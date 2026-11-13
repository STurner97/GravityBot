import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildResetPrompt, buildSqlModal } from './buildDebugComponents.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

test('the reset prompt is ephemeral, with Yes then Cancel', () => {
  const reply = buildResetPrompt(text);
  assert.equal(reply.data.flags, 64);
  assert.equal(
    reply.data.content,
    '⚠️ **WARNING: Are you sure you want to reset the entire database?** This will delete all users, predictions, and bets.'
  );
  const [row] = reply.data.components;
  assert.deepEqual(row.components.map(b => [b.label, b.style, b.custom_id]), [
    ['Yes, Reset', 4, 'confirm_reset:yes'],
    ['Cancel', 2, 'confirm_reset:no'],
  ]);
});

test('the SQL modal', () => {
  const reply = buildSqlModal(text);
  assert.equal(reply.data.custom_id, 'debug_sql_modal');
  assert.equal(reply.data.title, 'Execute SQL Query');
  const [input] = reply.data.components[0].components;
  assert.equal(input.custom_id, 'sql_query_input');
  assert.equal(input.label, 'SQL Query');
  assert.equal(input.placeholder, 'SELECT * FROM users;');
  assert.equal(input.style, 2);
  assert.equal(input.required, true);
  assert.equal(input.max_length, 2000);
});
