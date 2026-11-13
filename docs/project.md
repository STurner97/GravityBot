# GravityBot

GravityBot is a Discord bot for a small private server of friends, used daily. It began as a
credit-based prediction-betting bot and now also runs a pinboard (starboard) and admin debug
tools. The developer is its sole maintainer; other server admins run the admin-only slash
commands, gated by `ADMIN_IDS`. It was largely vibe coded, and is being brought up to
pipeline's standard for agentic development.

It runs as two Heroku processes: a REST interaction handler (`app.js`) and a gateway worker
(`pinboard-worker.js`). Heroku deploys automatically from `main` on GitHub (`origin`), so
**every push to `main` goes live** on the server. Work in progress stays local or on another
branch until it is meant to be deployed. Publishing a version is that deploy plus a
`v<version>` tag (see [development/VERSIONS.md](development/VERSIONS.md)).

## Facts

| Fact | Value |
|---|---|
| stack | Node.js (ES modules), discord.js v14, Express, PostgreSQL (pg) |
| test | npm test |
| build | — |
| lint | — |
| deploy | git push origin main |
| publish | git push origin main |
| docs | [README.md](../README.md), [CLAUDE.md](../CLAUDE.md) |

## Production configuration

Heroku's config vars, as the developer confirmed on 2026-11-13: `ADMIN_IDS`,
`ALLOWED_CHANNEL_IDS`, `APP_ID`, `DATABASE_URL`, `DISCORD_TOKEN`,
`PINBOARD_MESSAGE_CONTENT_INTENT` and `PUBLIC_KEY`. That is every variable in the README's
[Environment variables](../README.md#environment-variables) table, which says what each one does.
`PORT` is set by Heroku itself. Because `ALLOWED_CHANNEL_IDS` is set, the bot answers only in the
listed channels and denies use anywhere else. Values are secrets and are never written down here.

## Ground rules

- **Live data is not touched**, prediction bets above all. Anything that could change or delete
  production rows runs on throwaway data or after a backup, and is said aloud first.
- Follow [CLAUDE.md](../CLAUDE.md): readability, SOLID, DRY, parameterised SQL, explicit
  admin checks, structured logs.
- New slash commands, modals and buttons are added as files under `src/features/`, registered
  in the dispatch maps, never as new branches in the core handler.
- `commands.js` is the single source of truth for slash command definitions.
- Pure logic has unit tests (`npm test`, Node's built-in runner, `*.test.js` beside the code).
  Handlers and Discord responses are checked by hand in the Discord server.

## Where the documentation is

- [README.md](../README.md): architecture, directory layout, how to add a feature.
- [CLAUDE.md](../CLAUDE.md): coding standards for this repo.
- `docs/development/`: pipeline builds, one folder per build.

No other notes exist; the history is in git.
