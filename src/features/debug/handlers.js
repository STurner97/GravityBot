import {
  MessageComponentTypes,
  ButtonStyleTypes,
  TextStyleTypes,
} from 'discord-interactions';
import {
  getDebugStats,
  getUserDebug,
  getRecentPredictions,
  resetDatabase,
  getPrediction,
} from '../../../betting.js';
import { ephemeral, modal } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';
import { encode } from '../../lib/customId.js';

function formatTimestamp(dateStr, format = 'F') {
  if (!dateStr) return 'unknown';
  const unixSeconds = Math.floor(new Date(dateStr).getTime() / 1000);
  return `<t:${unixSeconds}:${format}>`;
}

export async function handleDebug(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral('❌ You do not have permission to use this command.');
  }

  const subcommand = data.options?.[0];
  if (!subcommand) {
    return ephemeral('❌ Missing debug subcommand.');
  }

  if (subcommand.name === 'stats') {
    const stats = await getDebugStats();
    const message =
      '🧪 **DB Stats:**\n' +
      `Users: ${stats.users}\n` +
      `Predictions: ${stats.predictions} (active: ${stats.active_predictions}, resolved: ${stats.resolved_predictions})\n` +
      `Bets: ${stats.bets} | Total bet amount: ${stats.total_bet_amount}`;
    return ephemeral(message);
  }

  if (subcommand.name === 'prediction') {
    const predictionId = subcommand.options?.find(opt => opt.name === 'prediction_id')?.value;
    const prediction = await getPrediction(predictionId);
    if (!prediction) {
      return ephemeral(`❌ Prediction #${predictionId} not found.`);
    }

    const totalPot = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0);
    const createdAt = formatTimestamp(prediction.createdAt);
    const MAX_BETS_SHOWN = 10;

    let message =
      `🧪 **Prediction #${prediction.id}**\n` +
      `Question: ${prediction.question}\n` +
      `Options: ${prediction.options.join(', ')}\n` +
      `Created: ${createdAt}\n` +
      `Resolved: ${prediction.resolved ? 'yes' : 'no'}\n` +
      `Outcome: ${prediction.outcome || 'n/a'}\n` +
      `Total pot: ${totalPot} credits\n` +
      `Bets (${prediction.bets.length}):\n`;

    if (prediction.bets.length === 0) {
      message += 'No bets yet.';
    } else {
      for (const bet of prediction.bets.slice(0, MAX_BETS_SHOWN)) {
        message += `• <@${bet.userId}>: ${bet.prediction} (${bet.amount})\n`;
      }
      if (prediction.bets.length > MAX_BETS_SHOWN) {
        message += `…and ${prediction.bets.length - MAX_BETS_SHOWN} more`;
      }
    }

    return ephemeral(message);
  }

  if (subcommand.name === 'user') {
    const targetUserId = subcommand.options?.find(opt => opt.name === 'user')?.value;
    const limit = subcommand.options?.find(opt => opt.name === 'limit')?.value || 10;
    const userDebug = await getUserDebug(targetUserId, limit);

    let message =
      `🧪 **User <@${targetUserId}>**\n` +
      `Balance: ${userDebug.balance} credits\n` +
      `Recent bets (max ${limit}):\n`;

    if (userDebug.bets.length === 0) {
      message += 'No bets found.';
    } else {
      for (const bet of userDebug.bets) {
        const createdAt = formatTimestamp(bet.created_at);
        const status = bet.resolved ? `resolved (${bet.outcome || 'n/a'})` : 'active';
        message += `• #${bet.prediction_id}: ${bet.question} | ${bet.prediction} (${bet.amount}) | ${status} | ${createdAt}\n`;
      }
    }

    return ephemeral(message);
  }

  if (subcommand.name === 'recent') {
    const limit = subcommand.options?.find(opt => opt.name === 'limit')?.value || 5;
    const recent = await getRecentPredictions(limit);

    let message = `🧪 **Recent Predictions (max ${limit})**\n`;
    if (recent.length === 0) {
      message += 'No predictions found.';
    } else {
      for (const pred of recent) {
        const createdAt = formatTimestamp(pred.created_at);
        const status = pred.resolved ? `resolved (${pred.outcome || 'n/a'})` : 'active';
        message += `• #${pred.id}: ${pred.question} | ${status} | ${createdAt}\n`;
      }
    }

    return ephemeral(message);
  }

  if (subcommand.name === 'reset') {
    return ephemeral(
      '⚠️ **WARNING: Are you sure you want to reset the entire database?** This will delete all users, predictions, and bets.',
      [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              style: ButtonStyleTypes.DANGER,
              label: 'Yes, Reset',
              custom_id: encode('confirm_reset', 'yes'),
            },
            {
              type: MessageComponentTypes.BUTTON,
              style: ButtonStyleTypes.SECONDARY,
              label: 'Cancel',
              custom_id: encode('confirm_reset', 'no'),
            },
          ],
        },
      ]
    );
  }

  if (subcommand.name === 'sql') {
    return modal('debug_sql_modal', 'Execute SQL Query', [
      {
        type: MessageComponentTypes.ACTION_ROW,
        components: [{
          type: MessageComponentTypes.INPUT_TEXT,
          custom_id: 'sql_query_input',
          label: 'SQL Query',
          style: TextStyleTypes.PARAGRAPH,
          placeholder: 'SELECT * FROM users;',
          required: true,
          max_length: 2000,
        }],
      },
    ]);
  }

  return ephemeral('❌ Unknown debug subcommand.');
}
