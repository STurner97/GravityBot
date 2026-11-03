import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMessages } from './createMessages.js';
import { textMessage } from './catalog.js';

const catalog = {
  'a.one': textMessage(['n']),
  'a.two': textMessage(),
};

const file = (overrides = {}) => JSON.stringify({
  a: { one: { uses: '{n}', text: 'One {n}' }, two: 'Two' },
  ...overrides,
});

test('text renders a message with its values', () => {
  const { text } = createMessages(file(), catalog);
  assert.equal(text('a.one', { n: 3 }), 'One 3');
  assert.equal(text('a.two'), 'Two');
});

test('an unknown message name throws, since it is a mistake in the code', () => {
  const { text } = createMessages(file(), catalog);
  assert.throws(() => text('a.three'), /a\.three/);
});

test('a broken message throws when asked for, and the others still work', () => {
  const { text, problems } = createMessages(file({ a: { one: 'no uses', two: 'Two' } }), catalog);
  assert.equal(problems.length, 1);
  assert.throws(() => text('a.one', { n: 1 }), /a\.one.*unavailable/);
  assert.equal(text('a.two'), 'Two');
});

test('a file that does not parse makes every message unavailable', () => {
  const { text, problems } = createMessages('{ not json', catalog);
  assert.equal(problems.length, 1);
  assert.throws(() => text('a.two'), /unavailable/);
});

test('a value the code forgot to give throws', () => {
  const { text } = createMessages(file(), catalog);
  assert.throws(() => text('a.one', {}), /\{n\}/);
});
