import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSqlResult, formatSqlError } from './formatSqlResult.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

test('a statement that returns no rows shows the rows affected', () => {
  assert.equal(
    formatSqlResult({ rows: [], rowCount: 3 }, text),
    '✅ Query executed.\n```\nRows affected: 3\n```'
  );
});

test('rows are laid out as a padded table', () => {
  const rows = [{ one: 1, name: 'ab' }, { one: 22, name: null }];
  assert.equal(
    formatSqlResult({ rows, rowCount: 2 }, text),
    '✅ Query executed. (2 rows)\n\n```\none | name\n----+-----\n1   | ab  \n22  | NULL\n```'
  );
});

test('long values are cut to 20 characters', () => {
  const rows = [{ v: 'x'.repeat(30) }];
  const reply = formatSqlResult({ rows, rowCount: 1 }, text);
  assert.ok(reply.includes(`\n${'x'.repeat(20)}\n`));
});

test('more than fifteen rows show fifteen and a count', () => {
  const rows = Array.from({ length: 17 }, (_, i) => ({ n: i }));
  const reply = formatSqlResult({ rows, rowCount: 17 }, text);
  assert.ok(reply.endsWith('... and 2 more rows\n```'));
  assert.ok(reply.startsWith('✅ Query executed. (17 rows)\n\n```\nn \n--\n0 '));
});

test('the database error is shown raw, on purpose', () => {
  assert.equal(formatSqlError('syntax error', text), '❌ SQL Error:\n```\nsyntax error\n```');
});
