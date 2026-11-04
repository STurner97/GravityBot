# Build 02 — Phase 5: Publish

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 5 of 5 · in progress
> [← Review](4-review.md) · [State](0-build.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Version

| | |
|---|---|
| Version | 1.2.0-alpha |
| Stage | alpha. Build 03 (the rest of the wording) and build 04 (configuration) are still planned, so the project is far from full |
| Planned at design | 1.2.0-alpha, alpha. Unchanged: the scope held |
| Previous version | 1.1.0-alpha (build 01) |
| Builds included | [02](0-build.md) |

## Distributable

The bot is installed by deploying it: Heroku builds `main` on every push, and the project's
publish command is `git push origin main` ([docs/project.md](../../project.md)). The agent
does not run it, because a push to `main` is a production deploy and is the developer's act.
Nothing is left to push: `HEAD` and `origin/main` are the same commit, `f8be73f`, so the
sign-off commit already carried the build to Heroku. `package.json` says `1.2.0-alpha`. The
distributable is that commit; `messages.json` has the sha256 in Evidence. `npm test` passes
118 of 118 on it.


## Release notes

**GravityBot 1.2.0-alpha** (alpha: for the developer's own testing, not public)

What you can do now:

- Change what the bot says by editing one file, `messages.json`. Open it, change the text,
  commit and push. No JavaScript is touched. Each message lists the values it may use, such as
  `{amount}` or `{predictionId}`, and lists (bets, winners, balances) can be reworded line by
  line. See *Changing the wording* in the [README](../../../README.md).
- `npm test` now fails if the file does not parse (it names the line and column), if a message
  is missing, or if a message uses a value it is not given. Run it before you push.

What changed:

- Every betting message now comes from that file: replies, modals, buttons, error replies,
  announcements and the `/predictions` list. They read as they did before, except the
  deliberate rewords made through the file: the balance messages, the `/mybets` line, and
  counts without a plural form, which now say "Credit(s)".
- If a bad edit gets past the tests, only the command that uses the broken message fails. The
  rest of the bot keeps working.

Known not to work or not covered:

- Pinboard, debug and channel-denial messages are still written in the code (build 03).
- `/debug reset` still shows the database's own error text to an admin (build 03).
- Discord's length limits on modal titles, labels and button labels are not yet checked by
  `npm test`. A reword past a limit would break that modal live (build 03).
- Seen only in unit tests, never live: the Next button on a list left open across a resolve,
  "too rich to beg", and the no-winners and no-refunds announcements.

## Install test

This project's install is a deploy, so the install test is the deployed bot. The agent cannot
see Heroku, so the developer confirms the first two rows. The deploy was the developer's
push, not a clean install on a new app, so each row is `Pass with a limit` once seen.

Review owes nothing to publish ([4-review.md](4-review.md), *Requirements met*), so no
requirement id needs a row here.

| # | Check | Result |
|---|---|---|
| 1 | Heroku is running a release built from the reviewed code (Activity tab) | Pass with a limit: release v69, `Deploy 2f554ae4`, build succeeded at 00:12:25. That is the docs commit after `f8be73f`, so the code is the reviewed code. A deploy over the running app, not a clean install |
| 2 | The web dyno log shows `[Messages] file=messages.json messages=62 problems=0` for that release | Pass with a limit: web.1 logged it at 00:12:31, then `Listening on port 8811` and `up`. The worker logged in as GravityBot#7124 and loads no messages until W11 |
| 3 | `/balance` and `/predictions` answer in Discord with the reworded text | Pass with a limit: the developer ran both and reported all passed. Seen on the running app after a deploy, not a clean install |


## Withdrawing it

Revert the build's code and push: `git restore --source=186ab7a^ --staged --worktree -- .
':!docs'`, commit, push (full steps and the throwaway-worktree trial in
[4-review.md](4-review.md), *Deployment*). To undo one reword only, `git revert <commit>` and
push. As a stopgap, Roll back on the Heroku Activity tab restores the previous release, but
`main` must be reverted as well or the next push brings it back. The build changes no table,
so no data needs restoring.


## Edit log

- **2026-11-04** — publish: 1.2.0-alpha confirmed; notes and install test written.
- **2026-11-04** — install rows 1-2 recorded from developer's Heroku log (v69, 2f554ae); row 3 passed (developer).

## Evidence

```console
$ git rev-parse HEAD origin/main && git status -sb | head -1
f8be73f453f232d9b06f11a68dbba4c686f32bf9
f8be73f453f232d9b06f11a68dbba4c686f32bf9
## main...origin/main
```

```console
$ sha256sum messages.json && git log --oneline 186ab7a^..HEAD -- messages.json src | wc -l
2fa54e76f44a86b971deedf86be77d8dda6f61046d4ba54051c9c77c9e489c87  messages.json
10
```

```console
$ npm test 2>&1 | tail -12
✔ a list is the header, then each item, joined by the separator (0.20078ms)
✔ an empty list shows the empty text and no header (0.14213ms)
✔ a list without a separator joins items directly (0.13786ms)
✔ a list header and empty text can use the values given beside the items (0.15644ms)
ℹ tests 118
ℹ suites 0
ℹ pass 118
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 127.321917
```
