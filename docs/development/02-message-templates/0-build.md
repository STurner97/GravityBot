---
build: 02-message-templates
phase: 3-development
status: in-progress
size: standard
format: 2
signed_off: 1-requirements, 2-design
signed_off_by: 1-requirements=Ferby, 2-design=Ferby
blocked_on: 
version: 1.2.0-alpha
stage: alpha
gate: developer accepts the build: every Must accepted, tests passing, clean tree
next: Developer pushes main (F2 live), then runs /mybets and /beg (as a rich user) and reports; agent checks log for problems=0, messages=16
updated: 2026-11-03
---

# Build 02 — Betting messages from a template file

**Read this file first.** It is the only file you need to know where this build stands.

## What this build is

Every message the betting bot sends, including the `/predictions` list from build 01, takes
its wording from one template file in the repo, with named placeholders for the values. The
developer changes wording by editing that file and pushing, with no JavaScript touched, and
`npm test` catches a broken file before it goes live. Every message reads exactly as it does
today when the build is done.

## Why it is this build

It is the change the developer wants most, build 01 proved the one-place pattern on
`/predictions`, and it changes only text, not how data is read or written.

## What changed during the build

- **2026-11-03** — numbered 02, not the "build 03" of build 01's notes. Config work is now
  build 03; SQL work not planned. See Decisions in [1-requirements.md](1-requirements.md).
- **2026-11-03** — pinboard and debug messages moved from Won't to Could (C2).
- **2026-11-03** — design: developer chose JSON (no new dependency), and that a broken message
  fails only its command while the bot keeps running. See R1 and R7 in [2-design.md](2-design.md).
- **2026-11-03** — design proposed amendments to M2, M5 and C2 (push-back P1-P3).

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | Design push-back P1-P3: does the developer re-agree amended M2 (wording tests on a reference copy), M5 (parse error names line and column) and C2 (adds the router's channel denial)? See [2-design.md](2-design.md) | Resolved 2026-11-03: re-agreed with the design sign-off |

## Notes for whoever picks this up

- Every push to `main` deploys to the live bot. The developer pushes.
- Live data must not be written while accepting this build. The resolve and void messages can
  only be seen on a throwaway prediction, and creating one takes a stake from a real balance;
  design plans that (R8) and the stake is said aloud before it is placed.
