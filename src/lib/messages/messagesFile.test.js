import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalog } from './catalog.js';
import { checkMessages } from './checkMessages.js';
import { MESSAGES_FILE } from './index.js';

// These pass whatever the wording is: they fail only when messages.json is broken.
test('messages.json has every message the bot needs and nothing it does not know', () => {
  const { problems } = checkMessages(readFileSync(MESSAGES_FILE, 'utf8'), catalog);
  const report = problems.map(({ message, problem }) => `${message}: ${problem}`);
  assert.deepEqual(report, []);
});
