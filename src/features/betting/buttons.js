import { getPrediction } from '../../../betting.js';
import { ephemeral } from '../../lib/response.js';
import { decode } from '../../lib/customId.js';
import { buildBetModal } from './modals.js';

export async function handleBetButton(interaction) {
  const { data } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId = parseInt(parts[0]);
  const prediction = await getPrediction(predictionId);

  if (!prediction) {
    return ephemeral(`❌ Prediction #${predictionId} not found.`);
  }

  return buildBetModal(predictionId, prediction.options);
}
