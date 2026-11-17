---
build: 04-admin-checks-and-unpin
phase: 5-publish
status: signed-off
size: standard
format: 2
signed_off: 1-requirements, 2-design, 3-development, 4-review, 5-publish
signed_off_by: 1-requirements=Ferby, 2-design=Ferby, 3-development=Ferby, 4-review=Ferby, 5-publish=Ferby
blocked_on: 
accepted: e9af5c041de809f727a1be64f32700c94407b708
version: 1.4.0-alpha
stage: alpha
gate: developer confirms the distributable installs and runs; version and stage recorded, or nothing to publish
next: build complete
updated: 2026-11-17
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
- **2026-11-14** — requirements signed off: M1-M8, S1 agreed as drafted.
- **2026-11-14** — design drafted: `pin_state` column, row-first removal, F1 takedown then F2
  re-checks, 1.4.0-alpha; O1-O4 put to the developer and answered ([2-design.md](2-design.md)).
- **2026-11-14** — design signed off: F1 takedown (push A, migration, push B), then F2.
- **2026-11-17** — F1 and F2 built and accepted live; see [3-development.md](3-development.md).
- **2026-11-17** — development signed off, `e9af5c0` accepted. Review: README and CLAUDE.md
  updated, I1-I5 found and proposed for later builds (W7-W11); see [4-review.md](4-review.md).
- **2026-11-17** — final acceptance waived by the developer, not run.

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | How is `npm run migrate` run against the live database after push A: Heroku dashboard "Run console" (recommended, the secret stays on Heroku), or locally with the live `DATABASE_URL`? | answered: Run console |
| O2 | A forced post keeps the forced heading until it turns natural (recommended), or is rewritten as ordinary at its first 📌 change, as today? | answered: keep forced heading |
| O3 | Which already-resolved prediction does the M2 live check submit `/resolve` for? | answered: the developer picks one at the time |
| O4 | M3, M5, M6 live: take down a natural pin the developer chooses, then bring it back with forcepin and one 📌 toggle (recommended), or unit tests only? | answered: unit tests only |

## Notes for whoever picks this up

- Never run `/debug reset` live: it truncates every table.
- `migrate.js` is not run on deploy. It runs by hand, and against the live database only with
  the developer's word (M8).
- A forcepin on a real message posts publicly in the pinboard channel.
