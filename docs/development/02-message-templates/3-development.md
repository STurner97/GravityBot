# Build 02 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 3 of 5 · signed off
> [← Design](2-design.md) · [State](0-build.md) · [Review →](4-review.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Stack and tooling

Existing stack, binding, from [docs/project.md](../../project.md): Node.js ES modules,
discord.js v14, Express, PostgreSQL. No new dependency in this build.

| Task | Command |
|---|---|
| test | `npm test` (Node's built-in runner, `*.test.js` beside the code) |

## Features

| Feature | Requirements | Status |
|---|---|---|
| F1 — The file, its checks, `/balance`, `/balances` | M3, M5, M4, part of M1, M2 | Accepted 2026-11-03 |
| F2 — `/mybets`, `/beg`, donate, `/changebalance`, shared denial and not-found | M1, M2, M4 | Accepted 2026-11-03 |
| F3 — `/predictions` and the three modals | M7, S1 | Accepted 2026-11-03 |
| F4 — Confirmations, announcements, `betting.js` errors | M8, M1, M2, C1 | Accepted 2026-11-03; C1's Next check could not be exercised |
| F5 — Identity proven, then a reword live | M2, M6 | Accepted 2026-11-03 |
| F6 — Pinboard, debug and router messages (Could) | C2 | Not built: deferred (W11) |

## Acceptance — requirement by requirement

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M1 | No message text left in the betting code | A search of `handlers.js`, `modals.js`, `buttons.js`, `buildModals.js` and the list modules found no quoted user text. It also found two messages the design's feature plan did not assign, which were added | Pass |
| M2 | Output identical to `cb1f8a5` | Each message has a wording test on the reference file. `messages.json` was byte-identical to the reference before any reword: `cmp` exit 0, both sha256 `ee70614704a6f64b4dbaf0f72aa71568a11f5abf20a94843138446c12564f641` at `cb162f8`. Seen in Discord, each as before: the balance messages, `/mybets`, the beg request, prediction created, bet placed, void with refunds, resolve with winners, changebalance remove, and three `betting.js` errors | Pass with a limit. Unit-tested only: "too rich", donate, the admin denial, not-found, no winners, no refunds, duplicate options, negative balance, too few options, choice not an option, and changebalance set and add |
| M3 | Values shown through named placeholders, listed in `uses` | Every message that takes values names them in `uses`. The checker rejects an unknown placeholder (M5) | Pass |
| M4 | Lists are a header, item, separator and empty text, each editable | `/balances`, `/mybets`, the winners, the refunds, the option lists and the `/predictions` entries are all lists in the file. Render and wording tests cover each, including the empty cases. In Discord, `/balances`, `/mybets`, the refunds and the winners read as before | Pass with a limit. The agreed check, editing `/mybets`'s item line and seeing every bet change, was not run in development. Review runs it ([4-review.md](4-review.md)) |
| M5 | `npm test` fails on a broken file, naming the line and column or the message | `messages.json` was broken three ways. `npm test` named `does not parse at line 10 column 13`, `balance.other: is missing` and `balance.own: unknown placeholder {balanse}`. Restored, `cmp` identical to the reference | Pass |
| M6 | A wording change is an edit to the file alone, committed and pushed | The developer reworded `balance.own` (`fa43958`, `8d1ed5f`). `git diff --stat 7901018 HEAD` showed that one file and one line, no JavaScript. `npm test` 118 pass; pushed; the log showed `messages=62 problems=0` at 23:29:04; `/balance` showed the new wording. After F5, the developer reworded `balance.other` the same way (`29be1cf`) | Pass |
| M7 | `/predictions` keeps build 01's behaviour and 2000-character limit, its layout from the file | Build 01's list tests on the reference, and a worst-case page on the real file without a cut. In Discord: `/predictions` with Next and Previous, the Bet modal, and the `/predict` and `/resolve` modals, each cancelled | Pass |
| M8 | `betting.js` errors come from the file, no SQL or transaction change | `git diff -U0 betting.js` shows only `return` lines and the 3 unused `message:` fields. Wording tests cover all 9 codes. Live on throwaway 432: invalid option, bet on all options and insufficient credits, each as expected and writing nothing | Pass |
| S1 | Modal titles, labels and placeholders from the file | Modal wording tests; the developer opened each modal and cancelled it | Pass |
| S2 | The file says beside each message which placeholders it may use | `uses` is on every message that takes values, checked against the catalog by `npm test`. The developer edited `balance.own` using only what the file says | Pass |
| C1 | Next works on a list left open across a resolve | Only prediction 433 was active, so the list had no Next button | Not exercised: it needs at least six active predictions. The other half of the old C1 was dropped (W10) |
| C2 | Pinboard, debug and router messages in the file | Not built | Not built: deferred as W11 |

## Manual checks

| # | Check | How | Result |
|---|---|---|---|
| 1 | The deployed bot finds and reads the file | After the F1 push, the Heroku log shows `[Messages] file=messages.json messages=4 problems=0` | Pass: web.1 logged it at 22:49:28 |
| 2 | Discord shows each balance message as before | `/balance`, `/balance user:@friend`, `/balances` | Pass: the developer saw all three as normal. The `/balances` empty case is unit-tested only |
| 3 | Deployed log, F2 | Heroku dashboard | Pass: web.1 `messages=16 problems=0` at 22:54:17 |
| 4 | `/mybets` and `/beg` read as before | The developer ran both | Pass. `/beg` ran as the request (the balance was 10 or less), so "too rich" was not seen |
| 5 | Deployed log, F3 | Heroku dashboard | Pass: web.1 `messages=42 problems=0` at 23:00:58 |
| 6 | F3 screens read as before | The developer ran each in Discord and cancelled the modals; no bet placed, nothing resolved | Pass |
| 7 | C1: a second account sees no `/predictions` list | Needs a second account | Dropped by the developer (W10); not exercised |
| 8 | R8 throwaway session | Predictions 432 (voided) and 433 (resolved). Each write was said aloud first, and the developer took a backup before starting | Pass. The balance ended at 4, where the session's notes had it. A friend's donation arrived mid-session, which explained a 5 the agent had not expected |
| 9 | Deployed log, F4 | Heroku dashboard | Pass: web.1 `messages=62 problems=0` at 23:11:03 |
| 10 | Deployed log, F5 reword | Heroku dashboard | Pass: `messages=62 problems=0`; `/balance` read as `You have 💰 **N** Credit(s).` |

## Feedback and triage

| Feedback | Decision | Where |
|---|---|---|
| Pot 1 but winner paid 2 (profit 1) on throwaway 433 | No change: payout is fixed at twice the stake, not a share of the pot; code untouched; developer says fine | — |

## How it works

Design: [2-design.md](2-design.md). Start reading at `src/lib/messages/index.js`.

- `messages.json`, in the repo's top folder, holds all 62 betting messages. `catalog.js` lists
  each message the code needs and the values the code gives it. The frozen reference file
  `src/lib/messages/fixtures/wording-cb1f8a5.json` holds `cb1f8a5`'s wording. All three must
  name the same messages. A new message is added to all three, or the checker reports it
  missing from whichever lacks it.
- `checkMessages.js` is the one checker. `npm test` and the bot at startup both use it.
  `createMessages.js` wraps it, so a broken message throws only when it is asked for: one
  bad edit fails one command, and the rest of the bot keeps working.
- `renderMessage.js` turns a checked message and its values into text. A list takes
  `{ items: [...] }`, beside any values its header or empty text uses. Plurals choose `one`
  or `other` with `Intl.PluralRules('en')`.
- Handlers call `messageText(name, values)` and choose which message to show. They hold no
  wording. Pure code (the `/predictions` page builders and the modal builders in
  `buildModals.js`) takes the text function as a parameter instead, so its tests can pass the
  reference text and need no environment.
- `betting.js` returns `error: { code, ...values }`. `bettingErrorReply` maps the code to
  `bettingErrors.<code>` in the file and joins an `options` array through `optionList`. Only
  `return` lines changed (`git diff -U0 betting.js`). `resetDatabase` still returns a plain
  string error, because it belongs to the debug feature (W11, W13).
- `src/features/betting/wording.test.js` reads the reference file, not `messages.json`, so
  rewording the real file never breaks it. `messagesFile.test.js` reads the real file, but
  checks only its shape and the `/predictions` page budget, so it passes whatever the wording.
- Two messages were not in the design's feature plan. A search of the code for leftover text
  found them: the bulleted options in the "prediction created" reply (`bulletedOptionList`),
  which the inventory missed, and `/bet` on a resolved prediction (`bet.alreadyResolved`),
  which it listed but no feature named.

## Known issues

None blocks acceptance. Review found two gaps outside this build's scope: the Discord length
limits are not checked (W12), and the debug reset error is raw (W13). See
[4-review.md](4-review.md).

## Edit log

- **2026-11-03** — F1 built: message modules, `messages.json` with the balance messages,
  reference file, `/balance` and `/balances` through it; version stamped 1.2.0-alpha.
- **2026-11-03** — F1 accepted live; acceptance and manual checks filled in.
- **2026-11-03** — F2 built: 13 more messages, wording tests, handlers, buttons and modals' not-found switched.
- **2026-11-03** — F2 accepted live (with the limit in the acceptance table).
- **2026-11-03** — F3 built: `/predictions` layout, option list and the three modals from the file; pure modal builders moved to `buildModals.js` so tests need no database; list builder reports `cut`.
- **2026-11-03** — F3 accepted live; C1 second-account check not exercised.
- **2026-11-03** — F4 built: errors as codes, announcements and confirmations from the file; two messages found beyond the inventory.
- **2026-11-03** — C1 narrowed to the Next check; second-account check dropped (W10).
- **2026-11-03** — F4 accepted live (R8 session); C1 Next check not exercisable. F5 started: `cmp` shows `messages.json` identical to the reference.
- **2026-11-03** — F5 accepted: M6 reword live (`balance.own`, commits `fa43958`, `8d1ed5f`). `messages.json` now deliberately differs from the reference.
- **2026-11-03** — F6 / C2 not built, deferred as W11; C1 re-agreed with the sign-off.
- **2026-11-03** — review: current-state rewrite; acceptance in one table; second reword (`29be1cf`) and M4 gap recorded; known issues point at W12, W13.

## Evidence
