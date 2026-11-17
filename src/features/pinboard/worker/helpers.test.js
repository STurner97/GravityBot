import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostPayload, publishOrUpdatePin, removeFromPinboard } from './helpers.js';
import { referenceText } from '../../../lib/messages/fixtures/referenceMessages.js';

const message = {
  id: '3',
  channelId: '2',
  url: 'https://discord.com/channels/1/2/3',
  content: 'hello',
  author: { id: '42' },
  createdAt: new Date('2026-11-13T10:00:00.000Z'),
  attachments: new Map(),
  embeds: [],
};

const broken = () => { throw new Error('message is broken'); };

test('the post payload carries the pin embed first', () => {
  const { embeds, files } = buildPostPayload(message, 3, referenceText);
  assert.equal(embeds.length, 1);
  assert.equal(embeds[0].author.name, '📌 3 Pins');
  assert.deepEqual(files, []);
});

test('a broken pin message makes the payload throw', () => {
  assert.throws(() => buildPostPayload(message, 3, broken), /broken/);
});

test('with a broken pin message nothing is sent or edited', async () => {
  const calls = [];
  const pinMessage = { edit: async () => calls.push('edit') };
  const channel = {
    isTextBased: () => true,
    send: async () => { calls.push('send'); return { id: '9' }; },
    messages: { fetch: async () => pinMessage },
  };
  const client = { channels: { fetch: async () => channel } };

  await assert.rejects(publishOrUpdatePin(client, '5', message, 3, null, broken), /broken/);
  await assert.rejects(publishOrUpdatePin(client, '5', message, 3, { pinboard_message_id: '9' }, broken), /broken/);
  assert.deepEqual(calls, []);
});

test('removeFromPinboard deletes the row before it touches Discord (R2)', async () => {
  const calls = [];
  const channel = { isTextBased: () => true, messages: { delete: async () => calls.push('discordDelete') } };
  const client = { channels: { fetch: async () => channel } };
  const deleteRow = async () => calls.push('deleteRow');

  await removeFromPinboard(client, '5', { pinboard_message_id: '9' }, '3', deleteRow);
  assert.deepEqual(calls, ['deleteRow', 'discordDelete']);
});

function publishFixture() {
  const upserts = [];
  const channel = {
    isTextBased: () => true,
    send: async () => ({ id: '9' }),
    messages: { fetch: async () => ({ edit: async () => {} }) },
  };
  const client = { channels: { fetch: async () => channel } };
  return { upserts, client, upsert: async (row) => upserts.push(row) };
}

test('publishOrUpdatePin writes the pin state it is given, on a new post', async () => {
  const { upserts, client, upsert } = publishFixture();
  await publishOrUpdatePin(client, '5', message, 3, null, referenceText, 'natural', upsert);
  assert.equal(upserts[0].pinState, 'natural');
});

test('publishOrUpdatePin writes the pin state it is given, on an edit', async () => {
  const { upserts, client, upsert } = publishFixture();
  await publishOrUpdatePin(client, '5', message, 1, { pinboard_message_id: '9' }, referenceText, 'forced', upsert);
  assert.equal(upserts[0].pinState, 'forced');
  assert.equal(upserts[0].pinboardMessageId, '9');
});

test('a forced pin keeps the forced heading, a natural pin shows the count (O2)', () => {
  assert.equal(buildPostPayload(message, 1, referenceText, 'forced').embeds[0].author.name, referenceText('pinboard.post.forcedHeading'));
  assert.equal(buildPostPayload(message, 1, referenceText, 'natural').embeds[0].author.name, '📌 1 Pin');
});
