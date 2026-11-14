import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWhitelist } from './formatWhitelist.js';
import { referenceText as text } from '../../lib/messages/fixtures/referenceMessages.js';

test('a target and channels', () => {
  assert.equal(
    formatWhitelist('9', ['1', '2'], text),
    '📌 Pinboard channel: <#9>\nWhitelisted channels:\n<#1>\n<#2>'
  );
});

test('a target and no channels', () => {
  assert.equal(formatWhitelist('9', [], text), '📌 Pinboard channel: <#9>\nWhitelist is empty.');
});

test('no target says not set', () => {
  assert.equal(formatWhitelist(null, ['1'], text), '📌 Pinboard channel: not set\nWhitelisted channels:\n<#1>');
  assert.equal(formatWhitelist(undefined, [], text), '📌 Pinboard channel: not set\nWhitelist is empty.');
});
