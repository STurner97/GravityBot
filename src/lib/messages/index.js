import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalog } from './catalog.js';
import { createMessages } from './createMessages.js';

export const MESSAGES_FILE = fileURLToPath(new URL('../../../messages.json', import.meta.url));

function readMessagesFile() {
  try {
    return readFileSync(MESSAGES_FILE, 'utf8');
  } catch (err) {
    console.error('[Messages] cannot read messages.json', err);
    return '{}';
  }
}

const { text, problems, messageCount } = createMessages(readMessagesFile(), catalog);

console.log(`[Messages] file=messages.json messages=${messageCount} problems=${problems.length}`);
for (const { message, problem } of problems) {
  console.error(`[Messages] message=${message} problem=${problem}`);
}

export const messageText = text;
