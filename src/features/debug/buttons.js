import { ephemeral } from '../../lib/response.js';
import { decode } from '../../lib/customId.js';
import { denyNonAdmin } from '../../lib/adminDenial.js';
import { messageText } from '../../lib/messages/index.js';

// `isAdmin` and `reset` are given by the registration, so this file and its test never load
// config or the database. The check covers Cancel too: any click on the prompt is admin-only.
export async function handleConfirmReset(interaction, { isAdmin, reset, text = messageText }) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return denyNonAdmin({ tag: 'Debug', action: 'confirmReset', userId, text });
  }

  const { parts } = decode(data.custom_id);
  const answer = parts[0];

  if (answer === 'no') {
    return ephemeral(text('debug.reset.cancelled'));
  }

  try {
    await reset();
  } catch (err) {
    console.error('[Debug] action=resetDatabase failed', err);
    return ephemeral(text('debug.reset.failed'));
  }

  return ephemeral(text('debug.reset.done'));
}
