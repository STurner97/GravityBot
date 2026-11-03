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
| F1 — The file, its checks, `/balance`, `/balances` | M3, M5, M4, part of M1, M2 | in acceptance: tests green, waiting on the push and the live run |
| F2 — `/mybets`, `/beg`, donate, `/changebalance`, shared denial and not-found | M1, M2, M4 | planned |
| F3 — `/predictions` and the three modals | M7, S1, part of C1 | planned |
| F4 — Confirmations, announcements, `betting.js` errors | M8, M1, M2, C1 | planned |
| F5 — Identity proven, one reword live | M2, M6 | planned |
| F6 — Pinboard, debug and router messages (Could) | C2 | planned |

## Acceptance — requirement by requirement

Rows are added as each feature is accepted. F1 so far:

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M5 | `npm test` fails on a bad file, naming the line and column or the message | Broke `messages.json` three ways; `npm test` named `does not parse at line 10 column 13`, `balance.other: is missing`, and `balance.own: unknown placeholder {balanse}`; restored, `cmp` identical to the reference | Pass for the F1 messages; live push pending |

## Manual checks

| # | Check | How | Result |
|---|---|---|---|
| 1 | The deployed bot finds and reads the file | After the F1 push, Heroku log shows `[Messages] file=messages.json messages=4 problems=0` | Not yet run: waiting on the push |
| 2 | Discord shows each balance message as before | `/balance`, `/balance user:@friend`, `/balances` | Not yet run |

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

- **2026-11-03** — F1 built: message modules, `messages.json` with the balance messages,
  reference file, `/balance` and `/balances` through it; version stamped 1.2.0-alpha.

## Evidence
