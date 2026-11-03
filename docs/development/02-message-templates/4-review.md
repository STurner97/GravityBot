# Build 02 — Phase 4: Review

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 4 of 5 · in progress
> [← Development](3-development.md) · [State](0-build.md) · Publish → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Deployment

Heroku deploys `main` from GitHub on every push (`deploy` fact: `git push origin main`). The
developer pushes. The build changes no database table, so deploys and rollbacks are code
only. Only the `web` dyno reads `messages.json`; the pinboard worker loads nothing from it
until W11.

| What | Where | State |
|---|---|---|
| F1 to F4 code, `186ab7a` to `eec290b` | Heroku `web` dyno, via `main` | Deployed feature by feature in development; each push confirmed by the `[Messages]` startup line |
| Rewords: `fa43958` and `8d1ed5f` (`balance.own`), `29be1cf` (`balance.other`) | Heroku `web` dyno, via `main` | Deployed 2026-11-03. `origin/main` is `29be1cf`, so the live code is the accepted code |
| Accepted commit `133bbb9`, sign-off `108544d`, review commits | Heroku, via `main` | Documents only. The developer pushes them before final acceptance |

**Rolling back the whole build.** Run
`git restore --source=186ab7a^ --staged --worktree -- . ':!docs'`, commit, and push. `186ab7a`
is the build's first code commit. The command keeps the build's documents, deletes
`messages.json` and `src/lib/messages/`, and restores the changed files. It was tried in a
throwaway worktree (see Evidence), and the code it left was identical to `cb1f8a5`.

**Rolling back one reword.** Run `git revert <commit>` and push.

**Faster stopgap.** Use Roll back on the Heroku dashboard's Activity tab. It redeploys the
previous release without touching git, so `main` must be reverted as well, or the next push
brings the change back. No data needs restoring.

## Documents checked against reality

| Document | Matches | Corrected |
|---|---|---|
| [0-build.md](0-build.md) | Not fully: *What changed* stopped at design | Lines added for C1, C2 to W11, the second reword and review. Notes updated |
| [1-requirements.md](1-requirements.md) | Yes. Each row describes what was built or deferred; C2 stays in Could and its deferral is W11 | Nothing |
| [2-design.md](2-design.md) | Mostly. Problems: the module table had no `buildModals.js`, `formatOptionList.js` or reference helper; pure functions take a `text` function, not `messages`; "about 60" messages is 62; C1 was given in its old two-check form; F6 was given as planned | Module table, signatures, count and C1 row corrected. F6, manual check 1's worker and the retires list's C2 line marked not built (W11) |
| [3-development.md](3-development.md) | For what was accepted, yes. Problems: M6 named one reworded message, but there were two (`29be1cf`); a blank line split the acceptance table, under a leftover "F1 so far" line; manual checks 9 and 10 were out of order; *How it works* said the catalog "grows with each feature"; M4's own acceptance (edit the `/mybets` item line) was never recorded | Rewritten into current-state form. M4's gap noted and taken to final acceptance |
| [docs/project.md](../../project.md) | Yes: stack, test, deploy and publish are unchanged | Nothing |
| [README.md](../../../README.md) | No: see the next section | See the next section |

## Requirements met

| # | Requirement | At development | Now | Owed to publish |
|---|---|---|---|---|
| M1 | Every betting message from one file | Pass | Pass. A search of the betting code finds only command descriptions (W5) and SQL | — |
| M2 | Output identical to `cb1f8a5` | Pass with a limit: the rare cases are unit-tested only | Pass with a limit, as at development. Each of the 62 messages has a wording test on the reference file. `messages.json` now differs from the reference on purpose, in `balance.own` and `balance.other` | — |
| M3 | Named placeholders | Pass | Pass | — |
| M4 | Lists as header, item and empty text | Pass with a limit: proven on `/balances`; the agreed check, editing `/mybets`'s item line, was not run | pending | — |
| M5 | `npm test` fails on a broken file and names the problem | Pass, shown on the F1 messages | Pass. Repeated on the full 62-message file: the line and column, `void.refunds: is missing`, and `myBets: item: unknown placeholder {amont}` (Evidence) | — |
| M6 | A reword is an edit to the file alone | Pass | Pass. The second reword, `29be1cf`, also touched `messages.json` alone | — |
| M7 | `/predictions` keeps build 01's behaviour within 2000 characters | Pass | Pass. The worst-case contract test still runs on the real file | — |
| M8 | `betting.js` errors from the file, no SQL change | Pass | Pass | — |
| S1 | Modal text from the file | Pass | Pass | — |
| S2 | `uses` beside each message | Pass | Pass | — |
| C1 | Next works on a list left open across a resolve | Not exercised | Not exercised. It needs at least six active predictions, and each one costs a real credit to create | — |
| C2 | Pinboard, debug and router messages in the file | Not built | Not built: deferred as W11 | — |

Publish owes nothing beyond its usual push and tag. The bot is installed by deploying it, and
the deployed bot is already where acceptance runs.

## Existing documentation brought up to date

| Document | What was out of date | Fixed |
|---|---|---|
| [README.md](../../../README.md) | The directory tree had no `messages.json`, `src/lib/messages/`, `bettingErrorReply.js`, `buildModals.js` or `formatOptionList.js`. It described `predictionsListFormat.js` as holding every string the list shows | Tree updated |
| [README.md](../../../README.md) | Nothing said where the wording lives or how to change it | New *Changing the wording* section |
| [README.md](../../../README.md) | *How to add a feature* showed text written inline, with no mention of the file | Note added: betting text goes through `messages.json`; other features keep inline text until W11 |
| [CLAUDE.md](../../../CLAUDE.md) | No rule kept new betting text out of the code | Convention added: betting text lives in `messages.json`, with its entry in `catalog.js` and the reference file. This is the requirements decision "one place for its wording", recorded so later builds follow it |
| Build documents | Cycle history was threaded through the text | Rewritten into current-state form; the history is in each edit log |

## Issues found in review

| Issue | Evidence | Size | Outcome |
|---|---|---|---|
| I1 — `npm test` does not check Discord's length limits on modal titles, field labels and placeholders, or on button labels. A reword past a limit passes the tests, then that modal or list fails to open live | Limits from `@discordjs/builders`: title 45, label 45, placeholder 100, button 80. `messagesFile.test.js` has no length check. Today's longest title is 26 (Evidence) | Outside scope: a new check that M5 does not name. Nothing today is near a limit | New build: W12, with W11. The developer agreed |
| I2 — `balance.other` was reworded after F5 was accepted (`29be1cf`), and no document recorded it | `git log cb162f8..HEAD -- messages.json` | Small: documents only | Recorded in [3-development.md](3-development.md). The new wording was first seen live in final acceptance 1 |
| I3 — M4's agreed acceptance (edit `/mybets`'s item line and see every bet change) was never run | The M4 row in [3-development.md](3-development.md) | Small: a check, no code | Taken to final acceptance 2 |
| I4 — `/debug reset` shows the raw database error to the user (`Reset failed: ${result.error}`), against CLAUDE.md's rule that error replies stay generic | `src/features/debug/buttons.js:16`; `resetDatabase` returns `err.message` | Outside scope: the debug feature, which this build did not touch. Admin-only | W13, with W11, which moves the debug messages anyway |

Not a defect: throwaway 433's resolve showed "Total Pot: 1 credits" and paid "won 2 credits".
The payout is twice the stake by design (`resolvePrediction`: `winnings = bet.amount * 2`),
not a share of the pot. The developer confirmed it in development.

No issue sends the build back to development. The build does what was agreed.

## Final acceptance

Run on the deploy of the reviewed commit, after the developer pushes.

| # | Check | How | Result |
|---|---|---|---|
| 1 | Smoke test of the main path, and both rewords live | `[Messages] ... problems=0` in the Heroku log; `/balance`, `/balance user:@friend`, `/predictions`, `/mybets` | pending |
| 2 | M4: an edit to the list's item line changes every item | The developer edits `myBets.item` in `messages.json`, runs `npm test`, pushes, runs `/mybets` | pending |

## What this build retired

Actually removed, each confirmed by a search of the code:

- Every message literal in `handlers.js`, `modals.js`, `buttons.js` and
  `predictionsListFormat.js`. That module now exports only `truncate` and
  `formatPredictionEntry`, and its seven text constants and helpers are gone.
- The 15 error strings and the 3 unused `message:` fields in `betting.js`.
- The six `` `❌ ${result.error}` `` sites in the betting feature, now `bettingErrorReply`.
- The five `join(', ')` calls for options, now the `optionList` message.
- `/changebalance`'s `actionText` branching, now three whole messages.

Predicted but still there, because C2 was deferred (W11):

- The root `pinboard.js`, which nothing imports.
- The inline text in the debug and pinboard features, including one `join(', ')` in
  `src/features/debug/handlers.js`.

## Next steps

The candidates this build leaves, in the recommended order:

1. **Build 03 — the rest of the wording in the file (W11), with W12 and W13.** This moves the
   pinboard, debug and router messages into `messages.json`, deletes the root `pinboard.js`,
   adds an `npm test` check of Discord's length limits (W12, I1), and makes the debug reset
   reply generic (W13, I4). It goes first because it holds the build's one untested seam: the
   pinboard worker is a separate process that would read the file for the first time. The
   developer is also now rewording, and I1 is the gap that rewording can fall into. The
   developer chose this order in review. Requirements had earmarked build 03 for configuration.
2. **Build 04 — configuration (W4).** The default credits, the beg limit and the donate amounts become
   settings. It will be easier to check once every message is in the file, because those
   values show there as placeholders.
3. **Checks never run live, for whichever build next touches them:** Next on a list left
   open across a resolve (C1); the "too rich to beg" reply; the no-winners and no-refunds
   announcements.

Not planned: W8 (SQL) and W9 (resolved predictions), until the developer raises them. Dropped:
W2, W7 and W10.

## Edit log

- **2026-11-03** — review: docs checked vs build, I1-I4 found, M5 repeated on full file, rollback tried in worktree; README, CLAUDE.md, build docs updated.

## Evidence

```console
$ grep -nE 'var (titleValidator|labelValidator|placeholderValidator2|buttonLabelValidator) ' node_modules/@discordjs/builders/dist/index.js | sed -E 's/import_shapeshift[0-9]+\.s\.//; s/\.setValidationEnabled.*//'
534:var buttonLabelValidator = string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(80)
893:var placeholderValidator2 = string().lengthLessThanOrEqual(100)
894:var labelValidator = string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(45)
2688:var titleValidator = string().lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(45)
```

```console
$ node -e "import('./src/features/betting/buildModals.js').then(m => { const ms = [m.buildPredictModal(), m.buildBetModal(999999, ['a','b']), m.buildResolveModal(999999, ['a','b'])]; for (const x of ms) { console.log('title', x.data.title.length); for (const row of x.data.components) for (const c of row.components) console.log('  label', c.label.length, 'placeholder', (c.placeholder ?? '').length); } })" 2>&1 | grep -v Messages; grep -n 'expect\\|45\\|80' src/lib/messages/messagesFile.test.js || echo 'messagesFile.test.js: no modal or button length check'
title 19
  label 8 placeholder 31
  label 25 placeholder 34
  label 11 placeholder 28
  label 10 placeholder 14
title 25
  label 16 placeholder 4
  label 10 placeholder 14
title 26
  label 15 placeholder 4
messagesFile.test.js: no modal or button length check
```

```console
$ bash /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/break-messages.sh .
== comma removed after balance.own uses
ℹ fail 2
"messages.json: does not parse at line 12 column 7: Expected ',' or '}' after property value in JSON at position 441 (line 12 column 7)"
== void.refunds deleted
ℹ fail 1
'void.refunds: is missing'
== myBets item {amount} misspelt {amont}
ℹ fail 1
'myBets: item: unknown placeholder {amont}; this message may use {predictionId} {question} {option} {amount}'
== restored
messages.json identical to HEAD
```

```console
$ wt=/tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/rollback-wt; git worktree add -q --detach $wt HEAD && cd $wt && git restore --source=186ab7a^ --staged --worktree -- . ':!docs' && git status --short && echo '-- remaining diff from cb1f8a5 outside docs:' && git diff --cached --stat cb1f8a5 -- . ':!docs' | tail -1; cd - >/dev/null; git worktree remove --force $wt
M  betting.js
D  messages.json
M  package-lock.json
M  package.json
D  src/features/betting/bettingErrorReply.js
D  src/features/betting/bettingErrorReply.test.js
D  src/features/betting/buildModals.js
M  src/features/betting/buttons.js
D  src/features/betting/formatOptionList.js
M  src/features/betting/handlers.js
M  src/features/betting/loadPredictionsPage.js
M  src/features/betting/modals.js
M  src/features/betting/predictionsList.js
M  src/features/betting/predictionsList.test.js
M  src/features/betting/predictionsListFormat.js
M  src/features/betting/predictionsListFormat.test.js
D  src/features/betting/wording.test.js
D  src/lib/messages/catalog.js
D  src/lib/messages/checkMessages.js
D  src/lib/messages/checkMessages.test.js
D  src/lib/messages/createMessages.js
D  src/lib/messages/createMessages.test.js
D  src/lib/messages/fixtures/referenceMessages.js
D  src/lib/messages/fixtures/wording-cb1f8a5.json
D  src/lib/messages/index.js
D  src/lib/messages/messagesFile.test.js
D  src/lib/messages/renderMessage.js
D  src/lib/messages/renderMessage.test.js
-- remaining diff from cb1f8a5 outside docs:
```
