import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplate, joinLines, renderMessage, placeholderNames } from './renderMessage.js';

const text = (source) => ({ kind: 'text', template: parseTemplate(joinLines(source)) });

test('a placeholder is replaced by its value', () => {
  assert.equal(renderMessage(text('You have **{balance}** credits.'), { balance: 7 }), 'You have **7** credits.');
});

test('a value of zero is shown, not treated as missing', () => {
  assert.equal(renderMessage(text('{amount}'), { amount: 0 }), '0');
});

test('a placeholder can be used twice and moved', () => {
  assert.equal(renderMessage(text('{b} then {a} then {b}'), { a: 'x', b: 'y' }), 'y then x then y');
});

test('{{ and }} are written as literal braces', () => {
  assert.equal(renderMessage(text('{{not a value}} {n}'), { n: 1 }), '{not a value} 1');
});

test('text written as a list of lines is joined with line breaks', () => {
  assert.equal(joinLines(['a', '', 'b']), 'a\n\nb');
});

test('an empty last line adds a line break after the text', () => {
  assert.equal(joinLines(['a', '']), 'a\n');
});

test('a value the code did not give throws', () => {
  assert.throws(() => renderMessage(text('{amount}'), {}), /amount/);
});

test('a stray brace is a template error', () => {
  assert.throws(() => parseTemplate('oops { here'), /stray/i);
  assert.throws(() => parseTemplate('oops } here'), /stray/i);
});

test('a placeholder name must be letters and digits', () => {
  assert.throws(() => parseTemplate('{two words}'), /stray|invalid/i);
  assert.throws(() => parseTemplate('{}'), /stray|invalid/i);
});

test('placeholderNames lists each name once', () => {
  assert.deepEqual(placeholderNames(parseTemplate('{a} {b} {a} {{c}}')), ['a', 'b']);
});

const plural = {
  kind: 'plural',
  countName: 'amount',
  one: parseTemplate('Donate {amount} Credit'),
  other: parseTemplate('Donate {amount} Credits'),
};

test('a plural message picks the form from the count', () => {
  assert.equal(renderMessage(plural, { amount: 1 }), 'Donate 1 Credit');
  assert.equal(renderMessage(plural, { amount: 0 }), 'Donate 0 Credits');
  assert.equal(renderMessage(plural, { amount: 50 }), 'Donate 50 Credits');
});

const list = {
  kind: 'list',
  header: parseTemplate('Header\n'),
  item: parseTemplate('- {name}'),
  separator: parseTemplate(', '),
  empty: parseTemplate('Nothing'),
};

test('a list is the header, then each item, joined by the separator', () => {
  assert.equal(renderMessage(list, { items: [{ name: 'a' }, { name: 'b' }] }), 'Header\n- a, - b');
});

test('an empty list shows the empty text and no header', () => {
  assert.equal(renderMessage(list, { items: [] }), 'Nothing');
});

test('a list without a separator joins items directly', () => {
  const noSeparator = { ...list, separator: parseTemplate('') };
  assert.equal(renderMessage(noSeparator, { items: [{ name: 'a' }, { name: 'b' }] }), 'Header\n- a- b');
});

test('a list header and empty text can use the values given beside the items', () => {
  const withValues = { ...list, header: parseTemplate('Page {page}\n'), empty: parseTemplate('None on page {page}') };
  assert.equal(renderMessage(withValues, { page: 2, items: [{ name: 'a' }] }), 'Page 2\n- a');
  assert.equal(renderMessage(withValues, { page: 2, items: [] }), 'None on page 2');
});
