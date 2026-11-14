import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalog } from './catalog.js';
import { checkMessages } from './checkMessages.js';
import { checkLengths } from './checkLengths.js';
import { createMessages } from './createMessages.js';
import { MESSAGES_FILE } from './index.js';
import { buildPredictionsListPage } from '../../features/betting/predictionsList.js';
import { MESSAGE_CONTENT_MAX_LENGTH } from '../discordLimits.js';

// These pass whatever the wording is: they fail only when messages.json is broken.
test('messages.json has every message the bot needs and nothing it does not know', () => {
  const { problems } = checkMessages(readFileSync(MESSAGES_FILE, 'utf8'), catalog);
  const report = problems.map(({ message, problem }) => `${message}: ${problem}`);
  assert.deepEqual(report, []);
});

// The worst page the modals allow: a 200-character question, 300 characters of options and
// large numbers, five to a page. A layout edit that outgrows the budget fails here, before a push.
test('the /predictions layout in messages.json fits its page budget without being cut', () => {
  const { text } = createMessages(readFileSync(MESSAGES_FILE, 'utf8'), catalog);
  const worst = Array.from({ length: 10 }, (_, i) => ({
    id: 999999 - i,
    question: 'q'.repeat(200),
    options: Array.from({ length: 150 }, () => 'o'),
    bets: Array.from({ length: 9999 }, () => ({ amount: 999999 })),
  }));
  for (const page of [0, 1]) {
    const built = buildPredictionsListPage(worst, page, 5, text);
    assert.equal(built.cut, false, `page ${page} had to be cut`);
    assert.ok(built.content.length <= MESSAGE_CONTENT_MAX_LENGTH);
  }
});

// The longest each value can be, so a message is measured at its worst. A new value needs an
// entry here, or checkLengths reports it.
const LONGEST_VALUES = {
  predictionId: '9'.repeat(10), // a PostgreSQL integer
  amount: '9'.repeat(10), // the amount inputs' max_length
  count: '9'.repeat(6), // a reaction count
  authorId: '9'.repeat(20), // a Discord snowflake
  messageUrl: `https://discord.com/channels/${'9'.repeat(20)}/${'9'.repeat(20)}/${'9'.repeat(20)}`, // 91 characters
};

test('no message is longer than Discord allows where it is shown', () => {
  const problems = checkLengths(readFileSync(MESSAGES_FILE, 'utf8'), catalog, LONGEST_VALUES);
  const report = problems.map(({ message, problem }) => `${message}: ${problem}`);
  assert.deepEqual(report, []);
});
