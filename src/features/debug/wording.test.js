import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceText as text, referenceProblems } from '../../lib/messages/fixtures/referenceMessages.js';

// Every expected string is the wording of the debug feature at 11f4e9e.

test('the reference file is valid for the debug messages', () => {
  assert.deepEqual(referenceProblems.filter(({ message }) => message.startsWith('debug.')), []);
});

test('missing and unknown subcommands', () => {
  assert.equal(text('debug.missingSubcommand'), '❌ Missing debug subcommand.');
  assert.equal(text('debug.unknownSubcommand'), '❌ Unknown debug subcommand.');
});

test('/debug stats', () => {
  assert.equal(
    text('debug.stats', { users: 4, predictions: 9, activePredictions: 2, resolvedPredictions: 7, bets: 30, totalBetAmount: 1500 }),
    '🧪 **DB Stats:**\nUsers: 4\nPredictions: 9 (active: 2, resolved: 7)\nBets: 30 | Total bet amount: 1500'
  );
});

test('/debug prediction summary, bets and overflow', () => {
  assert.equal(
    text('debug.prediction.summary', {
      predictionId: 7, question: 'Q?', options: 'a, b', createdAt: '<t:1:F>', resolved: 'no',
      outcome: 'n/a', totalPot: 300, betCount: 2,
    }),
    '🧪 **Prediction #7**\nQuestion: Q?\nOptions: a, b\nCreated: <t:1:F>\nResolved: no\nOutcome: n/a\nTotal pot: 300 credits\nBets (2):\n'
  );
  assert.equal(
    text('debug.prediction.bets', { items: [{ userId: '1', option: 'a', amount: 5 }, { userId: '2', option: 'b', amount: 6 }] }),
    '• <@1>: a (5)\n• <@2>: b (6)\n'
  );
  assert.equal(text('debug.prediction.bets', { items: [] }), 'No bets yet.');
  assert.equal(text('debug.prediction.moreBets', { count: 3 }), '…and 3 more');
});

test('/debug user summary and bets', () => {
  assert.equal(
    text('debug.user.summary', { userId: '5', balance: 900, limit: 10 }),
    '🧪 **User <@5>**\nBalance: 900 credits\nRecent bets (max 10):\n'
  );
  assert.equal(
    text('debug.user.bets', {
      items: [{ predictionId: 3, question: 'Q?', option: 'a', amount: 5, status: 'active', createdAt: '<t:1:F>' }],
    }),
    '• #3: Q? | a (5) | active | <t:1:F>\n'
  );
  assert.equal(text('debug.user.bets', { items: [] }), 'No bets found.');
});

test('/debug recent header and list', () => {
  assert.equal(text('debug.recent.header', { limit: 5 }), '🧪 **Recent Predictions (max 5)**\n');
  assert.equal(
    text('debug.recent.list', { items: [{ predictionId: 3, question: 'Q?', status: 'active', createdAt: '<t:1:F>' }] }),
    '• #3: Q? | active | <t:1:F>\n'
  );
  assert.equal(text('debug.recent.list', { items: [] }), 'No predictions found.');
});

test('the small words', () => {
  assert.equal(text('debug.yes'), 'yes');
  assert.equal(text('debug.no'), 'no');
  assert.equal(text('debug.notApplicable'), 'n/a');
  assert.equal(text('debug.unknownTime'), 'unknown');
  assert.equal(text('debug.status.active'), 'active');
  assert.equal(text('debug.status.resolved', { outcome: 'yes' }), 'resolved (yes)');
});

test('the reset prompt, buttons and outcomes', () => {
  assert.equal(
    text('debug.reset.prompt'),
    '⚠️ **WARNING: Are you sure you want to reset the entire database?** This will delete all users, predictions, and bets.'
  );
  assert.equal(text('debug.reset.confirmButton'), 'Yes, Reset');
  assert.equal(text('debug.reset.cancelButton'), 'Cancel');
  assert.equal(text('debug.reset.cancelled'), '✋ Reset cancelled.');
  assert.equal(text('debug.reset.done'), '💥 **Database reset complete!** All tables truncated.');
  assert.equal(text('debug.reset.failed'), '❌ Reset failed.');
});

test('the SQL modal and replies', () => {
  assert.equal(text('debug.sqlModal.title'), 'Execute SQL Query');
  assert.equal(text('debug.sqlModal.queryLabel'), 'SQL Query');
  assert.equal(text('debug.sqlModal.queryPlaceholder'), 'SELECT * FROM users;');
  assert.equal(text('debug.sql.denied'), '❌ You do not have permission to execute SQL queries.');
  assert.equal(text('debug.sql.noRows', { rowCount: 2 }), '✅ Query executed.\n```\nRows affected: 2\n```');
  assert.equal(text('debug.sql.rows', { rowCount: 1, table: 'T' }), '✅ Query executed. (1 rows)\n\nT');
  assert.equal(text('debug.sql.moreRows', { count: 4 }), '... and 4 more rows\n');
  assert.equal(text('debug.sql.error', { error: 'boom' }), '❌ SQL Error:\n```\nboom\n```');
});

test('the reset failure message takes no values, so it cannot show the error', () => {
  assert.equal(text('debug.reset.failed', { error: 'secret' }), '❌ Reset failed.');
});
