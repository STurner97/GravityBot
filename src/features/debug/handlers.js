import {
  getDebugStats,
  getUserDebug,
  getRecentPredictions,
  getPrediction,
} from '../../../betting.js';
import { ephemeral } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';
import { messageText } from '../../lib/messages/index.js';
import { formatStats, formatPrediction, formatUserDebug, formatRecent } from './formatDebugReplies.js';
import { buildResetPrompt, buildSqlModal } from './buildDebugComponents.js';

const DEFAULT_USER_BETS_LIMIT = 10;
const DEFAULT_RECENT_LIMIT = 5;

const optionValue = (subcommand, name) => subcommand.options?.find(opt => opt.name === name)?.value;

async function showStats() {
  return ephemeral(formatStats(await getDebugStats()));
}

async function showPrediction(subcommand) {
  const predictionId = optionValue(subcommand, 'prediction_id');
  const prediction = await getPrediction(predictionId);
  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }
  return ephemeral(formatPrediction(prediction));
}

async function showUser(subcommand) {
  const targetUserId = optionValue(subcommand, 'user');
  const limit = optionValue(subcommand, 'limit') || DEFAULT_USER_BETS_LIMIT;
  const userDebug = await getUserDebug(targetUserId, limit);
  return ephemeral(formatUserDebug(targetUserId, limit, userDebug));
}

async function showRecent(subcommand) {
  const limit = optionValue(subcommand, 'limit') || DEFAULT_RECENT_LIMIT;
  return ephemeral(formatRecent(limit, await getRecentPredictions(limit)));
}

const SUBCOMMANDS = {
  stats: showStats,
  prediction: showPrediction,
  user: showUser,
  recent: showRecent,
  reset: () => buildResetPrompt(),
  sql: () => buildSqlModal(),
};

export async function handleDebug(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('denied.admin'));
  }

  const subcommand = data.options?.[0];
  if (!subcommand) {
    return ephemeral(messageText('debug.missingSubcommand'));
  }

  const show = SUBCOMMANDS[subcommand.name];
  if (!show) {
    return ephemeral(messageText('debug.unknownSubcommand'));
  }
  return show(subcommand);
}
