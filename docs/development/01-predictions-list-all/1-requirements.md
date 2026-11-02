# Build 01 — Phase 1: Requirements

<!-- pipeline:nav -->
> **Build 01 — List all active predictions** · Phase 1 of 5 · in progress
> [State](0-build.md) · Design → · [All builds](../README.md)
<!-- /pipeline:nav -->

## The problem

`/predictions` lists only the 5 newest active predictions. Any older active prediction cannot
be found in the list, so nobody can click "Bet on #N" for it. Predictions last for months and
are all cleared at the end of the year, so the number of active predictions grows through the
year and the hidden set grows with it. The server is a few friends who use the bot daily.

The cap is a Discord limit, not an arbitrary number. Each prediction gets a "Bet on" button in
its own action row, and a message holds at most 5 rows. A message is also limited to 2000
characters, so simply listing everything in one message cannot work.

### Why this build, and why now

It is a visible defect that gets worse every week, it only reads data, and the other planned
work (configuration, build 02 onward) does not depend on it.

## Scope

<!-- Every row is a candidate the agent suggested or the developer raised, and enters only on the
     developer's explicit yes. Requirement: the current text only, one testable thing; an
     amendment adds "(amended YYYY-MM-DD)" and its history goes in the edit log. Accepted by: how
     the developer will accept it. Agreed: the date the developer agreed the row, "proposed"
     until then, or "fix" for a defect against behaviour already agreed. check refuses sign-off
     while a row is proposed. -->

### Must have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| M1 | `/predictions` lets the user reach every active prediction, not only the newest 5 | With more than 5 active predictions, every one can be reached from the list | proposed |
| M2 | The list is paged, 5 predictions per page, with Previous and Next buttons that update the same message | Click through every page; the first page has no Previous and the last has no Next | proposed |
| M3 | Every prediction on every page keeps its "Bet on #N" button, and it opens the bet modal | Click the button on a prediction from page 2 or later | proposed |
| M4 | The list is visible only to the user who ran `/predictions` | Run it as one user; another user sees no list | proposed |
| M5 | The entry layout stays as today (ID, question, options, created time, bet count), newest first, without the total pot line | Compare a page with today's output | proposed |
| M6 | With 5 or fewer active predictions there is one page and no paging buttons | Run it with 5 or fewer active predictions | proposed |

### Should have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| S1 | The hard-coded values the `/predictions` list depends on (page size, and any other limit it uses) are defined as named settings in the config module (`src/config.js`), not inline in the handler | Read `src/config.js`: each value is there with a name; the handler holds no bare numbers | proposed |

### Could have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| C1 | The text layout of a `/predictions` entry is defined in one place that can be changed without touching the handler logic | Change the layout in that one place and see the list change | proposed |

### Won't have — in this build

<!-- The only mechanical resistance to scope creep in this workflow. Name what this build is NOT
     doing and where it goes instead: a later build, a different tool, or Dropped. Candidates the
     developer turned down land here too. check fails while this is empty. -->

| # | Deferred | Where it goes |
|---|---|---|
| W3 | Any change to how SQL is configured or run | Build 04, needs its own conversation |
| W4 | A way to see resolved predictions | Not planned; raise as a new build if wanted |
| W5 | Showing the total pot anywhere else | Dropped for this list, per the developer |
| W6 | Hard-coded values elsewhere in the bot (beg limits, pin settings, other commands) | Build 02 |
| W7 | Message formatting of commands other than `/predictions`, editable without code | Build 03 |

## Decisions taken in this phase

- Paging is chosen over multiple messages or a list without buttons.
- The list is shown to the invoking user only (reading of "client-sided only"; to confirm).
- The total pot line is removed from the list; the rest of the layout stays.

## Research for the design phase

<!-- What design must find out, and what each answer would settle. -->

| # | Question | What it settles |
|---|---|---|
| R1 | Does a button on an ephemeral message still open a modal when clicked | Whether M3 works with M4 |
| R2 | How to carry the page number so Previous and Next need no stored state | Whether paging needs new storage |
| R3 | Worst-case length of one page of 5 entries against the 2000 character limit | Whether 5 per page is safe, or a character budget is needed |
| R4 | The active prediction count and growth from the developer's SQL | Whether paging is enough or the list needs more |

## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each:
     - **YYYY-MM-DD** — what changed, why if not obvious.
     check requires at least one dated entry before sign-off. -->
- **2026-11-02** — first draft from developer conversation; all rows proposed.
- **2026-11-02** — developer moved W1 to Should (S1) and W2 to Could (C1); both narrowed to the `/predictions` list so they are testable. W1, W2 retired; their wider versions are W6, W7. Other W ids unchanged. All proposed until re-agreed.
