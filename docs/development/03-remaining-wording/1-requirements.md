# Build 03 — Phase 1: Requirements

<!-- pipeline:nav -->
> **Build 03 — Pinboard, debug and channel-denial messages from the template file** · Phase 1 of 5 · in progress
> [State](0-build.md) · Design → · [All builds](../README.md)
<!-- /pipeline:nav -->

## The problem

Build 02 moved every betting message into `messages.json`, so the developer now rewords the
bot by editing one file and pushing. The rest of the bot did not move. The pinboard's replies
and the pin post itself, the debug tools' replies, modal and buttons, and the router's "only in
specific channels" denial are still string literals in JavaScript: about 40 strings across
`src/features/pinboard/`, `src/features/debug/` and `src/interactions/router.js`. Half the
bot's wording therefore still needs a code edit, and the file's promise, one place for the
wording, is only half kept. The root `pinboard.js`, which nothing imports, still sits beside
the real pinboard code.

Build 02's review also found two gaps:

- **Length limits (I1).** Discord refuses a modal whose title or field label is over 45
  characters, a placeholder over 100, or a button label over 80. `npm test` does not check
  them. Since the developer now rewords freely, an over-long reword passes the tests and then
  breaks that modal or list live, in front of the friends who use the bot.
- **Raw errors (I4).** `/debug reset` shows the database's own error text when it fails, against
  CLAUDE.md's rule that error replies stay generic. `/pinboard forcepin` does the same with
  "Failed to force pin: …". The `/debug sql` console also shows the database's error, but on
  purpose: an admin typing SQL needs to see why it failed.

The pinboard worker is a separate Heroku process that has never read `messages.json`. Once it
posts the pin from the file, a file it cannot read could stop pins being posted. This is the
build's riskiest seam.

### Why this build, and why now

The developer chose this order in build 02's review. It holds that build's one untested seam,
the worker reading the file, and it closes the gap that rewording can fall into (I1), now that
rewording has started. Configuration (build 04) comes after, and will be easier to check
once every message is in the file, because its values show there as placeholders.

## Scope

### Must have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| M1 | Every message the pinboard, debug and router features show users takes its text from `messages.json`: `/pinboard` replies, the pin post the worker makes (its "📌 N Pins" heading and "Posted by" field) and the forced pin, `/debug` replies, its SQL modal and its reset buttons, and the channel denial | Read the file: each of those messages is there. Search those features' code: no user text left in JavaScript, apart from W2 and W9 | proposed |
| M2 | Every moved message reads exactly as on `11f4e9e`, character for character | A wording test per message, built from a frozen reference copy of today's wording. A smoke run in Discord shows no change: a real pin, `/pinboard whitelist_list`, a read-only `/debug` command, the reset prompt cancelled, and the channel denial | proposed |
| M3 | The pinboard worker reads the same `messages.json` as the web process, and checks it at startup the way the web process does | After deploy, the worker's Heroku log shows its `[Messages] … problems=0` line, and the next real pin posts as before | proposed |
| M4 | A broken pinboard message in the deployed file fails only the posts that use it. The worker keeps running and logs the problem | Unit test: a worker given a broken pin message logs the problem and posts nothing for that pin, without crashing. Design chooses the exact behaviour | proposed |
| M5 | `npm test` fails when a message is longer than Discord allows where it is shown: modal title, field label, placeholder, button label, and embed author and field text. It names the message and the limit | Lengthen one modal title past the limit; `npm test` fails and names it; restore it | proposed |
| M6 | `/debug reset` shows a generic error if the reset fails. The full error goes to the log | A unit test makes the reset fail: the reply is generic and the log line holds the error. Not triggered live: a real reset empties every table | proposed |
| M7 | `/pinboard forcepin` shows a generic error if the force pin fails. The full error goes to the log | Live: forcepin on the link to a message that does not exist. The reply is generic, the log holds the error, and nothing is posted | proposed |
| M8 | The unused root `pinboard.js` is deleted | A search shows nothing imported it; `npm test` passes; the bot runs after deploy | proposed |

### Should have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|
| S1 | The pinboard worker listens for `clientReady`, not the deprecated `ready` | After deploy, the worker log has its login line and no `DeprecationWarning` | proposed |

### Could have

| # | Requirement | Accepted by | Agreed |
|---|---|---|---|

### Won't have — in this build

| # | Deferred | Where it goes |
|---|---|---|
| W1 | A generic error on the `/debug sql` console | Dropped: the console shows the database's error on purpose, so an admin can see why their SQL failed |
| W2 | The router's JSON error bodies (`unknown command`, `internal error` and the rest) | Stay in code: they go back to Discord's API, not to a user |
| W3 | Rewording any message | After this build, through the file |
| W4 | Values inside messages becoming settings (default credits, beg limit, donate amounts, pin threshold) | Build 04, configuration |
| W5 | Slash command names and descriptions | Stay in `commands.js`, the recorded single source of truth |
| W6 | Log lines | Stay in code: read by the developer in Heroku logs, not by users |
| W7 | The betting checks never run live: Next across a resolve, "too rich to beg", the no-winners and no-refunds announcements (build 02's C1 and review) | Build 04, or whichever build next touches betting. This build does not change betting |
| W8 | Any change to how SQL is configured or run; a way to see resolved predictions | Not planned (build 02's W8 and W9) |
| W9 | The layout of the `/debug sql` result table (column padding, separators, `NULL`) | Stays in code: it is formatting of the database's data, not wording. The text around it ("Query executed", "… and N more rows") moves under M1 |

## Decisions taken in this phase

- Size is standard. The build is numbered 03, as chosen in build 02's review.
- The moved text reads exactly as today, proven against a frozen reference copy, as in build 02.
  Rewording comes after, through the file.
- The pin post is in scope, so the worker reads the file. That seam is the reason for M3 and M4.
- Forcepin's error becomes generic (M7). The SQL console's stays raw (W1).
- `/debug reset` is never run live. Its failure is proven by a unit test (M6), and the live check
  is the prompt, cancelled.

## Research for the design phase

| # | Question | What it settles |
|---|---|---|
| R1 | An inventory of every user-visible string in `src/features/pinboard/` (worker included), `src/features/debug/` and `src/interactions/router.js`, with where each is built and the values it uses | The list M1 and M2 are checked against; nothing is missed |
| R2 | How the worker loads `messages.json`: the module it imports, the path on a Heroku worker dyno, and what it should log and do on a broken file at startup and per post | M3 and M4's shape |
| R3 | Whether this build's reference wording joins build 02's frozen file or gets its own at `11f4e9e`, and how the wording tests stay independent of rewording | How M2 is proven without blocking later rewords |
| R4 | Discord's length limit for each place a message is shown (modal title, label, placeholder, button label, embed author name, embed field name and value), quoted from discord.js or Discord's docs; and how `npm test` learns which message is shown where | M5's limits and where they live (`src/lib/discordLimits.js` already holds the message limit) |
| R5 | What `resetDatabase` and forcepin can fail with, how to reply generically while logging the full error, and a forcepin input that fails before anything is posted or written | M6 and M7, and a live check of M7 that writes nothing |
| R6 | How a pin and the `/debug` commands are seen live without touching real data: which `/debug` subcommands only read, and whether a test pin leaves a `pinboard_posts` row or a post that friends see, and how to clear it | A safe acceptance plan under the live-data ground rule |
| R7 | Whether the installed discord.js (`^14.16.3`) emits `clientReady`, and from which version | Whether S1 needs a dependency bump |

## Edit log

- **2026-11-13** — first draft from build 02 candidates and developer answers (size, forcepin, identical wording, pin post in scope); all rows proposed.
