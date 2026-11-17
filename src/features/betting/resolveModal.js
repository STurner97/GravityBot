import { public_, ephemeral } from '../../lib/response.js';
import { messageText } from '../../lib/messages/index.js';
import { decode } from '../../lib/customId.js';
import { denyNonAdmin } from '../../lib/adminDenial.js';
import { bettingErrorReply } from './bettingErrorReply.js';

// The functions that touch config or the database are given by the registration, so the test
// never loads them. The admin check comes first: the form can outlive the admin's rights.
export async function handleResolveModal(interaction, { isAdmin, getPrediction, resolvePrediction, text = messageText }) {
  const { data, userId } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId = parseInt(parts[0]);

  if (!isAdmin(userId)) {
    return denyNonAdmin({ tag: 'Betting', action: 'resolve', userId, fields: { predictionId }, text });
  }

  const outcome = data.components[0].components[0].value;

  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(text('prediction.notFound', { predictionId }));
  }

  const result = await resolvePrediction(predictionId, outcome);
  if (!result.success) {
    return bettingErrorReply(result.error);
  }

  const results = text('resolve.winners', { items: result.winners });
  return public_(text('resolve.announcement', {
    predictionId,
    question: prediction.question,
    outcome,
    totalPot: result.totalPot,
    results,
  }));
}
