# Build 04 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 3 of 5 · signed off
> [← Design](2-design.md) · [State](0-build.md) · Review → · [All builds](../README.md)
<!-- /pipeline:nav -->

<!-- This document describes the build AS IT IS NOW. Rewrite sections when they change; do not
     append corrections below them. History goes in one place: the edit log at the end. -->

## Stack and tooling

<!-- Existing stack: read from docs/project.md and say so. New stack: what was agreed with the
     developer and installed. Then the commands, so the next build does not rediscover them. -->

| Task | Command |
|---|---|
| test | `npm test` (`node --test`) |

The stack is the project's own: Node.js ES modules, discord.js v14, Express, PostgreSQL. No
dependency is added.

## Features

<!-- The design's feature plan, in order. A feature is a thin path through the whole system that
     the developer can run and judge, not a layer. Status: planned, building, in acceptance,
     accepted. -->

| Feature | Requirements | Status |
|---|---|---|
| F1 — Taking pins down (push A, migration, push B) | M3, M4, M5, M6, M7, M8, S1 | accepted live (MC1-MC3), limits recorded below |
| F2 — Admin re-checks | M1, M2 | accepted live (MC4, MC5) |

## Acceptance — requirement by requirement

<!-- The build is accepted against this table, so it grows during the cycles, not at the end.
     Every Must needs a real verdict before sign-off; check fails on blanks and "not yet run".
     Shoulds and Coulds belong here too when built. Demonstrated by: the command, screen or test
     that shows it. -->

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M1 | The reset buttons check the admin list first | `buttons.test.js`: a non-admin on Yes and on Cancel gets the denial, reset never runs, the log line is written. Live (MC4): the developer cancelled a reset prompt | Pass |
| M2 | The resolve form checks the admin list before any read or write | `resolveModal.test.js`: a non-admin gets the denial, neither `getPrediction` nor `resolvePrediction` runs. Live (MC5): `/resolve` submitted for resolved prediction 433 | Pass |
| M3 | A taken-down natural pin stays down | `pinRules.test.js` (banned ignores every count), `handleMessageDeleted.test.js`. Live, by accident: the developer deleted the post of a pre-build forced pin, stored as natural. Log `outcome=ban`, `SELECT` showed `banned`; the developer then removed that row by hand | Pass |
| M4 | A taken-down forced pin is forgotten | Unit tests. Live (MC2): `SELECT` showed the forced row, the post was deleted, the row was gone. Log `outcome=forget` | Pass |
| M5 | A forced pin at the threshold becomes natural | `pinRules.test.js` only (O4) | Pass with a limit: unit test only, as agreed |
| M6 | Forcepin lifts a ban and posts a forced pin | Live (MC2): forcepin wrote `forced`. Unit tests cover `publishOrUpdatePin` and the pin state passed to the upsert | Pass with a limit: lifting a ban over a banned row was not run live, and the `handleForcePin` call has no unit test because `handlers.js` needs env vars |
| M7 | The bot's own removals ban nothing | `helpers.test.js` (row before post), `handleMessageDeleted.test.js`. Live (MC3): source deleted, log `outcome=removePin`, no `ban` line, no row | Pass |
| M8 | The stored change is additive | MC1: 7 rows before, 7 `natural` after. Existing pins kept their state | Pass |
| S1 | One place deletes a pin post and its row | `grep`: `removeFromPinboard` in `helpers.js` is the only caller path; `npm test` passes | Pass |

## Manual checks

<!-- For code behind a seam that cannot be unit tested. The agent runs every command; the
     developer does only what needs a person -- an in-game action, a look at a screen -- and
     reports what they see. Record real results, never "should pass". -->

| # | Check | How | Result |
|---|---|---|---|
| MC1 | Migration adds the column and changes no row (M8) | `/debug sql` count before: 7. Developer ran `npm run migrate` in the Heroku Run console. `SELECT pin_state, COUNT(*) … GROUP BY 1` after | Pass: `natural` 7, the total is unchanged |
| MC2 | A deleted forced pin post removes its row (M4, M6) | Developer forcepinned `1570373856655446047`. `SELECT` showed it `forced` with the other 7 `natural`. Developer deleted the pin post | Pass: row gone, worker log `outcome=forget` |
| MC4 | Reset prompt still cancels for an admin (M1) | Developer ran `/debug reset` and pressed Cancel only | Pass: the reply read as before |
| MC5 | Resolve form still works for an admin, and pays nothing for a resolved prediction (M2) | `/debug sql` found prediction 433 resolved. Developer submitted `/resolve` for 433 | Pass: `❌ This prediction is already resolved`, no announcement |
| MC3 | The bot's own removal bans nothing (M7) | Developer forcepinned a different throwaway post, then deleted its source message | Pass: worker log `messageId=1572232492755460237 … outcome=removePin`, no `ban` line, row gone. The `SELECT` for the forced state of this second post was not taken |

## Feedback and triage

<!-- Every piece of feedback from acceptance testing, and where it went, in caveman rows.
     Actioned now (and how), deferred to the Won't-have list with a destination (W<n>), or a
     requirement changed (amended in 1-requirements.md, set back to proposed until the developer
     re-agrees it). Nothing is built because it was small and you were already there. -->

| Feedback | Decision | Where |
|---|---|---|
| Forced pins made before this build read natural, so deleting one bans it | Known limit of M8: old rows count as natural. Admin can lift it with a forcepin | Known issues |

## How it works

The design is in [2-design.md](2-design.md); this is where to start reading.

**Pinboard.** `pin_state` (natural, forced, banned) lives on `pinboard_posts`. All decisions
are pure functions in `worker/pinRules.js`: `decideReactionOutcome` for 📌 changes and
`decideDeletionOutcome` for deletions. `worker/handleMessageDeleted.js` applies the deletion
outcome and is the only thing both delete listeners call. Start with `pinRules.js`.

The subtle part: the bot cannot tell its own deletions from a person's. `removeFromPinboard`
deletes the row first, so the event for the bot's own post deletion finds no row and does
nothing. Do not reorder those two lines.

A banned row keeps its old `pinboard_message_id`, which names a deleted post. That is
deliberate: the column is `NOT NULL` and no event will name that id again.

Rows from before the build are `natural`, so a pin forced before the build is banned, not
forgotten, when its post is deleted. A forcepin lifts it.

**Admin re-checks.** `denyNonAdmin` in `src/lib/adminDenial.js` writes the log line and the
reply. `handleConfirmReset` and `handleResolveModal` take `isAdmin` as an argument, because
`auth.js` imports `config.js`, which throws without env vars; the registrations pass the real
one. `handleResolveModal` moved to `betting/resolveModal.js` so its test loads no database.

No departure from the design.

<!-- The learning material: the shape of the build, the subtle parts, the parts that look wrong
     but are deliberate, and where to start reading. Link to 2-design.md rather than repeating
     it; record here where the build departed from the design, and why. -->

## Known issues

- A pin force-pinned before this build is stored as natural. Deleting its post bans it instead
  of forgetting it. A forcepin lifts the ban. Not fixable: the old rows hold no forced marker.

<!-- What is known to be wrong now, and whether it blocks acceptance. -->

## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each. The only
     append-only section:
     - **YYYY-MM-DD** — what changed, and why if it is not obvious.
     check requires at least one dated entry before sign-off. -->

- **2026-11-17** — F2 accepted live (MC4, MC5); How it works written; ready for sign-off.
- **2026-11-17** — F2 code and tests: adminDenial, resolveModal moved out of modals.js, both checks first; 215 tests pass.
- **2026-11-17** — F1 code and tests: pinRules, handleMessageDeleted, row-first removal, forcepin writes forced; 206 tests pass.
- **2026-11-17** — dev doc opened; F1 push A committed (migrate column, 1.4.0-alpha).

## Evidence
