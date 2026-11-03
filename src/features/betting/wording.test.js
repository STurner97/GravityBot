import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPredictModal, buildBetModal, buildResolveModal } from './buildModals.js';
import { referenceText as text, referenceProblems as problems } from '../../lib/messages/fixtures/referenceMessages.js';

test('the reference file is itself valid', () => {
  assert.deepEqual(problems, []);
});

test('/balance shows your own balance', () => {
  assert.equal(text('balance.own', { balance: 1000 }), '💰 You have **1000** credits.');
});

test('/balance of another user', () => {
  assert.equal(text('balance.other', { userId: '42', balance: 0 }), '💰 <@42> has **0** credits.');
});

test('/balance with a badly formed user', () => {
  assert.equal(text('balance.invalidUser'), '❌ Invalid user format. Please tag a user or use "_all".');
});

test('/balances lists every balance', () => {
  const items = [{ userId: '1', balance: 50 }, { userId: '2', balance: 1200 }];
  assert.equal(
    text('balances', { items }),
    '💰 **All Balances:**\n\n<@1>: **50** credits\n<@2>: **1200** credits\n'
  );
});

test('/balances when nobody has a balance row', () => {
  assert.equal(text('balances', { items: [] }), '💰 Everyone has the default balance (1000 credits).');
});

test('the admin denial', () => {
  assert.equal(text('denied.admin'), '❌ You do not have permission to use this command.');
});

test('a prediction that is not found', () => {
  assert.equal(text('prediction.notFound', { predictionId: 7 }), '❌ Prediction #7 not found.');
});

test('/bet on a prediction that is not found points to /predictions', () => {
  assert.equal(
    text('bet.notFoundWithHint', { predictionId: 7 }),
    '❌ Prediction #7 not found. Use `/predictions` to see active predictions.'
  );
});

test('/mybets lists active bets', () => {
  const items = [
    { predictionId: 3, question: 'Rain?', option: 'Yes', amount: 20 },
    { predictionId: 9, question: 'Snow?', option: 'No', amount: 1 },
  ];
  assert.equal(
    text('myBets', { items }),
    '🎲 **Your Active Bets:**\n\n' +
    '**ID 3:** Rain?\nYour bet: **Yes** (20 credits)\n\n' +
    '**ID 9:** Snow?\nYour bet: **No** (1 credits)\n\n'
  );
});

test('/mybets with no bets', () => {
  assert.equal(text('myBets', { items: [] }), '🎲 You have no active bets.');
});

test('/beg when too rich', () => {
  assert.equal(text('beg.tooRich'), 'You are too rich to beg.');
});

test('/beg request', () => {
  assert.equal(
    text('beg.request', { username: 'Sam' }),
    '**Sam** is begging for credits. Click a button to donate or just laugh at them.'
  );
});

test('donate buttons say Credit for one and Credits otherwise', () => {
  assert.equal(text('donate.button', { amount: 1 }), 'Donate 1 Credit');
  assert.equal(text('donate.button', { amount: 50 }), 'Donate 50 Credits');
  assert.equal(text('donate.button', { amount: 100 }), 'Donate 100 Credits');
});

test('donation announcement says credit for one and credits otherwise', () => {
  assert.equal(text('donate.donated', { donorId: '1', amount: 1, recipientId: '2' }), '<@1> donated **1** credit to <@2>!');
  assert.equal(text('donate.donated', { donorId: '1', amount: 50, recipientId: '2' }), '<@1> donated **50** credits to <@2>!');
});

test('donating to yourself', () => {
  assert.equal(text('donate.self'), 'You cannot donate to yourself.');
});

const balanceChange = { amount: 25, userId: '5', oldBalance: 100, newBalance: 125 };
const balanceLines = '\n**Old balance:** 100\n**New balance:** 125';

test('/changebalance set', () => {
  assert.equal(text('changeBalance.set', balanceChange), "✅ set to 25 credits for <@5>'s balance." + balanceLines);
});

test('/changebalance add', () => {
  assert.equal(text('changeBalance.add', balanceChange), "✅ 25 credits added to <@5>'s balance." + balanceLines);
});

test('/changebalance remove', () => {
  assert.equal(text('changeBalance.remove', balanceChange), "✅ 25 credits removed from <@5>'s balance." + balanceLines);
});

test('/predictions pieces', () => {
  assert.equal(text('predictions.header'), '📋 **Active Predictions:**\n\n');
  assert.equal(text('predictions.empty'), '📋 No active predictions. Create one with `/predict`!');
  assert.equal(text('predictions.previous'), '◀ Previous');
  assert.equal(text('predictions.next'), 'Next ▶');
  assert.equal(text('predictions.pageLine', { page: 2, pageCount: 3 }), 'Page 2 of 3');
  assert.equal(text('predictions.betButton', { predictionId: 41 }), 'Bet on #41');
  assert.equal(text('predictions.cutMarker'), '…');
});

test('a /predictions entry', () => {
  const entry = { predictionId: 41, question: 'Snow?', options: 'Yes, No', betCount: 3, totalCredits: 350 };
  assert.equal(
    text('predictions.entry', entry),
    '**ID 41:** Snow?\n**Options:** Yes, No\n3 bet(s), totalling 💰 350 Credits\n\n'
  );
});

test('options are joined with a comma and a space', () => {
  const items = ['Yes', 'No', 'Maybe'].map(option => ({ option }));
  assert.equal(text('optionList', { items }), 'Yes, No, Maybe');
});

const fieldsOf = (modal) => modal.data.components.map(row => row.components[0]);
const textsOf = (fields) => fields.map(({ label, placeholder }) => ({ label, placeholder }));

test('the Create a Prediction modal', () => {
  const modal = buildPredictModal(text);
  assert.equal(modal.data.title, 'Create a Prediction');
  assert.deepEqual(textsOf(fieldsOf(modal)), [
    { label: 'Question', placeholder: 'e.g., How long will UK PM last?' },
    { label: 'Options (comma-separated)', placeholder: '1 week, 2 weeks, 1 month, 3 months' },
    { label: 'Your Choice', placeholder: 'Pick from your options above' },
    { label: 'Bet Amount', placeholder: 'Credits to bet' },
  ]);
});

test('the bet modal', () => {
  const modal = buildBetModal(7, ['Yes', 'No'], text);
  assert.equal(modal.data.title, 'Bet on Prediction #7');
  assert.deepEqual(textsOf(fieldsOf(modal)), [
    { label: 'Choose an option', placeholder: 'Yes, No' },
    { label: 'Bet Amount', placeholder: 'Credits to bet' },
  ]);
});

test('the resolve modal', () => {
  const modal = buildResolveModal(7, ['Yes', 'No'], text);
  assert.equal(modal.data.title, 'Resolve Prediction #7');
  assert.deepEqual(textsOf(fieldsOf(modal)), [{ label: 'Winning Outcome', placeholder: 'Yes, No' }]);
});

test('an options placeholder with no options asks for one', () => {
  assert.equal(fieldsOf(buildBetModal(7, [], text))[0].placeholder, 'Enter an option');
});

test('an options placeholder over 100 characters is cut with three dots', () => {
  const placeholder = fieldsOf(buildBetModal(7, Array.from({ length: 60 }, (_, i) => `Option${i}`), text))[0].placeholder;
  assert.equal(placeholder.length <= 100, true);
  assert.equal(placeholder.endsWith('...'), true);
});

test('an amount that is not a positive number', () => {
  assert.equal(text('invalidAmount'), '❌ Amount must be a positive number.');
});

test('/predict with too few options', () => {
  assert.equal(text('predict.tooFewOptions'), '❌ You must provide at least 2 options (comma-separated).');
});

test('/predict with a choice that is not an option', () => {
  assert.equal(
    text('predict.choiceNotAnOption', { options: 'Yes, No' }),
    '❌ Your choice must match one of the options exactly.\nOptions: Yes, No'
  );
});

test('options can be listed with bullets', () => {
  const items = ['Yes', 'No'].map(option => ({ option }));
  assert.equal(text('bulletedOptionList', { items }), '• Yes\n• No');
});

test('a prediction created', () => {
  assert.equal(
    text('predict.created', {
      predictionId: 12, question: 'Snow?', options: '• Yes\n• No', userId: '5', amount: 10, choice: 'Yes',
    }),
    '✅ Prediction created!\n\n' +
    '**ID:** 12\n' +
    '**Question:** Snow?\n' +
    '**Options:**\n• Yes\n• No\n\n' +
    '<@5> bet **10** credits on: **Yes**\n\n' +
    'Others can bet using `/bet 12` or `/predictions`!'
  );
});

test('a bet placed', () => {
  assert.equal(
    text('bet.placed', { predictionId: 12, question: 'Snow?', userId: '5', amount: 10, option: 'Yes' }),
    '✅ Bet placed!\n\n**Prediction #12:** Snow?\n<@5> bet **10** credits on: **Yes**'
  );
});

const resolved = { predictionId: 12, question: 'Snow?', outcome: 'Yes', totalPot: 80 };

test('a prediction resolved with winners', () => {
  const results = text('resolve.winners', {
    items: [{ userId: '5', winnings: 80, profit: 70 }, { userId: '6', winnings: 20, profit: 10 }],
  });
  assert.equal(
    text('resolve.announcement', { ...resolved, results }),
    '✅ **Prediction #12 Resolved!**\n\n' +
    '**Question:** Snow?\n' +
    '**Outcome:** Yes\n' +
    '**Total Pot:** 80 credits\n\n' +
    '🎉 **Winners:**\n' +
    '<@5> won **80** credits (profit: **70**)\n' +
    '<@6> won **20** credits (profit: **10**)\n'
  );
});

test('a prediction resolved with no winners', () => {
  const results = text('resolve.winners', { items: [] });
  assert.equal(
    text('resolve.announcement', { ...resolved, results }),
    '✅ **Prediction #12 Resolved!**\n\n' +
    '**Question:** Snow?\n' +
    '**Outcome:** Yes\n' +
    '**Total Pot:** 80 credits\n\n' +
    '❌ No winners. All bets lost.'
  );
});

const voided = { predictionId: 12, question: 'Snow?', totalPot: 80 };

test('a prediction voided with refunds', () => {
  const refunds = text('void.refunds', { items: [{ userId: '5', amount: 50 }, { userId: '6', amount: 30 }] });
  assert.equal(
    text('void.announcement', { ...voided, refunds }),
    '✅ **Prediction #12 Voided!**\n\n' +
    '**Question:** Snow?\n' +
    '**Total Pot Returned:** 80 credits\n\n' +
    '💸 **Refunds:**\n' +
    '<@5> received **50** credits back\n' +
    '<@6> received **30** credits back\n'
  );
});

test('a prediction voided with no bets', () => {
  const refunds = text('void.refunds', { items: [] });
  assert.equal(
    text('void.announcement', { ...voided, totalPot: 0, refunds }),
    '✅ **Prediction #12 Voided!**\n\n' +
    '**Question:** Snow?\n' +
    '**Total Pot Returned:** 0 credits\n\n' +
    '💸 No bets to refund.'
  );
});

test('/bet on a prediction that is already resolved', () => {
  assert.equal(text('bet.alreadyResolved', { predictionId: 7 }), '❌ Prediction #7 is already resolved.');
});
