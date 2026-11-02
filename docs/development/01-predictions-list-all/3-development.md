# Build 01 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 01 — List all active predictions** · Phase 3 of 5 · in progress
> [← Design](2-design.md) · [State](0-build.md) · Review → · [All builds](../README.md)
<!-- /pipeline:nav -->

<!-- This document describes the build AS IT IS NOW. Rewrite sections when they change; do not
     append corrections below them. History goes in one place: the edit log at the end. -->

## Stack and tooling

Existing stack (Node.js ES modules, discord.js v14, Express, `pg`), recorded in
[project.md](../../project.md). Tests use Node's built-in runner, as agreed in the design (O2).
Node v26.13.0 (LTS) was installed from the official tarball into `~/.local/opt`, linked from
`~/.local/bin`, checksum verified.

| Task | Command |
|---|---|
| test | `npm test` (`node --test`; finds `*.test.js` beside the code) |


## Features

| Feature | Requirements | Status |
|---|---|---|
| F1 — Private paged list with working buttons | M1, M2, M3, M4, M6, S1 | built, tests green; waits for a deploy so the developer can accept it live |
| F2 — Entry layout and length safeguard | M5, M7, C1 | planned |


## Acceptance — requirement by requirement

<!-- The build is accepted against this table, so it grows during the cycles, not at the end.
     Every Must needs a real verdict before sign-off; check fails on blanks and "not yet run".
     Shoulds and Coulds belong here too when built. Demonstrated by: the command, screen or test
     that shows it. -->

| # | Requirement | Demonstrated by | Verdict |
|---|---|---|---|

## Manual checks

<!-- For code behind a seam that cannot be unit tested. The agent runs every command; the
     developer does only what needs a person -- an in-game action, a look at a screen -- and
     reports what they see. Record real results, never "should pass". -->

| # | Check | How | Result |
|---|---|---|---|

## Feedback and triage

<!-- Every piece of feedback from acceptance testing, and where it went, in caveman rows.
     Actioned now (and how), deferred to the Won't-have list with a destination (W<n>), or a
     requirement changed (amended in 1-requirements.md, set back to proposed until the developer
     re-agrees it). Nothing is built because it was small and you were already there. -->

| Feedback | Decision | Where |
|---|---|---|

## How it works

Start at [predictionsList.js](../../../src/features/betting/predictionsList.js). The design
([2-design.md](2-design.md)) explains the shape; what is worth knowing in the code:

- `buildPredictionsListPage` is pure. It takes the page size as an argument so tests never import
  `src/config.js`, which throws without Discord and database variables.
- The page number rides in the Previous/Next `custom_id` (`predictions_page:<n>`, zero-based).
  Any value is clamped to a real page, so a button on a list left open after a prediction was
  resolved still lands somewhere valid.
- `loadPredictionsPage` is the one adapter both the slash command and the paging button call, so
  fetch, build and log exist once.
- Previous or Next is left out rather than disabled at the ends of the list, as M2 says.
- Bet buttons share one row, up to 5. A page size over 20 would need a sixth row, so
  `assertPageSizeFitsRows` stops startup if `PREDICTIONS_PAGE_SIZE` is changed that far.

Departure from the design: the builder also returns `pageIndex` and `pageCount`, so the handler can
log the page actually shown without repeating the clamp.


## Edit log

- **2026-11-02** — dev started. Node installed, `node --test`, version 1.1.0-alpha stamped. F1 built test-first (17 tests).

## Evidence
