import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMessages } from './checkMessages.js';
import { renderMessage } from './renderMessage.js';
import { textMessage, pluralMessage, listMessage } from './catalog.js';

const catalog = {
  'greeting.hello': textMessage(['name']),
  'greeting.plain': textMessage([]),
  'donate.button': pluralMessage('amount'),
  'people': listMessage({ itemValues: ['name'] }),
};

const goodFile = {
  _howToEdit: 'notes are ignored',
  greeting: {
    hello: { uses: '{name}', text: ['Hello', '{name}'] },
    plain: 'Just text',
  },
  donate: { button: { uses: '{amount}', one: '{amount} Credit', other: '{amount} Credits' } },
  people: { header: 'People:\n', item: { uses: '{name}', text: '- {name}' }, separator: '\n', empty: 'Nobody' },
};

const check = (file, usedCatalog = catalog) =>
  checkMessages(typeof file === 'string' ? file : JSON.stringify(file), usedCatalog);

const problemsOf = (file, usedCatalog) => check(file, usedCatalog).problems;

const without = (file, ...path) => {
  const copy = structuredClone(file);
  const last = path.pop();
  const parent = path.reduce((node, key) => node[key], copy);
  delete parent[last];
  return copy;
};

test('a good file has no problems and every message renders', () => {
  const { messages, problems } = check(goodFile);
  assert.deepEqual(problems, []);
  assert.equal(renderMessage(messages.get('greeting.hello'), { name: 'Sam' }), 'Hello\nSam');
  assert.equal(renderMessage(messages.get('greeting.plain')), 'Just text');
  assert.equal(renderMessage(messages.get('donate.button'), { amount: 1 }), '1 Credit');
  assert.equal(renderMessage(messages.get('people'), { items: [{ name: 'a' }, { name: 'b' }] }), 'People:\n- a\n- b');
  assert.equal(renderMessage(messages.get('people'), { items: [] }), 'Nobody');
});

test('a file that does not parse names the line and column, and makes no message available', () => {
  const { messages, problems } = check('{\n  "a": 1\n  "b": 2\n}');
  assert.equal(messages.size, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0].problem, /line 3 column 3/);
});

test('a file that is not an object is a parse problem', () => {
  assert.match(problemsOf('[1, 2]')[0].problem, /object/);
});

test('a missing message is named', () => {
  const { messages, problems } = check(without(goodFile, 'greeting', 'hello'));
  assert.deepEqual(problems, [{ message: 'greeting.hello', problem: 'is missing' }]);
  assert.equal(messages.has('greeting.hello'), false);
  assert.equal(messages.has('greeting.plain'), true);
});

test('a missing group names every message in it', () => {
  const names = problemsOf(without(goodFile, 'greeting')).map(p => p.message);
  assert.deepEqual(names, ['greeting.hello', 'greeting.plain']);
});

test('a message the code does not know is named', () => {
  const file = structuredClone(goodFile);
  file.greeting.helo = 'typo';
  assert.deepEqual(problemsOf(file), [{ message: 'greeting.helo', problem: 'is not a message the bot uses' }]);
});

test('an unknown placeholder names the message and the placeholder', () => {
  const file = structuredClone(goodFile);
  file.greeting.hello.text = 'Hello {nam}';
  const [problem] = problemsOf(file);
  assert.equal(problem.message, 'greeting.hello');
  assert.match(problem.problem, /\{nam\}/);
});

test('a placeholder a message may use but does not is fine', () => {
  const file = structuredClone(goodFile);
  file.greeting.hello.text = 'Hello';
  assert.deepEqual(problemsOf(file), []);
});

test('a stray brace names the message', () => {
  const file = structuredClone(goodFile);
  file.greeting.plain = 'oops {';
  const [problem] = problemsOf(file);
  assert.equal(problem.message, 'greeting.plain');
  assert.match(problem.problem, /brace/);
});

test('{{ and }} are accepted as literal braces', () => {
  const file = structuredClone(goodFile);
  file.greeting.plain = 'a {{literal}} brace';
  assert.deepEqual(problemsOf(file), []);
});

test('uses that differs from what the code gives is a problem', () => {
  const file = structuredClone(goodFile);
  file.greeting.hello.uses = '{name} {extra}';
  const [problem] = problemsOf(file);
  assert.equal(problem.message, 'greeting.hello');
  assert.match(problem.problem, /uses/);
});

test('a message that takes values must say what it uses', () => {
  const file = structuredClone(goodFile);
  file.greeting.hello = 'Hello';
  assert.match(problemsOf(file)[0].problem, /uses/);
});

test('a plural must have both forms', () => {
  const file = without(goodFile, 'donate', 'button', 'other');
  const [problem] = problemsOf(file);
  assert.equal(problem.message, 'donate.button');
  assert.match(problem.problem, /other/);
});

test('a plural form is checked for unknown placeholders', () => {
  const file = structuredClone(goodFile);
  file.donate.button.one = '{amont} Credit';
  assert.match(problemsOf(file)[0].problem, /\{amont\}/);
});

test('a list without an item is a problem', () => {
  const [problem] = problemsOf(without(goodFile, 'people', 'item'));
  assert.equal(problem.message, 'people');
  assert.match(problem.problem, /item/);
});

test('a list part the code does not know is a problem', () => {
  const file = structuredClone(goodFile);
  file.people.heder = 'typo';
  assert.match(problemsOf(file)[0].problem, /heder/);
});

test('a list item is checked against the item values, not the list values', () => {
  const file = structuredClone(goodFile);
  file.people.header = 'Hello {name}';
  assert.match(problemsOf(file)[0].problem, /\{name\}/);
});

test('a message that is the wrong kind is a problem', () => {
  const file = structuredClone(goodFile);
  file.donate.button = 'just text';
  assert.equal(problemsOf(file)[0].message, 'donate.button');
});

test('one broken message leaves the others available', () => {
  const file = structuredClone(goodFile);
  file.greeting.plain = 'oops {';
  const { messages } = check(file);
  assert.equal(messages.has('greeting.plain'), false);
  assert.equal(messages.has('greeting.hello'), true);
  assert.equal(messages.has('people'), true);
});
