import { ephemeral } from './response.js';
import { messageText } from './messages/index.js';

// One place writes the denial log and reply, so no admin check can word them differently.
// Imports no config, so a test can load it.
export function denyNonAdmin({ tag, action, userId, fields = {}, text = messageText }) {
  const extra = Object.entries(fields).map(([key, value]) => ` ${key}=${value}`).join('');
  console.log(`[${tag}] userId=${userId}${extra} action=${action} denied=notAdmin`);
  return ephemeral(text('denied.admin'));
}
