import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostPayload, publishOrUpdatePin } from './helpers.js';
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
