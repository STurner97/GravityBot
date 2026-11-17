# Build 04 — Phase 4: Review

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 4 of 5 · awaiting sign-off
> [← Development](3-development.md) · [State](0-build.md) · Publish → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Deployment

The project deploys with `git push origin main` ([docs/project.md](../../project.md)): Heroku
builds `main` and restarts both dynos, `web` (`app.js`) and `worker` (`pinboard-worker.js`). The
build went out in three steps, in the order [2-design.md](2-design.md) R3 set:

| Step | Commit | What it carried |
|---|---|---|
| Push A | `f339249` | `pin_state` in `migrate.js`, version 1.4.0-alpha. Both dynos unchanged in behaviour |
| Migration | — | The developer ran `npm run migrate` in the Heroku dashboard's Run console: 7 rows before, 7 `natural` after (MC1) |
| Push B | `ea3090d` | F1: pin rules, the takedown handler, row-first removal, forcepin writes `forced` |
| F2 push | `7d8ac59` | F2: admin re-checks on the reset buttons and the resolve form. `origin/main` is here |

The commits after `7d8ac59` change documents only. Pushing them redeploys the same code; the
final acceptance runs on that deploy.

**Rolling back.** The column stays in every case. The code before this build names its columns
in every query, so it ignores `pin_state`. Never drop the column: a banned row would lose its ban.

1. **At once:** `heroku releases` lists the releases. `heroku rollback v<N>` to the release
   before push B returns both dynos to 1.3.0-alpha's behaviour (push A changed none). A
   rollback lasts only until the next push to `main`, so follow it with step 2. While rolled
   back, a banned row acts as an ordinary pin and posts again at its next 📌.
2. **For good:** revert the build's code in a new commit and push it, keeping the documents:

   ```sh
   git revert --no-commit ea3090d 7d8ac59
   git checkout HEAD -- docs
   git commit -m "revert build 04 code"
   git push origin main
   ```

   F2 alone is `git revert 7d8ac59`. Push A's `migrate.js` statement is left in, because it
   matches the live schema.

## Documents checked against reality

| Document | Matches | Corrected |
|---|---|---|
| [0-build.md](0-build.md) | Yes, up to development | Review line added to *What changed* |
| [1-requirements.md](1-requirements.md) | Yes. Every row describes what was built or deferred | W7-W11 added for the issues review found outside scope |
| [2-design.md](2-design.md) | Yes in the code: every part in its tables exists with the name, file and behaviour given, and both decision tables match `pinRules.js` line for line. Two gaps: F1's tests listed a unit test that forcepin writes `forced`, never written; R7 had the M7 check re-forcepin the same message, where a second throwaway message was used | Both rewritten to what was done |
| [3-development.md](3-development.md) | Mostly. M8's acceptance asks that the next real 📌 change updates its post as before; that was not watched, yet M8 read Pass. *How it works* said "no departure from the design", missing the forcepin test. Form: template prompts left in, MC3 after MC5, edit log newest first | M8 is Pass with a limit, covered by FA2. The departure named. Prompts removed, rows in id order, log oldest first |

## Requirements met

| # | Requirement | At development | Now | Owed to publish |
|---|---|---|---|---|
| M1 | The reset buttons check `ADMIN_IDS` first | Pass | Pass | — |
| M2 | The resolve form checks `ADMIN_IDS` before any read or write | Pass | Pass | — |
| M3 | A taken-down natural pin stays down | Pass | Pass | — |
| M4 | A taken-down forced pin is forgotten | Pass | Pass | — |
| M5 | A forced pin at the threshold becomes natural | Pass with a limit (unit test only, O4) | Pass with a limit: unit test only. Live needs friends' 📌 up to the threshold | — |
| M6 | Forcepin lifts a ban and posts a forced pin | Pass with a limit (lifting a ban not run live) | Pass with a limit: lifting a ban not run live | — |
| M7 | The bot's own removals ban nothing | Pass | Pass | — |
| M8 | The stored change is additive; existing pins update as before | Pass (corrected in review to Pass with a limit) | Pass with a limit: an existing pin updating after push B not seen | — |
| S1 | One place deletes a pin post and its row | Pass | Pass: `removeFromPinboard` is the only code that deletes a pin post; 215 tests pass | — |

## Existing documentation brought up to date

| Document | What was out of date | Fixed |
|---|---|---|
| [README.md](../../../README.md) | Directory tree lacked `adminDenial.js`, `resolveModal.js`, `pinRules.js`, `handleMessageDeleted.js`; the worker "handles emoji reactions"; nothing said how a pin comes down or what forcepin now also does; `pinboard_posts` lacked `pin_state`; the migration's note named only `CREATE TABLE IF NOT EXISTS` and not that it runs by hand | Tree and descriptions updated. The pinboard section says how pins go up and come down, forced against natural, the ban and its lift, and the `/debug sql` cleanup for deletions the worker missed (W3). `pin_state` row and meanings added. Migration runs by hand from the Run console |
| [CLAUDE.md](../../../CLAUDE.md) | The admin-check rule did not say that buttons and forms an admin command opens check again, nor how to deny | Says both: each re-checks, denies with `denyNonAdmin`, gets `isAdmin` passed in from `index.js` |
| [docs/project.md](../../project.md) | Nothing: stack, test and deploy unchanged | — |
| Code comments | None describe behaviour that moved. `removeFromPinboard`'s comment gives the reason for its order | — |

No binding decision is recorded. The admin re-check rule is a convention and now lives in
CLAUDE.md, where conventions are kept.

## Issues found in review

| Issue | Evidence | Size | Outcome |
|---|---|---|---|
| I1 — A forced pin's heading shows "1 Pin" whatever its count. O2 keeps the forced heading below the threshold, so at 2 📌 (threshold 3) the post still reads "📌 1 Pin (forced)" | `messages.json` `pinboard.post.forcedHeading` is the fixed text `"📌 1 Pin (forced)"` with no `{count}`. `pinboardEmbed.js` uses it whenever `forced` is true; `decideReactionOutcome` keeps a forced row forced at every count below the threshold | Outside scope: the agreed behaviour (O2) is built. The fix is a wording choice for the developer | Proposed: build 05, with the other message values (W7) |
| I2 — Six admin checks written before this build deny without logging, while CLAUDE.md asks for a log at every permission denial. Only the two new checks log | `grep -A2 "isAdmin("`: `debug/handlers.js`, `debug/modals.js`, `pinboard/handlers.js` and three in `betting/handlers.js` return `ephemeral(messageText(…))`; only `debug/buttons.js` and `betting/resolveModal.js` call `denyNonAdmin` | Outside scope: handlers this build did not touch | Proposed: a later build (W8) |
| I3 — No unit test shows forcepin writes `forced`. The design planned one | `handleForcePin` is in `pinboard/handlers.js`, which imports `config.js` and `utils.js`. Shown live in MC2 | Outside scope: a test gap in a handler that needs moving first | Proposed: a later build that touches forcepin (W9) |
| I4 — `/pinboard forcepin`'s description says "(for testing)". It is now also how a ban is lifted | `pinboard/commands.js:53` | Outside scope: the fix registers the slash commands again | Proposed: build 05 (W10) |
| I5 — A forcepin on a message already on the board posts a second copy and leaves the first behind | [2-design.md](2-design.md) R5, unchanged by this build. Deleting the orphan matches no row, so it does nothing | Outside scope: today's behaviour | Proposed: a later build that touches forcepin (W11) |

## Final acceptance

Planned for the reviewed commit. The developer waived all three on 2026-11-17 and accepted the
review without running them, so none is verified live. Review changed documents only, and the
code is the accepted `e9af5c0`, live since `7d8ac59`. The checks stay here as written, for
whoever wants to clear M6's and M8's limits later. FA2 would change a live pin's count and put
it back. FA3 runs on throwaway messages only. `/debug reset` is not run.

| # | Check | How | Result |
|---|---|---|---|
| FA1 | Both dynos boot on the reviewed commit | Heroku log after the push: `[Messages] … problems=0` from web and worker, the worker's login line | Waived by the developer: not run |
| FA2 | An existing pin updates as before (M8's limit) | The developer adds 📌 to a message already on the board that they did not write: the post's count goes up by one with the ordinary heading. Then removes it: the count goes back | Waived by the developer: not run |
| FA3 | A natural pin taken down stays down, and forcepin lifts the ban (M3 live on purpose, M6's limit) | On a throwaway message: forcepin; `UPDATE` its one row to `natural`, standing in for the threshold; delete the pin post (log `outcome=ban`, row `banned`); 📌 on the source posts nothing; forcepin again (row `forced`, forced heading); delete the post (log `outcome=forget`, no row) | Waived by the developer: not run |

## What this build retired

Removed, as the design predicted:

- The copy of `removeFromPinboard`'s body in the `MessageDelete` listener (I2 of build 03, S1).
  Both delete listeners are now one call to `handleMessageDeleted`.
- `handleResolveModal` moved out of `modals.js`, with `modals.js`'s `resolvePrediction` import.
- The rewrite of a forced post as an ordinary post at its first 📌 change (O2).
- The `/debug sql` takedown workaround, for every deletion the worker sees. It stays in the
  README for deletions it missed (W3).

Not predicted, and removed: `worker/index.js`'s data imports, and the two copies of the upsert
call in `publishOrUpdatePin`, now one `savePin`. Nothing predicted survived.

## Next steps

What is waiting, from this build and earlier ones:

- **W5**: values inside messages becoming settings (default credits, beg limit, donate amounts,
  pin threshold). The configuration build, planned since build 02.
- **W6**: the betting checks never run live (Next across a resolve, "too rich to beg", the
  no-winners and no-refunds announcements).
- **W7 (I1)**: the forced heading's count.
- **W10 (I4)**: forcepin's description.
- **W8 (I2)**: every admin denial logged through `denyNonAdmin`.
- **W9 (I3)** and **W11 (I5)**: forcepin out of `handlers.js` with a unit test, and no second
  copy of a pin already on the board.

Recommended order:

1. **Build 05 — configuration (W5), standard,** carrying W6, W7 and W10. It is the build
   agreed since build 02, and the unknown with the most reach: every value that becomes a
   setting shows in `messages.json` as a placeholder. W7 and W10 are wording, and W10 needs the
   commands registered again, which a configuration build that adds settings commands does
   anyway.
2. **Build 06 — forcepin and admin denials (W8, W9, W11), small.** No risk was found in any
   of them: W8 is logging, W9 a test, W11 an old behaviour nobody has hit. Moving
   `handleForcePin` to its own file (W9) is the step that makes W11 testable, so they go
   together.

## Edit log

- **2026-11-17** — review drafted: deployment and rollback, documents checked, README and CLAUDE.md updated, I1-I5 found, final acceptance planned.
- **2026-11-17** — developer waived FA1-FA3, not run; M6 and M8 keep their limits.

## Evidence
