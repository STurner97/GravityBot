---
build: 03-remaining-wording
phase: 1-requirements
status: awaiting-signoff
size: standard
format: 2
signed_off: 
blocked_on: 
gate: developer agrees the MoSCoW list, Won't-have included
next: the developer agrees the MoSCoW list in 1-requirements.md, Won't-have included
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

## Open questions

| # | Question | Status |
|---|---|---|

## Notes for whoever picks this up

- The worker never reads `messages.json` before this build. Treat it as the riskiest seam.
- Never run `/debug reset` live: it truncates every table.
