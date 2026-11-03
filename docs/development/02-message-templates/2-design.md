# Build 02 — Phase 2: Design

<!-- pipeline:nav -->
> **Build 02 — Betting messages from a template file** · Phase 2 of 5 · blocked
> [← Requirements](1-requirements.md) · [State](0-build.md) · Development → · [All builds](../README.md)
<!-- /pipeline:nav -->

## Part 1 — Research

Commands and their output are quoted under [Evidence](#evidence) at the end.

### R1 — File format

- **JSON** is built into Node: no dependency. A syntax error names its line and column on
  Node 26: "Expected ',' or '}' after property value in JSON at position 27 (line 4
  column 3)". Line breaks are written `\n` and quotes `\"`, and JSON has no comments.
- **YAML** reads better for messages over several lines, but needs the `yaml` package (2.9.1,
  ISC, no dependencies of its own). Research found traps in unquoted YAML text that hit this
  bot's messages directly: ` #` starts a comment, so `❌ Prediction #5 not found.` silently
  became `❌ Prediction`; text starting `**`, `{` or a backtick, or containing `: `, fails to
  parse. Block literals (`|-`) avoid all of them, but trailing blank lines then depend on `|`,
  `|-` or `|+`, which is easy to get wrong.
- TOML (`smol-toml`) also needs a dependency, and nobody on the project uses it.

**Decided by the developer: JSON.** It needs no dependency, and its rules are few and strict.
To keep messages over several lines readable, a message's text can be written as a list of
lines, which the bot joins with line breaks (see *User interface* below). Node's line and
column are worked out by the bot from the error's position, so the report does not depend
on the wording of whichever Node version Heroku runs.

### R2 — Placeholders

`{name}` with a name in camelCase letters and digits. No message today contains a brace, and
Discord markdown does not use them, so the syntax cannot clash with existing text. A literal
brace is written `{{` or `}}`. Any other `{` is a mistake: an unknown name, or a stray brace,
is reported by `npm test` against the message it is in (M5).

### R3 — Plurals and lists without logic in the file

- **Plurals.** A message can have two forms, `one` and `other`. The code names which value is
  the count, and Node's built-in `Intl.PluralRules('en')` picks the form: `1` is `one`, and
  `0`, `2` and `50` are `other`. That covers `Credit`/`Credits` on donate, and `Pin`/`Pins` on
  the pinboard (C2). `bet(s)` in `/predictions` is literal text, not a plural, and stays as
  it is.
- **Lists.** A list is a `header`, an `item` written once and repeated for each element, an
  optional `separator` between items, and an `empty` text used instead when there are none.
  Today's lists are all of that shape, so every one is reproduced exactly. Options lists
  (`Yes, No`) are one shared list, `optionList`, with `", "` as its separator, replacing five
  separate `join(', ')` calls.
- **Choices between messages** stay in code, as a choice of which message to show, with each
  message whole in the file. `/changebalance` becomes three messages (set, add, remove), and
  the resolve "winners" or "no winners" text is the list's item or empty text.

So every current message can be reproduced with no logic in the file.

### R4 — Errors from `betting.js`

`betting.js` returns 15 error strings, nine distinct (evidence: `grep error: betting.js`). Six
handler sites print them as `❌ ${result.error}`. The change: each `error:` becomes a code
plus the values the message needs, for example `{ code: 'insufficientCredits', balance }`,
and one helper in the betting feature turns a code into its message from `bettingErrors` in
the file. Only `return` lines change. The three unused `message:` fields (`'No winners. All bets lost.'`,
`'Prediction resolved'`, `'Prediction voided'`) are deleted: no caller reads them (evidence:
`grep '\.message\b'`). No query, transaction or `withTransaction` call moves.

The nine codes: `insufficientCredits {balance}`, `negativeBalance {balance}`,
`duplicateOptions`, `tooFewOptions`, `choiceNotAnOption {options}`, `predictionNotFound`, `alreadyResolved`,
`invalidOption {options}`, `cannotBetOnAllOptions {optionCount} {maxOptions}`.

### R5 — Inventory of user-visible text

From the evidence greps of `handlers.js`, `modals.js`, `buttons.js`, `predictionsListFormat.js`
and `betting.js`:

| Where | Messages | Notes |
|---|---|---|
| `/balance`, `/balances` | 6 | own, other, invalid user; header, item, empty |
| `/bet`, `/mybets` | 5 | not found with hint, already resolved; header, item, empty |
| `/predict`, bet and resolve modals | 5 confirmations and errors, 17 modal texts (S1) | created, placed, amount not positive (×2), too few options, choice not an option |
| `/resolve`, `/voidprediction` | 2 announcements, each with a list | winners and refunds lists |
| `/beg`, donate | 5 | too rich, request, donate button (plural), donated (plural), self |
| `/changebalance` | 3 | set, add, remove |
| Shared | 2 | admin denial (3 sites), "Prediction #N not found." (5 sites) |
| `/predictions` | 8 | header, entry, page line, empty, Previous, Next, Bet on #N, cut marker `…` |
| `betting.js` | 9 codes | above |
| Options lists | 1 | `optionList`, used by 5 sites |

About 60 messages in all. Today's three forms of "not found"
stay three messages, because M2 keeps the wording identical; a later rewording can make them
one (W3).

Outside the betting feature (C2): the `/pinboard` replies (11), the pinboard embed (3, with a
plural), `/debug` and its reset button and SQL modal (about 25), and the router's channel
denial (1, see the push-back). Each `/debug sql` result table is laid out from its data and
stays in code; only the text around it moves.

### R6 — The `/predictions` page budget

Build 01 measures each entry's fixed overhead by laying it out with an empty question and
empty options, then shares what is left between them. That still works when the layout comes
from the file, with one exception: if an edit uses `{question}` twice, the overhead is
undercounted and a page could pass 2000 characters, which Discord would reject. Two guards:

- A contract test lays out a worst-case page from the real file (five entries, each with a
  200-character question, 300 characters of options and large numbers) and fails if it passes
  2000 characters. This catches the edit before it is pushed.
- If a page is still over 2000 when it is built, it is cut to 2000 with the cut marker, so
  Discord never rejects it.

### R7 — Loading, a broken file, and tests that read the real file

- The file is read once, when each process starts (the file only changes with a deploy).
- One function, `checkMessages`, both checks the file and builds the messages. `npm test` and
  the bot call the same function on the same file, so whatever the tests pass is exactly what
  the bot accepts.
- **A broken file (decided by the developer): the command fails, the bot keeps running.** At
  startup the bot logs every problem found, one line each. A message with a problem is
  unavailable: a command that needs it fails, and Discord shows "This interaction failed".
  Every other command works. A file that does not parse at all makes every message unavailable, but
  the process stays up, and the next good push brings it back. No fallback wording is kept in
  code.
- The path is resolved from the module's own location (`import.meta.url`), not the working
  directory, so the tests, the web dyno and the worker all find the same file.

### R8 — Seeing resolve and void live without touching real bets

Every step of the plan uses two throwaway predictions, and every step that writes is said
aloud first. The developer's balance ends where it started. Recommended first, by the
developer: a database backup (`heroku pg:backups:capture`).

| Step | Shows | Developer's balance |
|---|---|---|
| `/predict` "Throwaway test, ignore", options `A, B`, choice `A`, 1 credit | Prediction created | −1 |
| Bet on it: option `zzz`, 1 credit | M8: invalid option (writes nothing) | −1 |
| Bet on it: option `B`, 1 credit | M8: cannot bet on all options (writes nothing) | −1 |
| Bet on it: option `A`, an amount above the balance | M8: insufficient credits (writes nothing) | −1 |
| Bet on it: option `A`, 1 credit | Bet placed | −2 |
| `/voidprediction` it | Void announcement, two refunds | ±0 |
| `/predict` a second throwaway, `A, B`, choice `A`, 1 credit; open `/predictions` on page 1 | Prediction created | −1 |
| `/resolve` it with `A`; press Next on the open list (C1) | Resolve announcement, one winner; paging after a resolve | +1 |
| `/changebalance` the developer, remove 1 | Changebalance message | ±0 |

A friend could bet on a throwaway in the minute it is open. Void refunds them automatically,
and the resolve step is done straight after creating, so the second throwaway is open for
seconds. Real predictions are only ever viewed, and their bet modal opened and cancelled.

### R9 — The pinboard worker and C2

The worker is a separate Heroku process (`Procfile`: `worker: node pinboard-worker.js`),
deployed from the same repo, so it reads the same `messages.json` through the same module, in
the same way. The one difference is that a broken pinboard message makes a pin fail to post,
which the worker's existing `try`/`catch` already logs; there is no reply to fail. C2 fits the
design unchanged and is cheap: it is the last feature, built only after the Musts are accepted.

Found on the way: the root `pinboard.js` is a stale copy of `src/features/pinboard/data.js`
that nothing imports (evidence: `git grep`). It holds message text of its own, so C2
deletes it.

## Part 2 — The design

### Core functionality

Every message the betting bot shows (replies, errors, announcements, button labels, modal
text and the `/predictions` list) comes from one file, `messages.json`, in the repo's top
folder. Each message is written whole, with its values shown as `{placeholders}`. To reword,
the developer edits the file, runs `npm test`, commits and pushes. `npm test` says which
message is wrong if the file is broken. After this build, every message reads exactly as it
does today.

### Technical integration / back end

The stack is binding and unchanged: Node ES modules, discord.js v14, Express, PostgreSQL. No
new dependency: JSON is read with Node's own `JSON.parse`, and plurals use Node's own
`Intl.PluralRules`.

The modules, in `src/lib/messages/` (shared, because C2 reuses them in other features):

| Module | Holds | Tested by |
|---|---|---|
| `catalog.js` | Every message the bot needs, the values the code gives it, and its shape (text, plural with its count, list) | — (it is data the tests check against) |
| `checkMessages.js` | Pure: file contents and catalog in, `{ messages, problems }` out. Parse errors become a problem naming the line and column | `checkMessages.test.js`, on small inline files |
| `renderMessage.js` | Pure: one message and its values in, text out. Placeholders, `{{ }}`, plurals, lists, text written as lines | `renderMessage.test.js` |
| `createMessages.js` | Pure: binds the two, giving `text(name, values)`, which throws for an unavailable or unknown message | `createMessages.test.js` |
| `index.js` | Thin adapter: reads `messages.json` once, logs each problem, exports `messageText` | Manual check 1 |

`catalog.js` is the code's half of the contract. The file is checked against it: every
message the catalog names is present and has the right shape; no message is there that the
catalog does not know (a misspelt name); every placeholder is one the code gives; and each
message's `uses` names exactly the catalog's values (S2), so the file can never say a value
is available when it is not.

How the features use it:

- **Handlers stay adapters.** `ephemeral(messageText('balance.own', { balance }))`. The
  handler chooses which message to show and gives the values; the file holds every word.
- **Pure list code takes its messages as a parameter.** `buildPredictionsListPage(predictions,
  page, pageSize, messages)` and `formatPredictionEntry(prediction, maxLength, messages)`, so
  their tests run on a fixed file and need no environment, as in build 01.
- **`betting.js` returns codes** (R4). `bettingErrorReply(error)` in
  `src/features/betting/bettingErrorReply.js` turns one into its ephemeral reply, replacing
  the six `` `❌ ${result.error}` `` sites.
- **Startup logs** one line, `[Messages] file=messages.json messages=N problems=P`, and one
  line per problem: `[Messages] message=bet.placed problem=unknown placeholder {amont}`.

Tests come in two kinds. Neither breaks when the developer rewords a message:

1. **Contract tests on the real file** (`src/lib/messages/messagesFile.test.js`): it parses,
   matches the catalog, and fits the `/predictions` budget (R6). They pass whatever the wording
   is, and fail only when the file is broken (M5).
2. **Wording tests on a fixed reference file**
   (`src/lib/messages/fixtures/wording-cb1f8a5.json`), which holds today's wording: one test
   per message, rendering it as the handler does and comparing with the literal text of `cb1f8a5`
   (M2). Build 01's list tests move onto the same reference file. These prove the code
   assembles messages correctly, and they stay true after the developer rewords the real file,
   which is why they do not read it (see the push-back).

### User interface / front end

Discord users see no change. The developer's new interface is the file. A sample, with today's
wording:

```json
{
  "_howToEdit": [
    "Change the wording, keep the names. Run npm test before you push.",
    "{name} shows a value; \"uses\" lists the values a message may use.",
    "Text can be one string, or a list of lines joined with line breaks.",
    "An empty line \"\" at the end adds a line break after the text.",
    "Write {{ or }} for a brace. Write \\\" for a quote mark."
  ],
  "bet": {
    "placed": {
      "uses": "{predictionId} {question} {userId} {amount} {option}",
      "text": [
        "✅ Bet placed!",
        "",
        "**Prediction #{predictionId}:** {question}",
        "<@{userId}> bet **{amount}** credits on: **{option}**"
      ]
    }
  },
  "myBets": {
    "header": ["🎲 **Your Active Bets:**", "", ""],
    "item": {
      "uses": "{predictionId} {question} {option} {amount}",
      "text": ["**ID {predictionId}:** {question}", "Your bet: **{option}** ({amount} credits)", "", ""]
    },
    "empty": "🎲 You have no active bets."
  },
  "donate": {
    "button": { "uses": "{amount}", "one": "Donate {amount} Credit", "other": "Donate {amount} Credits" }
  },
  "optionList": { "uses": "{option}", "item": "{option}", "separator": ", " }
}
```

The rules, which `_howToEdit` states in the file itself: a message that takes no values can
be plain text; one that does is an object with `uses` and `text` (or `one` and `other`); a
list has `header`, `item`, `separator` and `empty`. Keys starting with `_` are notes, and the
bot ignores them.

### Data

No database change, no migration, nothing to back up for the upgrade. The only new data is
`messages.json`, in the repo, deployed with the code and versioned by git: rolling back the
code rolls back the wording with it. Its shape is described above. The reference file
`wording-cb1f8a5.json` is test data and is never read by the bot.

### How each requirement is met

| # | Satisfied by |
|---|---|
| M1 | `messages.json` holds every betting message (R5's inventory). Handlers, modals, buttons, `predictionsListFormat.js` and `betting.js` call `messageText` or return codes. Acceptance search: `grep` the betting code for text in quotes. The beg name fallback `<@id>` and custom ids are values, not text |
| M2 | Wording tests on `wording-cb1f8a5.json`, one per message, against `cb1f8a5`'s literal text; `messages.json` byte-identical to the reference at acceptance (`cmp`, recorded as evidence before M6 rewords anything); Discord smoke run per feature |
| M3 | `{name}` placeholders in `renderMessage.js`; `uses` beside each message |
| M4 | List shape (`header`, `item`, `separator`, `empty`) in `renderMessage.js`; used for active bets, winners, refunds, balances and the `/predictions` entries |
| M5 | `checkMessages.js`, run by `messagesFile.test.js`: a parse error names line and column, a missing message names the message, an unknown placeholder names message and placeholder |
| M6 | Nothing but `messages.json` holds wording, so a reword is an edit to it alone; done live in F5 |
| M7 | `predictionsList.js` keeps build 01's budget, measured from the file's layout; worst-case contract test and the 2000-character final cut (R6) |
| M8 | Error codes in `betting.js` (R4), `bettingErrorReply.js`, `bettingErrors` in the file; live errors on a throwaway (R8) |
| S1 | Modal titles, labels and placeholders in the file under `predictModal`, `betModal`, `resolveModal`, with the options placeholder's `Enter an option` and `...` cut marker |
| S2 | `uses` on every message that takes values, checked against the catalog |
| C1 | R8 steps: Next on a list left open across a resolve; F3: a second account (or a friend) sees no list |
| C2 | F6: pinboard, debug and router messages in the same file, same catalog and checks |

### Feature plan

Each feature ends with a push, which deploys live; the developer pushes. The riskiest seam
comes first: the file being found and read by the deployed bot on Heroku, plus the checks
that guard every later push.

| Feature | Requirements | Tests first | Accepted by |
|---|---|---|---|
| F1 — The file, its checks, and `/balance` and `/balances` through it | M3, M5, part of M1, M2, M4 | `checkMessages`: parse error with line/column, missing message, unknown placeholder, unknown message, `uses` mismatch, `{{ }}`; `renderMessage`: placeholders, lines, list, empty list; `createMessages`: an unavailable message throws, the rest work; wording tests for the 6 balance messages; contract test on the real file | The agent breaks the file three ways and shows `npm test` naming each; restores it. The developer pushes, then runs `/balance`, `/balance user:@friend`, `/balances`: unchanged. The Heroku log shows the `[Messages]` startup line with `problems=0` |
| F2 — `/mybets`, `/beg`, donate, `/changebalance`, the shared denial and not-found | M1, M2, M4 | Plurals (`one`/`other` by count); wording tests for each message, including donate amounts 1 and 50 and each changebalance action | `/mybets` unchanged; `/beg` shows "too rich" for the developer. Donate and changebalance seen live in F4, or noted as unit-tested only |
| F3 — `/predictions` and the three modals from the file | M7, S1, part of C1 | Build 01's list tests on the reference file; worst-case budget on the real file; final 2000 cut; modal wording tests | `/predictions`: pages, Next and Previous, Bet on page 2 opens the modal, cancel. Open `/predict` and `/resolve`, cancel each. A second account runs `/predictions` and sees nothing of the developer's list (C1) |
| F4 — Confirmations, announcements and `betting.js` errors | M8, M1, M2, C1 | Wording tests for created, placed, resolve (winners and none), void (refunds and none), each of the nine codes | The R8 throwaway session, step by step, each write said aloud first; the developer's balance ends where it began. `git diff` of `betting.js` shows only `return` lines |
| F5 — Identity proven, then one reword live | M2, M6 | — | The agent records `cmp messages.json wording-cb1f8a5.json` (identical). The developer edits one message in `messages.json` alone, runs `npm test`, pushes, and sees the new wording live |
| F6 — C2: pinboard, debug and router messages (Could; only once F1–F5 are accepted) | C2 | Wording tests for each; pinboard embed plural | A pin and a `/debug stats` read as before. Root `pinboard.js` deleted |

### Manual checks

The seam is where the code meets Heroku and Discord. The adapters (`index.js`, the handlers)
hold no logic worth testing; everything they call is pure and unit tested.

1. **The deployed bot finds and reads the file.** After each push, the Heroku log shows
   `[Messages] file=messages.json messages=N problems=0` from the web dyno (and the worker
   after F6).
2. **Discord shows each message as before.** Each feature's acceptance runs its commands.
   Bold, mentions, backticks and emoji render as they did.
3. **The broken-file behaviour** is proven by unit tests only (`createMessages.test.js`).
   Proving it live would mean pushing a broken file to the friends' server, so this is
   recorded as not exercised live.
4. **The throwaway session (R8)**: the developer's balance before and after, recorded.

### What this build retires

- Every message literal in `handlers.js`, `modals.js`, `buttons.js` and
  `predictionsListFormat.js`; the exported text constants of `predictionsListFormat.js`
  (`PREDICTIONS_HEADER`, `NO_PREDICTIONS_TEXT`, `PREVIOUS_LABEL`, `NEXT_LABEL`, `ELLIPSIS`,
  `formatPageLine`, `formatBetButtonLabel`). The module keeps only the shortening algorithm.
- The 15 error strings and the 3 unused `message:` fields in `betting.js`.
- Six `` `❌ ${result.error}` `` sites, replaced by `bettingErrorReply`.
- Five `join(', ')` calls for options, replaced by `optionList`.
- `/changebalance`'s `actionText` branching, replaced by three whole messages.
- With C2: the root `pinboard.js`, unused, and the inline text in debug and pinboard.

### Version

| | |
|---|---|
| Target version | 1.2.0-alpha |
| Stage | alpha |
| Previous version | 1.1.0-alpha |
| Why this number | A body of new scope, not a fix: the developer can now change the bot's wording without code. MINOR goes up. Alpha, because the roadmap continues (build 03, configuration) |

## Push-back on the requirements

Three amendments, each to be re-agreed by the developer:

- **P1 — M2's tests and M6 conflict.** M2's acceptance says a unit test per message compares
  the output with today's text. If those tests read the real file, the first reword (M6's own
  acceptance, and every one after it) breaks them, and fixing them means editing JavaScript,
  which M6 rules out. Proposed amendment to M2's *Accepted by*: "A unit test per message
  compares the output, built from a reference copy of today's wording, with today's text;
  `messages.json` is byte-identical to that reference before M6 rewords anything; a smoke run
  in Discord shows no visible change." The requirement itself is unchanged. Priority: Must.
- **P2 — M5 cannot name a message when the file does not parse.** A file that is not valid
  JSON has no messages to name. Proposed: M5's parse-error case names the line and column
  instead; the missing and unknown-placeholder cases still name the message. Priority: Must.
- **P3 — The router's channel denial** (`❌ This bot can only be used in specific channels.`)
  is sent for every feature's commands, so it is not a betting message under M1. Proposed: add
  it to C2. Priority: Could.

## Edit log

- **2026-11-03** — research R1–R9 with evidence; developer chose JSON, and that a broken
  message fails only its command. First full draft; P1–P3 push-back.

## Evidence

```console
$ node --version; grep -n '"node"' package.json
v26.13.0
9:    "node": ">=18.x"
```

```console
$ node -e 'try { JSON.parse("{\n  \"a\": \"x\",\n  \"b\": \"y\"\n  \"c\": 1\n}") } catch (e) { console.log(e.message) }'
Expected ',' or '}' after property value in JSON at position 27 (line 4 column 3)
```

```console
$ npm view yaml version dependencies license; npm view js-yaml version dependencies license; npm view smol-toml version dependencies license
version = '2.9.1'
license = 'ISC'
version = '5.5.0'
dependencies = { argparse: '^3.0.3' }
license = 'MIT'
version = '1.9.1'
license = 'BSD-3-Clause'
```

```console
$ node -e 'for (const n of [0,1,2,50]) console.log(n, new Intl.PluralRules("en").select(n))'
0 other
1 one
2 other
50 other
```

```console
$ cd /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/yamllab && npm ls yaml && cd - >/dev/null && grep -v '^//' /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-traps.mjs | grep show && node /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-traps.mjs /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/yamllab
yamllab@1.0.0 /tmp/claude-1000/-home-scott-Projects-GravityBot/***/scratchpad/yamllab
└── yaml@2.9.1

const show = (label, source) => {
show('plain with " #"', 'text: ❌ Prediction #5 not found.');
show('plain starting "**"', 'text: **ID {id}:** {question}');
show('plain starting "{"', 'text: {amount} credits');
show('plain with ": "', 'text: Options: {options}');
show('plain starting "`"', 'text: `/predict` first');
show('block literal |-', 'text: |-\n  ❌ Prediction #{predictionId} not found.\n  **ID {id}:** `/bet {id}` Options: {options}\n');
show('block literal |', 'text: |\n  line\n\nnext: x');
show('block literal |+', 'text: |+\n  line\n\nnext: x');
show('double-quoted', 'text: "💰 **All Balances:**\\n\\n"');
plain with " #"            "❌ Prediction"
plain starting "**"        ERROR: Unexpected flow-map-start at node end at line 1, column 12:
plain starting "{"         ERROR: Unexpected scalar at node end at line 1, column 16:
plain with ": "            ERROR: Nested mappings are not allowed in compact mappings at line 1, column 7:
plain starting "`"         ERROR: Plain value cannot start with reserved character ` at line 1, column 7:
block literal |-           "❌ Prediction #{predictionId} not found.\n**ID {id}:** `/bet {id}` Options: {options}"
block literal |            "line\n"
block literal |+           "line\n\n"
double-quoted              "💰 **All Balances:**\n\n"
```

```console
$ node /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-errors.mjs /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/yamllab
YAMLParseError BAD_INDENT {"line":4,"col":1}
All mapping items must start at the same column at line 4, column 1:

    ✅ Bet placed!
   denied: |-
^

a BLOCK_LITERAL
b PLAIN
c QUOTE_DOUBLE
```

```console
$ grep -nE "(ephemeral|public_)\(|label:|placeholder:|modal\(|'Enter an option'" src/features/betting/handlers.js src/features/betting/modals.js src/features/betting/buttons.js | grep -v '^.*import'
src/features/betting/handlers.js:26:      return ephemeral('❌ Invalid user format. Please tag a user or use "_all".');
src/features/betting/handlers.js:30:    return public_(`💰 <@${targetUserId}> has **${balance}** credits.`);
src/features/betting/handlers.js:34:  return ephemeral(`💰 You have **${balance}** credits.`);
src/features/betting/handlers.js:41:    return ephemeral('💰 Everyone has the default balance (1000 credits).');
src/features/betting/handlers.js:48:  return ephemeral(message);
src/features/betting/handlers.js:61:    return ephemeral(`❌ Prediction #${predictionId} not found. Use \`/predictions\` to see active predictions.`);
src/features/betting/handlers.js:65:    return ephemeral(`❌ Prediction #${predictionId} is already resolved.`);
src/features/betting/handlers.js:73:  return ephemeral(content, components);
src/features/betting/handlers.js:81:    return ephemeral('🎲 You have no active bets.');
src/features/betting/handlers.js:91:  return ephemeral(message);
src/features/betting/handlers.js:98:    return ephemeral('❌ You do not have permission to use this command.');
src/features/betting/handlers.js:105:    return ephemeral(`❌ Prediction #${predictionId} not found.`);
src/features/betting/handlers.js:115:    return ephemeral('❌ You do not have permission to use this command.');
src/features/betting/handlers.js:122:    return ephemeral(`❌ Prediction #${predictionId} not found.`);
src/features/betting/handlers.js:127:    return ephemeral(`❌ ${result.error}`);
src/features/betting/handlers.js:144:  return public_(message);
src/features/betting/handlers.js:156:      label: `Donate ${amount} Credit${amount === 1 ? '' : 's'}`,
src/features/betting/handlers.js:167:    return ephemeral('You are too rich to beg.');
src/features/betting/handlers.js:172:  return public_(`**${username}** is begging for credits. Click a button to donate or just laugh at them.`, buildDonateButtons(userId));
src/features/betting/handlers.js:179:    return ephemeral('❌ You do not have permission to use this command.');
src/features/betting/handlers.js:196:    return ephemeral(`❌ ${result.error}`);
src/features/betting/handlers.js:208:  return public_(`✅ ${actionText} <@${targetUser}>'s balance.\n**Old balance:** ${result.oldBalance}\n**New balance:** ${result.newBalance}`);
src/features/betting/modals.js:16:  if (!Array.isArray(options) || options.length === 0) return 'Enter an option';
src/features/betting/modals.js:24:  return modal('predict_modal', 'Create a Prediction', [
src/features/betting/modals.js:30:        label: 'Question',
src/features/betting/modals.js:32:        placeholder: 'e.g., How long will UK PM last?',
src/features/betting/modals.js:42:        label: 'Options (comma-separated)',
src/features/betting/modals.js:44:        placeholder: '1 week, 2 weeks, 1 month, 3 months',
src/features/betting/modals.js:54:        label: 'Your Choice',
src/features/betting/modals.js:56:        placeholder: 'Pick from your options above',
src/features/betting/modals.js:66:        label: 'Bet Amount',
src/features/betting/modals.js:68:        placeholder: 'Credits to bet',
src/features/betting/modals.js:77:  return modal(encode('bet_modal', predictionId), `Bet on Prediction #${predictionId}`, [
src/features/betting/modals.js:83:        label: 'Choose an option',
src/features/betting/modals.js:85:        placeholder: buildOptionsPlaceholder(options),
src/features/betting/modals.js:95:        label: 'Bet Amount',
src/features/betting/modals.js:97:        placeholder: 'Credits to bet',
src/features/betting/modals.js:106:  return modal(encode('resolve_modal', predictionId), `Resolve Prediction #${predictionId}`, [
src/features/betting/modals.js:112:        label: 'Winning Outcome',
src/features/betting/modals.js:114:        placeholder: buildOptionsPlaceholder(options),
src/features/betting/modals.js:132:    return ephemeral('❌ Amount must be a positive number.');
src/features/betting/modals.js:137:    return ephemeral('❌ You must provide at least 2 options (comma-separated).');
src/features/betting/modals.js:142:    return ephemeral(`❌ Your choice must match one of the options exactly.\nOptions: ${predefinedOptions.join(', ')}`);
src/features/betting/modals.js:147:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:158:  return public_(successMessage);
src/features/betting/modals.js:170:    return ephemeral('❌ Amount must be a positive number.');
src/features/betting/modals.js:175:    return ephemeral(`❌ Prediction #${predictionId} not found.`);
src/features/betting/modals.js:180:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:183:  return public_(`✅ Bet placed!\n\n**Prediction #${predictionId}:** ${prediction.question}\n<@${userId}> bet **${amount}** credits on: **${selectedOption}**`);
src/features/betting/modals.js:194:    return ephemeral(`❌ Prediction #${predictionId} not found.`);
src/features/betting/modals.js:199:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:217:  return public_(message);
src/features/betting/buttons.js:14:    return ephemeral('You cannot donate to yourself.');
src/features/betting/buttons.js:20:    return ephemeral(`❌ ${result.error}`);
src/features/betting/buttons.js:24:  return public_(`<@${donorId}> donated **${amount}** credit${amount === 1 ? '' : 's'} to <@${targetUserId}>!`);
src/features/betting/buttons.js:34:    return ephemeral(`❌ Prediction #${predictionId} not found.`);
```

```console
$ grep -nE "error: |message: '" betting.js
91:            return { success: false, error: err.message };
111:            return { success: false, error: `Insufficient credits. You have ${donorBalance} credits.` };
142:            return { success: false, error: `Cannot set negative balance. User has ${currentBalance} credits.` };
167:                return { success: false, error: 'Options must be unique (duplicates found).' };
173:            return { success: false, error: 'You must provide at least 2 options.' };
179:            return { success: false, error: `Your choice must match one of the options: ${normalizedOptions.join(', ')}` };
190:            return { success: false, error: `Insufficient credits. You have ${balance} credits.` };
224:            return { success: false, error: 'Prediction not found' };
229:            return { success: false, error: 'This prediction is already resolved' };
234:            return { success: false, error: `Invalid option. Choose from: ${pred.options.join(', ')}` };
250:            return { success: false, error: `You cannot bet on all ${totalOptions} options. Maximum allowed: ${maxOptionsAllowed} options.` };
260:            return { success: false, error: `Insufficient credits. You have ${balance} credits.` };
288:            return { success: false, error: 'Prediction not found' };
293:            return { success: false, error: 'This prediction is already resolved' };
323:                message: 'No winners. All bets lost.',
347:            message: 'Prediction resolved',
365:            return { success: false, error: 'Prediction not found' };
370:            return { success: false, error: 'This prediction is already resolved' };
402:            message: 'Prediction voided',
```

```console
$ grep -rnE '\.message\b|result\.error' src --include=*.js | grep -v 'err\.message\|reaction\.message'
src/features/betting/handlers.js:127:    return ephemeral(`❌ ${result.error}`);
src/features/betting/handlers.js:196:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:147:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:180:    return ephemeral(`❌ ${result.error}`);
src/features/betting/modals.js:199:    return ephemeral(`❌ ${result.error}`);
src/features/betting/buttons.js:20:    return ephemeral(`❌ ${result.error}`);
src/features/debug/buttons.js:16:    return ephemeral(`❌ Reset failed: ${result.error}`);
```

```console
$ grep -rnE "Prediction #\\$\{predictionId\} not found|Prediction not found" src betting.js | wc -l; grep -rn 'You do not have permission' src | wc -l
10
6
```

```console
$ grep -n "'  " /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-comments.mjs; node /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-comments.mjs /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/yamllab
8:  '  # {predictionId} {question} {userId} {amount} {option}',
9:  '  placed: |-',
10:  '    ✅ Bet placed!',
11:  '  # {balance}',
12:  '  item: |+',
13:  '    <@{userId}>: **{balance}** credits',
15:  '  # (none)',
16:  '  next: |-',
17:  '    x',
placed undefined "✅ Bet placed!"
item " {balance}" "<@{userId}>: **{balance}** credits\n\n"
next " (none)" "x"
```

```console
$ grep -n "'  " /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-header-comments.mjs; node /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/scripts/yaml-header-comments.mjs /tmp/claude-1000/-home-scott-Projects-GravityBot/b28a4fd0-7d64-4a49-925d-cb055fd7fe94/scratchpad/yamllab
8:  '  placed: |-  # {predictionId} {question} {userId} {amount} {option}',
9:  '    ✅ Bet placed!',
10:  '  item: |+  # {userId} {balance}',
11:  '    <@{userId}>: **{balance}** credits',
13:  '  next: |-  # nothing',
14:  '    x',
placed " {predictionId} {question} {userId} {amount} {option}" undefined "✅ Bet placed!"
item " {userId} {balance}" undefined "<@{userId}>: **{balance}** credits\n\n"
next " nothing" undefined "x"
```

```console
$ git grep -n "pinboard.js'" -- '*.js'; git grep -n "from '.*pinboard" -- '*.js'
commands.js:5:import { PINBOARD_COMMANDS } from './src/features/pinboard/commands.js';
pinboard-worker.js:2:import { startWorker } from './src/features/pinboard/worker/index.js';
```
