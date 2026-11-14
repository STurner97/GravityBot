---
build: 03-remaining-wording
phase: 5-publish
status: awaiting-signoff
size: standard
format: 2
signed_off: 1-requirements, 2-design, 3-development, 4-review
signed_off_by: 1-requirements=Ferby, 2-design=Ferby, 3-development=Ferby, 4-review=Ferby
blocked_on: 
accepted: 10e57e7ff70d83cbc3d2a84908de121e218b2830
version: 1.3.0-alpha
stage: alpha
gate: developer confirms the distributable installs and runs; version and stage recorded, or nothing to publish
next: developer confirms install rows 1-2 (Heroku release and logs) and signs off publish
updated: 2026-11-14
---

# Build 03 — Pinboard, debug and channel-denial messages from the template file

**Read this file first.** It is the only file you need to know where this build stands.

## What this build is

The rest of the bot's wording joins the betting messages in `messages.json`: the pinboard's
replies and the pin post the worker makes, the debug tools, and the router's channel denial,
each reading exactly as today. `npm test` also learns Discord's length limits, so an over-long
reword is caught before a push, and `/debug reset` and `/pinboard forcepin` stop showing raw
errors. The unused root `pinboard.js` is deleted.

## Why it is this build

Chosen in build 02's review: it holds that build's one untested seam, the pinboard worker
reading the file, and closes the length-limit gap now that the developer rewords. See
[1-requirements.md](1-requirements.md).

## What changed during the build

- **2026-11-13** — build opened from build 02's W11, W12, W13; S1 (`clientReady`) new from the publish log.
- **2026-11-13** — design drafted, 1.3.0-alpha planned; O1–O5 put to the developer ([2-design.md](2-design.md)).
- **2026-11-13** — F1 (pin post from file, worker failure wrapper, clientReady) built, 1.3.0-alpha stamped; awaiting push and live check ([3-development.md](3-development.md)).
- **2026-11-14** — F2, F3, F4 built and accepted live; all Musts have verdicts; development signed off, `10e57e7` accepted.
- **2026-11-14** — review: docs brought current; I1 (admin re-check) and I2 found, out of scope as W10, W11; final acceptance planned ([4-review.md](4-review.md)).

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | M4: broken pin message posts nothing and logs (recommended), or falls back to built-in text? | answered: post nothing, log |
| O2 | Generic error wording: keep `❌ Reset failed.` and `❌ Failed to force pin.`? | answered: kept |
| O3 | Debug and pinboard reuse `denied.admin`, `prediction.notFound`, `optionList` (recommended), or keep their own copies? | answered: reuse |
| O4 | Is `ALLOWED_CHANNEL_IDS` set on Heroku, so the channel denial can be seen live? | answered: set; recorded in `docs/project.md` |
| O5 | Run forcepin's happy path live on a test message, or leave it to tests (recommended)? | answered: tests only |

## Notes for whoever picks this up

- The worker never reads `messages.json` before this build. Treat it as the riskiest seam.
- Never run `/debug reset` live: it truncates every table.
