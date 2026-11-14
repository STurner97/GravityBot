# Build 04 — Phase 2: Design

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 2 of 5 · awaiting sign-off
> [← Requirements](1-requirements.md) · [State](0-build.md) · Development → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Part 1 — Research

Each topic from [1-requirements.md](1-requirements.md), what settled it, and the answer. The
quoted commands and output are under [Evidence](#evidence), in the order below.

### R1 — What the worker receives when a pin post is deleted

The worker runs discord.js 14.25.1 with `Partials.Message` and `Partials.Channel` on. With a
partial enabled, discord.js builds a partial object instead of dropping the event
(`getPayload`). So `MessageDelete` fires for every deleted message in a channel the worker can
see, cached or not, and the message carries its `id` and `channelId`. Pin posts the worker sent
before its last restart are not cached, and they still arrive.

A purge of several messages arrives as `MessageBulkDelete` instead, with a collection of
partial messages, as long as the channel is cached. Guild text channels are cached by the
`Guilds` intent, which the worker has. The bulk messages are built with `cache: false`, so they
carry ids only, which is all the takedown needs.

No query looks a row up by `pinboard_message_id` today. One new query finds every row whose
`message_id` or `pinboard_message_id` is the deleted id. It returns rows, not a row: if the
pinboard channel is itself whitelisted, a pin post can be the source of another pin.

The table is small (one row per pin ever made), so the lookup needs no index. One can be added
later without changing any code.

### R2 — Telling the bot's own deletion from a person's

`removeFromPinboard` deletes the post, then the row. With that order, the delete event for the
bot's own removal can arrive while the row still exists, and would be read as a person taking
the pin down.

Reversing the order settles it: the row is deleted first and awaited, and only then is the post
deleted. Discord cannot report a deletion before the bot asks for it, so by the time the event
arrives, no row names that post and the event does nothing. This holds whether or not Discord
sends the bot events for its own deletions, so the design does not depend on that.

A post deleted by a person always still has its row when the event arrives, because nothing
else removes the row first.

### R3 — The stored shape and the deploy order

One column, `pin_state`, records what a row is: `natural`, `forced` or `banned`. The three are
exclusive, and a banned pin is only ever a natural one taken down, so one column with a check
constraint makes impossible combinations (forced and banned) unstorable. Two booleans would
allow them.

```sql
ALTER TABLE pinboard_posts
  ADD COLUMN IF NOT EXISTS pin_state TEXT NOT NULL DEFAULT 'natural'
  CHECK (pin_state IN ('natural', 'forced', 'banned'));
```

PostgreSQL returns a constant default for every existing row without rewriting the table, so
every row made before this build reads as `natural` (M8), and no row's values change.

**Deploy order.** Every query on `pinboard_posts` names its columns, so the code running today
ignores a new column, and its inserts take the default. New code that reads `pin_state` fails
until the column exists. So the column goes in first:

1. **Push A**: `migrate.js` with the new statement, and the version stamp. Nothing else changes,
   so both dynos run today's behaviour.
2. **The migration**, run once by hand (`npm run migrate`; the Procfile has no release step). On
   Heroku a one-off dyno runs the code already deployed, which is why push A comes first.
3. **Push B**: the code that uses `pin_state`.

Between any two steps, both dynos work. A push restarts both dynos; a pin post deleted in the
seconds the worker is down is not seen (W3).

The migration's other statements are all `IF NOT EXISTS` or guarded, so running it again
changes nothing. How the developer runs it is open question O1.

### R4 — How each kind of row reacts to 📌

A pure function decides, from the row, the count and the threshold:

| Row | Count | Outcome |
|---|---|---|
| banned | any | Nothing. The row stays, even at zero (M3) |
| natural or forced | zero | Bot removes post and row, bans nothing (M7) |
| none | below threshold | Nothing |
| none | at or above threshold | Post, as `natural` |
| forced | above zero, below threshold | Update post, stays `forced` |
| natural or forced | at or above threshold | Update post, becomes or stays `natural` (M5) |
| natural | above zero, below threshold | Update post, stays `natural` (as today) |

A forced pin whose 📌 go from one back to zero is removed by the bot, as today. M7 keeps that
behaviour; it is named here because it means a single 📌 added and removed clears a forced
pin.

Today the first 📌 change rewrites a forced post as an ordinary one. With the state stored, the
post can keep the forced heading until the pin turns natural. Open question O2.

### R5 — Forcepin

Forcepin builds its own post and upserts the row with a count of 1. It will pass
`pin_state: 'forced'`, and the upsert sets `pin_state` on conflict as well as on insert. A
banned row is overwritten with `forced` and the new post's id, which lifts the ban (M6).

Forcepin on a message that is already on the board posts a second copy and points the row at
it, as today. The first copy is left with no row, so deleting it does nothing. That is
existing behaviour this build does not change.

### R6 — The admin checks, testably

`isAdmin` imports `config.js`, which throws without the production environment variables, so a
test cannot import it. Both handlers take it as a dependency, the way `handleConfirmReset`
already takes `reset`, and the registration passes the real one.

`handleResolveModal` sits in `modals.js`, which imports `betting.js` and so the database. It
moves to its own file, `resolveModal.js`, taking `isAdmin`, `getPrediction` and
`resolvePrediction` as dependencies, so its test loads no database. `modals.js` keeps the other
two forms.

Nothing in the codebase logs a denial today. A small shared helper logs the line and returns
the `denied.admin` reply, so the two checks cannot drift apart:

```
[Debug] userId=<id> action=confirmReset denied=notAdmin
[Betting] userId=<id> predictionId=<id> action=resolve denied=notAdmin
```

### R7 — A live acceptance plan under the live-data rule

- **M1.** Nobody else can click an admin's ephemeral reset prompt, so the denial is
  unit-tested only. Live, the developer opens the prompt and presses Cancel. A real reset is
  never run.
- **M2.** `/resolve` opens the form for any prediction that exists, resolved or not.
  `resolvePrediction` refuses an already-resolved prediction before its first write. So the
  developer submits the form for an already-resolved prediction and gets "❌ This prediction is
  already resolved": the submit passed the check and reached the read, and nothing changed.
  Which prediction to use is open question O3.
- **M4, M7.** The developer force-pins a throwaway message of their own. It is public in the
  pinboard channel for about a minute. A `/debug sql` `SELECT` shows it `forced`, the developer
  deletes the post, and the `SELECT` shows no row. Then the developer force-pins it again and
  deletes the source message: the bot removes post and row, and nothing is banned.
- **M3, M5, M6.** Seeing a natural pin live needs one: the threshold's worth of 📌 from people
  other than the author. Open question O4 offers a reversible loop on a pin the developer
  chooses, or unit tests only.
- **M8.** `/debug sql` counts rows before push A, and counts them by `pin_state` after the
  migration.

The `SELECT`s, all read-only:

```sql
SELECT count(*) FROM pinboard_posts;
SELECT pin_state, count(*) FROM pinboard_posts GROUP BY pin_state;
SELECT message_id, pinboard_message_id, pin_state FROM pinboard_posts WHERE message_id = '<id>';
```

## Part 2 — The design

### Core functionality

Two admin-only actions check `ADMIN_IDS` again at the point they write: the reset prompt's
buttons, and the `/resolve` form submit. Anyone not on the list gets the usual "admins only"
reply, and the denial is logged.

The pinboard learns the difference between a pin the server earned and one an admin forced.
An admin takes a pin down by deleting its post in the pinboard channel:

- a **forced** pin is forgotten, so the message is ordinary again;
- a **natural** pin is banned, and 📌 never brings it back;
- **forcepin** brings back a banned pin as a forced one.

A forced pin whose 📌 reach the threshold becomes natural. The bot's own removals (📌 down to
zero, source message deleted) work as today and ban nothing.

### Technical integration / back end

The stack is the project's own and binding: Node.js ES modules, discord.js v14, Express,
PostgreSQL. No new dependency.

The pattern follows the codebase: pure decisions in their own files with unit tests, thin
adapters around Discord and the database, and dependencies passed in where a test needs to
replace them.

**Pinboard: new and changed parts**

| Part | File | What it does |
|---|---|---|
| `PIN_STATE` | `pinboard/data.js` | The three state names, as constants |
| `findPinboardPostsByAnyMessageId(id)` | `pinboard/data.js` | Rows whose source or post is `id` |
| `markPinboardPostBanned(messageId)` | `pinboard/data.js` | Sets `pin_state` to `banned` |
| `upsertPinboardPost({ …, pinState })` | `pinboard/data.js` | Writes `pin_state` on insert and conflict |
| `decideReactionOutcome({ row, reactionCount, threshold })` | `worker/pinRules.js` | R4's table, pure |
| `decideDeletionOutcome(deletedId, row)` | `worker/pinRules.js` | `removePin`, `forget`, `ban` or `nothing`, pure |
| `handleReactionChange` | `worker/handleReactionChange.js` | Acts on the reaction outcome |
| `handleMessageDeleted(client, deletedId, deps)` | `worker/handleMessageDeleted.js` | Acts on each row's deletion outcome |
| `removeFromPinboard` | `worker/helpers.js` | Row first, then post (R2) |
| `publishOrUpdatePin(…, pinState)` | `worker/helpers.js` | Writes the state; forced heading per O2 |
| Listeners | `worker/index.js` | `MessageDelete` and `MessageBulkDelete` both call `handleMessageDeleted` |
| `handleForcePin` | `pinboard/handlers.js` | Writes `forced` |

`decideDeletionOutcome` compares the deleted id with the row:

| The deleted id is the row's | Row state | Outcome |
|---|---|---|
| source message | any | `removePin`: row, then post, as today (M7) |
| pin post | `forced` | `forget`: delete the row (M4) |
| pin post | `natural` | `ban`: mark the row `banned` (M3) |
| pin post | `banned` | `nothing` |

Each outcome is logged with the message ids, for example
`[Pinboard] messageId=<id> pinboardMessageId=<id> action=takedown outcome=ban`.

**Admin re-checks: new and changed parts**

| Part | File | What it does |
|---|---|---|
| `denyNonAdmin({ tag, action, userId, fields, text })` | `src/lib/adminDenial.js` | Logs R6's line, returns the `denied.admin` reply |
| `handleConfirmReset(interaction, { reset, isAdmin, text })` | `debug/buttons.js` | Checks first, on Yes and Cancel |
| `handleResolveModal(interaction, { isAdmin, getPrediction, resolvePrediction, text })` | `betting/resolveModal.js` | Moved from `modals.js`; checks first |
| Registrations | `debug/index.js`, `betting/index.js` | Pass the real `isAdmin` and data functions |

`adminDenial.js` imports only `response.js` and the messages module, so tests can load it.

### Data

`pinboard_posts` gains one column, `pin_state TEXT NOT NULL DEFAULT 'natural'`, checked to be
`natural`, `forced` or `banned` (R3). No other table changes.

| State | Written by | Meaning |
|---|---|---|
| `natural` | the default; the worker when a pin reaches the threshold | Earned, or older than this build |
| `forced` | forcepin | Forced, below the threshold |
| `banned` | the worker, when a person deletes a natural pin's post | Off the board for good, unless forced |

A banned row keeps its old `pinboard_message_id`, which names a deleted post. The column is
`NOT NULL`, and the id is harmless: no event will name it again.

**On upgrade:** push A, the migration, push B (R3). Existing rows read `natural` and keep
updating as before. Before the migration, the developer counts rows; after it, the count by
state must give the same total, all `natural`.

**On rollback:** reverting push B leaves the column, which today's code ignores. A banned row
would then act as an ordinary pin again and re-post at the next 📌 change, which is today's
behaviour for a deleted post. The column itself is never dropped.

### How each requirement is met

| # | Satisfied by |
|---|---|
| M1 | `handleConfirmReset` calls `isAdmin` first, for Yes and Cancel, and returns `denyNonAdmin`'s reply |
| M2 | `handleResolveModal`, in `resolveModal.js`, calls `isAdmin` before `getPrediction` |
| M3 | `decideDeletionOutcome` → `ban`; `decideReactionOutcome` ignores a banned row |
| M4 | `decideDeletionOutcome` → `forget` deletes a forced row; a later 📌 is treated as a new message |
| M5 | `decideReactionOutcome` writes `natural` once the count reaches the threshold |
| M6 | `handleForcePin` upserts `forced`, overwriting `banned` |
| M7 | `removeFromPinboard` deletes the row before the post (R2); source deletion → `removePin` |
| M8 | One additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS` with default `natural`; deploy order in R3 |
| S1 | `handleMessageDeleted` calls `removeFromPinboard`; the copy in `worker/index.js` goes |

### Feature plan

Takedown goes first: it holds both seams unit tests cannot see, the live database migration and
Discord's delete events. The admin re-checks are web-dyno only and low risk.

| Feature | Requirements | Tests first | Accepted by |
|---|---|---|---|
| F1 — Taking pins down | M3, M4, M5, M6, M7, M8, S1 | `pinRules.test.js`: every row of R4's table and of the deletion table. `handleMessageDeleted.test.js` with fake data and client: forced → row gone; natural → banned; source → `removeFromPinboard`; bulk ids each handled; no row → nothing. `helpers.test.js`: `removeFromPinboard` deletes the row before calling Discord; `publishOrUpdatePin` passes the state through. Forcepin's upsert carries `forced` | Push A and migration: counts before and after (M8). Push B: the forced-pin checks of R7 (M4, M7), the natural-pin loop if O4 chooses it (M3, M5, M6), and an existing pin updating at its next 📌 change (M8) |
| F2 — Admin re-checks | M1, M2 | `buttons.test.js`: a non-admin on Yes and on Cancel gets the denial, `reset` is never called, and the line is logged; admins as before. `resolveModal.test.js`: a non-admin gets the denial and neither `getPrediction` nor `resolvePrediction` is called; an admin goes through. `adminDenial.test.js`: the reply and the log line | One push. The developer cancels a reset prompt; submits `/resolve` for the prediction O3 names and reads "already resolved" |

The version is stamped in `package.json` in push A, so every acceptance runs 1.4.0-alpha.

### Manual checks

The adapters stay thin, so what is left to check by hand is Discord's side and Heroku's:

| Check | Adapter | How |
|---|---|---|
| A deleted pin post reaches `handleMessageDeleted` | `MessageDelete` listener | F1's forced-pin check: the row goes when the post is deleted |
| The bot's own removal bans nothing | `removeFromPinboard`'s order | F1: deleting the forced pin's source; the log shows `removePin` and no `ban` line |
| A purge of several posts is handled | `MessageBulkDelete` listener | Not exercised live: a purge needs a bot or tool the server does not use. Unit-tested through `handleMessageDeleted`; the listener is one line |
| Forcepin writes `forced` | `handleForcePin` | F1's `SELECT` after a forcepin |
| The migration runs on Heroku | `migrate.js` | F1's counts before and after |
| A non-admin is denied | Both handlers | Not exercisable live: nobody else can use an admin's ephemeral prompt or form. Unit-tested |

### What this build retires

- The copy of `removeFromPinboard`'s body in the `MessageDelete` listener (I2, S1). The listener
  becomes one call.
- `handleResolveModal` leaves `modals.js` for its own file. This is a move, not a deletion.
- The `/debug sql` takedown workaround in build 03's release notes, for any deletion after this
  build is live. It stays documented for posts deleted before (W3).
- If O2 chooses it, the rewrite of a forced post as an ordinary one at its first 📌 change.

The README's pinboard section and table list are updated in review to name `pin_state` and the
takedown.

### Version

| | |
|---|---|
| Target version | 1.4.0-alpha |
| Stage | alpha |
| Previous version | 1.3.0-alpha |
| Why this number | Taking pins down is new behaviour, so MINOR goes up. The stage stays alpha: configuration (build 05) is still to come, and the roadmap is not full |

## Edit log

- **2026-11-14** — research R1-R7 with evidence; design, F1 takedown then F2 admin re-checks;
  1.4.0-alpha; O1-O4 open.

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
