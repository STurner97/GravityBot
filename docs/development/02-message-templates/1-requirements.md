# Build 02 — Phase 1: Requirements

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 1 of 5 · signed off
> [State](0-build.md) · Design → · [All builds](../README.md)
<!-- /pipeline:nav -->

## The problem

Every message the betting bot sends is built from string literals inside its handlers:
`src/features/betting/handlers.js`, `modals.js` and `buttons.js`, plus the error text that
`betting.js` returns. To change a word, the developer has to find the right handler, read
JavaScript that mixes text with logic (loops for winners and refunds, plural rules, `❌` error
branches) and edit it without breaking the code around it. The same message is spelt more
than once: the admin denial appears three times, and "Prediction #N not found" six times in
the handlers and three more in `betting.js`, in three forms.

The developer wants to change how bets and results read, and during build 01 asked for exactly
that on `/predictions`. Build 01 answered it for one command with a JavaScript formatting module
(`predictionsListFormat.js`). That still means editing code. What the developer wants is to
edit the wording without touching JavaScript at all: open one file, change the text, push.

The server is a few friends who use the bot daily, and every push to `main` goes live, so a
broken message file must be caught before it is pushed, not by the people using the bot.

### Why this build, and why now

The developer wants it most, it is understood best (build 01 proved the one-place pattern on
`/predictions`), and it changes only text, not how data is read or written. The config work
(build 03) does not depend on it, but will be easier to check once every message comes from
one place: values like the default credits will then show up in the file as placeholders.

## Scope

### Must have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| M1 | Every message the betting feature sends (slash command replies, modal and button replies, error replies, button labels, and the `/predictions` list) takes its text from one template file in the repo | Read the file: every betting message is there. Search the betting code: no message text is left in JavaScript | 2026-11-03 |
| M2 | Every message reads exactly as it does on `cb1f8a5`, character for character | A unit test per message compares the templated output with today's text; a smoke run in Discord shows no visible change | 2026-11-03 |
| M3 | A message shows its values through named placeholders, such as `{amount}` or `{predictionId}`, which can be moved or removed in the file | Read the file: each message names the values it uses | 2026-11-03 |
| M4 | Lists (active bets, winners, refunds, balances, predictions) are written in the file as a header, a line per item, and a message for when the list is empty, each editable on its own | Change the item line of `/mybets` in the file and see every bet in the list change | 2026-11-03 |
| M5 | `npm test` fails, naming the message, when the file does not parse, a message the bot needs is missing, or a message uses a placeholder it is not given | Break the file each of those three ways in turn; `npm test` fails each time and names the message; restore it | 2026-11-03 |
| M6 | A wording change is made by editing only the template file, committing and pushing; no JavaScript changes | The developer rewords one message in the file alone, pushes, and sees the new wording live | 2026-11-03 |
| M7 | `/predictions` keeps build 01's behaviour, including the 2000-character page limit and shortening long entries, now with its layout taken from the file | Build 01's list tests still pass; a longer entry line in the file still yields pages within the limit | 2026-11-03 |
| M8 | The error text `betting.js` returns to users (insufficient credits, invalid option, already resolved, and the rest) also comes from the file, without changing how `betting.js` reads or writes data | Read the diff of `betting.js`: only returned text changes, no SQL or transaction code; trigger one such error live that writes nothing, chosen in design (R8) | 2026-11-03 |

### Should have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| S1 | The modals' titles, field labels and placeholders (Create a Prediction, Bet on Prediction #N, Resolve Prediction #N) also come from the file | Open each modal and cancel it: text unchanged; each one is in the file | 2026-11-03 |
| S2 | The file says, beside each message, which placeholders it may use, so the developer can edit it without reading code | The developer edits a message using only what the file says | 2026-11-03 |

### Could have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| C1 | Build 01's two unexercised checks, run during this build's live acceptance: a second account sees no `/predictions` list, and Next works on a list left open after a throwaway prediction is resolved | Both seen live and recorded | 2026-11-03 |
| C2 | The pinboard and debug messages, including those the pinboard worker posts, also come from the template file, on the same terms as M1 to M5: identical output, placeholders, checked by `npm test` | Read the file: pinboard and debug messages are there; a pin and a debug command in Discord read as before | 2026-11-03 |

### Won't have — in this build

| # | Deferred | Where it goes |
|---|---|---|
| W2 | Changing wording without a deploy (templates in the database, or edited from Discord by an admin) | Dropped: the developer chose edit, commit and push |
| W3 | Rewording any message | After this build, through the file. M6's single edit is the only rewording here |
| W4 | Values inside messages becoming settings (the 1000 default credits, the beg limit, the donate amounts) | Build 03, configuration (build 01's W6) |
| W5 | Slash command names and descriptions | Stay in `commands.js`, the recorded single source of truth |
| W6 | Log lines | Stay in code: read by the developer in Heroku logs, not by users |
| W7 | Translations or more than one language | Dropped: one server of friends |
| W8 | Any change to how SQL is configured or run (build 01's W3) | Not planned; raise as a new build if wanted |
| W9 | A way to see resolved predictions | Not planned (build 01's W4) |

## Decisions taken in this phase

- Size is standard. The build is numbered 02, and the config work is renumbered build 03. The
  SQL work is no longer planned (W8). Build 01's signed-off notes keep their old numbers; W4
  and W8 above record the current destinations.
- "Editable" means editable without JavaScript, through a template file. One JavaScript
  module per feature, and admin editing from Discord, were both turned down.
- The file lives in the repo, so a wording change is a commit and a push, and git keeps its
  history and its rollback.
- `/predictions` moves into the same file, so the bot has one place for its wording.
- The output stays identical. The move is proven against today's text, and rewording comes
  after the build.
- A broken file is caught by `npm test` before a push. Design chooses what the running bot does
  if one gets through anyway.

## Research for the design phase

| # | Question | What it settles |
|---|---|---|
| R1 | Which file format edits most easily for multi-line messages that contain emoji, Discord markdown and backticks (JSON, YAML, or another), what a syntax error looks like in each, and whether a format needs a new dependency | The file format, and whether the project takes on a dependency |
| R2 | A placeholder syntax that cannot clash with Discord markdown or ordinary message text, and how a literal brace is written | How placeholders are written and checked (M3, M5) |
| R3 | How plurals (`credit` or `credits` on donate, `bet(s)`) and the lists in M4 are written without putting logic in the file | Whether every current message can be reproduced exactly (M2) without code in the templates |
| R4 | How `betting.js` hands an error to the handler without holding user text: an error code plus its values, mapped to a template by the caller | The shape of M8's change, and evidence that no SQL or transaction code moves |
| R5 | An inventory of every user-visible string in the betting feature and `betting.js`, with where each is built | The list M1 and M2 are checked against; nothing is missed |
| R6 | How build 01's page budget is measured when the entry layout comes from the file, so a longer template cannot silently break the 2000-character limit | Whether M7 holds after the developer edits the layout |
| R7 | Whether the file is read once at startup or per message, what the running bot does with a broken file that got past the tests, and how tests read the same file as the bot | The runtime fallback left open in the decisions, and that M5's tests test the real file |
| R8 | How the resolve and void announcements (and C1) are seen live without touching real bets: creating a prediction takes a bet from the creator's real balance, so name the throwaway prediction, its stake, and how the balance comes back | A safe acceptance plan that keeps to the live-data ground rule |
| R9 | For C2: how the pinboard worker, a separate Heroku process, loads the same file, and which pinboard and debug messages exist | Whether C2 fits the same design, or is cheap enough to build after the Musts |

## Edit log

- **2026-11-03** — first draft from developer conversation; all rows proposed.
- **2026-11-03** — developer moved W1 (pinboard, debug messages; was "a later build") to Could as C2; W1 retired. W8 SQL work: was build 04, now not planned. R9 added for C2.
- **2026-11-03** — developer agreed all rows via /pipeline-signoff; M8 Must, S1 Should as drafted.
