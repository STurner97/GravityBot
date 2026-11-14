---
build: 04-admin-checks-and-unpin
phase: 1-requirements
status: awaiting-signoff
size: standard
format: 2
signed_off: 
blocked_on: 
gate: developer agrees the MoSCoW list, Won't-have included
next: The developer agrees M1-M8, S1 and W1-W6 in 1-requirements.md, or changes them
updated: 2026-11-14
---

# Build 04 — Admin re-checks and taking pins down

**Read this file first.** It is the only file you need to know where this build stands.

## What this build is

The `/debug reset` confirm buttons and the `/resolve` form submit check `ADMIN_IDS` again
before they write. An admin can take a pin off the pinboard by deleting its post: a forced pin
goes back to being an ordinary message, and a natural pin stays down until forcepin brings it
back. The worker's delete handling stops repeating `removeFromPinboard`.

## Why it is this build

Chosen in build 03's review: it closes the gap in the project's own admin-check rule (I1), on
the two most destructive actions, and gives the pinboard a way to take a pin down (I4). See
[1-requirements.md](1-requirements.md).

## What changed during the build

- **2026-11-14** — build opened from build 03's W10, W11, W12; takedown rules agreed with the
  developer ([1-requirements.md](1-requirements.md), decisions).

## Open questions

| # | Question | Status |
|---|---|---|

## Notes for whoever picks this up

- Never run `/debug reset` live: it truncates every table.
- `migrate.js` is not run on deploy. It runs by hand, and against the live database only with
  the developer's word (M8).
- A forcepin on a real message posts publicly in the pinboard channel.
