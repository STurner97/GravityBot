import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLengths } from './checkLengths.js';
import { textMessage, pluralMessage, listMessage } from './catalog.js';
import { TEXT_LIMITS } from '../discordLimits.js';

const catalog = {
  'a.title': textMessage([], { shownAs: 'modalTitle' }),
  'a.label': textMessage([], { shownAs: 'inputLabel' }),
  'a.placeholder': textMessage([], { shownAs: 'inputPlaceholder' }),
  'a.button': textMessage(['predictionId'], { shownAs: 'buttonLabel' }),
  'a.author': pluralMessage('count', [], { shownAs: 'embedAuthorName' }),
  'a.fieldName': textMessage([], { shownAs: 'embedFieldName' }),
  'a.fieldValue': textMessage(['authorId'], { shownAs: 'embedFieldValue' }),
  'a.unlimited': textMessage(),
  'a.list': listMessage({ itemValues: ['x'] }),
};
const samples = { predictionId: '9'.repeat(10), count: '9'.repeat(6), authorId: '9'.repeat(20) };

const sourceWith = (overrides) => JSON.stringify({
  a: {
    title: 'ok', label: 'ok', placeholder: 'ok', button: 'ok',
    author: { uses: '{count}', one: 'ok', other: 'ok' },
    fieldName: 'ok', fieldValue: { uses: '{authorId}', text: 'ok' },
    unlimited: 'x'.repeat(5000),
    list: { item: { uses: '{x}', text: '{x}' } },
    ...overrides,
  },
});

const check = (overrides) => checkLengths(sourceWith(overrides), catalog, samples);

test('a file within every limit has no problems, and unmarked messages are not measured', () => {
  assert.deepEqual(check({}), []);
});

test('the limits are Discord\'s', () => {
  const max = Object.fromEntries(Object.entries(TEXT_LIMITS).map(([place, { max }]) => [place, max]));
  assert.deepEqual(max, {
    modalTitle: 45, inputLabel: 45, inputPlaceholder: 100, buttonLabel: 80,
    embedAuthorName: 256, embedFieldName: 256, embedFieldValue: 1024,
  });
});

test('text exactly at the limit passes and one over fails, naming the message and the limit', () => {
  assert.deepEqual(check({ title: 'x'.repeat(45) }), []);
  assert.deepEqual(check({ title: 'x'.repeat(46) }), [
    { message: 'a.title', problem: 'is 46 characters; a modal title allows 45' },
  ]);
});

test('every place is checked', () => {
  const problems = check({
    label: 'x'.repeat(46),
    placeholder: 'x'.repeat(101),
    button: { uses: '{predictionId}', text: `${'x'.repeat(81)}{predictionId}` },
    fieldName: 'x'.repeat(257),
  }).map(({ message }) => message);
  assert.deepEqual(problems, ['a.label', 'a.placeholder', 'a.button', 'a.fieldName']);
});

test('placeholders are measured with the longest value they can take', () => {
  // 10 digits of {predictionId} push this over 80; "ok" alone would not.
  const problems = check({ button: { uses: '{predictionId}', text: `${'x'.repeat(71)}{predictionId}` } });
  assert.deepEqual(problems, [{ message: 'a.button', problem: 'is 81 characters; a button label allows 80' }]);
  // 1004 + 20 digits is exactly the field value limit.
  assert.deepEqual(check({ fieldValue: { uses: '{authorId}', text: `${'x'.repeat(1004)}{authorId}` } }), []);
});

test('both plural forms are measured', () => {
  const tooLong = 'x'.repeat(257);
  assert.deepEqual(check({ author: { uses: '{count}', one: tooLong, other: 'ok' } }).map(p => p.message), ['a.author']);
  assert.deepEqual(check({ author: { uses: '{count}', one: 'ok', other: tooLong } }).map(p => p.message), ['a.author']);
});

test('a value with no sample is itself a problem', () => {
  const problems = checkLengths(sourceWith({}), catalog, { predictionId: '1', count: '1' });
  assert.deepEqual(problems, [
    { message: 'a.fieldValue', problem: 'uses {authorId}, which has no sample value in the length check' },
  ]);
});

test('a message that is missing or broken is left to checkMessages', () => {
  assert.deepEqual(check({ title: undefined }), []);
  assert.deepEqual(check({ title: 'bad {brace' }), []);
});
