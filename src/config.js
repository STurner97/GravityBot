// All configuration is read from environment variables here.
// Required vars are validated at startup — the process throws immediately if any are missing.

import { assertPageSizeFitsRows } from './lib/discordLimits.js';

const REQUIRED_VARS = ['PUBLIC_KEY', 'DISCORD_TOKEN', 'APP_ID', 'DATABASE_URL'];
for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export const ALLOWED_CHANNEL_IDS = (process.env.ALLOWED_CHANNEL_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Canonical starting balance — must match the DB schema default in migrate.js.
export const STARTING_BALANCE = 1000;

// Predictions per /predictions page; fails at startup if Discord's row limit can't hold it.
export const PREDICTIONS_PAGE_SIZE = 10;
assertPageSizeFitsRows(PREDICTIONS_PAGE_SIZE);
