import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessageDeleted } from './handleMessageDeleted.js';

const rowOf = (pinState, ids = {}) => ({
  message_id: '10', pinboard_message_id: '20', pin_state: pinState, ...ids,
});

function makeDeps({ rows = [], targetChannelId = '5' } = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      findRows: async (id) => { calls.push(['find', id]); return rows; },
      getConfig: async () => ({ target_channel_id: targetChannelId }),
      removePin: async (_client, channelId, row, messageId) => { calls.push(['removePin', channelId, row.message_id, messageId]); },
      deleteRow: async (id) => { calls.push(['deleteRow', id]); },
      markBanned: async (id) => { calls.push(['ban', id]); },
      log: (line) => calls.push(['log', line]),
    },
  };
}

test('a forced pin post deleted: the row goes (M4)', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('forced')] });
  await handleMessageDeleted({}, '20', deps);
  assert.deepEqual(calls.filter(c => c[0] !== 'log' && c[0] !== 'find'), [['deleteRow', '10']]);
});

test('a natural pin post deleted: the row is banned (M3)', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('natural')] });
  await handleMessageDeleted({}, '20', deps);
  assert.deepEqual(calls.filter(c => c[0] !== 'log' && c[0] !== 'find'), [['ban', '10']]);
});

test('a banned pin post deleted: nothing changes', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('banned')] });
  await handleMessageDeleted({}, '20', deps);
  assert.deepEqual(calls.filter(c => c[0] !== 'log' && c[0] !== 'find'), []);
});

test('a source message deleted calls the bot removal and bans nothing (M7)', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('forced')] });
  await handleMessageDeleted({}, '10', deps);
  assert.deepEqual(calls.filter(c => c[0] !== 'log' && c[0] !== 'find'), [['removePin', '5', '10', '10']]);
});

test('no row means nothing happens, and the config is not read', async () => {
  const { deps, calls } = makeDeps({ rows: [] });
  deps.getConfig = async () => { throw new Error('config read'); };
  await handleMessageDeleted({}, '77', deps);
  assert.deepEqual(calls, [['find', '77']]);
});

test('a source deletion with no target channel configured does nothing', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('natural')], targetChannelId: null });
  await handleMessageDeleted({}, '10', deps);
  assert.deepEqual(calls.filter(c => c[0] !== 'log' && c[0] !== 'find'), []);
});

test('each outcome is logged with the ids', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('natural')] });
  await handleMessageDeleted({}, '20', deps);
  const line = calls.find(c => c[0] === 'log')[1];
  assert.match(line, /^\[Pinboard\] messageId=10 pinboardMessageId=20 action=takedown outcome=ban$/);
});

test('a source deletion logs removePin, never ban', async () => {
  const { deps, calls } = makeDeps({ rows: [rowOf('forced')] });
  await handleMessageDeleted({}, '10', deps);
  const lines = calls.filter(c => c[0] === 'log').map(c => c[1]);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /outcome=removePin$/);
});

test('every id of a bulk deletion gets its own outcome', async () => {
  const rowsById = { '20': [rowOf('natural')], '31': [rowOf('forced', { message_id: '30', pinboard_message_id: '31' })], '99': [] };
  const { deps, calls } = makeDeps();
  deps.findRows = async (id) => rowsById[id];
  for (const id of ['20', '31', '99']) await handleMessageDeleted({}, id, deps);
  assert.deepEqual(calls.filter(c => c[0] === 'ban' || c[0] === 'deleteRow'), [['ban', '10'], ['deleteRow', '30']]);
});
