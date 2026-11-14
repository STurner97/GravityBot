# Build 03 — Phase 4: Review

<!-- pipeline:nav -->
> **Build 03 — Pinboard, debug and channel-denial messages from the template file** · Phase 4 of 5 · awaiting sign-off
> [← Development](3-development.md) · [State](0-build.md) · Publish → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Deployment

The project deploys with `git push origin main` ([docs/project.md](../../project.md)): Heroku
builds `main` and restarts both dynos, `web` (`app.js`) and `worker` (`pinboard-worker.js`), on
the new slug. The developer pushed each feature as it was built:

| Commit | What it carried | Heroku release |
|---|---|---|
| `2f3f938`, `6f3677b` | F1: the pin post from the file, `reportFailures`, `clientReady` | before v73 |
| `ca9e434` | F2: debug text from the file, generic reset error | v73 |
| `052a49b` | F3: pinboard replies, generic forcepin error, channel denial | v74 |
| `0c65dc3` | F4: length check, root `pinboard.js` deleted | v75, live since 2026-11-14 22:11 |

The commits after `0c65dc3` change documents and one code comment only. Pushing them redeploys
the same code; the final acceptance runs on that deploy.

There is no schema change and no stored data holds wording, so nothing needs migrating either
way. The code before this build is exactly `v1.2.0-alpha` (`git diff v1.2.0-alpha 0272ba5`
outside `docs/` is empty).

**Rolling back:**

1. **At once:** `heroku releases` lists the releases. `heroku rollback v<N>` returns both dynos
   to release N: v74 undoes F4, v73 undoes F3 as well, and the release before F1's deploy runs
   `v1.2.0-alpha`'s code. A rollback lasts only until the next push to `main`, which deploys
   `main` again, so follow it with step 2.
2. **For good:** revert the build's code in a new commit and push it, keeping the documents:

   ```sh
   git revert --no-commit 2f3f938..0c65dc3
   git checkout HEAD -- docs
   git commit -m "revert build 03 code"
   git push origin main
   ```

   One feature alone can be undone the same way with `git revert` of its commit.

## Documents checked against reality

| Document | Matches | Corrected |
|---|---|---|
| [0-build.md](0-build.md) | Yes, up to development | Review line added to *What changed* |
| [1-requirements.md](1-requirements.md) | Yes. Every row describes what was built or deferred | W10 and W11 added for the two issues review found outside scope |
| [2-design.md](2-design.md) | Mostly. Module table, messages, retirements, feature plan and version all match the code. Three gaps: `handleConfirmReset` was sketched with `reset = resetDatabase` as a default, but built with `reset` required; the placeholder limit was written `TEXT_LIMITS.inputPlaceholder`, built as `.max`; decision 4 said the denial *is* checked live, but it was accepted unexercised | All three rewritten to what was built |
| [3-development.md](3-development.md) | Yes in substance. Form: acceptance and manual-check rows out of id order, F1.1 had five cells in a four-column table and quoted the old `messages=66`, M8's cell still said "Live start: not yet run", feedback table empty with its template prompt left in, two bullets on `SUBCOMMANDS` | Rewritten into current-state form: rows in id order, cells fixed, feedback rows filled, prompts removed, known issues point here |

## Requirements met

| # | Requirement | At development | Now | Owed to publish |
|---|---|---|---|---|
| M1 | Every pinboard, debug and router message comes from `messages.json` | Pass | Pass: search repeated in review (no reply, label, title or placeholder literal left in the three features); 181 tests pass | — |
| M2 | Every moved message reads exactly as on `11f4e9e` | Pass with a limit (F3 wording and a brand-new pin not seen live) | Pass: F3 wording seen live in FA2, FA3, FA4, FA6, and a brand-new pin in FA7 | — |
| M3 | The worker reads the same file and checks it at startup | Pass | Pass | — |
| M4 | A broken pin message fails only that post; the worker keeps running | Pass (unit) | Pass (unit). Not run live by design: it would mean deploying a broken file | — |
| M5 | `npm test` fails on a message too long for where it is shown | Pass | Pass | — |
| M6 | `/debug reset` shows a generic error on failure | Pass (unit) | Pass (unit). Never run live: a real reset empties every table | — |
| M7 | `/pinboard forcepin` shows a generic error on failure | Pass | Pass | — |
| M8 | The unused root `pinboard.js` is deleted | Pass | Pass | — |
| S1 | The worker listens for `clientReady` | Pass | Pass | — |

## Existing documentation brought up to date

| Document | What was out of date | Fixed |
|---|---|---|
| [CLAUDE.md](../../../CLAUDE.md) | Said `pinboard.js` owns pinboard logic; said `messages.json` holds only the betting text and that debug and pinboard text stays in code (build 02's W11); no word on `shownAs` | Pinboard logic is `src/features/pinboard/`. `messages.json` holds every user-visible text; builders take `text`; wording test per feature; `shownAs` rule and its blind spot; what stays in code (logs, command definitions, router JSON errors, SQL table layout) |
| [README.md](../../../README.md) | Directory tree lacked the seven new modules; `messages.json` described as betting only; *How to add a feature* said debug and pinboard write inline text; *Changing the wording* said the length limits are not checked and wording tests live only in `betting/` | Tree updated; the file covers every message and both processes read it; the limits and the `shownAs` and `LONGEST_VALUES` steps for adding a message; a broken pin message posts nothing |
| `src/lib/messages/fixtures/referenceMessages.js` | Comment said the reference is the wording of `cb1f8a5` only | Says betting is as at `cb1f8a5`, the rest as at `11f4e9e` |
| [docs/project.md](../../project.md) | Nothing: stack, test and deploy unchanged | — |

No binding decision is recorded: the rules this build set (every text in the file, `shownAs` on
limited places) are project conventions and now live in CLAUDE.md, where conventions are kept.

## Issues found in review

| Issue | Evidence | Size | Outcome |
|---|---|---|---|
| I1 — Two admin-only follow-ups do not re-check `ADMIN_IDS` before writing. The `/debug reset` confirm button truncates every table, and the `/resolve` form submit pays out, on the strength of the command having checked. CLAUDE.md asks for the check at the top of every admin-only handler, before any read or write | `isAdmin` is called in `debug/handlers.js`, `debug/modals.js`, `pinboard/handlers.js` and `betting/handlers.js` only. `debug/buttons.js` (`handleConfirmReset`) and `betting/modals.js:83` (`handleResolveModal`) have none. Both are the same at `11f4e9e`. Each is reached only from a reply or form Discord showed the admin; whether Discord refuses a crafted interaction from anyone else is not verified | Outside scope: the reset handler's check predates this build, which changed only its error reply, and betting was not touched. Low exposure, high cost if reached | Build 04, with I2 and I4 (W10). The developer agreed |
| I2 — The worker's message-delete listener repeats `removeFromPinboard`'s body: fetch the channel, delete the post, delete the row | `worker/index.js`'s `MessageDelete` listener and `worker/helpers.js` `removeFromPinboard`; the same at `11f4e9e`. This build only wrapped it in `reportFailures` | Outside scope: a DRY cleanup with no change in behaviour | Build 04, with I1 and I4 (W11). The developer agreed |
| I3 — During final acceptance, `/pinboard` and `/debug` gave Discord's "The application did not respond" while `/balance` worked | No app log line appeared for the failures, though the router logs every error. The reviewed commit, run locally through the real router, answered forcepin `not a link` in 0 ms. Re-adding the bot to the server made both commands work again. The exact cause on Discord's side is not proven | Not a code defect: Discord's integration for the server | Resolved by re-adding the bot. No change. If it recurs, re-add the bot before looking at the code |
| I4 — There is no way to take a pin down. Deleting the post by hand leaves its `pinboard_posts` row, and the next 📌 added or removed on the source message posts it again, even below the threshold | The worker's delete listener looks the row up by `message_id`, the source message's id (`data.js` `getPinboardPost`), so deleting the pin post itself matches nothing. `handleReactionChange` skips only when `reactionCount < threshold && !existing`, so a stale row re-posts at one reaction; at zero it deletes the row. The same at `11f4e9e` | Outside scope: new behaviour (an unpin command, or cleanup when a pin post is deleted) | Build 04, with I1 and I2 (W12). The developer agreed. Until then, the workaround under *Next steps* |

## Final acceptance

On the reviewed commit, after the developer pushes it. Every step below only reads, except
FA6, which runs an insert that changes no row. `/debug reset` is not run.

| # | Check | How | Result |
|---|---|---|---|
| FA1 | Both dynos boot on the reviewed commit | Heroku log after the push: `[Messages] file=messages.json messages=114 problems=0` from web and worker, the worker's login line, no `DeprecationWarning` | Pass: `origin/main` at `21406ef`; build succeeded 2026-11-14 22:23, web and worker both `messages=114 problems=0`, worker logged in as GravityBot#7124, no warning |
| FA2 | `/pinboard whitelist_list` reads as before (F3.1, never live) | The developer runs it: the pinboard channel line, a blank line, "Whitelisted channels:", then each channel | Pass: developer ran it after re-adding the bot (I3) |
| FA3 | Forcepin's format error (F3.3, never live) | `/pinboard forcepin message_url: not a link` gives `❌ Invalid message URL format…`; nothing posted | Pass |
| FA4 | The channel denial (F3.5, never live) | `/balance` in a channel not on `ALLOWED_CHANNEL_IDS` gives `❌ This bot can only be used in specific channels.` | Pass |
| FA5 | The bet form's options placeholder (`buildOptionsPlaceholder`'s limit now from `TEXT_LIMITS`) | `/bet <id>` on an active prediction: the form opens and its placeholder lists the options. Close it without submitting | Pass |
| FA6 | `whitelist_add` on a channel already listed (F3.2, never live) | `/pinboard whitelist_add` with a channel the FA2 list already shows: "✅ Added … to the pinboard whitelist."; `ON CONFLICT DO NOTHING` leaves the table as it was | Pass: reply as expected, no row changed |
| FA7 | A brand-new pin (M2's limit: the worker's `send` path) | The developer looks in the pinboard channel for a pin first posted after 2026-11-13: it reads "📌 N Pins" and "Posted by" as before | Pass: developer saw a new pin read as before |

## What this build retired

Everything the design predicted was removed:

- The root `pinboard.js`, which nothing imported.
- About 70 string literals in `pinboard/` and `debug/`, and `router.js`'s channel denial.
- The worker's three copied `try/catch` listener blocks, now one `reportFailures`.
- Forcepin's `author.name = '📌 1 Pin (forced)'` overwrite, now `buildPinboardEmbed({ forced: true })`.
- `resetDatabase`'s inner `try/catch` and its `{ success, error }` result.
- The unused `resetDatabase` import in `debug/handlers.js`.
- The bare `100` in `buildOptionsPlaceholder`.
- `buildPinboardEmbed` in `data.js`, which now holds only SQL.
- CLAUDE.md's "Debug and pinboard text stays in code" and its `pinboard.js` mention.

Nothing predicted survived. Not predicted, and still there: the three `max_length: 100`
literals in `buildModals.js`, which limit what a user types rather than any message, and the
duplication in I2.

## Next steps

What is waiting, from this build and earlier ones:

- **W10 (I1)**: the admin re-check on the reset button and the resolve form.
- **W4**: values inside messages becoming settings (default credits, beg limit, donate
  amounts, pin threshold). Planned as the configuration build since build 02.
- **W7**: the betting checks never run live (Next across a resolve, "too rich to beg", the
  no-winners and no-refunds announcements). Goes with whichever build next touches betting.
- **W11 (I2)**: the delete listener's duplication.
- **W12 (I4)**: a way to take a pin down. Until it exists, an admin deletes the pin post, then
  removes its row with `/debug sql`:
  `DELETE FROM pinboard_posts WHERE message_id = '<source message id>'`, after a `SELECT` with
  the same `WHERE` shows the one row. Without the row deleted, the pin comes back at the next
  📌 on the source message.

Order, agreed with the developer:

1. **Build 04 — admin re-checks and taking pins down (W10, W11, W12), standard.** W10 is the
   one risk found: a gap in the project's own security rule, on the two most destructive
   actions the bot has. W12 is new behaviour and needs a requirements choice first (an unpin
   command, the worker clearing the row when a pin post is deleted, or both). W11 sits in the
   same delete listener as W12. One build costs one set of phases instead of two; the price is
   that W10 waits for W12's design, accepted because its exposure is low. `isAdmin` imports
   `config.js`, so the handlers will need it passed in, the way `reset` is, to stay testable.
2. **Build 05 — configuration (W4), standard,** carrying W7, since configuration touches the
   betting values those checks exercise. Every message now sits in the file, so the values that
   become settings show there as placeholders, which makes the inventory easy.

## Edit log

- **2026-11-14** — review drafted: deployment and rollback, documents checked, CLAUDE.md and README updated, I1 and I2 found, final acceptance planned.
- **2026-11-14** — FA1 passed on `21406ef`. I3: admin commands not reaching app, fixed by re-adding bot.
- **2026-11-14** — FA2-FA7 passed; M2 now Pass. I4 (no way to take a pin down) found, W12.
- **2026-11-14** — developer agreed: I1, I2, I4 all to build 04; configuration moves to build 05.

## Evidence
