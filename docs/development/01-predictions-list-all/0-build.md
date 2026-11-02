---
build: 01-predictions-list-all
phase: 2-design
status: awaiting-signoff
size: standard
format: 2
signed_off: 1-requirements
signed_off_by: 1-requirements=Ferby
blocked_on: 
gate: developer approves the design and feature plan, including any revised MoSCoW
next: developer approves design (R4 in, all O closed)
version: 1.1.0-alpha
stage: alpha
updated: 2026-11-02
---

# Build 01 — List all active predictions

**Read this file first.** It is the only file you need to know where this build stands.

## What this build is

`/predictions` today shows only the 5 newest active predictions, publicly. This build makes it
a private, paged list of every active prediction, 5 to a page with Previous and Next buttons,
each entry keeping its "Bet on #N" button. The list's page size and text layout move out of
the handler into named settings and one layout file.

## Why it is this build

It is a visible defect that worsens as predictions build up through the year, it only reads
data, and it is the smallest first build that also starts the configuration work the developer
wants (builds 02 to 04).

## What changed during the build

- **2026-11-02** — design proposed M7 (page length limit) and amended S1 (Discord limits
  outside `src/config.js`); see the push-back in [2-design.md](2-design.md). Developer
  agreed both.
- **2026-11-02** — developer adopted unit tests (O2) and version tags from 1.1.0-alpha (O3);
  see Technical integration and Version in [2-design.md](2-design.md).

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | R4: results of [research/active-predictions.sql](research/active-predictions.sql), the active count, the longest real text and the monthly growth | Resolved 2026-11-02: 7 active, about 2 a month, longest entry 105 chars; page size stays 5 |
| O2 | Unit tests need Node on this machine, which has none. Install Node 20 or later and adopt `node --test` as the project's `test` command, or check by hand only? | Resolved 2026-11-02: install Node, `node --test` |
| O3 | Version: none, or adopt version tags now? | Resolved 2026-11-02: tags, build 01 is 1.1.0-alpha; publish = Heroku deploy + tag |
| O4 | The exact Heroku deploy command, for the `deploy` and `publish` facts in `docs/project.md` | Resolved 2026-11-02: Heroku auto-deploys `main`, so `git push origin main` |

## Notes for whoever picks this up

- Node is not installed on the developer's machine, and `node_modules` is absent. The bot
  runs on Heroku and is checked by hand in the Discord server.
- Live data must not be written while accepting this build. Open the bet modal, then cancel it.
- Every push to `main` deploys to the live bot. Development commits locally and pushes only
  when a feature is ready for the developer to accept on the server.
