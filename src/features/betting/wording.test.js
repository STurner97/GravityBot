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
