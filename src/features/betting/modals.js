import {
  createPrediction,
  placeBet,
  resolvePrediction,
  getPrediction,
} from '../../../betting.js';
import { ephemeral, public_ } from '../../lib/response.js';
import { messageText } from '../../lib/messages/index.js';
import { decode } from '../../lib/customId.js';
import { bettingErrorReply } from './bettingErrorReply.js';
import { formatOptionList } from './formatOptionList.js';

export async function handlePredictModal(interaction) {
  const { data, userId } = interaction;
  const components = data.components;
  const question   = components[0].components[0].value;
  const optionsStr = components[1].components[0].value;
  const yourChoice = components[2].components[0].value;
  const amountStr  = components[3].components[0].value;
  const amount     = parseInt(amountStr);

  if (isNaN(amount) || amount < 1) {
    return ephemeral(messageText('invalidAmount'));
  }

  const predefinedOptions = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
  if (predefinedOptions.length < 2) {
    return ephemeral(messageText('predict.tooFewOptions'));
  }

  const validChoice = predefinedOptions.find(opt => opt.toLowerCase() === yourChoice.toLowerCase());
  if (!validChoice) {
    return ephemeral(messageText('predict.choiceNotAnOption', { options: formatOptionList(predefinedOptions, messageText) }));
  }

  const result = await createPrediction(userId, question, predefinedOptions, validChoice, amount);
  if (!result.success) {
    return bettingErrorReply(result.error);
  }

  const options = messageText('bulletedOptionList', { items: predefinedOptions.map(option => ({ option })) });
  return public_(messageText('predict.created', {
    predictionId: result.predictionId,
    question,
    options,
    userId,
    amount,
    choice: validChoice,
  }));
}

export async function handleBetModal(interaction) {
  const { data, userId } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId   = parseInt(parts[0]);
  const selectedOption = data.components[0].components[0].value;
  const amountStr      = data.components[1].components[0].value;
  const amount         = parseInt(amountStr);

  if (isNaN(amount) || amount < 1) {
    return ephemeral(messageText('invalidAmount'));
  }

  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }

  const result = await placeBet(predictionId, userId, selectedOption, amount);
  if (!result.success) {
    return bettingErrorReply(result.error);
  }

  return public_(messageText('bet.placed', {
    predictionId,
    question: prediction.question,
    userId,
    amount,
    option: selectedOption,
  }));
}

export async function handleResolveModal(interaction) {
  const { data } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId = parseInt(parts[0]);
  const outcome      = data.components[0].components[0].value;

  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }

  const result = await resolvePrediction(predictionId, outcome);
  if (!result.success) {
    return bettingErrorReply(result.error);
  }

  const results = messageText('resolve.winners', { items: result.winners });
  return public_(messageText('resolve.announcement', {
    predictionId,
    question: prediction.question,
    outcome,
    totalPot: result.totalPot,
    results,
  }));
}

