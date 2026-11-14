# Build 03 — Phase 5: Publish

<!-- pipeline:nav -->
> **Build 03 — Pinboard, debug and channel-denial messages from the template file** · Phase 5 of 5 · in progress
> [← Review](4-review.md) · [State](0-build.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Version

| | |
|---|---|
| Version | 1.3.0-alpha |
| Stage | alpha. Build 04 (admin re-checks and taking pins down) and build 05 (configuration) are still planned, so the project is far from full |
| Planned at design | 1.3.0-alpha, alpha. Unchanged: the scope held |
| Previous version | 1.2.0-alpha (build 02) |
| Builds included | [03](0-build.md) |

## Distributable

The bot is installed by deploying it: Heroku builds `main` on every push, and the project's
publish command is `git push origin main` ([docs/project.md](../../project.md)). The agent
does not run it, because a push to `main` is a production deploy and is the developer's act.

The code is already live. The developer pushed it feature by feature and `21406ef` is on
`origin/main` (release history in [4-review.md](4-review.md), *Deployment*). The three commits
ahead of it (`4c46b50`, `9c4c951`, `2b04088`) change documents only: the diff outside `docs/`
is empty (Evidence). `package.json` says `1.3.0-alpha`, and `npm test` passes 181 of 181.
Pushing those commits redeploys the same code. `messages.json` has its sha256 in Evidence.

## Release notes

**GravityBot 1.3.0-alpha** (alpha: for the developer's own testing, not public)

What you can do now:

- Change every message the bot shows by editing `messages.json`: the pinboard's replies and
  the pin post itself, the `/debug` replies, modal and buttons, and the "only in specific
  channels" denial join the betting messages. Commit and push; no JavaScript is touched. See
  *Changing the wording* in the [README](../../../README.md).
- `npm test` now also fails when a message is too long for where Discord shows it (modal title
  or label, placeholder, button label, embed author, field name or value). It names the
  message and the limit.

What changed:

- The pinboard worker now reads the same file as the bot and reports `[Messages] … problems=0`
  at startup. If a pin message is broken, that pin posts nothing and the problem is logged;
  the worker keeps running.
- `/debug reset` and `/pinboard forcepin` show a generic error when they fail. The full error
  goes to the log. The `/debug sql` console still shows the database's error, on purpose.
- Every moved message reads as before.
- The worker listens for `clientReady`, so the deprecation warning is gone. The unused root
  `pinboard.js` is deleted.

Known not to work or not covered:

- Admins only: the `/debug reset` confirm button and the `/resolve` form do not re-check the
  admin list when pressed (build 04).
- There is no command to take a pin down. Workaround: delete the pin post, then in
  `/debug sql` run a `SELECT` and then `DELETE FROM pinboard_posts WHERE message_id =
  '<source message id>'`. Until then a stale row re-posts the pin at one 📌 (build 04).
- The worker's message-delete listener repeats code from `removeFromPinboard` (build 04).
- Never run live, by design: a broken pin message in the deployed file, and a failing
  `/debug reset` (a real reset empties every table). Both are proved by unit tests.
- Seen only in unit tests, never live: the Next button across a resolve, "too rich to beg",
  and the no-winners and no-refunds announcements (build 05).
- The three `max_length: 100` literals in `buildModals.js` are not read from the limits file.

## Install test

This project's install is a deploy, so the install test is the deployed bot. The agent cannot
see Heroku, so the developer confirms rows 1 and 2. The deploy was the developer's push
over the running app, not a clean install on a new app, so each row is `Pass with a limit`.

Review owes nothing to publish ([4-review.md](4-review.md), *Requirements met*), so no
requirement id needs a row here.

| # | Check | Result |
|---|---|---|
| 1 | Heroku is running a release built from the reviewed code (Activity tab) | Pass with a limit: from the final acceptance (FA1 in [4-review.md](4-review.md)): `origin/main` at `21406ef`, build succeeded 2026-11-14 22:23. A deploy over the running app, not a clean install |
| 2 | Web and worker logs show `[Messages] file=messages.json messages=114 problems=0`, the worker's login line and no `DeprecationWarning` | Pass with a limit: both dynos logged it at that deploy; the worker logged in as GravityBot#7124. Same limit |
| 3 | `/balance`, `/pinboard whitelist_list`, a read-only `/debug` command, forcepin on a bad link and a real pin answer in Discord | Pass with a limit: FA2 to FA7 in [4-review.md](4-review.md), after the bot was re-added to the server (I3). Seen on the running app, not a clean install |

## Withdrawing it

Revert the build's code and push, keeping the documents (full steps in
[4-review.md](4-review.md), *Deployment*):

```sh
git revert --no-commit 2f3f938..0c65dc3
git checkout HEAD -- docs
git commit -m "revert build 03 code"
git push origin main
```

As a stopgap, `heroku rollback v<N>` (or Roll back on the Heroku Activity tab) restores an
earlier release, but `main` must be reverted as well or the next push brings it back. The
build changes no table and no stored data holds wording, so no data needs restoring.

## Edit log

- **2026-11-14** — publish: 1.3.0-alpha confirmed; notes and install test written from review's final acceptance.

## Evidence

```console
$ git rev-parse HEAD origin/main; git status -sb | head -1; git diff --stat origin/main HEAD -- . ':!docs' | tail -1
2b04088d54796f0deb3d9ab552363b46d2ebe61c
21406efedff6d460cc0c4b0aca6c171afd06fc6d
## main...origin/main [ahead 3]
```

```console
$ grep -n '"version"' package.json; sha256sum messages.json
4:  "version": "1.3.0-alpha",
f398fb781b5f55b2599fea7a7961c86edfb7718ba39e01db9ed4bb0c4df9b7fb  messages.json
```

```console
$ npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
ℹ tests 181
ℹ pass 181
ℹ fail 0
```
