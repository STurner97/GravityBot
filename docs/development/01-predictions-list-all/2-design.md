# Build 01 — Phase 2: Design

<!-- pipeline:nav -->
> **Build 01 — List all active predictions** · Phase 2 of 5 · awaiting sign-off
> [← Requirements](1-requirements.md) · [State](0-build.md) · Development → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Part 1 — Research

The Discord facts below are quoted from Discord's own API documentation (the
`discord/discord-api-docs` repository); the commands and output are in the Evidence section.

### R1 — Does a button on an ephemeral message still open a modal?

**Yes, per the documentation; confirmed by hand in feature 1.** A button click is a component
interaction, and the `MODAL` response (type 9) is refused only for `MODAL_SUBMIT` and `PING`
interactions. Nothing restricts it by the message's visibility. The interaction also carries the
message the component was attached to, so whether that message is ephemeral makes no difference
to the handler. The existing `bet` button handler can be reused unchanged.

Because the documentation only says this by omission, the first feature confirms it on the
real server before anything else is built on it.

### R2 — How to carry the page number with no stored state

**In the button's `custom_id`.** Discord's documentation describes `custom_id` as 1 to 100
characters that "can be used flexibly to maintain state". The Previous and Next buttons carry
the page they lead to, for example `predictions_page:2`, through the existing `encode`/`decode`
helpers in `src/lib/customId.js`. The click is answered with `UPDATE_MESSAGE` (type 7), which
"for components, edit[s] the message the component was attached to". No table, no cache, and
nothing is lost on a dyno restart.

`custom_id` values must be unique within a message. Bet buttons are unique by prediction id, and
Previous and Next always point at different pages, so they never collide.

### R3 — Worst-case length of a page of 5

**A page of 5 can exceed the limit.** Message content is capped at 2000 characters. The modals
allow a 200-character question and a 300-character options input. The options input is split
on commas and re-joined with `, `, so 150 one-character options grow to 449 characters. With
today's entry layout (pot line removed), the computed worst case is:

| Case | One entry | Page of 5 | Fits in 2000 |
|---|---|---|---|
| Longest question, longest options | 719 | 3635 | No |
| Longest question, typical options | 305 | 1565 | Yes |

The script is [research/worst-case-page.py](research/worst-case-page.py). Real predictions are
far shorter, but one long prediction on a page would make Discord reject the whole response,
and the list would fail with no message at all. See the push-back below: the design adds a
length safeguard.

A second limit came out of the same research. **A message holds at most 5 action rows, and a
row holds at most 5 buttons.** Today each prediction has its own row, so 5 predictions use all
5 rows and leave no room for Previous and Next. The design puts the bet buttons together in one
row (up to 5 buttons) and the paging buttons in a second row.

### R4 — Active prediction count and growth

**Waiting on the developer's query results (O1).** The read-only queries are in
[research/active-predictions.sql](research/active-predictions.sql). They report the active
count, the longest real question and options text, and predictions created per month this year.

What the answer can change: the page size, which is a single setting (S1), and whether the
length safeguard ever triggers on real data. Paging itself does not depend on the count. Even
100 active predictions is 20 pages, and the page number has no practical limit in a
`custom_id`.

## Part 2 — The design

### Core functionality

`/predictions` shows a private list (only the person who ran it sees it) of the active
predictions, newest first, 5 to a page. Below the entries is a row of "Bet on #N" buttons, one
per prediction on that page, and beneath that a Previous and a Next button. Clicking Previous or
Next changes the same message to the other page. Clicking a Bet button opens the bet modal as
it does today. A "Page 2 of 4" line under the entries shows where the user is. With 5 or fewer
active predictions there is one page, no paging buttons, and no page line.

Each page is rebuilt from the database on every click. A prediction created or resolved since
the list was opened shows up on the next click. A page number that no longer exists, for
example the last page after a prediction resolved, shows the nearest page that does.

### Technical integration / back end

The stack is already decided and binding: Node.js with ES modules, the `discord-interactions`
package for the REST interaction responses, PostgreSQL through `pg`. This build adds no
dependency. Tests use Node's built-in test runner (`node --test`), as the developer chose (O2).
Development starts by installing Node 20 or later on the developer's machine, adding
`"test": "node --test"` to `package.json`, and recording `npm test` as the `test` fact in
`docs/project.md`. That fact is recorded only once Node is installed, because `check`
verifies that the command resolves.

The pattern follows the existing feature structure. The decisions sit in pure functions that
take data and return a Discord response. The handlers are thin adapters that fetch, call, log
and return.

| Module | Responsibility |
|---|---|
| `src/features/betting/predictionsList.js` (new) | Pure. `buildPredictionsListPage(predictions, requestedPage, pageSize)` returns `{ content, components }`: picks the page, clamps the page number, fits entries into the length budget, builds the bet-button rows (5 buttons to a row, so one row at today's page size) and the paging row |
| `src/features/betting/predictionsListFormat.js` (new) | Pure. The text layout, in one place (C1): the header, the empty-list text, the page line, and `formatPredictionEntry` |
| `src/lib/discordLimits.js` (new) | Discord's fixed limits as named constants: message length 2000, 5 action rows, 5 buttons per row |
| `src/lib/format.js` (new) | `formatTimestamp`, moved out of `handlers.js` so the formatter can use it without importing a handler module. Existing callers import it from here |
| `src/config.js` | Adds `PREDICTIONS_PAGE_SIZE = 5`, checked at startup: it must be 1 to 20, because 4 rows of 5 Bet buttons plus the paging row is Discord's 5-row maximum. Any other value stops the process with a clear error |
| `src/lib/response.js` | `ephemeral(content, components)` gains optional components. New `updateMessage(content, components)` for type 7 |
| `src/features/betting/handlers.js` | `handlePredictions` fetches, builds page 0, logs, returns `ephemeral` |
| `src/features/betting/buttons.js` | New `handlePredictionsPageButton`: decodes the page, fetches, builds, logs, returns `updateMessage` |
| `src/features/betting/index.js` | `registerButton('predictions_page', handlePredictionsPageButton)` |

Why the builder takes `pageSize` as an argument instead of importing it: `src/config.js`
throws at import when the Discord and database environment variables are missing. Passing the
setting in keeps the builder free of environment and lets tests use a page size of 2 to cover
paging with small fixtures.

**The length safeguard (M7).** The builder gives each entry an equal share of the character
budget: 2000, minus the header and page line, divided by the page size. An entry over its share
has its options text shortened first, then its question, each ending in `…`. With today's page
size that share is about 390 characters, so real entries are expected to pass untouched; R4
will confirm it. Lengths are measured with JavaScript's `String.length`, which counts emoji
as 2 and so errs on the safe side.

**Getting the data.** `getActivePredictions()` in `betting.js` is used as it is. It returns
each prediction's bets, and the list needs only their count. A count query would be cheaper,
but the list is small and changing the SQL is outside this build's scope (W3). Every click
runs the same two queries `/predictions` runs today, well inside the 3-second response window,
so no deferral is needed.

**Logging.** Both handlers log one line at the decision point:
`[Betting] userId=… action=listPredictions page=2 pages=4 active=17`, and the button logs
`action=pagePredictions`.

**Alternative not taken: Components V2.** Discord's newer message layout allows 40 components
and would let each entry carry its own Bet button beside it. It replaces `content` with text
components, so it would be a rewrite of the list's output rather than a change to it. It is not
needed to meet the requirements.

### User interface / front end

The Discord message, page 2 of 3:

```
📋 **Active Predictions:**

**ID 41:** Will it snow in London before February?
**Options:** Yes, No
🕒 Created: <t:…:F>
🎲 3 bet(s)

… four more entries …

Page 2 of 3
[Bet on #41] [Bet on #40] [Bet on #38] [Bet on #37] [Bet on #35]
[◀ Previous] [Next ▶]
```

The message is ephemeral, so Discord marks it "Only you can see this". The Bet buttons move
from one row per prediction into a single row, in the same order as the entries. The first
page has no Previous button and the last page has no Next button (M2). Buttons are omitted
rather than disabled, as M2 states.

### Data

Nothing new is stored and no schema changes. The page number lives in the paging buttons'
`custom_id` (`predictions_page:<page>`, zero-based, shown one-based to the user).

On upgrade: old public `/predictions` messages already posted in channels keep working. Their
buttons use the `bet:<id>` namespace, which is unchanged. No live row is read differently or
written.

### How each requirement is met

| # | Satisfied by |
|---|---|
| M1 | `buildPredictionsListPage` pages through the whole result of `getActivePredictions()`; no slice cap remains |
| M2 | Page slicing at `PREDICTIONS_PAGE_SIZE` in `buildPredictionsListPage`; paging row with `predictions_page:<n>` buttons; `handlePredictionsPageButton` answers with `updateMessage` (type 7), editing the same message |
| M3 | Bet buttons for every entry on the page, using the existing `bet:<id>` custom_id, answered by the existing `handleBetButton` |
| M4 | `handlePredictions` responds with `ephemeral(content, components)`; page clicks edit that ephemeral message, which stays ephemeral |
| M5 | `formatPredictionEntry` in `predictionsListFormat.js`: today's layout minus the pot line; order kept from `getActivePredictions()` (`created_at DESC`) |
| M6 | `buildPredictionsListPage` omits the paging row and page line when there is one page |
| M7 | Length budget in `buildPredictionsListPage` using `MESSAGE_CONTENT_MAX_LENGTH` from `discordLimits.js` |
| S1 | `PREDICTIONS_PAGE_SIZE` in `src/config.js`; Discord's limits in `src/lib/discordLimits.js` |
| C1 | `predictionsListFormat.js` holds every string the list shows |

### Feature plan

Feature 1 crosses the riskiest seam first: an ephemeral message whose buttons both edit it in
place and open a modal. Feature 2 is text and safety, which unit tests see well.

| Feature | Requirements | Tests first | Accepted by |
|---|---|---|---|
| F1 — Private paged list with working buttons | M1, M2, M3, M4, M6, S1 | `buildPredictionsListPage`: page 0 of 12 holds the newest 5; last page holds the remainder; no Previous on page 0, no Next on the last page, both in between; paging buttons carry the right target pages; a page number past the end clamps to the last page, and a negative or non-numeric one to page 0; 5 or fewer predictions give no paging row; an empty list gives the empty text; every page uses at most 5 rows and 5 buttons a row; all custom_ids on a page are unique; startup check rejects a page size of 0 or one too large for the rows | Developer deploys, runs `/predictions`, sees "Only you can see this", clicks through every page (message edits in place, first has no Previous, last has no Next), opens the bet modal from page 2 or later and **cancels it** (no bet placed), and a second account confirms it sees nothing |
| F2 — Entry layout and length safeguard | M5, M7, C1 | `formatPredictionEntry` gives today's layout without the pot line; entries stay newest first; a page built from the longest question and options the modals allow is at most 2000 characters; a shortened entry ends in `…` and keeps its ID line whole; an entry within budget is not changed | Developer compares a page with a screenshot of today's output; edits one string in `predictionsListFormat.js`, deploys and sees the list change, then reverts it |

M6 cannot be shown on the live server without resolving predictions, which touches live data.
It is accepted through F1's unit tests, plus one live check: with `PREDICTIONS_PAGE_SIZE`
temporarily raised above the active count, the list shows one page with no paging buttons.
That check only changes a setting and is reverted afterwards.

### Manual checks

The adapters are `handlePredictions`, `handlePredictionsPageButton`, and the two response
helpers. They hold no branching of their own. Checked by hand on the real server:

- `/predictions` reply shows "Only you can see this".
- Next and Previous edit the same message; no new message appears.
- A Bet button on an ephemeral page opens the bet modal (R1).
- Cancelling the modal changes nothing; the list stays as it was.
- An old public `/predictions` message's Bet button still opens the modal.
- Clicking Next on a list left open after a prediction was resolved shows a valid page.
- The Heroku log shows the `action=listPredictions` and `action=pagePredictions` lines.

### What this build retires

- `MAX_PREDICTIONS_SHOWN` and its comment in `handlePredictions`: the cap it imposed is the
  defect.
- The total-pot sum in `handlePredictions` (M5).
- The public `/predictions` reply (`public_` there), replaced by the ephemeral one.
- `formatTimestamp` in `handlers.js`, moved to `src/lib/format.js` rather than copied.
- README's `/predictions` row ("List active predictions with bet buttons") is rewritten in
  review to say the list is private and paged.

### Version

| | |
|---|---|
| Target version | 1.1.0-alpha |
| Stage | alpha |
| Previous version | 1.0.0, untagged: the number in `package.json`, inherited from Discord's example app |
| Why this number | The developer chose to keep the 1.x numbering already in `package.json` and treat today's bot as 1.0.0 (O3). This build adds a body of scope, so MINOR goes up. It is alpha because builds 02 to 04 are planned |

The version lives in `package.json` and is stamped there in development. Publishing means the
developer deploys the accepted commit to Heroku by hand. The commit is then tagged
`v1.1.0-alpha`. The deploy command is recorded in `docs/project.md` once the developer gives
it (O4).

## Push-back on the requirements

**New Must M7, proposed: every page fits Discord's 2000-character limit.** R3 shows a page of 5
can reach 3635 characters with input the modals accept today. Discord rejects the whole
response, so the list would fail outright. No requirement covers this, and M5 ("the entry
layout stays") could be read as forbidding the shortening that prevents it. M7 is added to
[1-requirements.md](1-requirements.md) as proposed. The alternative not taken is fewer entries
on a page that runs long. That makes page boundaries depend on content and contradicts M2's
fixed 5 per page.

**S1 amended, proposed: Discord's fixed limits live outside `src/config.js`.** S1 as agreed
puts the page size "and any other limit it uses" in `src/config.js`. The other limits are
Discord's (2000 characters, 5 rows, 5 buttons). Putting them in the file meant for settings
invites editing values that would break the bot if changed. The amendment keeps the page size
in `src/config.js` and names Discord's limits in `src/lib/discordLimits.js`. Either way, no
bare numbers remain in the list code.

**M3, how it looks: the Bet buttons share one row.** M3 is met as written, but the layout
changes. Today each prediction has its own row. 5 rows plus the paging row would be 6, over
Discord's limit of 5, so the 5 Bet buttons sit together in one row under the entries.

## Edit log

- **2026-11-02** — first draft: R1-R3 researched w/ evidence, R4 waits on developer SQL (O1). M7 + S1 amendment proposed in push-back. Bet buttons one row (5-row limit).
- **2026-11-02** — developer agreed M7 + S1; chose `node --test` (O2), version 1.1.0-alpha w/ Heroku deploy + tag as publish (O3).

## Evidence

```console
$ curl -s https://raw.githubusercontent.com/discord/discord-api-docs/main/developers/interactions/receiving-and-responding.mdx | grep -n -E '^\| (UPDATE_MESSAGE|MODAL)|Only valid for .MODAL_SUBMIT|Not available for .MODAL_SUBMIT|For components or modals triggered'
36:| message?                       | [message](/developers/resources/message#message-object) object                                                                              | For components or modals triggered by components, the message they were attached to                                                                                                                                                                                        |
62:| MODAL_SUBMIT                     | 5     |
103:| MODAL_SUBMIT (`5`)                     | [Modal Submit Data Structure](/developers/interactions/receiving-and-responding#interaction-object-modal-submit-data-structure)               |
274:| UPDATE_MESSAGE\*                        | 7     | For components, edit the message the component was attached to                                                                                                                                                                                    |
276:| MODAL\*\*                               | 9     | Respond to an interaction with a popup modal                                                                                                                                                                                                      |
280:\* Only valid for `MODAL_SUBMIT` and [component-based](/developers/components/reference) interactions.
282:\*\* Not available for `MODAL_SUBMIT` and `PING` interactions.
```

```console
$ curl -s https://raw.githubusercontent.com/discord/discord-api-docs/main/developers/resources/message.mdx | grep -n -E '^\| EPHEMERAL|content\?\\\* .*2000'
154:| EPHEMERAL                              | `1 << 6`  | this message is only visible to the user who invoked the Interaction                    |
1104:| content?\*           | string                                                                                                                      | Message contents (up to 2000 characters)                                                                                                                                                                                                                |
```

```console
$ curl -s https://raw.githubusercontent.com/discord/discord-api-docs/main/developers/components/reference.mdx | grep -n -E 'Legacy messages allow up to 5 action rows|Up to 5 contextually grouped|must be unique per component'
81:`custom_id` is only available on interactive components and must be unique per component. Multiple components on the same message must not share the same `custom_id`. This field is a string of 1 to 100 characters and can be used flexibly to maintain state or pass through other important data.
94:- Up to 5 contextually grouped [buttons](/developers/components/reference#button)
2569:Legacy messages allow up to 5 action rows as top-level components
```

```console
$ grep -n -E 'max_length: (200|300)|custom_id: .(question|options)_input' src/features/betting/modals.js; grep -n "split(',')" src/features/betting/modals.js
29:        custom_id: 'question_input',
34:        max_length: 200,
41:        custom_id: 'options_input',
46:        max_length: 300,
135:  const predefinedOptions = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
```

```console
$ python3 -I docs/development/01-predictions-list-all/research/worst-case-page.py
max question, max options: entry=719 page_of_5=3635 limit=2000 fits=False
max question, typical options: entry=305 page_of_5=1565 limit=2000 fits=True
```
