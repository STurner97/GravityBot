# Build 02 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 3 of 5 · in progress
> [← Design](2-design.md) · [State](0-build.md) · Review → · [All builds](../README.md)
<!-- /pipeline:nav -->

<!-- This document describes the build AS IT IS NOW. Rewrite sections when they change; do not
     append corrections below them. History goes in one place: the edit log at the end. -->

## Stack and tooling

Existing stack, binding, from [docs/project.md](../../project.md): Node.js ES modules,
discord.js v14, Express, PostgreSQL. No new dependency in this build.

| Task | Command |
|---|---|
| test | `npm test` (Node's built-in runner, `*.test.js` beside the code) |

## Features

| Feature | Requirements | Status |
|---|---|---|
| F1 — The file, its checks, `/balance`, `/balances` | M3, M5, M4, part of M1, M2 | accepted 2026-11-03 |
| F2 — `/mybets`, `/beg`, donate, `/changebalance`, shared denial and not-found | M1, M2, M4 | accepted 2026-11-03 |
| F3 — `/predictions` and the three modals | M7, S1, part of C1 | planned |
| F4 — Confirmations, announcements, `betting.js` errors | M8, M1, M2, C1 | planned |
| F5 — Identity proven, one reword live | M2, M6 | planned |
| F6 — Pinboard, debug and router messages (Could) | C2 | planned |

## Acceptance — requirement by requirement

Rows are added as each feature is accepted. F1 so far:

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M5 | `npm test` fails on a bad file, naming the line and column or the message | Broke `messages.json` three ways; `npm test` named `does not parse at line 10 column 13`, `balance.other: is missing`, and `balance.own: unknown placeholder {balanse}`; restored, `cmp` identical to the reference | Pass for the F1 messages |
| M3 | Values shown through named placeholders, listed in `uses` | `balance.*` and `balances` in `messages.json`; checker rejects an unknown placeholder (above) | Pass for the F1 messages |
| M4 | Lists are header, item, separator, empty, each editable | `balances` list: render tests and wording test for items and the empty case | Pass for `/balances`; other lists in F2 to F4 |
| M2 | Output identical to `cb1f8a5` | Wording tests on the reference for the 5 balance messages; `/balance`, `/balance user:@friend`, `/balances` read as before in Discord | Pass for the F1 messages |

| M1, M2 | F2 messages (mybets, beg, donate, changebalance, denial, not-found) from the file, identical to `cb1f8a5` | Wording tests on the reference for all 12; `/mybets` and `/beg` read as before in Discord | Pass for `/mybets` and the beg request. Pass with a limit for the rest: "too rich", donate, changebalance, denial and not-found are unit-tested only here; donate and changebalance are seen live in F4 |

## Manual checks

| # | Check | How | Result |
|---|---|---|---|
| 1 | The deployed bot finds and reads the file | After the F1 push, Heroku log shows `[Messages] file=messages.json messages=4 problems=0` | Pass: web.1 logged `[Messages] file=messages.json messages=4 problems=0` at 22:49:28 |
| 2 | Discord shows each balance message as before | `/balance`, `/balance user:@friend`, `/balances` | Pass: developer saw all three as normal. `/balances` empty case is unit-tested only |
| 3 | Deployed log, F2 | Heroku dashboard | Pass: web.1 `[Messages] ... messages=16 problems=0` at 22:54:17 |
| 4 | `/mybets`, `/beg` read as before | Developer ran both | Pass. `/beg` ran as the request (balance now 10 or less), so "too rich" was not seen |

## Feedback and triage

<!-- Every piece of feedback from acceptance testing, and where it went, in caveman rows.
     Actioned now (and how), deferred to the Won't-have list with a destination (W<n>), or a
     requirement changed (amended in 1-requirements.md, set back to proposed until the developer
     re-agrees it). Nothing is built because it was small and you were already there. -->

| Feedback | Decision | Where |
|---|---|---|

## How it works

Design: [2-design.md](2-design.md). Start reading at `src/lib/messages/index.js`.

- `catalog.js` lists every message the code needs and the values it gives each. It grows with
  each feature, and so do `messages.json` and the reference file `wording-cb1f8a5.json`; the
  three are kept in step so the checker never reports a message as missing.
- `checkMessages.js` is the one checker, used by `npm test` and by the bot at startup.
  `createMessages.js` wraps it: a broken message throws only when asked for.
- `renderMessage.js` turns a checked message and its values into text. A list takes
  `{ items: [...] }` beside any values its header or empty text uses.
- Handlers call `messageText(name, values)` and choose which message to show; they hold no
  wording.
- `src/features/betting/wording.test.js` reads the frozen reference, not `messages.json`, so
  rewording the real file never breaks it.

## Known issues

<!-- What is known to be wrong now, and whether it blocks acceptance. -->

## Edit log

- **2026-11-03** — F2 accepted live (with the limit in the acceptance table).
- **2026-11-03** — F2 built: 13 more messages, wording tests, handlers, buttons and modals' not-found switched.
- **2026-11-03** — F1 accepted live; acceptance and manual checks filled in.
- **2026-11-03** — F1 built: message modules, `messages.json` with the balance messages,
  reference file, `/balance` and `/balances` through it; version stamped 1.2.0-alpha.

## Evidence
