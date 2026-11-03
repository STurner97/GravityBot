import { checkMessages } from './checkMessages.js';
import { renderMessage } from './renderMessage.js';

// A broken message throws only when asked for, so one bad edit fails one command, not the bot.
export function createMessages(source, catalog) {
  const { messages, problems } = checkMessages(source, catalog);

  function text(name, values) {
    if (!(name in catalog)) throw new Error(`[Messages] ${name} is not a message the bot knows`);
    if (!messages.has(name)) throw new Error(`[Messages] ${name} is unavailable: see the startup log`);
    return renderMessage(messages.get(name), values);
  }

  return { text, problems, messageCount: messages.size };
}
