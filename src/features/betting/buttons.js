import { getPrediction, donateCredits } from '../../../betting.js';
import { messageText } from '../../lib/messages/index.js';
import { ephemeral, public_, updateMessage } from '../../lib/response.js';
import { decode } from '../../lib/customId.js';
import { bettingErrorReply } from './bettingErrorReply.js';
import { buildBetModal } from './buildModals.js';
import { loadPredictionsPage } from './loadPredictionsPage.js';

export async function handleDonateButton(interaction) {
  const { data, userId: donorId } = interaction;
  const { parts } = decode(data.custom_id);
  const targetUserId = parts[0];
  const amount = parseInt(parts[1]);

  if (donorId === targetUserId) {
    return ephemeral(messageText('donate.self'));
  }

  const result = await donateCredits(donorId, targetUserId, amount);

  if (!result.success) {
    return bettingErrorReply(result.error);
  }

  console.log(`[Betting] donorId=${donorId} recipientId=${targetUserId} amount=${amount} action=donate`);
  return public_(messageText('donate.donated', { donorId, amount, recipientId: targetUserId }));
}

export async function handleBetButton(interaction) {
  const { data } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId = parseInt(parts[0]);
  const prediction = await getPrediction(predictionId);

  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }

  return buildBetModal(predictionId, prediction.options);
}

export async function handlePredictionsPageButton(interaction) {
  const { data, userId } = interaction;
  const { parts } = decode(data.custom_id);
  const { content, components } = await loadPredictionsPage(userId, parseInt(parts[0], 10), 'pagePredictions');
  return updateMessage(content, components);
}
