# Build 01 — Phase 4: Review

<!-- pipeline:nav -->
> **Build 01 — List all active predictions** · Phase 4 of 5 · signed off
> [← Development](3-development.md) · [State](0-build.md) · [Publish →](5-publish.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Deployment

Heroku deploys `main` from GitHub on every push (`deploy` fact: `git push origin main`). The
developer pushes. Nothing in this build changes the database, so a deploy and a rollback are
code-only.

| What | Where | State |
|---|---|---|
| Accepted commit `5cb255c` and the docs sign-off `d087672` | Heroku `web` dyno, via `main` | Deployed 2026-11-02 |
| Developer's layout change `7c74d0b` (after sign-off) | Heroku, via `main` | Deployed: live before review began |
| `b29e82a` (capitals), review fix `cbc49ea`, review documents `1bc04c2` | Heroku, via `main` | Deployed 2026-11-03 |
| Developer's final bets line `1135e21`: `N bet(s), totalling 💰 N Credits` | Heroku, via `main` | Deployed 2026-11-03; the code under final acceptance |

**Rolling back.** The build's first code commit is `d1a0781`. To return the bot to the old
public, capped `/predictions` while keeping the build's documents:
`git restore --source=d1a0781^ --staged --worktree -- src package.json`, commit, and push;
Heroku redeploys the result. `git restore` removes the files the build added under `src/`,
because it does not overlay by default. A faster stopgap is Heroku's own release rollback (`heroku rollback`, or Roll
back on the dashboard's Activity tab), which redeploys the previous release without touching
git; `main` must then be reverted too, or the next push brings the build back. No data needs
restoring either way.

## Documents checked against reality

| Document | Matches | Corrected |
|---|---|---|
| [0-build.md](0-build.md) | Yes, except `next` and the post-sign-off change | `next`, phase, and a *what changed* line for the layout change |
| [1-requirements.md](1-requirements.md) | No: M5 named a created time and a `💰 Total` line the live bot no longer shows | M5 amended to the built layout and set to proposed for the developer to re-agree; W5 and the pot decision reworded |
| [2-design.md](2-design.md) | Mostly. Missing `loadPredictionsPage.js`, the builder's `pageIndex`/`pageCount`, and named a `src/lib/format.js` that the review deleted | Module table, mockup, M5 row, F2 tests, retires list, Node and deploy wording |
| [3-development.md](3-development.md) | Yes for what was accepted; its "departures" note was stale | M5 row, feedback row for the post-sign-off change, How it works |
| [docs/project.md](../../project.md) | Yes: test, deploy and publish facts all current | Nothing |

## Requirements met

| # | Requirement | At development | Now | Owed to publish |
|---|---|---|---|---|
| M1 | Every active prediction reachable | Pass | Pass | — |
| M2 | 5 a page, Previous/Next edit the same message | Pass | Pass | — |
| M3 | Bet button on every entry opens the bet modal | Pass | Pass | — |
| M4 | List visible only to the invoker | Pass with a limit | Pass with a limit: "Only you can see this" seen; no second account checked | — |
| M5 | ID, question, options, bets count and total; newest first | Pass | Pass, on the amended layout | — |
| M6 | One page, no paging buttons at 5 or fewer | Pass | Pass | — |
| M7 | Every page within 2000 characters; long entries shortened | Pass | Pass: the budget is measured from the new layout, unit tests green | — |
| S1 | Page size in `config.js`, Discord limits in `discordLimits.js` | Pass | Pass | — |
| C1 | Layout defined in one place | Pass | Pass: the developer changed the layout by editing only `predictionsListFormat.js` | — |

Publish owes nothing beyond its usual push and tag: the bot is installed by deploying, and the
deploy is already the acceptance environment.

## Existing documentation brought up to date

| Document | What was out of date | Fixed |
|---|---|---|
| [README.md](../../../README.md) | `/predictions` row said only "List active predictions with bet buttons" | Now: every active prediction, privately, 5 to a page, Previous/Next |
| [README.md](../../../README.md) | Directory tree lacked the build's files | Added `discordLimits.js`, `loadPredictionsPage.js`, `predictionsList.js`, `predictionsListFormat.js`; `updateMessage` in `response.js`; paging in `buttons.js` |
| [README.md](../../../README.md) | No way to run the tests | New *Tests* section: `npm test`, Node 20 or later |
| `src/features/betting/predictionsListFormat.js` | A commented-out Created line and an unused `formatTimestamp` import | Removed (git keeps the old line) |
| Build documents | Departures and history threaded through the text | Rewritten into current-state form; history in each edit log |

## Issues found in review

| Issue | Evidence | Size | Outcome |
|---|---|---|---|
| I1 — Code changed after the accepted commit, and the live bot no longer met M5 as agreed | `git diff d087672 HEAD`: `7c74d0b` and `b29e82a` commented out the `🕒 Created` line and reworded the bets line. `7c74d0b` was already live | Small: a requirement change, no design question | Developer chose to keep the new layout. M5 amended to match |
| I2 — 3 of 27 unit tests failing on `main` | `npm test`: "entry shows the bets total and count on one line", "an entry over its limit shortens the options first…", "an entry with no bets shows a total of 0" | Small | Fixed test-first in `cbc49ea`. Only one test now spells out the layout, so the next layout change breaks one test, not three |
| I3 — Bets line ended in a dangling separator: `… 💰 Credits | ` | The expected-layout test failed on the trailing ` | ` once updated | Small | Developer: remove it. Fixed in `cbc49ea`. The developer then set the final wording in `1135e21`, which broke only the one layout test, as intended; that test was updated to match |
| I4 — Dead code: commented-out line, unused import, and `src/lib/format.js` with no caller left | `grep -rn formatTimestamp src`: only the comment and `src/features/debug/handlers.js`'s own copy | Small | Deleted in `cbc49ea` |

No issue sends the build back to development or out to a new build: the build does what was
agreed, on the amended M5.

## Final acceptance

| # | Check | How | Result |
|---|---|---|---|
| 1 | Review fix and final layout: each entry is three lines — ID and question, options, `N bet(s), totalling 💰 N Credits` — with no Created line and no trailing `|` | Developer ran `/predictions` on the deploy of `1135e21` | Pass |
| 2 | Bets count and total are right | Developer compared one entry's count and total against what they know of its bets | Pass |
| 3 | Smoke: private list, Next and Previous edit in place, Bet button on page 2 opens the modal, then cancel | Developer, same session: "Only you can see this", Next/Previous edited in place, Bet on page 2 opened the modal, cancelled | Pass |
| 4 | Log line for the slash command (`action=listPredictions`), never seen in development | Developer pasted: `[Betting] userId=218448193661173761 action=listPredictions page=1 pages=2 active=7` (page is one-based, as shown to the user) | Pass |
| 5 | An old public `/predictions` message's Bet button still opens the modal (development manual check 7) | Developer clicked Bet on an old public message; the modal opened and worked | Pass |

## What this build retired

Actually removed:

- `MAX_PREDICTIONS_SHOWN` and the 5-prediction cap in `handlePredictions`.
- The public `/predictions` reply; the list is ephemeral.
- One row of buttons per prediction; Bet buttons share one row.
- `formatTimestamp` in `src/features/betting/handlers.js`. It moved to `src/lib/format.js` in
  development, and review deleted that file when the created time left the list. The debug
  feature's own copy in `src/features/debug/handlers.js` is now the only one, so the
  duplication development recorded no longer exists.

Predicted but still there: the pot sum. The design retired it; the developer asked for it back
during development, and it now lives in `predictionsListFormat.js` as the bets total (M5).

## Next steps

The candidates this build leaves, in the recommended order:

1. **Build 03 — message formatting of the other commands, editable in one place (W7).** The
   developer asked during this build to amend how bets are shown, and C1 proved the pattern
   on `/predictions`: every string in one formatting module, one test pinning the layout.
   Extending it to `/mybets`, the bet confirmations and the resolve and void messages is the
   change most wanted and the best understood. Recommended next.
2. **Build 02 — hard-coded values elsewhere (W6):** beg limits, pin settings and other
   commands' constants, moved into `src/config.js` the way S1 moved the page size. Low risk,
   independent of 03.
3. **Build 04 — how SQL is configured and run (W3).** It touches how the bot reads and writes
   live data, so it needs its own requirements conversation and the most care. One input for
   it from this build: `getActivePredictions()` loads every bet to show a count and a total,
   which a single aggregate query would do more cheaply.

Not exercised in this build, worth folding into whichever build next touches `/predictions`:
a second account seeing nothing (M4), and Next on a list left open after a resolve, which
needs a throwaway prediction to resolve.

W4 (a view of resolved predictions) stays unplanned until the developer raises it.

## Edit log

- **2026-11-03** — review started. Found post-sign-off layout commits, 3 failing tests (I1-I4); developer kept layout, dropped trailing pipe; fixed in cbc49ea. Docs brought to current state.
- **2026-11-03** — developer agreed M5, pushed final bets line (1135e21); layout test + docs updated to match.
- **2026-11-03** — final acceptance 1-5 pass on deploy of 1135e21. Awaiting sign-off.

## Evidence
