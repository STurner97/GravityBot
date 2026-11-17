# Build 04 — Phase 3: Development

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 3 of 5 · in progress
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
| F1 — Taking pins down (push A, migration, push B) | M3, M4, M5, M6, M7, M8, S1 | building: push A live, migration verified (MC1); code and tests committed locally, awaiting push B and live check |
| F2 — Admin re-checks | M1, M2 | planned |

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
| MC1 | Migration adds the column and changes no row (M8) | `/debug sql` count before: 7. Developer ran `npm run migrate` in the Heroku Run console. `SELECT pin_state, COUNT(*) … GROUP BY 1` after | Pass: `natural` 7, the total is unchanged |

## Feedback and triage

<!-- Every piece of feedback from acceptance testing, and where it went, in caveman rows.
     Actioned now (and how), deferred to the Won't-have list with a destination (W<n>), or a
     requirement changed (amended in 1-requirements.md, set back to proposed until the developer
     re-agrees it). Nothing is built because it was small and you were already there. -->

| Feedback | Decision | Where |
|---|---|---|

## How it works

<!-- The learning material: the shape of the build, the subtle parts, the parts that look wrong
     but are deliberate, and where to start reading. Link to 2-design.md rather than repeating
     it; record here where the build departed from the design, and why. -->

## Known issues

<!-- What is known to be wrong now, and whether it blocks acceptance. -->

## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each. The only
     append-only section:
     - **YYYY-MM-DD** — what changed, and why if it is not obvious.
     check requires at least one dated entry before sign-off. -->

- **2026-11-17** — F1 code and tests: pinRules, handleMessageDeleted, row-first removal, forcepin writes forced; 206 tests pass.
- **2026-11-17** — dev doc opened; F1 push A committed (migrate column, 1.4.0-alpha).

## Evidence
