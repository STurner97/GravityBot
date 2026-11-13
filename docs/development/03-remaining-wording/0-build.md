---
build: 03-remaining-wording
phase: 2-design
status: awaiting-signoff
size: standard
format: 2
signed_off: 1-requirements
signed_off_by: 1-requirements=Ferby
version: 1.3.0-alpha
stage: alpha
blocked_on: 
gate: developer approves the design and feature plan, including any revised MoSCoW
next: developer reviews the design (F1–F4, 1.3.0-alpha) and answers O1–O5, then signs off
updated: 2026-11-13
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

## Open questions

| # | Question | Status |
|---|---|---|
| O1 | M4: broken pin message posts nothing and logs (recommended), or falls back to built-in text? | open, at design sign-off |
| O2 | Generic error wording: keep `❌ Reset failed.` and `❌ Failed to force pin.`? | open, at design sign-off |
| O3 | Debug and pinboard reuse `denied.admin`, `prediction.notFound`, `optionList` (recommended), or keep their own copies? | open, at design sign-off |
| O4 | Is `ALLOWED_CHANNEL_IDS` set on Heroku, so the channel denial can be seen live? | open, at design sign-off |
| O5 | Run forcepin's happy path live on a test message, or leave it to tests (recommended)? | open, at design sign-off |

## Notes for whoever picks this up

- The worker never reads `messages.json` before this build. Treat it as the riskiest seam.
- Never run `/debug reset` live: it truncates every table.
