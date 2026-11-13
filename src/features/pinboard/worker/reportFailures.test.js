import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportFailures } from './reportFailures.js';

function captureErrors(run) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  return run(logged).finally(() => { console.error = original; });
}

test('a failing handler is logged with its event name and the error, and does not throw', async () => {
  const boom = new Error('boom');
  await captureErrors(async (logged) => {
    const wrapped = reportFailures('messageReactionAdd', async () => { throw boom; });
    await wrapped('a', 'b');
    assert.deepEqual(logged, [['[Pinboard] event=messageReactionAdd failed', boom]]);
  });
});

test('a working handler gets its arguments and logs nothing', async () => {
  await captureErrors(async (logged) => {
    const seen = [];
    await reportFailures('messageDelete', async (...args) => { seen.push(args); })('x', 'y');
    assert.deepEqual(seen, [['x', 'y']]);
    assert.deepEqual(logged, []);
  });
});
