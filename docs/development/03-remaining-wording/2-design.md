# Build 03 — Phase 2: Design

<!-- pipeline:nav -->
> **Build 03 — Pinboard, debug and channel-denial messages from the template file** · Phase 2 of 5 · signed off
> [← Requirements](1-requirements.md) · [State](0-build.md) · Development → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Part 1 — Research

Every claim below about a library, Heroku or Discord is backed by a block under *Evidence*.

### R1 — Inventory of user text

The search in the first evidence block finds the user text in seven files. It is larger than
the requirements' "about 40": the `/debug` inspection replies (`stats`, `prediction`, `user`,
`recent`) build several lines each and drop in small words (`yes`, `no`, `n/a`, `unknown`,
`active`). The full list, with the message name each string becomes, is the message table under
*Data*. Three strings are already in the file under another feature's name and reuse it:

- the admin denial on `/pinboard` and `/debug` is `denied.admin`, word for word;
- `/debug prediction`'s "Prediction #N not found." is `prediction.notFound`, word for word;
- `/debug prediction` joins options with `", "`, which is `optionList` through
  `formatOptionList`.

What stays in code, as the requirements drew it: slash command names (W5), log lines (W6), the
router's JSON bodies (W2), the SQL result table's layout (W9), the `' '` that stands in for an
empty embed description (Discord rejects an empty one; it is not wording), and the
`'unknown'` author id the worker writes to `pinboard_posts` (stored, never shown).

### R2 — How the worker reads the file

Both Heroku processes run from the same slug: the Procfile starts `node app.js` and
`node pinboard-worker.js` from the app root. The messages module resolves `messages.json`
relative to its own source file, not the working directory, so the worker finds the same file
the web process does. Importing the module reads the file, checks it and logs
`[Messages] file=messages.json messages=N problems=P` at once; the evidence shows that line
from a bare import. Today nothing on the worker's import path reaches the module (`data.js`
imports only `db.js`). It will once the pin post is built from the file.

On a broken file the module already behaves as M4 wants. An unreadable or unparsable file logs
the problem and leaves every message unavailable. A broken message is left out and logged by
name. Nothing throws at startup. `messageText` throws only when a broken message is asked for,
so the failure lands on the one pin being posted, inside the worker's per-event `try/catch`.

### R3 — The reference wording

Build 02's frozen reference, `fixtures/wording-cb1f8a5.json`, holds the wording at `cb1f8a5`.
`cb1f8a5` is an ancestor of `11f4e9e`, and no file under `src/features/pinboard`,
`src/features/debug` or `src/interactions/router.js` changed between them. The wording this
build must keep, as at `11f4e9e`, is therefore exactly the wording at `cb1f8a5`. The new
messages join the same reference file, and its name stays true. The wording tests read the
reference, never `messages.json`, so the developer's rewording does not break them. Build 02
set it up this way, and the betting text has already been reworded under it.

### R4 — Discord's length limits

Quoted from `@discordjs/builders` 1.13.1, the version the lockfile installs:

| Where a message is shown | Limit |
|---|---|
| Modal title | 45 |
| Text input label | 45 |
| Text input placeholder | 100 |
| Button label | 80 |
| Embed author name | 256 |
| Embed field name | 256 |
| Embed field value | 1024 |

These are the limits discord.js enforces before sending, and they match Discord's own. Our code
sends raw JSON through `discord-interactions` and `fetch`, so nothing checks them for us.
Discord rejects the response, and the user sees "This interaction failed".

`npm test` cannot learn from the code where each message is shown without building every modal
and button, and that would not name the message. So the catalog declares it: each message
shown in a limited place carries `shownAs` (see *Technical integration*).

### R5 — Reset and forcepin failures

- **Reset.** `resetDatabase` catches its own error inside the transaction, keeps only
  `err.message`, and returns `{ success: false, error }`. Nothing logs the error object. The
  button handler puts the message in the reply. Because the error is caught inside the
  transaction, `withTransaction` sends `COMMIT` on an aborted transaction instead of
  `ROLLBACK`. PostgreSQL treats that as a rollback, so no data is at risk, but the code says
  the opposite of what happens.
- **Forcepin.** `DiscordRequest` throws `new Error(JSON.stringify(body))` on any non-2xx
  response, and the forcepin `catch` replies with `err.message`. That is Discord's raw JSON,
  for example `{"message": "Unknown Message", "code": 10008}`. The handler fetches the source
  message first. A link in the right format with a message id that does not exist therefore
  fails on that fetch, before the post or the `pinboard_posts` write. That is the safe live
  check for M7.

### R6 — A safe live acceptance plan

- **Read-only `/debug`:** `stats`, `recent` and `prediction` only read. `user` is **not**
  read-only. `getUserDebug` calls `ensureUser`, which inserts a `users` row for anyone who has
  none. It is safe only on a user who already has a row, such as the developer.
- **SQL modal:** opening it reads nothing. Submitting `SELECT 1 AS one` reads nothing and shows
  the "Query executed" wording and a one-row table.
- **Reset:** the prompt and **Cancel** only. **Yes, Reset** is never pressed live.
- **A pin:** a new pin needs three reactions from members other than the author
  (`DEFAULT_THRESHOLD = 3`), so the developer cannot make one alone. The worker re-renders an
  **existing** pin post whenever its count changes. The developer adds a 📌 to a message
  already on the pinboard that someone else wrote, sees the post re-rendered from the file
  ("N+1 Pins"), then removes the reaction to put it back. That moves one
  `pinboard_posts.reaction_count` up and back down. It is the bot's ordinary use, and it is
  said aloud before it is done. A brand-new pin is left to the friends' next real pin (M3's
  acceptance).
- **Pinboard config:** `whitelist_add` of a channel already on the list changes nothing
  (`ON CONFLICT DO NOTHING`) and shows the "Added" reply. `setchannel` and `whitelist_remove`
  change live config and are proven by wording tests only.
- **Channel denial:** it shows only when `ALLOWED_CHANNEL_IDS` is set. The developer confirmed
  it is set on Heroku (see `docs/project.md`), so a command in a channel off the list shows it
  and reads nothing.

### R7 — `clientReady`

The lockfile installs discord.js 14.25.1, which defines `Events.ClientReady = 'clientReady'`
and emits both events. It warns only when `ready` has a listener: `emit` returns true only
then. Listening to `clientReady` alone removes the warning. S1 needs no dependency bump.

### Feasibility

Every Must is feasible on the current stack. There is no push-back on any priority. Two
acceptance methods need adjusting; they are under *Push-back on the requirements*.

## Part 2 — The design

### Core functionality

Every message the pinboard, the debug tools and the router show users comes from
`messages.json`, as betting's already does, and reads exactly as it does today. The developer
can reword the pin post, the pinboard replies and the debug tools by editing that one file.

The pinboard worker reads the file too. It logs the same startup line as the web process, so
the developer can see in Heroku that the file loaded. If a pin message is broken in a deployed
file, that pin is not posted and the reason is logged. The worker keeps running and keeps
removing deleted pins.

`npm test` refuses a message that is too long for where Discord shows it, and names the message
and the limit. A failed `/debug reset` or `/pinboard forcepin` shows a short generic error and
logs the full one. The unused root `pinboard.js` is deleted, and the worker stops using the
deprecated `ready` event.

### Technical integration / back end

The stack is recorded in `docs/project.md` and binding: Node.js (ES modules), discord.js v14,
Express, PostgreSQL. This build adds no dependency.

The pattern is build 02's, extended:

- **Handlers stay thin.** They read options, call data functions and return a reply. Text comes
  from `messageText(name, values)`.
- **Pure builders sit beside the handlers.** Anything that composes text from data takes a
  `text` function with `messageText` as its default. That is how `buildModals.js` works today.
  Tests pass `referenceText` and need no database or Discord. The new modules:

| Module | Holds | Used by |
|---|---|---|
| `src/features/pinboard/pinboardEmbed.js` | `buildPinboardEmbed`, moved out of `data.js` (which keeps only SQL). Takes `{ count, forced, … }` and picks `pinboard.post.heading` or `pinboard.post.forcedHeading` | worker `helpers.js`, forcepin |
| `src/features/pinboard/formatWhitelist.js` | The `whitelist_list` reply from the target channel and the list | `handlers.js` |
| `src/features/debug/formatDebugReplies.js` | The `stats`, `prediction`, `user` and `recent` replies from their data, and the status and yes/no words | `handlers.js` |
| `src/features/debug/buildDebugComponents.js` | The reset prompt with its two buttons, and the SQL modal | `handlers.js` |
| `src/features/debug/formatSqlResult.js` | The SQL reply: its text from the file, the table layout in code (W9) | `modals.js` |

- **The worker** (`worker/index.js`) imports the messages module explicitly, so the startup
  check runs at boot and the dependency is visible. The import chain would reach it anyway. Its
  three listeners share one wrapper, `reportFailures(eventName, handler)`. The wrapper runs the
  handler and logs `[Pinboard] event=<name> failed` with the full error instead of throwing. It
  replaces three copied `try/catch` blocks, and it is the "keeps running" half of M4, in one
  testable function. Readiness uses `Events.ClientReady` (S1).
- **Generic errors (M6, M7).**
  - `resetDatabase` stops catching its own error. `withTransaction` then rolls back and
    rethrows, as it does for every other transaction.
  - `handleConfirmReset(interaction, { reset = resetDatabase, text = messageText } = {})`
    catches, logs `[Debug] action=resetDatabase failed` with the error, and replies
    `debug.reset.failed`.
  - Forcepin's `catch` already logs the full error. It now replies
    `pinboard.forcepin.failed`.
  - Both messages are declared with no values, and `checkMessages` refuses a placeholder the
    code does not give. So even a reword cannot show the raw error again.
- **Length limits (M5).**
  - `discordLimits.js` gains `TEXT_LIMITS`, the seven limits from R4, named by place.
  - Catalog entries shown in those places take an option, for example
    `textMessage([], { shownAs: 'modalTitle' })`. Plural messages are checked in both forms.
  - A pure `checkLengths(source, catalog, sampleValues)` in `src/lib/messages/` renders each
    such message with the longest value each placeholder can take. It returns
    `{ message, problem }` rows in `checkMessages`' format, for example
    `predictModal.title: is 52 characters; a modal title allows 45`.
  - A placeholder with no sample value is itself a problem. A new message cannot skip the
    check unnoticed.
  - `messagesFile.test.js` runs it on the real `messages.json`. `buildOptionsPlaceholder`'s
    bare `100` becomes `TEXT_LIMITS.inputPlaceholder`.
  - The check runs in `npm test` only, not at bot startup. It needs sample values that mean
    nothing at run time, and the test runs before every push.
- **Sample values** live in the test file beside the check. Each value is the longest it can
  be:

| Value | Sample | Why that length |
|---|---|---|
| `predictionId` | 10 digits | PostgreSQL `integer` |
| `amount` | 10 digits | The amount inputs' `max_length` |
| `count` | 6 digits | A reaction count |
| `authorId` | 20 digits | Discord snowflake |
| `messageUrl` | 91 characters | `https://discord.com/channels/` plus three snowflakes |

### Data

There are no schema changes. The database is touched only where the code already does:
`resetDatabase` still truncates the same three tables, now inside a transaction that rolls back
on failure.

**`messages.json`** gains the messages below, each with the wording it has today. The live file
is edited by hand in the same commit as the code that reads it, so the web process and the
worker always deploy a matching pair. **The reference file** `wording-cb1f8a5.json` gains the
same messages with the same text (R3). **The catalog** gains their names and values, plus
`shownAs` on 29 messages: the 20 betting messages already shown in a modal or on a button, and
the 9 new ones marked below.

| Message | Kind, values | Shown as | Today's text (source) |
|---|---|---|---|
| `pinboard.missingSubcommand` | text | reply | `❌ Missing pinboard subcommand.` |
| `pinboard.unknownSubcommand` | text | reply | `❌ Unknown pinboard subcommand.` |
| `pinboard.setChannel.missing` | text | reply | `❌ Missing channel for pinboard target.` |
| `pinboard.setChannel.done` | `channelId` | reply | `📌 Pinboard channel set to <#…>.` |
| `pinboard.whitelistAdd.missing` | text | reply | `❌ Missing channel to whitelist.` |
| `pinboard.whitelistAdd.done` | `channelId` | reply | `✅ Added <#…> to the pinboard whitelist.` |
| `pinboard.whitelistRemove.missing` | text | reply | `❌ Missing channel to remove.` |
| `pinboard.whitelistRemove.done` | `channelId` | reply | `✅ Removed <#…> from the pinboard whitelist.` |
| `pinboard.whitelist.target` | text, `target` | reply | `📌 Pinboard channel: …` and a line break |
| `pinboard.whitelist.targetChannel` | `channelId` | reply | `<#…>` |
| `pinboard.whitelist.targetNotSet` | text | reply | `not set` |
| `pinboard.whitelist.channels` | list, item `channelId` | reply | `Whitelisted channels:` / `<#…>` lines / `Whitelist is empty.` |
| `pinboard.forcepin.missingUrl` | text | reply | `❌ Message URL is required.` |
| `pinboard.forcepin.invalidUrl` | text | reply | `❌ Invalid message URL format. Right-click…` |
| `pinboard.forcepin.noTarget` | text | reply | `❌ Pinboard target channel not set.` |
| `pinboard.forcepin.done` | `pinUrl` | reply | `✅ Force pinned message: …` |
| `pinboard.forcepin.failed` | text, no values | reply | **New**: `❌ Failed to force pin.` (agreed) |
| `pinboard.post.heading` | plural `count` | embed author | `📌 1 Pin` / `📌 N Pins` |
| `pinboard.post.forcedHeading` | text | embed author | `📌 1 Pin (forced)` |
| `pinboard.post.postedByName` | text | embed field name | `Posted by` |
| `pinboard.post.postedByValue` | `authorId`, `messageUrl` | embed field value | `<@…> · <link>` |
| `debug.missingSubcommand` | text | reply | `❌ Missing debug subcommand.` |
| `debug.unknownSubcommand` | text | reply | `❌ Unknown debug subcommand.` |
| `debug.stats` | six counts | reply | `🧪 **DB Stats:**` and three lines |
| `debug.prediction.summary` | eight values | reply | `🧪 **Prediction #N**` through `Bets (N):` |
| `debug.prediction.bets` | list, item `userId option amount` | reply | `• <@…>: option (amount)` lines / `No bets yet.` |
| `debug.prediction.moreBets` | `count` | reply | `…and N more` |
| `debug.user.summary` | `userId balance limit` | reply | `🧪 **User <@…>**` through `Recent bets (max N):` |
| `debug.user.bets` | list, six item values | reply | `• #id: question \| … ` lines / `No bets found.` |
| `debug.recent.header` | `limit` | reply | `🧪 **Recent Predictions (max N)**` |
| `debug.recent.list` | list, four item values | reply | `• #id: question \| status \| time` lines / `No predictions found.` |
| `debug.yes`, `debug.no` | text | reply | `yes`, `no` |
| `debug.notApplicable` | text | reply | `n/a` |
| `debug.unknownTime` | text | reply | `unknown` |
| `debug.status.active` | text | reply | `active` |
| `debug.status.resolved` | `outcome` | reply | `resolved (…)` |
| `debug.reset.prompt` | text | reply | `⚠️ **WARNING: Are you sure…` |
| `debug.reset.confirmButton` | text | button label | `Yes, Reset` |
| `debug.reset.cancelButton` | text | button label | `Cancel` |
| `debug.reset.cancelled` | text | reply | `✋ Reset cancelled.` |
| `debug.reset.done` | text | reply | `💥 **Database reset complete!** All tables truncated.` |
| `debug.reset.failed` | text, no values | reply | **New**: `❌ Reset failed.` (agreed) |
| `debug.sqlModal.title` | text | modal title | `Execute SQL Query` |
| `debug.sqlModal.queryLabel` | text | input label | `SQL Query` |
| `debug.sqlModal.queryPlaceholder` | text | input placeholder | `SELECT * FROM users;` |
| `debug.sql.denied` | text | reply | `❌ You do not have permission to execute SQL queries.` |
| `debug.sql.noRows` | `rowCount` | reply | `✅ Query executed.` and the rows-affected block |
| `debug.sql.rows` | `rowCount table` | reply | `✅ Query executed. (N rows)` and the table |
| `debug.sql.moreRows` | `count` | reply, inside the table | `... and N more rows` |
| `debug.sql.error` | `error` | reply | `❌ SQL Error:` and the database's message (W1: raw on purpose) |
| `denied.channel` | text | reply | `❌ This bot can only be used in specific channels.` |

That is 52 new entries; `debug.yes`/`debug.no` count as two. The catalog grows from 62 to 114,
and the startup line will read `messages=114`. The table gives the shape. Development writes
the exact strings from the code at `11f4e9e`, character for character, and the wording tests
hold them there.

Where a reply is a summary followed by a list (`debug prediction`, `user`, `recent`, the
whitelist), the summary and the list are separate messages. A list's empty text replaces its
header, so one message would have to repeat the summary in its empty text. Two messages keep
each piece of wording in the file once.

**On upgrade:** the deploy restarts both dynos on the new slug. Nothing is migrated, and no
stored data holds wording. An existing pin post keeps the text it was posted with until its
next re-render, which produces identical text.

### How each requirement is met

| # | Satisfied by |
|---|---|
| M1 | The 52 messages under *Data*. Handlers call `messageText`, and the pure builders `pinboardEmbed.js`, `formatWhitelist.js`, `formatDebugReplies.js`, `buildDebugComponents.js` and `formatSqlResult.js` take `text`. A final search of the three features finds no user text outside W2 and W9 |
| M2 | One wording test per message against `wording-cb1f8a5.json` (R3). Builder tests check the composed output against the strings and embed object today's code produces, written into the tests from `11f4e9e`. A live smoke run per feature |
| M3 | `worker/index.js` imports the messages module, which logs `[Messages] … problems=N` at boot (R2). `pinboardEmbed.js` reads the same `MESSAGES_FILE` |
| M4 | Design choice: **post nothing and log**. A broken pin message makes `buildPinboardEmbed` throw before anything is sent or written. `reportFailures` logs it and returns, and the worker keeps running; message-delete cleanup needs no text and keeps working. Rejected: falling back to built-in text, which would put the pin wording in two places and hide a broken file behind a working pin |
| M5 | `TEXT_LIMITS` in `discordLimits.js`, `shownAs` in the catalog, `checkLengths` and its test on the real file |
| M6 | `resetDatabase` rethrows. `handleConfirmReset` logs and replies `debug.reset.failed`, a message with no values. Unit-tested with an injected failing reset |
| M7 | Forcepin's `catch` replies `pinboard.forcepin.failed`, a message with no values, and keeps logging the full error |
| M8 | Delete `pinboard.js`. The evidence shows that no module imports it |
| S1 | `client.once(Events.ClientReady, …)` in `worker/index.js` |

### Feature plan

Each feature ends with the developer pushing it to `main`, which deploys, and judging it live,
as build 02 did. The wording in each push is identical by test, so friends see no change.
Accepting a feature includes reading the Heroku log for both dynos.

| Feature | Requirements | Tests first | Accepted by |
|---|---|---|---|
| **F1 — The pin post from the file.** The riskiest seam: the worker reads `messages.json` | M3, M4, S1; M1 and M2 for the four `pinboard.post.*` messages | Wording tests for `pinboard.post.*`. `buildPinboardEmbed` with `referenceText` equals today's embed object for counts 0, 1 and 3 and for a forced pin. With a broken `text`, `buildPostPayload` throws and a fake channel's `send` and `edit` are never called. `reportFailures` logs the event name and the error, and resolves | Push. The worker's log shows `[Messages] … problems=0` and its login line, with no `DeprecationWarning`. The developer adds 📌 to a message already on the pinboard that someone else wrote: the post re-renders as "N+1 Pins", the same as before. Removing the reaction restores it. The friends' next real pin posts as before |
| **F2 — Debug from the file, with a generic reset error** | M1 and M2 for `debug.*`; M6 | Wording tests per `debug.*` message. The four reply formatters, the reset prompt, the SQL modal and the SQL result each equal today's output for fixed data. A failing injected reset gives `debug.reset.failed`, and the logged error is the thrown object | Push. `/debug stats`, `/debug recent` and `/debug prediction <id>` read as before. `/debug user` is run on the developer only. Open the SQL modal and submit `SELECT 1 AS one`. Run `/debug reset` and press **Cancel**; never **Yes** |
| **F3 — Pinboard replies, generic forcepin error, channel denial** | M1 and M2 for the remaining `pinboard.*` and `denied.channel`; M7 | Wording tests per message. `formatWhitelist` matches today's output, with and without channels and target. `pinboard.forcepin.failed` declares no values | Push. `/pinboard whitelist_list`. `whitelist_add` on a channel already listed (no change). Forcepin `not a link` gives the format error. Forcepin on a link to a real channel with a made-up message id gives the generic error, the log holds Discord's error, and nothing is posted. The channel denial: any command in a channel off the list |
| **F4 — Length limits and the dead file** | M5, M8 | `checkLengths` on fixtures: an over-long modal title, label, placeholder, button label (each plural form), embed author, field name and value. Each is reported with the message's name and the limit; a placeholder without a sample is a problem. The real file passes | Locally: lengthen `predictModal.title` past 45, `npm test` fails naming it and the limit, restore it. `pinboard.js` deleted; `npm test` passes; push; both dynos start |

The final search for M1 runs at the end of F3, after the last message has moved.

### Manual checks

These adapters touch systems we do not control. Each holds no logic worth a test, and each gets
a live check instead:

| Adapter | What it does | Checked by |
|---|---|---|
| `worker/index.js`: client setup, listeners, `clientReady` | Wires Discord's gateway events to `reportFailures(handleReactionChange)` | F1: login line, no warning, a pin re-rendered |
| `helpers.js`: `publishOrUpdatePin`'s `send` and `edit` | Hands the built payload to discord.js | F1: the re-rendered pin post |
| Forcepin's `DiscordRequest` calls | `GET` the source message, `POST` the pin | F3: the failing link; the happy path is not run live (decision 5) |
| Handler reply wiring in `pinboard/handlers.js`, `debug/handlers.js`, `buttons.js`, `modals.js`, `router.js` | Passes builder output to `ephemeral`, `modal` | F2 and F3 smoke runs |
| Heroku's worker dyno | Runs the worker from the same slug | F1: the worker's `[Messages]` line |

### What this build retires

- The root `pinboard.js` (M8), 128 lines that nothing imports.
- About 70 string literals across `pinboard/` and `debug/`, and `router.js`'s denial.
- The three copied `try/catch` listener blocks in `worker/index.js`, which become one
  `reportFailures`.
- The `pinboardEmbed.author.name = '📌 1 Pin (forced)'` overwrite in forcepin, which becomes
  `buildPinboardEmbed({ forced: true })`.
- `resetDatabase`'s inner `try/catch` and its `{ success, error }` result.
- The unused `resetDatabase` import in `debug/handlers.js`.
- The bare `100` in `buildOptionsPlaceholder`.
- `buildPinboardEmbed` leaves `data.js`, so `data.js` holds only SQL.
- In review: CLAUDE.md's "Debug and pinboard text stays in code until it is moved", and its
  mention of `pinboard.js` as the module that owns pinboard logic.

### Version

| | |
|---|---|
| Target version | 1.3.0-alpha |
| Stage | alpha |
| Previous version | 1.2.0-alpha |
| Why this number | MINOR: a body of new scope. The rest of the bot's wording becomes editable, the worker reads the file, and `npm test` gains a length check. Not PATCH, because the behaviour changes: generic errors, and new log lines from the worker. Alpha, because configuration (build 04) and more builds are still to come |

## Push-back on the requirements

There are no priority changes. Two acceptance methods are adjusted, and both are stated here so
the developer can see them before approving:

- **M2's smoke run, "a real pin".** The developer cannot make a new pin alone: it needs three
  reactions from other members (R6). The smoke run re-renders an existing pin instead. That is
  the same builder and the same file, through the worker's `edit` path, not its `send` path.
  The `send` path is seen at the friends' next real pin, which M3 already waits for. If no pin
  happens before review, the row is `Pass with a limit`.
- **M2's "a read-only `/debug` command".** `/debug user` writes a `users` row for anyone
  without one (R6), so it is run only on the developer. `stats`, `recent` and `prediction` are
  the read-only checks.

The inventory is larger than the requirements estimated, about 70 strings rather than 40,
because the debug inspection replies were counted as single strings. M1 covers them as
written. The work is larger, not different.

## Decisions at the design review

1. **M4:** a broken pin message posts nothing and is logged. There is no built-in fallback.
2. **Generic errors:** `❌ Reset failed.` and `❌ Failed to force pin.`, today's text with the
   raw error removed.
3. **Reuse:** `/debug` and `/pinboard` share `denied.admin`, `prediction.notFound` and
   `optionList` with betting. A reword of one changes both, as intended.
4. **Channel denial:** `ALLOWED_CHANNEL_IDS` is set on Heroku, so the denial is checked live in
   F3.
5. **Forcepin's success path** is left to the wording and pin-post tests, not run live. F1
   checks the same pin post live, and a live forcepin would leave a post friends see.

## Edit log

- **2026-11-13** — first draft: research R1–R7 with evidence, design, F1–F4, 1.3.0-alpha; awaiting signoff.
- **2026-11-13** — O1–O4 answered by developer: post nothing on broken pin, generic texts kept, reuse shared messages, `ALLOWED_CHANNEL_IDS` set so denial checked live in F3.
- **2026-11-13** — O5 answered: forcepin happy path left to tests; open-questions section removed.
- **2026-11-13** — developer approved the design via /pipeline-signoff.

## Evidence

```console
$ grep -nE "ephemeral\(|label: '|placeholder: '|name: |modal\('|'(yes|no|n/a|unknown|active|not set|No bets|No predictions)'" src/features/pinboard/*.js src/features/pinboard/worker/*.js src/features/debug/*.js src/interactions/router.js
src/features/pinboard/commands.js:3:    name: 'pinboard',
src/features/pinboard/commands.js:8:        name: 'setchannel',
src/features/pinboard/commands.js:13:            name: 'channel',
src/features/pinboard/commands.js:21:        name: 'whitelist_add',
src/features/pinboard/commands.js:26:            name: 'channel',
src/features/pinboard/commands.js:34:        name: 'whitelist_remove',
src/features/pinboard/commands.js:39:            name: 'channel',
src/features/pinboard/commands.js:47:        name: 'whitelist_list',
src/features/pinboard/commands.js:52:        name: 'forcepin',
src/features/pinboard/commands.js:57:            name: 'message_url',
src/features/pinboard/data.js:18:      name: `📌 ${count} Pin${count !== 1 ? 's' : ''}`,
src/features/pinboard/data.js:23:        name: 'Posted by',
src/features/pinboard/handlers.js:18:    return ephemeral('❌ You do not have permission to use this command.');
src/features/pinboard/handlers.js:23:    return ephemeral('❌ Missing pinboard subcommand.');
src/features/pinboard/handlers.js:42:  return ephemeral('❌ Unknown pinboard subcommand.');
src/features/pinboard/handlers.js:48:    return ephemeral('❌ Missing channel for pinboard target.');
src/features/pinboard/handlers.js:51:  return ephemeral(`📌 Pinboard channel set to <#${channelId}>.`);
src/features/pinboard/handlers.js:57:    return ephemeral('❌ Missing channel to whitelist.');
src/features/pinboard/handlers.js:60:  return ephemeral(`✅ Added <#${channelId}> to the pinboard whitelist.`);
src/features/pinboard/handlers.js:66:    return ephemeral('❌ Missing channel to remove.');
src/features/pinboard/handlers.js:69:  return ephemeral(`✅ Removed <#${channelId}> from the pinboard whitelist.`);
src/features/pinboard/handlers.js:79:    : 'not set';
src/features/pinboard/handlers.js:82:    return ephemeral(`📌 Pinboard channel: ${targetText}\nWhitelist is empty.`);
src/features/pinboard/handlers.js:86:  return ephemeral(`📌 Pinboard channel: ${targetText}\nWhitelisted channels:\n${lines}`);
src/features/pinboard/handlers.js:92:    return ephemeral('❌ Message URL is required.');
src/features/pinboard/handlers.js:97:    return ephemeral('❌ Invalid message URL format. Right-click a message and select "Copy Message Link".');
src/features/pinboard/handlers.js:104:    return ephemeral('❌ Pinboard target channel not set.');
src/features/pinboard/handlers.js:159:    return ephemeral(`✅ Force pinned message: https://discord.com/channels/${guildId}/${config.target_channel_id}/${sentMessage.id}`);
src/features/pinboard/handlers.js:162:    return ephemeral(`❌ Failed to force pin: ${err.message}`);
src/features/pinboard/worker/helpers.js:89:        name: att.name || undefined,
src/features/pinboard/worker/helpers.js:121:        authorId: message.author?.id || 'unknown',
src/features/pinboard/worker/helpers.js:133:    authorId: message.author?.id || 'unknown',
src/features/debug/buttons.js:10:  if (answer === 'no') {
src/features/debug/buttons.js:11:    return ephemeral('✋ Reset cancelled.');
src/features/debug/buttons.js:16:    return ephemeral(`❌ Reset failed: ${result.error}`);
src/features/debug/buttons.js:19:  return ephemeral('💥 **Database reset complete!** All tables truncated.');
src/features/debug/commands.js:3:    name: 'debug',
src/features/debug/commands.js:8:        name: 'stats',
src/features/debug/commands.js:13:        name: 'prediction',
src/features/debug/commands.js:18:            name: 'prediction_id',
src/features/debug/commands.js:27:        name: 'user',
src/features/debug/commands.js:32:            name: 'user',
src/features/debug/commands.js:38:            name: 'limit',
src/features/debug/commands.js:48:        name: 'recent',
src/features/debug/commands.js:53:            name: 'limit',
src/features/debug/commands.js:63:        name: 'reset',
src/features/debug/commands.js:68:        name: 'sql',
src/features/debug/handlers.js:18:  if (!dateStr) return 'unknown';
src/features/debug/handlers.js:27:    return ephemeral('❌ You do not have permission to use this command.');
src/features/debug/handlers.js:32:    return ephemeral('❌ Missing debug subcommand.');
src/features/debug/handlers.js:42:    return ephemeral(message);
src/features/debug/handlers.js:49:      return ephemeral(`❌ Prediction #${predictionId} not found.`);
src/features/debug/handlers.js:61:      `Resolved: ${prediction.resolved ? 'yes' : 'no'}\n` +
src/features/debug/handlers.js:62:      `Outcome: ${prediction.outcome || 'n/a'}\n` +
src/features/debug/handlers.js:77:    return ephemeral(message);
src/features/debug/handlers.js:95:        const status = bet.resolved ? `resolved (${bet.outcome || 'n/a'})` : 'active';
src/features/debug/handlers.js:100:    return ephemeral(message);
src/features/debug/handlers.js:113:        const status = pred.resolved ? `resolved (${pred.outcome || 'n/a'})` : 'active';
src/features/debug/handlers.js:118:    return ephemeral(message);
src/features/debug/handlers.js:122:    return ephemeral(
... 13 more lines
```

```console
$ git merge-base --is-ancestor cb1f8a5 11f4e9e && echo 'cb1f8a5 is an ancestor of 11f4e9e'; git diff --stat cb1f8a5 11f4e9e -- src/features/pinboard src/features/debug src/interactions/router.js; echo "files changed in those paths between cb1f8a5 and 11f4e9e: $(git diff --name-only cb1f8a5 11f4e9e -- src/features/pinboard src/features/debug src/interactions/router.js | wc -l)"
cb1f8a5 is an ancestor of 11f4e9e
files changed in those paths between cb1f8a5 and 11f4e9e: 0
```

```console
$ cat Procfile; grep -n 'MESSAGES_FILE =\|console.log' src/lib/messages/index.js; grep -n '^import' pinboard-worker.js src/features/pinboard/worker/*.js src/features/pinboard/data.js
web: node app.js
worker: node pinboard-worker.js
6:export const MESSAGES_FILE = fileURLToPath(new URL('../../../messages.json', import.meta.url));
19:console.log(`[Messages] file=messages.json messages=${messageCount} problems=${problems.length}`);
pinboard-worker.js:1:import 'dotenv/config';
pinboard-worker.js:2:import { startWorker } from './src/features/pinboard/worker/index.js';
src/features/pinboard/worker/handleReactionChange.js:1:import { getPinboardConfig, getPinboardPost } from '../data.js';
src/features/pinboard/worker/handleReactionChange.js:2:import {
src/features/pinboard/worker/helpers.js:1:import { ChannelType } from 'discord.js';
src/features/pinboard/worker/helpers.js:2:import {
src/features/pinboard/worker/index.js:1:import { Client, GatewayIntentBits, Partials } from 'discord.js';
src/features/pinboard/worker/index.js:2:import { getPinboardConfig, getPinboardPost, deletePinboardPost } from '../data.js';
src/features/pinboard/worker/index.js:3:import { handleReactionChange } from './handleReactionChange.js';
src/features/pinboard/data.js:1:import { query } from '../../../db.js';
```

```console
$ node --input-type=module -e "const m = await import('./src/lib/messages/index.js'); console.log('MESSAGES_FILE', m.MESSAGES_FILE)"
[Messages] file=messages.json messages=62 problems=0
MESSAGES_FILE /home/scott/Projects/GravityBot/messages.json
```

```console
$ grep -n '"node_modules/@discordjs/builders"' -A1 package-lock.json; f=node_modules/@discordjs/builders/dist/index.js; grep -nE '^var (fieldNamePredicate|fieldValuePredicate|authorNamePredicate|buttonLabelValidator|placeholderValidator2|labelValidator|titleValidator) ' $f
25:    "node_modules/@discordjs/builders": {
26-      "version": "1.13.1",
151:var fieldNamePredicate = import_shapeshift.s.string().lengthLessThanOrEqual(256).setValidationEnabled(isValidationEnabled);
152:var fieldValuePredicate = import_shapeshift.s.string().lengthLessThanOrEqual(1024).setValidationEnabled(isValidationEnabled);
165:var authorNamePredicate = fieldNamePredicate.lengthGreaterThanOrEqual(1).nullable().setValidationEnabled(isValidationEnabled);
534:var buttonLabelValidator = import_shapeshift2.s.string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(80).setValidationEnabled(isValidationEnabled);
893:var placeholderValidator2 = import_shapeshift4.s.string().lengthLessThanOrEqual(100).setValidationEnabled(isValidationEnabled);
894:var labelValidator = import_shapeshift4.s.string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(45).setValidationEnabled(isValidationEnabled);
2688:var titleValidator = import_shapeshift8.s.string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(45).setValidationEnabled(isValidationEnabled);
```

```console
$ grep -n 'export async function DiscordRequest' -A22 utils.js | grep -n 'res.ok\|throw'; grep -n 'export async function resetDatabase' -A11 betting.js; grep -n 'export async function withTransaction' -A13 db.js | grep -n 'catch\|ROLLBACK\|throw'
15:17-  // throw API errors
16:18-  if (!res.ok) {
19:21-    throw new Error(JSON.stringify(data));
83:export async function resetDatabase() {
84-    return withTransaction(async (client) => {
85-        try {
86-            await client.query('TRUNCATE TABLE bets CASCADE');
87-            await client.query('TRUNCATE TABLE predictions CASCADE');
88-            await client.query('TRUNCATE TABLE users CASCADE');
89-            return { success: true };
90-        } catch (err) {
91-            return { success: false, error: err.message };
92-        }
93-    });
94-}
8:21-  } catch (err) {
9:22-    await client.query('ROLLBACK');
10:23-    throw err;
```

```console
$ grep -n 'export async function getUserDebug' -A2 betting.js; grep -n 'export async function ensureUser' -A8 betting.js | grep -n 'INSERT'; grep -n 'DEFAULT_THRESHOLD =' src/features/pinboard/data.js; grep -n 'existing && reactionCount === 0\|reactionCount < threshold' src/features/pinboard/worker/handleReactionChange.js; grep -n "on('messageDelete'" -A14 src/features/pinboard/worker/index.js | grep -n 'getPinboardPost\|messages.delete\|deletePinboardPost'
50:export async function getUserDebug(userId, limit = 10) {
51-    await ensureUser(userId);
52-    const balance = await getUserBalance(userId);
3:export const DEFAULT_THRESHOLD = 3;
23:  if (existing && reactionCount === 0) {
28:  if (reactionCount < threshold && !existing) return;
3:36-      const existing = await getPinboardPost(message.id);
11:44-        await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
14:47-      await deletePinboardPost(message.id);
```

```console
$ grep -n '"node_modules/discord.js"' -A1 package-lock.json; grep -n 'ClientReady:' node_modules/discord.js/src/util/Events.js; sed -n 384,401p node_modules/discord.js/src/client/websocket/WebSocketManager.js
515:    "node_modules/discord.js": {
516-      "version": "14.25.1",
111:  ClientReady: 'clientReady',
     * @param {Client} client The client
     */
    if (this.client.emit('ready', this.client) && !deprecationEmitted) {
      deprecationEmitted = true;

      process.emitWarning(
        // eslint-disable-next-line max-len
        'The ready event has been renamed to clientReady to distinguish it from the gateway READY event and will only emit under that name in v15. Please use clientReady instead.',
        'DeprecationWarning',
      );
    }

    /**
     * Emitted when the client becomes ready to start working.
     * @event Client#clientReady
     * @param {Client} client The client
     */
    this.client.emit(Events.ClientReady, this.client);
```

```console
$ git ls-files | xargs grep -ln "pinboard.js'\|/pinboard.js\|from '\./pinboard'" -- 2>/dev/null; echo "modules importing the root pinboard.js: $(git grep -lE "from '(\./|\.\./)+pinboard(\.js)?'" -- '*.js' | wc -l)"; git log --oneline -1 -- pinboard.js
docs/development/02-message-templates/2-design.md
modules importing the root pinboard.js: 0
1458493 Fix forcepin content
```
