# Build 04 — Phase 5: Publish

<!-- pipeline:nav -->
> **Build 04 — Admin re-checks and taking pins down** · Phase 5 of 5 · in progress
> [← Review](4-review.md) · [State](0-build.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Version

| | |
|---|---|
| Version | 1.4.0-alpha |
| Stage | alpha. Build 05 (configuration) and build 06 are still planned, so the project is far from full |
| Planned at design | 1.4.0-alpha, alpha. Unchanged: the scope held |
| Previous version | 1.3.0-alpha (build 03) |
| Builds included | [04](0-build.md) |

## Distributable

The bot is installed by deploying it: Heroku builds `main` on every push, and the project's
publish command is `git push origin main` ([docs/project.md](../../project.md)). The agent
does not run it, because a push to `main` is a production deploy and is the developer's act.

The code is already live. `7d8ac59` is on `origin/main`; the build's code went out in the
steps in [4-review.md](4-review.md), *Deployment*. The six commits ahead of it change
documents only: the diff outside `docs/` touches `README.md` and `CLAUDE.md`, and no code
(Evidence). `package.json` says `1.4.0-alpha`. Pushing those commits redeploys the same code.

## Release notes

**GravityBot 1.4.0-alpha** (alpha: for the developer's own testing, not public)

What you can do now:

- Take a pin off the pinboard by deleting its post. A pin made with `/pinboard forcepin` goes
  back to being an ordinary message. A pin that reached the threshold with 📌 reactions stays
  down: more 📌 reactions do not bring it back.
- Bring a taken-down pin back with `/pinboard forcepin`. It posts again as a forced pin.
- A forced pin that reaches the threshold becomes an ordinary pin.

What changed:

- The `/debug reset` confirm buttons and the `/resolve` form now check the admin list again
  when pressed, before they change anything. A non-admin gets the usual denial, and the
  denial is logged.
- The bot's own removals (for example a pin that falls below the threshold) ban nothing.
- The database gained a `pin_state` column on pinned posts. Existing pins read as ordinary
  pins and no value changed.

Known not to work or not covered:

- A pin made with forcepin before this version is stored as an ordinary pin. Deleting its post
  bans it instead of forgetting it. A forcepin brings it back.
- A forced pin shows its heading with the 📌 count as it was when forced (build 05).
- Forcepin's description still says "(for testing)" (build 05).
- Forcepin on a message already on the board posts a second copy (a later build).
- Six older admin checks log their denials in their own way (a later build).
- A deletion the worker misses leaves a stale row that re-posts the pin at one 📌. Workaround:
  in `/debug sql`, run a `SELECT`, then `DELETE FROM pinboard_posts WHERE message_id =
  '<source message id>'`.
- Not seen live, only in unit tests: a forced pin turning ordinary at the threshold, lifting a
  ban with forcepin, and an existing pin updating after the new code. The final acceptance was
  waived by the developer.

## Install test

This project's install is a deploy, so the install test is the deployed bot. The agent cannot
see Heroku, so the developer confirms the rows. The deploy was the developer's push over the
running app, not a clean install on a new app, so each row is `Pass with a limit`.

Review owes nothing to publish ([4-review.md](4-review.md), *Requirements met*), so no
requirement id needs a row here.

| # | Check | Result |
|---|---|---|
| 1 | Heroku is running a release built from the reviewed code (Activity tab) | not yet run: the developer checks the latest release |
| 2 | Both dynos are up and the bot answers a command | not yet run: the developer runs one command |

## Withdrawing it

Follow *Rolling back* in [4-review.md](4-review.md). In short: `heroku rollback v<N>` to the
release before push B for an immediate return to 1.3.0-alpha's behaviour, then revert the
code for good with `git revert --no-commit ea3090d 7d8ac59`, `git checkout HEAD -- docs`, a
commit and a push. The `pin_state` column stays: the older code ignores it, and dropping it
would lose any ban. A withdrawn number is not reused; the replacement is 1.4.1-alpha.

## Edit log

- **2026-11-17** — publish doc written: 1.4.0-alpha confirmed, release notes, install rows
  awaiting the developer.

## Evidence

```console
$ git log origin/main --oneline -8
7d8ac59 F2 04: admin re-check on reset buttons and resolve form
86a6637 dev 04: missing row was the developer's own delete
e73bfc0 dev 04: F1 live checks recorded, M3-M8 S1 verdicts
ea3090d F1 04: pin_state rules, takedown handler, row-first removal, forcepin forced
b4ab83f dev 04: migration ran live, 7 rows natural
86a6cda dev 04: dev doc opened, F1 building
f339249 push A 04: pin_state column in migrate, stamp 1.4.0-alpha
1e51cad dev 04: enter 3-development
```

```console
$ git diff --stat origin/main HEAD -- . ':!docs' | tail -3; echo exit=$?
 CLAUDE.md |  2 +-
 README.md | 42 +++++++++++++++++++++++++++++++++++-------
 2 files changed, 36 insertions(+), 8 deletions(-)
exit=0
```

```console
$ grep -n '"version"' package.json
4:  "version": "1.4.0-alpha",
```

```console
$ npm test 2>&1 | tail -12
✔ a list is the header, then each item, joined by the separator (0.1657ms)
✔ an empty list shows the empty text and no header (0.09765ms)
✔ a list without a separator joins items directly (0.09781ms)
✔ a list header and empty text can use the values given beside the items (0.1292ms)
ℹ tests 215
ℹ suites 0
ℹ pass 215
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 431.069717
```
