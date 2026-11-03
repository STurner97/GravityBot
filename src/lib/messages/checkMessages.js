import { joinLines, parseTemplate, placeholderNames } from './renderMessage.js';

const isNote = (key) => key.startsWith('_');
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' || (Array.isArray(value) && value.every(line => typeof line === 'string'));
const showNames = (names) => names.map(name => `{${name}}`).join(' ') || 'nothing';

function describeParseError(source, error) {
  const position = Number(/position (\d+)/.exec(error.message)?.[1]);
  if (Number.isNaN(position)) return `does not parse: ${error.message}`;

  const before = source.slice(0, position).split('\n');
  return `does not parse at line ${before.length} column ${before.at(-1).length + 1}: ${error.message}`;
}

function parseSource(source) {
  let file;
  try {
    file = JSON.parse(source);
  } catch (error) {
    return { problem: { message: 'messages.json', problem: describeParseError(source, error) } };
  }
  if (!isPlainObject(file)) {
    return { problem: { message: 'messages.json', problem: 'must be an object of messages' } };
  }
  return { file };
}

const parseTemplateOf = (text) => parseTemplate(joinLines(text));

function requireUsesToMatch(uses, expected) {
  if (uses === undefined && expected.length === 0) return;
  if (typeof uses !== 'string') throw new Error(`needs "uses": ${showNames(expected)}`);

  const listed = placeholderNames(parseTemplateOf(uses));
  const matches = listed.length === expected.length && expected.every(name => listed.includes(name));
  if (!matches) throw new Error(`"uses" lists ${showNames(listed)} but the bot gives ${showNames(expected)}`);
}

function parseAllowedTemplate(text, allowed) {
  const template = parseTemplateOf(text);
  const unknown = placeholderNames(template).find(name => !allowed.includes(name));
  if (unknown) throw new Error(`unknown placeholder {${unknown}}; this message may use ${showNames(allowed)}`);
  return template;
}

function rejectUnknownKeys(node, knownKeys) {
  const unknown = Object.keys(node).find(key => !isNote(key) && !knownKeys.includes(key));
  if (unknown) throw new Error(`"${unknown}" is not part of this message`);
}

function compileTextNode(node, allowed) {
  if (isText(node)) {
    requireUsesToMatch(undefined, allowed);
    return parseAllowedTemplate(node, allowed);
  }
  if (!isPlainObject(node) || !isText(node.text)) {
    throw new Error('must be text, a list of lines, or { "uses", "text" }');
  }
  rejectUnknownKeys(node, ['uses', 'text']);
  requireUsesToMatch(node.uses, allowed);
  return parseAllowedTemplate(node.text, allowed);
}

function compileText(node, spec) {
  return { kind: 'text', template: compileTextNode(node, spec.values) };
}

function compilePlural(node, spec) {
  const shape = 'must be { "uses", "one", "other" }';
  if (!isPlainObject(node)) throw new Error(shape);
  rejectUnknownKeys(node, ['uses', 'one', 'other']);
  requireUsesToMatch(node.uses, spec.values);

  const form = (key) => {
    if (!isText(node[key])) throw new Error(`needs "${key}" text`);
    return parseAllowedTemplate(node[key], spec.values);
  };
  return { kind: 'plural', countName: spec.countName, one: form('one'), other: form('other') };
}

function compileListPart(node, key, allowed, { optional }) {
  if (node[key] === undefined && optional) return [];
  if (node[key] === undefined) throw new Error(`needs "${key}"`);
  try {
    return compileTextNode(node[key], allowed);
  } catch (error) {
    throw new Error(`${key}: ${error.message}`);
  }
}

function compileList(node, spec) {
  if (!isPlainObject(node)) throw new Error('must be { "header", "item", "separator", "empty" }');
  rejectUnknownKeys(node, ['header', 'item', 'separator', 'empty']);

  return {
    kind: 'list',
    header: compileListPart(node, 'header', spec.values, { optional: true }),
    item: compileListPart(node, 'item', spec.itemValues, { optional: false }),
    separator: compileListPart(node, 'separator', [], { optional: true }),
    empty: compileListPart(node, 'empty', spec.values, { optional: true }),
  };
}

const COMPILERS = { text: compileText, plural: compilePlural, list: compileList };

function lookup(file, name) {
  return name.split('.').reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), file);
}

function findUnknownMessages(node, prefix, catalog) {
  const unknown = [];
  for (const [key, value] of Object.entries(node)) {
    if (isNote(key)) continue;
    const path = prefix + key;
    const isMessage = path in catalog;
    const isGroup = Object.keys(catalog).some(name => name.startsWith(`${path}.`));
    if (isGroup && isPlainObject(value)) unknown.push(...findUnknownMessages(value, `${path}.`, catalog));
    else if (!isMessage && !isGroup) unknown.push({ message: path, problem: 'is not a message the bot uses' });
  }
  return unknown;
}

// One function for the tests and the bot, so what passes in `npm test` is what the bot accepts.
export function checkMessages(source, catalog) {
  const { file, problem } = parseSource(source);
  if (problem) return { messages: new Map(), problems: [problem] };

  const problems = findUnknownMessages(file, '', catalog);
  const messages = new Map();

  for (const [name, spec] of Object.entries(catalog)) {
    const node = lookup(file, name);
    if (node === undefined) {
      problems.push({ message: name, problem: 'is missing' });
      continue;
    }
    try {
      messages.set(name, COMPILERS[spec.kind](node, spec));
    } catch (error) {
      problems.push({ message: name, problem: error.message });
    }
  }

  return { messages, problems };
}
