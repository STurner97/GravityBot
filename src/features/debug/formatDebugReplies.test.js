import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatStats, formatPrediction, formatUserDebug, formatRecent } from './formatDebugReplies.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

const CREATED = '2026-11-13T10:00:00.000Z';
const STAMP = `<t:${Date.parse(CREATED) / 1000}:F>`;

test('stats', () => {
  const stats = { users: 4, predictions: 9, active_predictions: 2, resolved_predictions: 7, bets: 30, total_bet_amount: 1500 };
  assert.equal(
    formatStats(stats, text),
    '🧪 **DB Stats:**\nUsers: 4\nPredictions: 9 (active: 2, resolved: 7)\nBets: 30 | Total bet amount: 1500'
  );
});

const prediction = (overrides) => ({
  id: 7, question: 'Q?', options: ['a', 'b'], createdAt: CREATED, resolved: false, outcome: null,
  bets: [{ userId: '1', prediction: 'a', amount: 100 }, { userId: '2', prediction: 'b', amount: 50 }],
  ...overrides,
});

test('an open prediction with two bets', () => {
  assert.equal(
    formatPrediction(prediction(), text),
    `🧪 **Prediction #7**\nQuestion: Q?\nOptions: a, b\nCreated: ${STAMP}\nResolved: no\nOutcome: n/a\n` +
    'Total pot: 150 credits\nBets (2):\n• <@1>: a (100)\n• <@2>: b (50)\n'
  );
});

test('a resolved prediction with no bets', () => {
  assert.equal(
    formatPrediction(prediction({ resolved: true, outcome: 'a', bets: [] }), text),
    `🧪 **Prediction #7**\nQuestion: Q?\nOptions: a, b\nCreated: ${STAMP}\nResolved: yes\nOutcome: a\n` +
    'Total pot: 0 credits\nBets (0):\nNo bets yet.'
  );
});

test('more than ten bets show ten and a count', () => {
  const bets = Array.from({ length: 12 }, (_, i) => ({ userId: String(i), prediction: 'a', amount: 1 }));
  const reply = formatPrediction(prediction({ bets }), text);
  assert.equal(reply.split('• <@').length - 1, 10);
  assert.ok(reply.endsWith('…and 2 more'));
  assert.ok(reply.includes('Bets (12):\n'));
});

test('a prediction without a date says unknown', () => {
  assert.ok(formatPrediction(prediction({ createdAt: null }), text).includes('Created: unknown\n'));
});

test('user debug with bets, active and resolved', () => {
  const userDebug = {
    balance: 900,
    bets: [
      { prediction_id: 3, question: 'Q?', prediction: 'a', amount: 5, resolved: false, outcome: null, created_at: CREATED },
      { prediction_id: 2, question: 'P?', prediction: 'b', amount: 6, resolved: true, outcome: 'b', created_at: CREATED },
      { prediction_id: 1, question: 'R?', prediction: 'c', amount: 7, resolved: true, outcome: null, created_at: CREATED },
    ],
  };
  assert.equal(
    formatUserDebug('5', 10, userDebug, text),
    '🧪 **User <@5>**\nBalance: 900 credits\nRecent bets (max 10):\n' +
    `• #3: Q? | a (5) | active | ${STAMP}\n` +
    `• #2: P? | b (6) | resolved (b) | ${STAMP}\n` +
    `• #1: R? | c (7) | resolved (n/a) | ${STAMP}\n`
  );
});

test('user debug with no bets', () => {
  assert.equal(
    formatUserDebug('5', 3, { balance: 1000, bets: [] }, text),
    '🧪 **User <@5>**\nBalance: 1000 credits\nRecent bets (max 3):\nNo bets found.'
  );
});

test('recent predictions', () => {
  const recent = [
    { id: 3, question: 'Q?', resolved: false, outcome: null, created_at: CREATED },
    { id: 2, question: 'P?', resolved: true, outcome: 'x', created_at: null },
  ];
  assert.equal(
    formatRecent(5, recent, text),
    `🧪 **Recent Predictions (max 5)**\n• #3: Q? | active | ${STAMP}\n• #2: P? | resolved (x) | unknown\n`
  );
  assert.equal(formatRecent(5, [], text), '🧪 **Recent Predictions (max 5)**\nNo predictions found.');
});
