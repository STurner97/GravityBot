# GravityBot

A vibe-coded politics prediction betting Discord bot. Create predictions, place bets with virtual credits, and resolve outcomes with admin commands.

## Project structure

```
├── app.js           -> main entrypoint and interaction handler
├── commands.js      -> slash command definitions
├── betting.js       -> core betting system logic
├── game.js          -> utility functions for game logic
├── utils.js         -> utility functions and enums
├── db.js            -> database connection and queries
├── migrate.js       -> database schema and migrations
├── pinboard.js       -> pinboard config + DB helpers
├── pinboard-worker.js -> gateway worker for 📌 reactions
├── package.json
├── Procfile        -> deployment configuration
├── LICENSE
└── examples/        -> feature-specific code examples
```

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v14 or higher)
- A [Discord bot application](https://discord.com/developers/applications) with these permissions:
  - `applications.commands` (Scope)
  - `bot` Scope with **Send Messages** enabled
- A database (PostgreSQL recommended)

### Setup

1. **Clone and install dependencies:**
   ```
   git clone <repository-url>
   cd GravityBot
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root with:
   ```
   DISCORD_TOKEN=your_bot_token
   APP_ID=your_app_id
   PUBLIC_KEY=your_public_key
   DATABASE_URL=postgresql://user:password@localhost:5432/gravitybot
   ```

3. **Initialize the database:**
   ```
   npm run migrate
   ```

4. **Register slash commands:**
   ```
   npm run register
   ```

5. **Set up interactivity webhook:**
   Use [ngrok](https://ngrok.com/) or similar to tunnel to localhost:3000
   ```
   ngrok http 3000
   ```
   
   Add the forwarding URL + `/interactions` to your Discord app's **Interactions Endpoint URL** in the Developer Portal.

6. **Start the bot:**
   ```
   npm start
   ```
   Start the pinboard worker in a second terminal:
   ```
   npm run start:worker
   ```
   or for development with auto-reload:
   ```
   npm install -g nodemon
   nodemon app.js
   ```
   and in another terminal:
   ```
   nodemon pinboard-worker.js
   ```

## Basic Usage

### Creating a Prediction

1. Use `/predict` to open the prediction form
2. Enter a clear question (e.g., "Will Biden run in 2028?")
3. Define the possible outcomes (typically "Yes" and "No")

### Placing a Bet

1. Use `/predictions` to see all active predictions
2. Use `/bet <prediction_id>` to bet on a prediction
3. Select your predicted outcome and enter your bet amount
4. Confirm to lock in your bet

### Checking Your Status

- `/balance` - View your credit balance
- `/mybets` - View your active bets and their status
- `/balances` - See all users' balances (excluding defaults)

## Advanced Use (Admin Commands)

Only users listed in `ADMIN_IDS` in [app.js](app.js) can use these commands:

### Resolving a Prediction

Use `/resolve <prediction_id>` to:
1. Select the prediction ID
2. Choose the correct outcome
3. Confirm resolution

**Payouts are calculated automatically:**
- Users who bet on the correct outcome receive winnings proportional to their bet
- Total payout pool = all bet amounts on that prediction
- Users who bet on the wrong outcome lose their bet

### Voiding a Prediction

Use `/voidprediction <prediction_id>` to:
- Refund all bets on a prediction (full amount returned)
- Useful for predictions that become invalid or cancelled

### Managing Credits

Use `/changebalance <user> <action> <amount>` to:
- **Add** - Give credits to a user
- **Remove** - Deduct credits from a user
- **Set** - Set a user's balance to a specific amount

### Pinboard (📌)

Pinboard posts a message to a dedicated channel once **3 unique users** react with 📌.
- Bots are ignored
- Self-pins are ignored
- Only whitelisted channels are monitored

Use `/pinboard` with subcommands:
- `setchannel <channel>` - Set the pinboard destination
- `whitelist_add <channel>` - Monitor a channel for 📌 reactions
- `whitelist_remove <channel>` - Stop monitoring a channel
- `whitelist_list` - Show current whitelist and destination channel

### Debug Commands

Use `/debug` with subcommands:
- `stats` - View overall database statistics
- `prediction <id>` - Inspect a specific prediction and all its bets
- `user <user> [limit]` - View a user's balance and bet history
- `recent [limit]` - Show recent predictions
- `reset` - Clear all database data (⚠️ DANGEROUS)
- `sql` - Execute custom SQL queries (⚠️ DANGEROUS)

## Database Structure

GravityBot uses PostgreSQL with three main tables:

### Users Table
Stores user accounts and credit balances.

| Column    | Type      | Description                                  |
| --------- | --------- | -------------------------------------------- |
| `user_id` | TEXT (PK) | Discord user ID                              |
| `balance` | INTEGER   | User's current credit balance (default: 100) |

### Predictions Table
Stores all predictions created by users.

| Column       | Type        | Description                              |
| ------------ | ----------- | ---------------------------------------- |
| `id`         | SERIAL (PK) | Unique prediction identifier             |
| `question`   | TEXT        | The prediction question/prompt           |
| `options`    | TEXT[]      | Array of possible outcomes               |
| `creator_id` | TEXT        | Discord ID of prediction creator         |
| `resolved`   | BOOLEAN     | Whether the prediction has been resolved |
| `outcome`    | TEXT        | The correct outcome (null if unresolved) |
| `created_at` | TIMESTAMPTZ | Timestamp when prediction was created    |

### Bets Table
Stores all individual bets placed on predictions.

| Column          | Type         | Description                  |
| --------------- | ------------ | ---------------------------- |
| `id`            | SERIAL (PK)  | Unique bet identifier        |
| `prediction_id` | INTEGER (FK) | References `predictions(id)` |
| `user_id`       | TEXT         | Discord ID of bet placer     |
| `prediction`    | TEXT         | The chosen outcome           |
| `amount`        | INTEGER      | Amount of credits bet        |

**Note:** Bets cascade delete when their prediction is deleted.

### Pinboard Tables

The pinboard feature adds these tables:

#### Pinboard Config

| Column              | Type    | Description                        |
| ------------------- | ------- | ---------------------------------- |
| `id`                | INTEGER | Single row (id = 1)                |
| `target_channel_id` | TEXT    | Channel ID where pinboard posts go |
| `threshold`         | INTEGER | Reaction threshold (default: 3)    |
| `emoji`             | TEXT    | Emoji to track (default: 📌)        |

#### Pinboard Whitelist

| Column       | Type | Description                |
| ------------ | ---- | -------------------------- |
| `channel_id` | TEXT | Allowed source channel IDs |

#### Pinboard Posts

| Column                | Type        | Description                         |
| --------------------- | ----------- | ----------------------------------- |
| `message_id`          | TEXT (PK)   | Original message ID                 |
| `source_channel_id`   | TEXT        | Source channel ID                   |
| `pinboard_message_id` | TEXT        | Message ID in the pinboard channel  |
| `author_id`           | TEXT        | Author of the original message      |
| `reaction_count`      | INTEGER     | Last tracked reaction count         |
| `created_at`          | TIMESTAMPTZ | When the pinboard entry was created |

## License

This project is licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). 

You are free to:
- Share and adapt this work
- Use it commercially or personally

As long as you:
- Provide attribution to the original creator
- Include a link to the license



