# GravityBot – Claude Instructions

GravityBot is a Discord prediction-betting bot built with Discord.js v14, Express, and PostgreSQL (pg pool). It runs as two Heroku processes: a REST interaction handler (`app.js`) and a gateway worker (`pinboard-worker.js`).

---

## Readability (highest priority)

- **Name things for what they do, not how they work.** Prefer `resolvePredictionAndPayOut` over `handleResolve` or `doThing`.
- **Keep functions short and single-purpose.** If a function needs a comment to explain what a block does, extract that block into a named function instead.
- **One level of abstraction per function.** A route handler should call helpers — it should not contain raw SQL, Discord API calls, *and* business logic all in one body.
- **Avoid deeply nested callbacks or conditionals.** Use early returns and guard clauses to keep the happy path left-aligned.
- **Use named constants for magic values.** Replace bare numbers and strings (`3`, `"📌"`, `1000`) with named constants (`MIN_PIN_REACTIONS`, `PIN_EMOJI`, `DEFAULT_CREDITS`).
- **Comments explain *why*, not *what*.** If the code clearly shows what is happening, a comment restating it is noise.

---

## SOLID

- **Single Responsibility.** Each module owns one concern: `db.js` manages the connection pool and transactions, `betting.js` owns betting logic, `pinboard.js` owns pinboard logic. Do not let helpers bleed across these boundaries.
- **Open/Closed.** Add new slash commands or interaction types by registering them in the dispatch map — do not add another `if/else if` branch to the main interaction handler.
- **Liskov Substitution.** Any function that accepts a Discord interaction object should work with any interaction subtype that exposes the same interface. Do not reach inside interaction internals beyond what the type contract provides.
- **Interface Segregation.** Pass only what a function needs. If a helper only needs `userId` and `guildId`, do not pass the entire interaction object.
- **Dependency Inversion.** Database calls belong in `db.js` or the feature module (e.g. `betting.js`), not inline in route handlers. Handlers depend on abstractions (functions), not on raw SQL strings.

---

## DRY

- **No duplicated query logic.** If two handlers run the same query, extract it into a named function in the appropriate module.
- **Reuse existing helpers before writing new ones.** Check `utils.js`, `db.js`, and the relevant feature module before adding code.
- **Centralise Discord response patterns.** Common response shapes (ephemeral error, deferred update, modal reply) should live in `utils.js` so they are consistent across all handlers.
- **Do not repeat validation.** Input validation for a given data type (e.g. credit amounts, prediction IDs) should live in one place and be called wherever that type is used.

---

## Security

- **Never trust user input.** Validate and sanitise all values from Discord interactions before using them in queries, log lines, or API calls.
- **Use parameterised queries exclusively.** Never interpolate user-supplied values into SQL strings. Use `pg` placeholders (`$1`, `$2`, …) at all times.
- **Admin checks must be explicit and early.** Perform the `ADMIN_IDS` check at the top of any admin-only handler before any database read or write occurs.
- **Secrets stay in environment variables.** Do not hardcode tokens, database URLs, or sensitive IDs. Validate that required `process.env` values are present at startup and fail fast if they are missing.
- **Fail closed on permission errors.** If an auth check fails, respond with an ephemeral denial and return immediately — do not fall through to privileged logic.
- **Do not expose internal state to users.** Error responses to Discord should be generic; full error details belong in server logs only.

---

## Logging

- **Use structured log lines.** Prefix every log with a consistent tag and include relevant IDs: `[Betting] userId=123 predictionId=456 action=placeBet amount=100`.
- **Log at decision points, not just errors.** Record when a prediction is created, bet placed, outcome resolved, or permission denied. These are the events that matter for debugging.
- **Always log the full error object on exceptions.** `console.error('[Tag] context', err)` — not just `err.message`.
- **Tag logs by process/module.** Use `[App]`, `[Betting]`, `[Pinboard]`, `[DB]` prefixes consistently so log streams from both Heroku dynos are easy to filter.
- **Log before and after external calls when diagnosing issues.** For Discord API calls or DB transactions, log the intent before and the outcome after (success or failure).

---

## Project conventions

- ES6 modules (`import`/`export`) throughout — do not mix in `require()`.
- Async/await with `try/catch` for all async operations — no `.then().catch()` chains.
- Use `withTransaction(pool, async (client) => { … })` from `db.js` for any operation that touches multiple tables.
- Discord interactions must receive a response within 3 seconds. Defer with `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` immediately if the handler needs to do async work, then follow up.
- Keep `commands.js` as the single source of truth for slash command definitions.
