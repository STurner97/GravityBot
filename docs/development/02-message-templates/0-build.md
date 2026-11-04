---
build: 02-message-templates
phase: 4-review
status: awaiting-signoff
size: standard
format: 2
signed_off: 1-requirements, 2-design, 3-development
signed_off_by: 1-requirements=Ferby, 2-design=Ferby, 3-development=Ferby
blocked_on: 
accepted: 133bbb934aa69ebd87457c864faba835aa970549
version: 1.2.0-alpha
stage: alpha
gate: documents match reality, final acceptance passed, next steps written
next: Developer signs off review: final acceptance 1-2 passed on 25d3d99; then publish on sonnet
updated: 2026-11-04
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
- **2026-11-03** — development: C1 narrowed to the Next check; second-account check dropped
  (W10). C2 not built, deferred as W11. See the edit log of [1-requirements.md](1-requirements.md).
- **2026-11-03** — developer reworded `balance.own` (M6) and then `balance.other` (`29be1cf`).
- **2026-11-03** — review: issues I1-I4; W12 and W13 added. Developer chose build 03 = W11, W12,
  W13; configuration (W4) moves to build 04. See [4-review.md](4-review.md).

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | Design push-back P1-P3: does the developer re-agree amended M2 (wording tests on a reference copy), M5 (parse error names line and column) and C2 (adds the router's channel denial)? See [2-design.md](2-design.md) | Resolved 2026-11-03: re-agreed with the design sign-off |

## Notes for whoever picks this up

- Every push to `main` deploys to the live bot. The developer pushes.
- Live data must not be written while accepting this build. The R8 plan in
  [2-design.md](2-design.md) shows how the resolve and void messages were seen on throwaway
  predictions.
- `messages.json` now differs from the reference file on purpose: the developer has reworded
  messages, and will keep doing so.
