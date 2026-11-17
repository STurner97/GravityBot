import { test } from 'node:test';
import assert from 'node:assert/strict';
import { denyNonAdmin } from './adminDenial.js';
import { referenceText as text } from './messages/fixtures/referenceMessages.js';

function captureLog(run) {
  const original = console.log;
  const lines = [];
  console.log = (line) => lines.push(line);
  try {
    return { result: run(), lines };
  } finally {
    console.log = original;
  }
}

test('the reply is the ephemeral admins-only message', () => {
  const { result } = captureLog(() => denyNonAdmin({ tag: 'Debug', action: 'confirmReset', userId: '5', text }));
  assert.equal(result.data.content, text('denied.admin'));
  assert.equal(result.data.flags, 64);
});

test('the log line has the tag, user, action and denial', () => {
  const { lines } = captureLog(() => denyNonAdmin({ tag: 'Debug', action: 'confirmReset', userId: '5', text }));
  assert.deepEqual(lines, ['[Debug] userId=5 action=confirmReset denied=notAdmin']);
});

test('extra fields come after the user id', () => {
  const { lines } = captureLog(() => denyNonAdmin({
    tag: 'Betting', action: 'resolve', userId: '5', fields: { predictionId: 12 }, text,
  }));
  assert.deepEqual(lines, ['[Betting] userId=5 predictionId=12 action=resolve denied=notAdmin']);
});
