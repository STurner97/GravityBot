import 'dotenv/config';
import { query } from './db.js';

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 1000
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      options TEXT[] NOT NULL,
      creator_id TEXT NOT NULL,
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      outcome TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bets (
      id SERIAL PRIMARY KEY,
      prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      prediction TEXT NOT NULL,
      amount INTEGER NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pinboard_config (
      id INTEGER PRIMARY KEY,
      target_channel_id TEXT,
      threshold INTEGER NOT NULL DEFAULT 3,
      emoji TEXT NOT NULL DEFAULT '📌'
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pinboard_whitelist (
      channel_id TEXT PRIMARY KEY
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pinboard_posts (
      message_id TEXT PRIMARY KEY,
      source_channel_id TEXT NOT NULL,
      pinboard_message_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      reaction_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Fix any existing databases where the default was incorrectly set to 100.
  await query(`
    DO $$
    BEGIN
      IF (SELECT column_default FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'balance') <> '1000'
      THEN
        ALTER TABLE users ALTER COLUMN balance SET DEFAULT 1000;
      END IF;
    END $$;
  `);

  console.log('Migration complete');
}

migrate().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
