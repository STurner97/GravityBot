// Every string the /predictions list shows lives here, so the layout changes in one place.

export const PREDICTIONS_HEADER = '📋 **Active Predictions:**\n\n';
export const NO_PREDICTIONS_TEXT = '📋 No active predictions. Create one with `/predict`!';
export const PREVIOUS_LABEL = '◀ Previous';
export const NEXT_LABEL = 'Next ▶';

export const formatPageLine = (pageIndex, pageCount) => `Page ${pageIndex + 1} of ${pageCount}`;

export const formatBetButtonLabel = (predictionId) => `Bet on #${predictionId}`;

const ELLIPSIS = '…';
// Keeps a cut question from eating the options entirely.
const OPTIONS_FLOOR_LENGTH = 20;

// Cuts to `maxLength` UTF-16 units, the unit Discord's limit is measured in.
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  if (maxLength <= 0) return '';
  let kept = text.slice(0, maxLength - ELLIPSIS.length);
  const lastUnit = kept.charCodeAt(kept.length - 1);
  const splitsEmoji = lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  if (splitsEmoji) kept = kept.slice(0, -1);
  return kept + ELLIPSIS;
}

const totalOfBets = (bets) => bets.reduce((sum, bet) => sum + bet.amount, 0);

function layoutEntry(prediction, question, optionsText) {
  return (
    `**ID ${prediction.id}:** ${question}\n` +
    `**Options:** ${optionsText}\n` +
    `${prediction.bets.length} bet(s), totalling 💰 ${totalOfBets(prediction.bets)} Credits\n\n`
  );
}

// An entry over maxLength gives up options text first, then question text.
export function formatPredictionEntry(prediction, maxLength = Infinity) {
  const optionsText = prediction.options.join(', ');
  const full = layoutEntry(prediction, prediction.question, optionsText);
  if (full.length <= maxLength) return full;

  const room = maxLength - layoutEntry(prediction, '', '').length;
  const optionsRoom = Math.min(Math.max(room - prediction.question.length, OPTIONS_FLOOR_LENGTH), room);
  const shortOptions = truncate(optionsText, optionsRoom);
  const shortQuestion = truncate(prediction.question, Math.max(0, room - shortOptions.length));
  return layoutEntry(prediction, shortQuestion, shortOptions);
}
