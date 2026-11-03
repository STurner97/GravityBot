// Shortens /predictions entries to fit a budget. The layout and every word come from the
// messages file; only the shortening algorithm lives here.
import { formatOptionList } from './formatOptionList.js';

// Keeps a cut question from eating the options entirely.
const OPTIONS_FLOOR_LENGTH = 20;

// Cuts to `maxLength` UTF-16 units, the unit Discord's limit is measured in.
export function truncate(content, maxLength, cutMarker) {
  if (content.length <= maxLength) return content;
  if (maxLength <= 0) return '';
  let kept = content.slice(0, maxLength - cutMarker.length);
  const lastUnit = kept.charCodeAt(kept.length - 1);
  const splitsEmoji = lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  if (splitsEmoji) kept = kept.slice(0, -1);
  return kept + cutMarker;
}

const totalOfBets = (bets) => bets.reduce((sum, bet) => sum + bet.amount, 0);

function layoutEntry(prediction, question, optionsText, text) {
  return text('predictions.entry', {
    predictionId: prediction.id,
    question,
    options: optionsText,
    betCount: prediction.bets.length,
    totalCredits: totalOfBets(prediction.bets),
  });
}

// An entry over maxLength gives up options text first, then question text.
export function formatPredictionEntry(prediction, maxLength = Infinity, text) {
  const optionsText = formatOptionList(prediction.options, text);
  const full = layoutEntry(prediction, prediction.question, optionsText, text);
  if (full.length <= maxLength) return full;

  const cutMarker = text('predictions.cutMarker');
  const room = maxLength - layoutEntry(prediction, '', '', text).length;
  const optionsRoom = Math.min(Math.max(room - prediction.question.length, OPTIONS_FLOOR_LENGTH), room);
  const shortOptions = truncate(optionsText, optionsRoom, cutMarker);
  const shortQuestion = truncate(prediction.question, Math.max(0, room - shortOptions.length), cutMarker);
  return layoutEntry(prediction, shortQuestion, shortOptions, text);
}
