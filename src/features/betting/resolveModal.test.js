import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleResolveModal } from './resolveModal.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

const submit = (userId) => ({
  userId,
  data: {
    custom_id: 'resolve_modal:12',
    components: [{ components: [{ value: 'Yes' }] }],
  },
});

function makeDeps({ admin, prediction = { question: 'Q?' }, result } = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      isAdmin: () => admin,
      getPrediction: async () => { calls.push('getPrediction'); return prediction; },
      resolvePrediction: async () => { calls.push('resolvePrediction'); return result; },
      text,
    },
  };
}

function silenced(run) {
  const original = console.log;
  console.log = () => {};
  return run().finally(() => { console.log = original; });
}

test('a non-admin submit gets the denial and reads and writes nothing (M2)', async () => {
  const { deps, calls } = makeDeps({ admin: false });
  const reply = await silenced(() => handleResolveModal(submit('5'), deps));
  assert.equal(reply.data.content, text('denied.admin'));
  assert.deepEqual(calls, []);
});

test('a non-admin denial is logged with the prediction id', async () => {
  const { deps } = makeDeps({ admin: false });
  const original = console.log;
  const lines = [];
  console.log = (line) => lines.push(line);
  try {
    await handleResolveModal(submit('5'), deps);
  } finally {
    console.log = original;
  }
  assert.deepEqual(lines, ['[Betting] userId=5 predictionId=12 action=resolve denied=notAdmin']);
});

test('an admin on a missing prediction gets not-found', async () => {
  const { deps, calls } = makeDeps({ admin: true, prediction: null });
  const reply = await handleResolveModal(submit('1'), deps);
  assert.equal(reply.data.content, text('prediction.notFound', { predictionId: 12 }));
  assert.deepEqual(calls, ['getPrediction']);
});

test('an admin resolving an already-resolved prediction gets the error reply', async () => {
  const { deps, calls } = makeDeps({ admin: true, result: { success: false, error: { code: 'alreadyResolved', predictionId: 12 } } });
  const reply = await handleResolveModal(submit('1'), deps);
  assert.equal(reply.data.flags, 64);
  assert.deepEqual(calls, ['getPrediction', 'resolvePrediction']);
});

test('an admin goes through to the announcement', async () => {
  const { deps } = makeDeps({ admin: true, result: { success: true, winners: [], totalPot: 100 } });
  const reply = await handleResolveModal(submit('1'), deps);
  assert.equal(reply.data.flags, undefined);
  assert.match(reply.data.content, /12/);
});
