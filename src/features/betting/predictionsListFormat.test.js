import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPredictionEntry } from './predictionsListFormat.js';

const CREATED_AT = new Date(Date.UTC(2026, 9, 1));
const UNIX_SECONDS = Math.floor(CREATED_AT.getTime() / 1000);

const prediction = (overrides = {}) => ({
  id: 41,
  question: 'Will it snow in London before February?',
  options: ['Yes', 'No'],
  bets: [{ amount: 100 }, { amount: 50 }, { amount: 200 }],
  createdAt: CREATED_AT,
  ...overrides,
});

test('entry shows the bets total and count on one line', () => {
  assert.equal(
    formatPredictionEntry(prediction()),
    '**ID 41:** Will it snow in London before February?\n' +
    '**Options:** Yes, No\n' +
    `🕒 Created: <t:${UNIX_SECONDS}:F>\n` +
    '💰 Total: 350 credits | 🎲 3 bet(s)\n\n'
  );
});

test('an entry within its limit is not changed', () => {
  const full = formatPredictionEntry(prediction());
  assert.equal(formatPredictionEntry(prediction(), full.length), full);
});

test('an entry over its limit shortens the options first and keeps the question whole', () => {
  const long = prediction({ options: Array.from({ length: 60 }, (_, i) => `Option${i}`) });
  const limit = 300;
  const entry = formatPredictionEntry(long, limit);
  assert.ok(entry.length <= limit);
  assert.match(entry, /^\*\*ID 41:\*\* Will it snow in London before February\?\n/);
  assert.match(entry, /\*\*Options:\*\* .*…\n/);
  assert.match(entry, /💰 Total: 350 credits \| 🎲 3 bet\(s\)\n\n$/);
});

test('when the options cannot absorb the cut the question is shortened too', () => {
  const long = prediction({ question: 'q'.repeat(200), options: ['Yes', 'No'] });
  const limit = 150;
  const entry = formatPredictionEntry(long, limit);
  assert.ok(entry.length <= limit);
  assert.match(entry, /^\*\*ID 41:\*\* q+…\n/);
  assert.match(entry, /\*\*Options:\*\* Yes, No\n/);
});

test('a cut never splits an emoji in half', () => {
  const long = prediction({ question: '🎲'.repeat(100) });
  for (let limit = 120; limit < 200; limit++) {
    const entry = formatPredictionEntry(long, limit);
    assert.ok(entry.length <= limit, `limit ${limit}`);
    assert.equal(entry, entry.toWellFormed(), `limit ${limit}`);
  }
});

test('an entry with no bets shows a total of 0', () => {
  assert.match(formatPredictionEntry(prediction({ bets: [] })), /💰 Total: 0 credits \| 🎲 0 bet\(s\)\n\n$/);
});
