import {
  MessageComponentTypes,
  TextStyleTypes,
} from 'discord-interactions';
import {
  createPrediction,
  placeBet,
  resolvePrediction,
  getPrediction,
} from '../../../betting.js';
import { ephemeral, public_, modal } from '../../lib/response.js';
import { encode, decode } from '../../lib/customId.js';

// Truncates the options list to fit Discord's 100-char placeholder limit.
function buildOptionsPlaceholder(options, maxLength = 100) {
  if (!Array.isArray(options) || options.length === 0) return 'Enter an option';
  const text = options.join(', ');
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildPredictModal() {
  return modal('predict_modal', 'Create a Prediction', [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'question_input',
        label: 'Question',
        style: TextStyleTypes.SHORT,
        placeholder: 'e.g., How long will UK PM last?',
        required: true,
        max_length: 200,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'options_input',
        label: 'Options (comma-separated)',
        style: TextStyleTypes.SHORT,
        placeholder: '1 week, 2 weeks, 1 month, 3 months',
        required: true,
        max_length: 300,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'choice_input',
        label: 'Your Choice',
        style: TextStyleTypes.SHORT,
        placeholder: 'Pick from your options above',
        required: true,
        max_length: 100,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'amount_input',
        label: 'Bet Amount',
        style: TextStyleTypes.SHORT,
        placeholder: 'Credits to bet',
        required: true,
        max_length: 10,
      }],
    },
  ]);
}

export function buildBetModal(predictionId, options) {
  return modal(encode('bet_modal', predictionId), `Bet on Prediction #${predictionId}`, [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'option_input',
        label: 'Choose an option',
        style: TextStyleTypes.SHORT,
        placeholder: buildOptionsPlaceholder(options),
        required: true,
        max_length: 100,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'bet_amount_input',
        label: 'Bet Amount',
        style: TextStyleTypes.SHORT,
        placeholder: 'Credits to bet',
        required: true,
        max_length: 10,
      }],
    },
  ]);
}

export function buildResolveModal(predictionId, options) {
  return modal(encode('resolve_modal', predictionId), `Resolve Prediction #${predictionId}`, [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'outcome_input',
        label: 'Winning Outcome',
        style: TextStyleTypes.SHORT,
        placeholder: buildOptionsPlaceholder(options),
        required: true,
        max_length: 100,
      }],
    },
  ]);
}

export async function handlePredictModal(interaction) {
  const { data, userId } = interaction;
  const components = data.components;
  const question   = components[0].components[0].value;
  const optionsStr = components[1].components[0].value;
  const yourChoice = components[2].components[0].value;
  const amountStr  = components[3].components[0].value;
  const amount     = parseInt(amountStr);

  if (isNaN(amount) || amount < 1) {
    return ephemeral('❌ Amount must be a positive number.');
  }

  const predefinedOptions = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
  if (predefinedOptions.length < 2) {
    return ephemeral('❌ You must provide at least 2 options (comma-separated).');
  }

  const validChoice = predefinedOptions.find(opt => opt.toLowerCase() === yourChoice.toLowerCase());
  if (!validChoice) {
    return ephemeral(`❌ Your choice must match one of the options exactly.\nOptions: ${predefinedOptions.join(', ')}`);
  }

  const result = await createPrediction(userId, question, predefinedOptions, validChoice, amount);
  if (!result.success) {
    return ephemeral(`❌ ${result.error}`);
  }

  const successMessage =
    `✅ Prediction created!\n\n` +
    `**ID:** ${result.predictionId}\n` +
    `**Question:** ${question}\n` +
    `**Options:**\n${predefinedOptions.map(opt => `• ${opt}`).join('\n')}\n\n` +
    `<@${userId}> bet **${amount}** credits on: **${validChoice}**\n\n` +
    `Others can bet using \`/bet ${result.predictionId}\` or \`/predictions\`!`;

  return public_(successMessage);
}

export async function handleBetModal(interaction) {
  const { data, userId } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId   = parseInt(parts[0]);
  const selectedOption = data.components[0].components[0].value;
  const amountStr      = data.components[1].components[0].value;
  const amount         = parseInt(amountStr);

  if (isNaN(amount) || amount < 1) {
    return ephemeral('❌ Amount must be a positive number.');
  }

  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(`❌ Prediction #${predictionId} not found.`);
  }

  const result = await placeBet(predictionId, userId, selectedOption, amount);
  if (!result.success) {
    return ephemeral(`❌ ${result.error}`);
  }

  return public_(`✅ Bet placed!\n\n**Prediction #${predictionId}:** ${prediction.question}\n<@${userId}> bet **${amount}** credits on: **${selectedOption}**`);
}

export async function handleResolveModal(interaction) {
  const { data } = interaction;
  const { parts } = decode(data.custom_id);
  const predictionId = parseInt(parts[0]);
  const outcome      = data.components[0].components[0].value;

  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(`❌ Prediction #${predictionId} not found.`);
  }

  const result = await resolvePrediction(predictionId, outcome);
  if (!result.success) {
    return ephemeral(`❌ ${result.error}`);
  }

  let message =
    `✅ **Prediction #${predictionId} Resolved!**\n\n` +
    `**Question:** ${prediction.question}\n` +
    `**Outcome:** ${outcome}\n` +
    `**Total Pot:** ${result.totalPot} credits\n\n`;

  if (result.winners.length === 0) {
    message += '❌ No winners. All bets lost.';
  } else {
    message += '🎉 **Winners:**\n';
    for (const winner of result.winners) {
      message += `<@${winner.userId}> won **${winner.winnings}** credits (profit: **${winner.profit}**)\n`;
    }
  }

  return public_(message);
}

