// Pure /debug replies, kept apart from the handler so tests can build them without a database.
import { messageText } from '../../lib/messages/index.js';
import { formatOptionList } from '../betting/formatOptionList.js';

const MAX_BETS_SHOWN = 10;

function formatTimestamp(dateStr, text, format = 'F') {
  if (!dateStr) return text('debug.unknownTime');
  const unixSeconds = Math.floor(new Date(dateStr).getTime() / 1000);
  return `<t:${unixSeconds}:${format}>`;
}

function formatStatus({ resolved, outcome }, text) {
  if (!resolved) return text('debug.status.active');
  return text('debug.status.resolved', { outcome: outcome || text('debug.notApplicable') });
}

export function formatStats(stats, text = messageText) {
  return text('debug.stats', {
    users: stats.users,
    predictions: stats.predictions,
    activePredictions: stats.active_predictions,
    resolvedPredictions: stats.resolved_predictions,
    bets: stats.bets,
    totalBetAmount: stats.total_bet_amount,
  });
}

export function formatPrediction(prediction, text = messageText) {
  const totalPot = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const shownBets = prediction.bets.slice(0, MAX_BETS_SHOWN);
  const hiddenBetCount = prediction.bets.length - shownBets.length;

  const summary = text('debug.prediction.summary', {
    predictionId: prediction.id,
    question: prediction.question,
    options: formatOptionList(prediction.options, text),
    createdAt: formatTimestamp(prediction.createdAt, text),
    resolved: text(prediction.resolved ? 'debug.yes' : 'debug.no'),
    outcome: prediction.outcome || text('debug.notApplicable'),
    totalPot,
    betCount: prediction.bets.length,
  });
  const bets = text('debug.prediction.bets', {
    items: shownBets.map(bet => ({ userId: bet.userId, option: bet.prediction, amount: bet.amount })),
  });
  const more = hiddenBetCount > 0 ? text('debug.prediction.moreBets', { count: hiddenBetCount }) : '';

  return summary + bets + more;
}

export function formatUserDebug(userId, limit, userDebug, text = messageText) {
  const summary = text('debug.user.summary', { userId, balance: userDebug.balance, limit });
  const bets = text('debug.user.bets', {
    items: userDebug.bets.map(bet => ({
      predictionId: bet.prediction_id,
      question: bet.question,
      option: bet.prediction,
      amount: bet.amount,
      status: formatStatus(bet, text),
      createdAt: formatTimestamp(bet.created_at, text),
    })),
  });
  return summary + bets;
}

export function formatRecent(limit, recent, text = messageText) {
  const list = text('debug.recent.list', {
    items: recent.map(prediction => ({
      predictionId: prediction.id,
      question: prediction.question,
      status: formatStatus(prediction, text),
      createdAt: formatTimestamp(prediction.created_at, text),
    })),
  });
  return text('debug.recent.header', { limit }) + list;
}
