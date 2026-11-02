# GravityBot

GravityBot is a Discord bot for a small private server of friends, used daily. It began as a
credit-based prediction-betting bot and now also runs a pinboard (starboard) and admin debug
tools. The developer is its sole maintainer; other server admins run the admin-only slash
commands, gated by `ADMIN_IDS`. It was largely vibe coded, and is being brought up to
pipeline's standard for agentic development.

It runs as two Heroku processes: a REST interaction handler (`app.js`) and a gateway worker
(`pinboard-worker.js`). Heroku is deployed to by hand; no deploy command is recorded yet.

## Facts

| Fact | Value |
|---|---|
| stack | Node.js (ES modules), discord.js v14, Express, PostgreSQL (pg) |
| test | — |
| build | — |
| lint | — |
| deploy | — |
| publish | — |
| docs | [README.md](../README.md), [CLAUDE.md](../CLAUDE.md) |

## Ground rules

- **Live data is not touched**, prediction bets above all. Anything that could change or delete
  production rows runs on throwaway data or after a backup, and is said aloud first.
- Follow [CLAUDE.md](../CLAUDE.md): readability, SOLID, DRY, parameterised SQL, explicit
  admin checks, structured logs.
- New slash commands, modals and buttons are added as files under `src/features/`, registered
  in the dispatch maps, never as new branches in the core handler.
- `commands.js` is the single source of truth for slash command definitions.
- There is no automated test suite yet; changes are checked by hand in the Discord server.

## Where the documentation is

- [README.md](../README.md): architecture, directory layout, how to add a feature.
- [CLAUDE.md](../CLAUDE.md): coding standards for this repo.
- `docs/development/`: pipeline builds, one folder per build.

No other notes exist; the history is in git.
