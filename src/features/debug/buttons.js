import { resetDatabase } from '../../../betting.js';
import { ephemeral } from '../../lib/response.js';
import { decode } from '../../lib/customId.js';

export async function handleConfirmReset(interaction) {
  const { data } = interaction;
  const { parts } = decode(data.custom_id);
  const answer = parts[0];

  if (answer === 'no') {
    return ephemeral('✋ Reset cancelled.');
  }

  const result = await resetDatabase();
  if (!result.success) {
    return ephemeral(`❌ Reset failed: ${result.error}`);
  }

  return ephemeral('💥 **Database reset complete!** All tables truncated.');
}
