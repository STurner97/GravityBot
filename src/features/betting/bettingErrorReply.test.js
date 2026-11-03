import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bettingErrorReply } from './bettingErrorReply.js';
import { referenceText } from '../../lib/messages/fixtures/referenceMessages.js';

// Each expected string is what a user saw on cb1f8a5: "❌ " plus the text betting.js returned.
const replyTo = (error) => bettingErrorReply(error, referenceText).data;

const CASES = [
  [{ code: 'insufficientCredits', balance: 12 }, '❌ Insufficient credits. You have 12 credits.'],
  [{ code: 'negativeBalance', balance: 5 }, '❌ Cannot set negative balance. User has 5 credits.'],
  [{ code: 'duplicateOptions' }, '❌ Options must be unique (duplicates found).'],
  [{ code: 'tooFewOptions' }, '❌ You must provide at least 2 options.'],
  [{ code: 'choiceNotAnOption', options: ['Yes', 'No'] }, '❌ Your choice must match one of the options: Yes, No'],
  [{ code: 'predictionNotFound' }, '❌ Prediction not found'],
  [{ code: 'alreadyResolved' }, '❌ This prediction is already resolved'],
  [{ code: 'invalidOption', options: ['A', 'B', 'C'] }, '❌ Invalid option. Choose from: A, B, C'],
  [
    { code: 'cannotBetOnAllOptions', optionCount: 3, maxOptions: 2 },
    '❌ You cannot bet on all 3 options. Maximum allowed: 2 options.',
  ],
];

for (const [error, expected] of CASES) {
  test(`${error.code} replies in private with the cb1f8a5 wording`, () => {
    const reply = replyTo(error);
    assert.equal(reply.content, expected);
    assert.equal(reply.flags, 64);
  });
}

test('a code the bot does not know throws, since it is a mistake in the code', () => {
  assert.throws(() => replyTo({ code: 'nope' }), /nope/);
});
