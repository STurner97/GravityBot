import { ephemeral } from '../../lib/response.js';
import { decode } from '../../lib/customId.js';
import { messageText } from '../../lib/messages/index.js';

// `reset` is given by the registration, so this file and its test never load the database.
export async function handleConfirmReset(interaction, { reset, text = messageText }) {
  const { data } = interaction;
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
