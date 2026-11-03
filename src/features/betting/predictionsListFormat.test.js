import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPredictionEntry } from './predictionsListFormat.js';

const prediction = (overrides = {}) => ({
  id: 41,
  question: 'Will it snow in London before February?',
  options: ['Yes', 'No'],
  bets: [{ amount: 100 }, { amount: 50 }, { amount: 200 }],
  createdAt: new Date(Date.UTC(2026, 9, 1)),
  ...overrides,
});

// The only test that spells out the layout, so a layout change edits this test alone.
test('entry shows the bets count and total on one line', () => {
  assert.equal(
    formatPredictionEntry(prediction()),
    '**ID 41:** Will it snow in London before February?\n' +
    '**Options:** Yes, No\n' +
    '3 🎲 Bet(s), totalling 350 💰 Credits\n\n'
  );
});

const lastLineOf = (entry) => entry.trimEnd().split('\n').at(-1);

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
  assert.equal(lastLineOf(entry), lastLineOf(formatPredictionEntry(prediction())));
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

test('an entry with no bets shows a count and total of 0', () => {
  const numbers = lastLineOf(formatPredictionEntry(prediction({ bets: [] }))).match(/\d+/g);
  assert.deepEqual(numbers, ['0', '0']);
});
