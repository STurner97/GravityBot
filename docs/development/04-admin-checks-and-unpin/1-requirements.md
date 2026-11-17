# Build 04 — Phase 1: Requirements

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 1 of 5 · signed off
> [State](0-build.md) · [Design →](2-design.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## The problem

Build 03's review found two problems, both outside that build's scope
([4-review.md](../03-remaining-wording/4-review.md), I1 and I4).

**Two admin-only actions trust an earlier check (I1).** `/debug reset` asks for confirmation
with a button, and `/resolve` opens a form. The commands check `ADMIN_IDS`; the button and the
form submit do not check again before they write. The reset button truncates every table, and
the resolve submit pays out every bet on a prediction, so these are the two most destructive
actions the bot has. Each is reached only from a reply or form Discord showed the admin, so the
exposure is low. Whether Discord refuses a crafted interaction from anyone else has not been
verified. Either way, CLAUDE.md asks for the check at the top of every admin-only handler,
before any read or write, and these two break that rule.

**Nobody can take a pin down (I4).** The pinboard posts a message once it gets enough 📌, and
an admin can force one on with `/pinboard forcepin`. Nothing takes a pin off. Deleting the pin
post by hand leaves its `pinboard_posts` row behind, and the next 📌 added or removed on the
source message posts it again, even below the threshold. Today the only real takedown is to
delete the post and then remove the row with hand-typed SQL in `/debug sql`. The developer's
first need is to undo a forcepin: forcepin is documented "for testing", and a test pin has
nowhere to go.

The database does not record whether a pin was forced. Only the post's wording says so, and
the first 📌 change on the source message rewrites the post as an ordinary pin. The rules
below need the difference stored.

Build 03's review also found that the worker's message-delete listener repeats the body of
`removeFromPinboard` (I2). This build rewrites that listener anyway.

### Why this build, and why now

Build 03's review chose this order with the developer. I1 is the one risk found: a gap in the
project's own security rule. I4 needs a requirements choice, made in this phase. I2 sits in the
same listener as I4. One build costs one set of phases, not two. Configuration follows as
build 05.

## Scope

A **natural pin** is one whose 📌 count reached the pinboard threshold. A **forced pin** is one
made by `/pinboard forcepin` whose 📌 count has not reached the threshold. To **take a pin
down** is to delete its post in the pinboard channel, by hand, in Discord.

### Must have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| M1 | The `/debug reset` confirm buttons check `ADMIN_IDS` for the person who clicked, before anything else. Someone not on the list gets the `denied.admin` reply, the reset does not run, and the denial is logged | Unit test: a non-admin click, on either Yes or Cancel, gets the denial, never calls the reset, and logs it. Live: the developer opens the reset prompt and cancels it, and the reply reads as before. A real reset is never run | 2026-11-14 |
| M2 | The `/resolve` form submit checks `ADMIN_IDS` for the person who submitted it, before any read or write. Someone not on the list gets the `denied.admin` reply, nothing is paid out, and the denial is logged | Unit test: a non-admin submit gets the denial, never reads the prediction or resolves it, and logs it. Live: a check that resolves no real prediction, chosen in design (R7) | 2026-11-14 |
| M3 | Taking down a natural pin keeps it down: later 📌 added or removed on the source message never post it again | Unit test: after its post is deleted, 📌 changes on the source post nothing. Live, as design plans it (R7), without taking down a pin the developer has not chosen | 2026-11-14 |
| M4 | Taking down a forced pin undoes the forcepin: its row is removed and the message is ordinary again, so 📌 reaching the threshold pins it as usual, and forcepin can force it again | Live: the developer force-pins a throwaway message of their own, deletes the pin post, and a `/debug sql` `SELECT` shows no row for it. Unit test: 📌 below the threshold then posts nothing | 2026-11-14 |
| M5 | A forced pin whose 📌 count reaches the threshold becomes a natural pin, so M3 applies to it | Unit test | 2026-11-14 |
| M6 | `/pinboard forcepin` on a message that was taken down posts it as a forced pin and lifts the ban, so taking that post down then follows M4 | Unit test. Live only if design finds a safe way (R7) | 2026-11-14 |
| M7 | Only a pin post deleted from the pinboard channel takes a pin down. The bot's own removals keep today's behaviour: a pin whose 📌 drop to zero, and a pin whose source message is deleted, lose their post and row, and nothing is banned | Unit tests for both removals. Live: the forced pin from M4's check is cleared by its post being deleted, not by the bot | 2026-11-14 |
| M8 | The stored change to `pinboard_posts` is additive: no existing row is changed or lost, and every pin already on the board keeps updating as before. Rows made before this build count as natural pins | `migrate.js` run once against the live database, said aloud first, after a count of `pinboard_posts`; the same count after; the next real 📌 change updates its post as before | 2026-11-14 |

### Should have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| S1 | The worker's message-delete handling reuses `removeFromPinboard` (or its replacement), not a copy of its body | Read the code: one place deletes a pin post and its row. `npm test` passes | 2026-11-14 |

### Could have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|

### Won't have — in this build

| # | Deferred | Where it goes |
|---|---|---|
| W1 | An unpin command | Dropped: deleting the pin post is the way to take a pin down (developer, 2026-11-14) |
| W2 | A command to lift a ban, such as `/pinboard allow` | Dropped: `/pinboard forcepin` lifts a ban (M6) |
| W3 | Pin posts deleted before this build is deployed, or while the worker is offline | Not handled: the worker cannot see a deletion it missed. Such a row behaves as today. An admin removes it once with the `/debug sql` workaround in build 03's release notes |
| W4 | Limiting who can take a pin down to `ADMIN_IDS` | Not planned: Discord's own permission to delete messages in the pinboard channel decides it. The worker is not told who deleted a message |
| W5 | Values inside messages becoming settings: default credits, beg limit, donate amounts, pin threshold (build 03's W4) | Build 05, configuration |
| W6 | The betting checks that have never run live: Next across a resolve, "too rich to beg", the no-winners and no-refunds announcements (build 03's W7) | Build 05, which touches the betting values they exercise. M2 adds a check to the resolve form and changes nothing after it |
| W7 | A forced pin's heading showing its real 📌 count: it reads "📌 1 Pin (forced)" whatever the count (review I1) | Build 05, with the other message values |
| W8 | The six admin checks written before this build (`/debug`, `/pinboard`, `/resolve`, `/voidprediction`, `/changebalance`, and the SQL form) logging their denials through `denyNonAdmin` (review I2) | A later build that touches those handlers |
| W9 | A unit test that forcepin writes `forced`: `handleForcePin` would move out of `handlers.js` with its data functions passed in (review I3) | A later build that touches forcepin |
| W10 | `/pinboard forcepin`'s description, "Force pin a message (for testing)", naming its other use: bringing back a taken-down pin (review I4) | Build 05, with the slash commands registered again |
| W11 | A forcepin on a message already on the board posting a second copy, the first left behind ([2-design.md](2-design.md) R5, review I5) | A later build that touches forcepin |

## Decisions taken in this phase

- Size is standard and the build is numbered 04, as build 03's review agreed with the developer.
- Deleting the pin post is the only way to take a pin down. There is no unpin command (W1).
- Forced and natural pins behave differently when taken down: a forced pin returns to ordinary
  (M4), a natural pin is banned (M3). The developer's need is to undo a forcepin, and a pin the
  server earned and an admin removed should not come back on its own.
- A forced pin becomes natural once its 📌 reach the threshold (M5). Otherwise it would re-post
  at the next 📌 change, already over the threshold.
- Forcepin overrides a ban, and that is the only undo (M6, W2).
- Only deletions the worker sees after the deploy count (W3). A missing post keeps its current
  meaning, so `/pinboard setchannel` still moves pins to the new channel as they change.
- The two re-checks reuse `denied.admin`, as build 03 reused it for debug and pinboard.

## Research for the design phase

| # | Question | What it settles |
|---|---|---|
| R1 | What the worker receives when a message in the pinboard channel is deleted: an uncached message carries only its id and channel. Whether `MessageBulkDelete` (a purge of several posts) arrives too. And how a deleted message is matched to a row by `pinboard_message_id`, which no query looks up today | M3, M4 and M7's trigger, and the new query in `data.js` |
| R2 | How the worker tells its own deletion from a person's. `removeFromPinboard` deletes the post, then the row, so the delete event for the bot's own removal may arrive before the row is gone. Whether removing or marking the row before deleting the post settles it | M7, with no ban on the bot's own removals |
| R3 | The stored shape: which column or columns record forced and taken-down, their defaults for existing rows, the `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in `migrate.js`, and how it reaches Heroku. The Procfile has no release step, so `npm run migrate` runs by hand. Whether it must run before or after the push, and what each dyno does in between | M8, and the order of the deploy steps |
| R4 | How `handleReactionChange` treats each kind of row: a banned row posts nothing and survives 📌 falling to zero. A forced row turns natural at the threshold. Today a forced row is rewritten as ordinary at the first 📌 change, and removed at zero | M3, M5, M7 |
| R5 | How forcepin writes its row today (it upserts with a count of 1), and how it marks the row forced and clears a ban | M4, M6 |
| R6 | How `handleConfirmReset` and `handleResolveModal` get the admin check while staying testable. `isAdmin` imports `config.js`, so it is passed in, as `reset` already is. And the denial's log line | M1, M2 |
| R7 | A live acceptance plan under the live-data rule. A forcepin of a throwaway message posts publicly in the pinboard channel, so how long it stays up and what friends see. How to see a natural pin and its ban live without friends' 📌 or a change to the live threshold, or whether those stay unit-tested only. A live check of M2 that resolves no real prediction. The `/debug sql` `SELECT`s that show a row's state | The acceptance column of M2, M3, M4, M6 and M7 |

## Edit log

- **2026-11-14** — first draft from build 03 candidates W10-W12 and developer answers: delete-post
  takedown, forced undo vs natural ban, forcepin lifts ban, forced turns natural at threshold,
  only new deletions; W11 as Should; all rows proposed.
- **2026-11-14** — developer agreed M1-M8, S1, W1-W6 via /pipeline-signoff, as drafted.
- **2026-11-17** — review: W7-W11 added for issues outside scope, destinations proposed.
