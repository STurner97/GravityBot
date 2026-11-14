# Build 04 — Phase 2: Design

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 2 of 5 · awaiting sign-off
> [← Requirements](1-requirements.md) · [State](0-build.md) · Development → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Part 1 — Research

This part gives each topic from [1-requirements.md](1-requirements.md), the data that settled
it, and the answer. [Evidence](#evidence) quotes the commands and their output, in the order
below.

### R1 — What the worker receives when a pin post is deleted

The worker runs discord.js 14.25.1 with `Partials.Message` and `Partials.Channel` on. When a
partial is on, discord.js makes a partial object and does not drop the event (`getPayload`).
Thus `MessageDelete` fires for every deleted message in a channel that the worker can see. The
message can be in the cache or not. The event message carries its `id` and `channelId`. The
cache does not hold pin posts that the worker sent before its last restart, but their delete
events still arrive.

A purge of several messages arrives as one `MessageBulkDelete` event. The event carries a
collection of partial messages. discord.js sends it only when the channel is in the cache. The
`Guilds` intent puts guild text channels in the cache, and the worker has that intent.
discord.js makes the bulk messages with `cache: false`. They carry only their ids, and the
takedown needs only the ids.

Today, no query finds a row by its `pinboard_message_id`. One new query finds every row whose
`message_id` or `pinboard_message_id` is the deleted id. The query returns a list of rows, not
one row. The reason: if the pinboard channel is itself on the whitelist, a pin post can be the
source of a different pin.

The table is small, with one row for each pin that the bot ever made. Thus the lookup needs no
index. A later build can add an index with no change to the code.

### R2 — Telling the bot's own deletion from a person's

Today, `removeFromPinboard` deletes the post first and the row second. With that order, the
delete event for the bot's own removal can arrive while the row still exists. The worker
would then read the event as a person who took the pin down.

The fix is to reverse the order. The worker deletes the row first and waits for the database.
Only then does it delete the post. Discord cannot report a deletion before the bot asks for
it. Thus, when the event arrives, no row names that post, and the event does nothing. This is
true whether or not Discord sends the bot events for its own deletions. The design does not
depend on that behaviour.

When a person deletes a post, the row always still exists when the event arrives. Nothing else
deletes the row first.

### R3 — The stored shape and the deploy order

One column, `pin_state`, records the kind of each row: `natural`, `forced` or `banned`. Only
one of the three can be true at a time. A banned pin is always a natural pin that a person
took down. One column with a check constraint makes it impossible to store a row that is both
forced and banned. Two booleans would let the database store that row.

```sql
ALTER TABLE pinboard_posts
  ADD COLUMN IF NOT EXISTS pin_state TEXT NOT NULL DEFAULT 'natural'
  CHECK (pin_state IN ('natural', 'forced', 'banned'));
```

PostgreSQL gives a constant default to every existing row and does not rewrite the table.
Thus every row from before this build reads as `natural` (M8). The statement changes no
value in any row.

**Deploy order.** Every query on `pinboard_posts` names its columns. Thus the code that runs
today ignores a new column, and its inserts get the default. New code that reads `pin_state`
fails until the column exists. For that reason, the column goes in first:

1. **Push A**: `migrate.js` with the new statement, and the version stamp. Nothing else
   changes. Both dynos keep today's behaviour.
2. **The migration**: the developer runs `npm run migrate` one time, by hand. The Procfile has
   no release step. On Heroku, a one-off dyno runs the code that is already deployed. That is
   why push A comes first.
3. **Push B**: the code that uses `pin_state`.

Between any two steps, both dynos work. A push restarts both dynos. If a person deletes a pin
post in the seconds while the worker is down, the worker does not see it (W3).

The other statements in the migration all use `IF NOT EXISTS` or a guard. Thus a second run
changes nothing. The developer runs the migration from the Run console in the Heroku dashboard
(O1). The database URL stays on Heroku.

### R4 — How each kind of row reacts to 📌

A pure function makes the decision from the row, the count and the threshold:

| Row | Count | Outcome |
|---|---|---|
| banned | any | Nothing. The row stays, also at zero (M3) |
| natural or forced | zero | The bot deletes the post and the row. It bans nothing (M7) |
| none | below threshold | Nothing |
| none | at or above threshold | Post, as `natural` |
| forced | above zero, below threshold | Update the post. The row stays `forced` |
| natural or forced | at or above threshold | Update the post. The row becomes or stays `natural` (M5) |
| natural | above zero, below threshold | Update the post. The row stays `natural` (as today) |

When the 📌 on a forced pin go from one back to zero, the bot deletes the pin, as it does
today. M7 keeps that behaviour. This section names it because of one result: if a person adds
one 📌 and then takes it away, the forced pin goes.

Today, the first 📌 change rewrites a forced post as an ordinary post. When the database
stores the state, the post can keep the forced heading until the pin becomes natural. Then the
post shows the ordinary heading with the count (O2).

### R5 — Forcepin

Forcepin makes its own post and writes the row with an upsert and a count of 1. It will send
`pin_state: 'forced'`. The upsert sets `pin_state` on a conflict and on an insert. A forcepin
on a banned row writes `forced` and the id of the new post over the old values. This lifts the
ban (M6).

A forcepin on a message that is already on the board posts a second copy, and the row then
points to the second copy. This is today's behaviour. No row points to the first copy, so a
deletion of the first copy does nothing. This build does not change that behaviour.

### R6 — The admin checks, testably

`isAdmin` imports `config.js`. `config.js` throws an error when the production environment
variables are missing. Thus a test cannot import `isAdmin`. Both handlers get `isAdmin` as a
dependency, as `handleConfirmReset` already gets `reset`. The registration gives the real
function.

`handleResolveModal` is in `modals.js`, and `modals.js` imports `betting.js`, which loads the
database. The handler moves to its own file, `resolveModal.js`. It gets `isAdmin`,
`getPrediction` and `resolvePrediction` as dependencies. Thus its test loads no database.
`modals.js` keeps the other two forms.

Today, no code in the codebase logs a denial. A small shared helper writes the log line and
returns the `denied.admin` reply. Because both checks use the helper, they cannot drift apart:

```
[Debug] userId=<id> action=confirmReset denied=notAdmin
[Betting] userId=<id> predictionId=<id> action=resolve denied=notAdmin
```

### R7 — A live acceptance plan under the live-data rule

- **M1.** No other person can click an ephemeral reset prompt that an admin sees. Thus only a
  unit test proves the denial. Live, the developer opens the prompt and clicks Cancel. Nobody
  runs a real reset.
- **M2.** `/resolve` opens the form for any prediction that exists, resolved or not.
  `resolvePrediction` refuses an already-resolved prediction before its first write. The
  developer submits the form for an already-resolved prediction. The reply is "❌ This
  prediction is already resolved". This proves that the submit passed the check and got to the
  read. No data changed. The developer selects the prediction at that time (O3).
- **M4, M7.** The developer force-pins a throwaway message of their own. The pin is public in
  the pinboard channel for approximately one minute. A `/debug sql` `SELECT` shows the row as
  `forced`. The developer deletes the post, and the `SELECT` then shows no row. Next, the
  developer force-pins the message again and deletes the source message. The bot deletes the
  post and the row, and it bans nothing.
- **M3, M5, M6.** A live check of a natural pin needs a natural pin. That needs as many 📌 as
  the threshold, from persons other than the author. The developer does not touch a natural pin
  live. Only unit tests prove these three (O4). The live check on the throwaway message still
  shows the forcepin part of M6.
- **M8.** `/debug sql` counts the rows before push A. After the migration, it counts the rows
  for each `pin_state`.

The `SELECT`s. All of them only read data:

```sql
SELECT count(*) FROM pinboard_posts;
SELECT pin_state, count(*) FROM pinboard_posts GROUP BY pin_state;
SELECT message_id, pinboard_message_id, pin_state FROM pinboard_posts WHERE message_id = '<id>';
```

## Part 2 — The design

### Core functionality

Two admin-only actions check `ADMIN_IDS` again at the point where they write. The first is the
pair of buttons on the reset prompt. The second is the `/resolve` form submit. A person who is
not on the list gets the usual "admins only" reply, and the bot logs the denial.

The pinboard learns the difference between a pin that the server earned and a pin that an
admin forced. An admin takes a pin down when they delete its post in the pinboard channel:

- The bot forgets a **forced** pin. The message is then an ordinary message again.
- The bot bans a **natural** pin. No 📌 brings it back.
- **Forcepin** brings back a banned pin as a forced pin.

A forced pin becomes natural when its 📌 reach the threshold. The bot's own removals work as
today and ban nothing. The bot deletes the post and row of a pin when its 📌 go down to zero,
and when a person deletes its source message.

### Technical integration / back end

The stack is the project's own stack, and it is binding: Node.js ES modules, discord.js v14,
Express, PostgreSQL. The build adds no dependency.

The pattern follows the codebase:

- Pure decisions go in their own files, with unit tests.
- Thin adapters sit around Discord and the database.
- A handler gets a dependency as an argument where a test must replace it.

**Pinboard: new and changed parts**

| Part | File | What it does |
|---|---|---|
| `PIN_STATE` | `pinboard/data.js` | The three state names, as constants |
| `findPinboardPostsByAnyMessageId(id)` | `pinboard/data.js` | Finds the rows whose source or post is `id` |
| `markPinboardPostBanned(messageId)` | `pinboard/data.js` | Sets `pin_state` to `banned` |
| `upsertPinboardPost({ …, pinState })` | `pinboard/data.js` | Writes `pin_state` on an insert and on a conflict |
| `decideReactionOutcome({ row, reactionCount, threshold })` | `worker/pinRules.js` | The table in R4, as a pure function |
| `decideDeletionOutcome(deletedId, row)` | `worker/pinRules.js` | Returns `removePin`, `forget`, `ban` or `nothing`. Pure |
| `handleReactionChange` | `worker/handleReactionChange.js` | Does the reaction outcome |
| `handleMessageDeleted(client, deletedId, deps)` | `worker/handleMessageDeleted.js` | Does the deletion outcome for each row |
| `removeFromPinboard` | `worker/helpers.js` | Deletes the row first, then the post (R2) |
| `publishOrUpdatePin(…, pinState)` | `worker/helpers.js` | Writes the state. Shows the forced heading while the row is `forced` (O2) |
| Listeners | `worker/index.js` | `MessageDelete` and `MessageBulkDelete` both call `handleMessageDeleted` |
| `handleForcePin` | `pinboard/handlers.js` | Writes `forced` |

`decideDeletionOutcome` compares the deleted id with the row:

| The deleted id is the row's | Row state | Outcome |
|---|---|---|
| source message | any | `removePin`: delete the row, then the post, as today (M7) |
| pin post | `forced` | `forget`: delete the row (M4) |
| pin post | `natural` | `ban`: set the row to `banned` (M3) |
| pin post | `banned` | `nothing` |

The worker logs each outcome with the message ids. For example:
`[Pinboard] messageId=<id> pinboardMessageId=<id> action=takedown outcome=ban`.

**Admin re-checks: new and changed parts**

| Part | File | What it does |
|---|---|---|
| `denyNonAdmin({ tag, action, userId, fields, text })` | `src/lib/adminDenial.js` | Writes the log line from R6. Returns the `denied.admin` reply |
| `handleConfirmReset(interaction, { reset, isAdmin, text })` | `debug/buttons.js` | Checks first, on Yes and on Cancel |
| `handleResolveModal(interaction, { isAdmin, getPrediction, resolvePrediction, text })` | `betting/resolveModal.js` | Moves from `modals.js`. Checks first |
| Registrations | `debug/index.js`, `betting/index.js` | Give the real `isAdmin` and data functions |

`adminDenial.js` imports only `response.js` and the messages module. Thus tests can load it.

### Data

`pinboard_posts` gets one new column, `pin_state TEXT NOT NULL DEFAULT 'natural'`. A check
constraint permits only `natural`, `forced` or `banned` (R3). No other table changes.

| State | Written by | Meaning |
|---|---|---|
| `natural` | The default. Also the worker, when a pin reaches the threshold | The server earned the pin, or the pin is older than this build |
| `forced` | Forcepin | An admin forced the pin, and it is below the threshold |
| `banned` | The worker, when a person deletes the post of a natural pin | The pin stays off the board, until a forcepin |

A banned row keeps its old `pinboard_message_id`, which names a deleted post. The column is
`NOT NULL`. The old id causes no problem, because no event will name it again.

**On upgrade:** push A, then the migration, then push B (R3). Existing rows read `natural`
and update as before. Before the migration, the developer counts the rows. After the
migration, the counts for each state must add up to the same total, and all rows must be
`natural`.

**On rollback:** a revert of push B leaves the column, and today's code ignores it. A banned
row would then act as an ordinary pin again. It would post again at the next 📌 change. That
is today's behaviour for a deleted post. Nobody drops the column.

### How each requirement is met

| # | Satisfied by |
|---|---|
| M1 | `handleConfirmReset` calls `isAdmin` first, for Yes and for Cancel. On a denial it returns the reply from `denyNonAdmin` |
| M2 | `handleResolveModal`, in `resolveModal.js`, calls `isAdmin` before `getPrediction` |
| M3 | `decideDeletionOutcome` returns `ban`. `decideReactionOutcome` ignores a banned row |
| M4 | `decideDeletionOutcome` returns `forget`, and the worker deletes the forced row. A later 📌 sees a new message |
| M5 | `decideReactionOutcome` writes `natural` when the count reaches the threshold |
| M6 | `handleForcePin` writes `forced` with an upsert, over `banned` |
| M7 | `removeFromPinboard` deletes the row before the post (R2). A source deletion returns `removePin` |
| M8 | One additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, with the default `natural`. R3 gives the deploy order |
| S1 | `handleMessageDeleted` calls `removeFromPinboard`. The copy in `worker/index.js` goes |

### Feature plan

Takedown comes first. It holds both seams that unit tests cannot see: the migration of the
live database, and the delete events from Discord. The admin re-checks run only on the web
dyno, and their risk is low.

| Feature | Requirements | Tests first | Accepted by |
|---|---|---|---|
| F1 — Taking pins down | M3, M4, M5, M6, M7, M8, S1 | `pinRules.test.js`: every row of the table in R4, and every row of the deletion table. `handleMessageDeleted.test.js`, with fake data and a fake client: a forced row goes. A natural row becomes banned. A source deletion calls `removeFromPinboard`. Each id in a bulk deletion gets its own outcome. No row means nothing happens. `helpers.test.js`: `removeFromPinboard` deletes the row before it calls Discord. `publishOrUpdatePin` sends the state to the upsert. The upsert from forcepin carries `forced` | Push A and the migration: counts before and after (M8). Push B: the forced-pin checks in R7 (M4, M7, and the forcepin part of M6). An existing pin updates at its next 📌 change (M8). Only unit tests prove M3 and M5 (O4) |
| F2 — Admin re-checks | M1, M2 | `buttons.test.js`: a non-admin on Yes and on Cancel gets the denial. `reset` never runs, and the log has the line. Admins get the same result as before. `resolveModal.test.js`: a non-admin gets the denial. Neither `getPrediction` nor `resolvePrediction` runs. An admin goes through. `adminDenial.test.js`: the reply and the log line | One push. The developer cancels a reset prompt. Then the developer submits `/resolve` for an already-resolved prediction of their choice, and reads "already resolved" |

Push A stamps the version in `package.json`. Thus every acceptance runs 1.4.0-alpha.

### Manual checks

The adapters stay thin. What remains to check by hand is on the side of Discord and Heroku:

| Check | Adapter | How |
|---|---|---|
| A deleted pin post gets to `handleMessageDeleted` | `MessageDelete` listener | The forced-pin check in F1: the row goes when the developer deletes the post |
| The bot's own removal bans nothing | The order in `removeFromPinboard` | F1: the developer deletes the source of the forced pin. The log shows `removePin` and no `ban` line |
| The worker handles a purge of several posts | `MessageBulkDelete` listener | Not done live. A purge needs a bot or a tool that the server does not use. Unit tests cover it through `handleMessageDeleted`, and the listener is one line |
| Forcepin writes `forced` | `handleForcePin` | The `SELECT` in F1 after a forcepin |
| A deleted natural post becomes banned | `MessageDelete` listener | Not done live (O4), because it would take down a real pin. F1's forced-pin check uses the same listener path |
| The migration runs on Heroku | `migrate.js` | The counts before and after, in F1 |
| The bot denies a non-admin | Both handlers | Not possible live. No other person can use an ephemeral prompt or form that an admin sees. Unit tests cover it |

### What this build retires

- The copy of the body of `removeFromPinboard` in the `MessageDelete` listener (I2, S1). The
  listener becomes one call.
- `handleResolveModal` moves from `modals.js` to its own file. This is a move, not a deletion.
- The `/debug sql` takedown workaround in the release notes of build 03, for each deletion
  after this build goes live. The workaround stays in the notes for posts deleted before (W3).
- The rewrite of a forced post as an ordinary post at its first 📌 change (O2).

In review, the agent updates the pinboard section and the table list in the README to name
`pin_state` and the takedown.

### Version

| | |
|---|---|
| Target version | 1.4.0-alpha |
| Stage | alpha |
| Previous version | 1.3.0-alpha |
| Why this number | Taking pins down is new behaviour, so MINOR goes up. The stage stays alpha. Configuration (build 05) is still to come, and the roadmap is not full |

## Edit log

- **2026-11-14** — research R1-R7 with evidence. Design: F1 takedown, then F2 admin re-checks.
  1.4.0-alpha. O1-O4 open.
- **2026-11-14** — O1-O4 answered: Run console, forced heading kept, resolve test picked live,
  natural pins unit-tested only.
- **2026-11-14** — prose rewritten in plain technical English (STE style). No design change.

## Evidence

```console
$ node -e "import('discord.js').then(d=>console.log('discord.js', d.version))"; grep -n 'partials\|Partials\.' src/features/pinboard/worker/index.js
discord.js 14.25.1
18:    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
```

```console
$ sed -n '1,30p' node_modules/discord.js/src/client/actions/MessageDelete.js
'use strict';

const Action = require('./Action');
const Events = require('../../util/Events');

class MessageDeleteAction extends Action {
  handle(data) {
    const client = this.client;
    const channel = this.getChannel({ id: data.channel_id, ...('guild_id' in data && { guild_id: data.guild_id }) });
    let message;
    if (channel) {
      if (!channel.isTextBased()) return {};

      if (channel.isThread()) channel.messageCount--;

      message = this.getMessage(data, channel);
      if (message) {
        channel.messages.cache.delete(message.id);
        /**
         * Emitted whenever a message is deleted.
         * @event Client#messageDelete
         * @param {Message} message The deleted message
         */
        client.emit(Events.MessageDelete, message);
      }
    }

    return { message };
  }
}
```

```console
$ grep -n -A3 'getPayload(data, manager' node_modules/discord.js/src/client/actions/Action.js
28:  getPayload(data, manager, id, partialType, cache) {
29-    return this.client.options.partials.includes(partialType) ? manager._add(data, cache) : manager.cache.get(id);
30-  }
31-
```

```console
$ grep -n 'client.channels.cache.get\|false,\|client.emit' node_modules/discord.js/src/client/actions/MessageDeleteBulk.js
10:    const channel = client.channels.cache.get(data.channel_id);
26:          false,
40:      if (messages.size > 0) client.emit(Events.MessageBulkDelete, messages, channel);
```

```console
$ grep -n 'removeFromPinboard' -A6 src/features/pinboard/worker/helpers.js | grep -n 'delete'
4:101-    await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
6:103-  await deletePinboardPost(messageId);
```

```console
$ curl -s https://www.postgresql.org/docs/current/sql-altertable.html | sed 's/<[^>]*>//g' | grep -i 'non-volatile DEFAULT is specified'
    When a column is added with ADD COLUMN and a non-volatile DEFAULT is specified, the default value is evaluated at the time of the statement and the result stored in the table's metadata, where it will be returned when any existing rows are accessed. The value will be only applied when the table is rewritten, making the ALTER TABLE very fast even on large tables. If no column constraints are specified, NULL is used as the DEFAULT. In neither case is a rewrite of the table required.
```

```console
$ grep -n 'SELECT\|INSERT INTO pinboard_posts' src/features/pinboard/data.js
12:    'SELECT target_channel_id, threshold, emoji FROM pinboard_config WHERE id = 1'
39:    'SELECT channel_id FROM pinboard_whitelist ORDER BY channel_id ASC'
60:    `SELECT message_id, source_channel_id, pinboard_message_id, author_id, reaction_count
70:    `INSERT INTO pinboard_posts (message_id, source_channel_id, pinboard_message_id, author_id, reaction_count)
```

```console
$ cat Procfile; grep -n '"migrate"' package.json
web: node app.js
worker: node pinboard-worker.js
17:    "migrate": "node migrate.js",
```

```console
$ grep -n -A12 'export async function handleResolve(' src/features/betting/handlers.js | grep -n 'resolved\|getPrediction\|buildResolveModal'; grep -n 'alreadyResolved\|UPDATE predictions' betting.js | head -3
9:96-  const prediction = await getPrediction(predictionId);
224:            return { success: false, error: { code: 'alreadyResolved' } };
288:            return { success: false, error: { code: 'alreadyResolved' } };
311:            'UPDATE predictions SET resolved = TRUE, outcome = $2 WHERE id = $1',
```

```console
$ grep -n 'import' src/features/betting/modals.js src/lib/auth.js; grep -n 'throw' src/config.js
src/features/betting/modals.js:1:import {
src/features/betting/modals.js:7:import { ephemeral, public_ } from '../../lib/response.js';
src/features/betting/modals.js:8:import { messageText } from '../../lib/messages/index.js';
src/features/betting/modals.js:9:import { decode } from '../../lib/customId.js';
src/features/betting/modals.js:10:import { bettingErrorReply } from './bettingErrorReply.js';
src/features/betting/modals.js:11:import { formatOptionList } from './formatOptionList.js';
src/lib/auth.js:1:import { ADMIN_IDS } from '../config.js';
2:// Required vars are validated at startup — the process throws immediately if any are missing.
9:    throw new Error(`Missing required environment variable: ${key}`);
```

```console
$ grep -rn 'console.*denied\|denied.*console' src || echo 'no denial is logged anywhere'
no denial is logged anywhere
```
