const PLACEHOLDER_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/;
const pluralRules = new Intl.PluralRules('en');

// Text may be written as a list of lines so long messages stay readable in the file.
export function joinLines(text) {
  return Array.isArray(text) ? text.join('\n') : text;
}

// Turns text into literal and placeholder pieces. `{{` and `}}` are literal braces.
export function parseTemplate(text) {
  const pieces = [];
  let literal = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if ((char === '{' || char === '}') && next === char) {
      literal += char;
      i += 2;
    } else if (char === '{') {
      const end = text.indexOf('}', i);
      const name = end === -1 ? '' : text.slice(i + 1, end);
      if (!PLACEHOLDER_NAME.test(name)) {
        throw new Error(`stray or invalid brace at character ${i + 1}`);
      }
      if (literal) pieces.push({ literal });
      literal = '';
      pieces.push({ name });
      i = end + 1;
    } else if (char === '}') {
      throw new Error(`stray brace at character ${i + 1}`);
    } else {
      literal += char;
      i += 1;
    }
  }

  if (literal) pieces.push({ literal });
  return pieces;
}

export function placeholderNames(template) {
  return [...new Set(template.filter(piece => piece.name).map(piece => piece.name))];
}

function renderTemplate(template, values) {
  return template.map(piece => {
    if (piece.literal !== undefined) return piece.literal;
    if (!(piece.name in values)) throw new Error(`no value given for {${piece.name}}`);
    return String(values[piece.name]);
  }).join('');
}

function renderPlural(message, values) {
  const form = pluralRules.select(values[message.countName]) === 'one' ? message.one : message.other;
  return renderTemplate(form, values);
}

function renderList(message, { items, ...values }) {
  if (items.length === 0) return renderTemplate(message.empty, values);

  const separator = renderTemplate(message.separator, values);
  const lines = items.map(item => renderTemplate(message.item, item));
  return renderTemplate(message.header, values) + lines.join(separator);
}

const RENDERERS = {
  text: (message, values) => renderTemplate(message.template, values),
  plural: renderPlural,
  list: renderList,
};

export function renderMessage(message, values = {}) {
  return RENDERERS[message.kind](message, values);
}
