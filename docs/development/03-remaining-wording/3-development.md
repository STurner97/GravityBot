# Build 03 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 03 — Pinboard, debug and channel-denial messages from the template file** · Phase 3 of 5 · in progress
> [← Design](2-design.md) · [State](0-build.md) · Review → · [All builds](../README.md)
<!-- /pipeline:nav -->

<!-- This document describes the build AS IT IS NOW. Rewrite sections when they change; do not
     append corrections below them. History goes in one place: the edit log at the end. -->

## Stack and tooling

The stack is the existing one in [docs/project.md](../../project.md): Node.js (ES modules),
discord.js v14, Express, PostgreSQL. Nothing is scaffolded and no dependency is added.

| Task | Command |
|---|---|
| test | `npm test` |
| deploy | `git push origin main` (the developer's act; every push goes live) |

## Features

| Feature | Requirements | Status |
|---|---|---|
| F1 — The pin post from the file | M3, M4, S1; M1, M2 for `pinboard.post.*` | in acceptance: built and tested, waiting for push and the live check |
| F2 — Debug from the file, generic reset error | M1, M2 for `debug.*`; M6 | planned |
| F3 — Pinboard replies, generic forcepin error, channel denial | M1, M2 for the rest; M7 | planned |
| F4 — Length limits and the dead file | M5, M8 | planned |

## Acceptance — requirement by requirement

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M3 | The worker reads `messages.json` and checks it at startup | `pinboardEmbed.js` imports the messages module; the worker imports it too. Locally the worker's import path logs `[Messages] … messages=66 problems=0`. Live: not yet | not yet run |
| M4 | A broken pin message fails only that post | `helpers.test.js`: with a broken `text`, `buildPostPayload` and `publishOrUpdatePin` throw and a fake channel's `send` and `edit` are never called. `reportFailures.test.js`: the failure is logged and not thrown | Pass (unit); live not exercised |
| S1 | The worker listens for `clientReady` | `Events.ClientReady` in `worker/index.js`. Live: no `DeprecationWarning` in the worker log | not yet run |

## Manual checks

| # | Check | How | Result |
|---|---|---|---|
| F1.1 | Worker boot log | After push: `heroku logs --dyno worker` shows `[Messages] … messages=66 problems=0` and the login line, no `DeprecationWarning` | not yet run |
| F1.2 | A pin re-renders from the file | The developer adds 📌 to a message on the pinboard that someone else wrote, sees "N+1 Pins", then removes the reaction | not yet run |

## Feedback and triage

<!-- Every piece of feedback from acceptance testing, and where it went, in caveman rows.
     Actioned now (and how), deferred to the Won't-have list with a destination (W<n>), or a
     requirement changed (amended in 1-requirements.md, set back to proposed until the developer
     re-agrees it). Nothing is built because it was small and you were already there. -->

| Feedback | Decision | Where |
|---|---|---|

## How it works

See [2-design.md](2-design.md) for the whole design. What F1 built:

- **`pinboard/pinboardEmbed.js`** holds `buildPinboardEmbed`, moved out of `data.js` so that
  file is only SQL. It takes `text` as its second argument, `messageText` by default, like
  `buildModals.js`. Tests pass the frozen reference text. `forced: true` picks the forced
  heading, which replaces the old overwrite of `author.name` in forcepin.
- **A broken pin message posts nothing.** The builder throws before any send, edit or database
  write, and `reportFailures` logs it. The worker keeps running and keeps removing deleted pins.
  There is deliberately no built-in fallback text (design decision 1).
- **`worker/reportFailures.js`** replaces three copied `try/catch` blocks. The log line is now
  `[Pinboard] event=<name> failed`, not the three old sentences.
- **The `pinboard.post.heading` plural** gives `0 Pins`, `1 Pin`, `N Pins`, as `count !== 1` did.
- **`import '../../../lib/messages/index.js'` in `worker/index.js`** looks unused. It is
  deliberate: the import is what runs the startup check, so the worker logs its own
  `[Messages]` line even if a later refactor stops the pin code reaching the module.

## Known issues

None yet.

## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each. The only
     append-only section:
     - **YYYY-MM-DD** — what changed, and why if it is not obvious.
     check requires at least one dated entry before sign-off. -->

- **2026-11-13** — F1 built test-first: pin post, worker failure wrapper, `clientReady`, 1.3.0-alpha stamped.

## Evidence
