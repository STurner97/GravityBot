import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleConfirmReset } from './buttons.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

const click = (answer) => ({ data: { custom_id: `confirm_reset:${answer}` } });
const contentOf = (reply) => reply.data.content;
const admin = () => true;
const nobody = () => false;

test('Cancel resets nothing', async () => {
  let resets = 0;
  const reply = await handleConfirmReset(click('no'), { isAdmin: admin, reset: async () => { resets += 1; }, text });
  assert.equal(contentOf(reply), '✋ Reset cancelled.');
  assert.equal(resets, 0);
});

test('Yes resets and says so', async () => {
  const reply = await handleConfirmReset(click('yes'), { isAdmin: admin, reset: async () => {}, text });
  assert.equal(contentOf(reply), '💥 **Database reset complete!** All tables truncated.');
});

test('a failing reset replies generically and logs the full error', async () => {
  const boom = new Error('relation "bets" is locked');
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    const reply = await handleConfirmReset(click('yes'), { isAdmin: admin, reset: async () => { throw boom; }, text });
    assert.equal(contentOf(reply), '❌ Reset failed.');
    assert.ok(!contentOf(reply).includes('locked'));
    assert.deepEqual(logged, [['[Debug] action=resetDatabase failed', boom]]);
  } finally {
    console.error = original;
  }
});

test('a non-admin on Yes or on Cancel gets the denial; reset never runs and the denial is logged (M1)', async () => {
  for (const answer of ['yes', 'no']) {
    let resets = 0;
    const original = console.log;
    const lines = [];
    console.log = (line) => lines.push(line);
    try {
      const reply = await handleConfirmReset(
        { userId: '5', ...click(answer) },
        { isAdmin: nobody, reset: async () => { resets += 1; }, text }
      );
      assert.equal(contentOf(reply), text('denied.admin'));
    } finally {
      console.log = original;
    }
    assert.equal(resets, 0);
    assert.deepEqual(lines, ['[Debug] userId=5 action=confirmReset denied=notAdmin']);
  }
});
