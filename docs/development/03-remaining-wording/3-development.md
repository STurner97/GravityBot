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
| F1 — The pin post from the file | M3, M4, S1; M1, M2 for `pinboard.post.*` | accepted: pin re-render and worker boot checked live; the `send` path waits for a real pin |
| F2 — Debug from the file, generic reset error | M1, M2 for `debug.*`; M6 | accepted: F2.1 to F2.4 passed live after deploy `ca9e434` |
| F3 — Pinboard replies, generic forcepin error, channel denial | M1, M2 for the rest; M7 | accepted: boot log and F3.4 live; F3.1, F3.2, F3.3, F3.5 passed unexercised on the developer's risk call |
| F4 — Length limits and the dead file | M5, M8 | in acceptance: built and tested; waiting for push and both dynos starting |

## Acceptance — requirement by requirement

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|
| M2 | Every moved message reads exactly as on `11f4e9e` | `pinboard/wording.test.js`, `debug/wording.test.js`, `pinboard/pinboardEmbed.test.js` and the formatter tests check each of the 52 new messages against `wording-cb1f8a5.json`, with expected strings taken from the code at `11f4e9e`. Live: pin re-render (F1.2) and the four read-only `/debug` commands, SQL modal and reset prompt (F2.1-F2.4) looked unchanged; F3's wording unexercised live by the developer's risk call | Pass with a limit (F3 wording and a brand-new pin not seen live) |
| M5 | `npm test` fails on a message too long for where it is shown | `checkLengths.test.js` on fixtures for every place and both plural forms. Real run: `predictModal.title` lengthened to 57 characters, `npm test` failed with `predictModal.title: is 57 characters; a modal title allows 45`, file restored, 181 tests pass | Pass |
| M8 | The unused root `pinboard.js` is deleted | `git grep` found no importer. Deleted; `npm test` passes (181); the registry, pinboard feature and worker import cleanly. Live start after push: not yet run | Pass (local); live start not yet run |
| M3 | The worker reads `messages.json` and checks it at startup | `pinboardEmbed.js` imports the messages module; the worker imports it too. Live worker log after deploy `ca9e434`: `[Messages] file=messages.json messages=96 problems=0`, then `Worker logged in as GravityBot#7124` | Pass |
| M4 | A broken pin message fails only that post | `helpers.test.js`: with a broken `text`, `buildPostPayload` and `publishOrUpdatePin` throw and a fake channel's `send` and `edit` are never called. `reportFailures.test.js`: the failure is logged and not thrown | Pass (unit); live not exercised |
| M1 | Every message of the three features comes from the file | Final search after F3: no user text left in `pinboard/`, `debug/` or `router.js`, apart from the 📌 reaction-emoji constant (`data.js`, configuration not wording), W2 and W9. Startup line `messages=114 problems=0` | Pass (code search; boot log `messages=114 problems=0` on both dynos) |
| M7 | `/pinboard forcepin` shows a generic error | F3.4 live: made-up message id on a real channel gave `❌ Failed to force pin.`, nothing posted. The log line holding Discord's error was seen by the developer | Pass |
| M6 | `/debug reset` shows a generic error when the reset fails | `buttons.test.js`: an injected failing reset gives `❌ Reset failed.`, the reply holds none of the error, and the log line is `[Debug] action=resetDatabase failed` with the thrown error. Not run live (a real reset empties every table) | Pass (unit) |
| S1 | The worker listens for `clientReady` | `Events.ClientReady` in `worker/index.js`. Live worker boot log (2026-11-14 21:52): login line, no `DeprecationWarning` | Pass |

## Manual checks

| # | Check | How | Result |
|---|---|---|---|
| F1.1 | Worker boot log | After push: `heroku logs --dyno worker` shows `[Messages] … messages=66 problems=0` and the login line, no `DeprecationWarning` | worker `[Messages] … messages=96 problems=0`, login line, no `DeprecationWarning` (deploy `ca9e434`, 2026-11-14) | Pass |
| F1.2 | A pin re-renders from the file | The developer adds 📌 to a message on the pinboard that someone else wrote, sees "N+1 Pins", then removes the reaction | Pass: developer reports the pin looks fine. Edit path only; the `send` path waits for a real pin |
| F4.1 | Both dynos start after `pinboard.js` is deleted and the length check ships | After push: both boot logs show `messages=114 problems=0`, worker logs in | not yet run |
| F2.1 | `/debug stats`, `recent`, `prediction <id>` read as before | After push, the developer runs each; all read-only | Pass: developer ran it after deploy `ca9e434` (2026-11-14) |
| F2.2 | `/debug user` on the developer only | It writes a `users` row for anyone without one | Pass: developer ran it after deploy `ca9e434` (2026-11-14) |
| F2.3 | SQL modal | Open it, submit `SELECT 1 AS one`: "Query executed. (1 rows)" and a one-row table | Pass: developer ran it after deploy `ca9e434` (2026-11-14) |
| F2.4 | Reset prompt | Run `/debug reset`, press **Cancel**. Never **Yes** | Pass: developer ran it after deploy `ca9e434` (2026-11-14) |
| F3.1 | `/pinboard whitelist_list` reads as before | After push, the developer runs it | Not exercised live. Developer accepted on risk (2026-11-14); covered by wording and formatter tests and a local run of the real handler and router |
| F3.2 | `whitelist_add` on a channel already listed | Shows "Added …"; `ON CONFLICT DO NOTHING` changes nothing | Not exercised live. Developer accepted on risk (2026-11-14); covered by wording and formatter tests and a local run of the real handler and router |
| F3.3 | Forcepin with `not a link` | Gives the format error; nothing is read or written | Not exercised live. Developer accepted on risk (2026-11-14); covered by wording and formatter tests and a local run of the real handler and router |
| F3.4 | Forcepin on a real channel link with a made-up message id | Generic reply `❌ Failed to force pin.`; Heroku log holds Discord's error (`[Pinboard] Force pin failed`); nothing posted | Pass: developer ran it after deploy `052a49b` (2026-11-14): generic reply, nothing posted |
| F3.5 | Channel denial | Any command in a channel off `ALLOWED_CHANNEL_IDS` shows the denial and reads nothing | Not exercised live. Developer accepted on risk (2026-11-14); covered by wording and formatter tests and a local run of the real handler and router |

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
- **Debug text** lives in `debug/formatDebugReplies.js` (the four inspection replies),
  `buildDebugComponents.js` (reset prompt and SQL modal) and `formatSqlResult.js` (words from
  the file, table layout in code). Each takes `text`, `messageText` by default. A reply that is
  a summary plus a list is two messages; the code joins them.
- **Length limits.** `TEXT_LIMITS` in `lib/discordLimits.js` holds the seven Discord limits with
  a label each. A catalog entry declares where Discord shows it with `{ shownAs: 'modalTitle' }`
  (29 messages). `lib/messages/checkLengths.js` renders each such message with the longest
  value every placeholder can take (`LONGEST_VALUES` in `messagesFile.test.js`) and both plural
  forms, and reports `name: is N characters; <place> allows M`. It runs in `npm test`, not at
  bot startup. **Its blind spot:** a message shown in a limited place but never marked
  `shownAs` is not measured, so mark new modal, button and embed messages when adding them.
  A value with no sample is itself a problem, so a new placeholder cannot slip through.
- **The pinboard and router** follow the same pattern: `formatWhitelist.js` builds the
  `whitelist_list` reply (summary and list are two messages joined in code) and `handlers.js`
  dispatches through a `SUBCOMMANDS` map. Forcepin's `catch` logs the full error and replies
  `pinboard.forcepin.failed`, which declares no values.
- **`handleConfirmReset` takes `reset` as a required option**, not defaulting to
  `resetDatabase` as the design sketched. A default would make `buttons.js` import `betting.js`,
  which needs production environment variables at import, so its test could not load.
  `debug/index.js` passes `resetDatabase` in when it registers the button.
- **`resetDatabase` no longer catches.** `withTransaction` now rolls back and rethrows, as for
  every other transaction. Before, the inner catch made it commit an aborted transaction.
- **`handlers.js` dispatches through a `SUBCOMMANDS` map** instead of an `if` chain, per
  CLAUDE.md's open/closed rule.
- **`import '../../../lib/messages/index.js'` in `worker/index.js`** looks unused. It is
  deliberate: the import is what runs the startup check, so the worker logs its own
  `[Messages]` line even if a later refactor stops the pin code reaching the module.

## Known issues

None known.

## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each. The only
     append-only section:
     - **YYYY-MM-DD** — what changed, and why if it is not obvious.
     check requires at least one dated entry before sign-off. -->

- **2026-11-13** — F1 built test-first: pin post, worker failure wrapper, `clientReady`, 1.3.0-alpha stamped.

- **2026-11-13** — F1 live: `[Messages]` line and pin re-render seen; login line and warning check pending.

- **2026-11-13** — F2 built test-first: `debug.*` messages (30), formatters, reset failure handling; startup line now `messages=96`.

- **2026-11-14** — F1 accepted: worker boot log shows messages line, login, no warning. F2 deployed (ca9e434); F2.1-F2.4 awaiting rerun.

- **2026-11-14** — F2 accepted: F2.1-F2.4 passed live on ca9e434.

- **2026-11-14** — F3 built test-first: 20 `pinboard.*` and `denied.channel` messages; startup line now `messages=114`; final M1 search done.

- **2026-11-14** — F3 accepted: boot log ok, F3.4 passed live, other F3 checks skipped by developer on low risk.

- **2026-11-14** — F4 built test-first: `TEXT_LIMITS`, `shownAs` on 29 messages, `checkLengths`; M5 shown by lengthening a title; root `pinboard.js` deleted.

## Evidence
