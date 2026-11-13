import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPinboardEmbed } from './pinboardEmbed.js';
import { referenceText as text, referenceProblems } from '../../lib/messages/fixtures/referenceMessages.js';

const post = {
  messageUrl: 'https://discord.com/channels/1/2/3',
  messageContent: 'hello',
  authorId: '42',
  createdAt: new Date('2026-11-13T10:00:00.000Z'),
};

// The embed exactly as buildPinboardEmbed built it at 11f4e9e.
const embedAt = (heading) => ({
  color: 0xED4245,
  author: { name: heading },
  description: 'hello',
  fields: [{ name: 'Posted by', value: '<@42> · https://discord.com/channels/1/2/3', inline: false }],
  timestamp: '2026-11-13T10:00:00.000Z',
  url: 'https://discord.com/channels/1/2/3',
});

test('the reference file is valid for the pin post messages', () => {
  assert.deepEqual(referenceProblems.filter(({ message }) => message.startsWith('pinboard.post.')), []);
});

test('the pin heading names the count', () => {
  assert.equal(text('pinboard.post.heading', { count: 0 }), '📌 0 Pins');
  assert.equal(text('pinboard.post.heading', { count: 1 }), '📌 1 Pin');
  assert.equal(text('pinboard.post.heading', { count: 3 }), '📌 3 Pins');
});

test('the forced pin heading', () => {
  assert.equal(text('pinboard.post.forcedHeading'), '📌 1 Pin (forced)');
});

test('the "Posted by" field', () => {
  assert.equal(text('pinboard.post.postedByName'), 'Posted by');
  assert.equal(
    text('pinboard.post.postedByValue', { authorId: '42', messageUrl: 'https://x' }),
    '<@42> · https://x'
  );
});

test('the pin embed equals what the code built before the move, for counts 0, 1 and 3', () => {
  for (const [count, heading] of [[0, '📌 0 Pins'], [1, '📌 1 Pin'], [3, '📌 3 Pins']]) {
    assert.deepEqual(buildPinboardEmbed({ ...post, count }, text), embedAt(heading));
  }
});

test('a forced pin has the forced heading', () => {
  assert.deepEqual(buildPinboardEmbed({ ...post, count: 1, forced: true }, text), embedAt('📌 1 Pin (forced)'));
});

test('an empty message gets a space, and an image is attached', () => {
  const embed = buildPinboardEmbed({ ...post, count: 2, messageContent: '', imageUrl: 'https://img' }, text);
  assert.equal(embed.description, ' ');
  assert.deepEqual(embed.image, { url: 'https://img' });
});

test('a broken pin message makes the builder throw', () => {
  const broken = () => { throw new Error('message is broken'); };
  assert.throws(() => buildPinboardEmbed({ ...post, count: 1 }, broken), /broken/);
});
