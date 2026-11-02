// Every string the /predictions list shows lives here, so the layout changes in one place.
import { formatTimestamp } from '../../lib/format.js';

export const PREDICTIONS_HEADER = '📋 **Active Predictions:**\n\n';
export const NO_PREDICTIONS_TEXT = '📋 No active predictions. Create one with `/predict`!';
export const PREVIOUS_LABEL = '◀ Previous';
export const NEXT_LABEL = 'Next ▶';

export const formatPageLine = (pageIndex, pageCount) => `Page ${pageIndex + 1} of ${pageCount}`;

export const formatBetButtonLabel = (predictionId) => `Bet on #${predictionId}`;

export function formatPredictionEntry(prediction) {
  return (
    `**ID ${prediction.id}:** ${prediction.question}\n` +
    `**Options:** ${prediction.options.join(', ')}\n` +
    `🕒 Created: ${formatTimestamp(prediction.createdAt)}\n` +
    `🎲 ${prediction.bets.length} bet(s)\n\n`
  );
}
