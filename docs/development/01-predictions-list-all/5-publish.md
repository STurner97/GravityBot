# Build 01 — Phase 5: Publish

<!-- pipeline:nav -->
> **Build 01 — List all active predictions** · Phase 5 of 5 · in progress
> [← Review](4-review.md) · [State](0-build.md) · [All builds](../README.md)
<!-- /pipeline:nav -->

## Version

| | |
|---|---|
| Version | 1.1.0-alpha |
| Stage | alpha |
| Planned at design | 1.1.0-alpha. Confirmed: the scope did not move enough to change the number or stage |
| Previous version | 1.0.0, in daily use, untagged before pipeline |
| Builds included | [01](0-build.md) |

Stage reasoning: the roadmap still holds builds 02 to 04 (configuration, message formats, SQL),
so the project is not feature complete. `package.json` already reads `1.1.0-alpha`.


## Distributable

GravityBot is installed by deploying: Heroku builds `main` from GitHub, so the project's
publish command is `git push origin main` (`pipeline project publish`). The developer pushes;
the agent does not.

| What | Value |
|---|---|
| Code to ship | Commit `1135e21` is already live and was the code under final acceptance |
| Waiting to push | 4 local commits up to `ec84fae`; they change documents and the layout test only (`git diff --stat 1135e21 HEAD -- src package.json`: one test file) |
| Tests | `npm test`: 27 of 27 pass on `ec84fae` |
| Checksum | The commit id: `ec84faefe7f5105c3041fa29077ff2058d7be2f0` |

Nothing is built or packaged; there is no file to upload.


## Release notes

### 1.1.0-alpha (alpha, for the developer's server only)

**What you can do now**

- `/predictions` lists every active prediction, not only the newest 5.
- The list is private: only the person who ran the command sees it.
- It shows 5 predictions a page. Use **Previous** and **Next** to move; the same message
  updates. With 5 or fewer predictions there is one page and no paging buttons.
- Every entry keeps its **Bet on #N** button, and it opens the bet modal.
- Each entry shows the ID, question and options, then
  `N bet(s), totalling 💰 N Credits`. The created time is gone.

**What changed**

- `/predictions` is no longer posted to the whole channel.
- Entries too long for a page are shortened with `…` instead of the list failing.

**Known limits**

- Another user seeing nothing was not checked with a second account.
- Next on a list left open after a prediction resolves was only covered by a unit test.
- Old public `/predictions` messages still work; their Bet buttons open the modal.


## Install test

The bot is installed by deploying, and `1135e21` has been live since 2026-11-03, so the
build was accepted on the install itself. The four commits still to push change no bot
behaviour. Rows 1 to 3 are the check after the push.

| # | Check | Result |
|---|---|---|
| 1 | Developer pushes `main`; Heroku deploys `ec84fae` and the app starts | |
| 2 | `/predictions` shows the private paged list in the expected layout | |
| 3 | Bet on a prediction opens the modal, then cancel; no bet placed | |

Requirements owed to publish: none (`4-review.md`, *Requirements met*).


## Withdrawing it

Take the version back by returning the code to the old public `/predictions`:
`git restore --source=d1a0781^ --staged --worktree -- src package.json`, then commit and push
(Heroku redeploys). A faster stopgap is `heroku rollback` or Roll back on the dashboard's
Activity tab; `main` must then be reverted too, or the next push brings the build back. No data
is changed by this build, so none needs restoring. A withdrawn version number is not reused.


## Edit log

<!-- When this document changed and what changed, newest last, one caveman line each:
     - **YYYY-MM-DD** — what changed, and why if it is not obvious.
     check requires at least one dated entry before sign-off. -->

- **2026-11-03** — publish started. Version 1.1.0-alpha confirmed; install test rows await the push.

## Evidence

```console
$ git diff --stat 1135e21 HEAD -- src package.json package-lock.json; echo diff-exit=$?; git rev-parse HEAD; git log origin/main -1 --format='%h %s'
 src/features/betting/predictionsListFormat.test.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
diff-exit=0
ec84faefe7f5105c3041fa29077ff2058d7be2f0
1135e21 tweak formatting
```

```console
$ npm test 2>&1 | tail -12
✔ page sizes 1 to 20 fit in the 5 action rows (1.130241ms)
✔ page size 0 is rejected (0.642951ms)
✔ page size 21 needs more than 5 rows and is rejected (0.24551ms)
✔ a non-integer page size is rejected (3.509243ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 142.722318
```
