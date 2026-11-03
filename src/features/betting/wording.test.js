import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalog } from '../../lib/messages/catalog.js';
import { createMessages } from '../../lib/messages/createMessages.js';

// Reads the frozen copy of cb1f8a5's wording, not messages.json, so rewording the real
// file never breaks these. Each expected string is the literal text from cb1f8a5.
const REFERENCE = new URL('../../lib/messages/fixtures/wording-cb1f8a5.json', import.meta.url);
const { text, problems } = createMessages(readFileSync(REFERENCE, 'utf8'), catalog);

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
