// Pure: turns the active predictions into one page of the /predictions message.
// The page size and the message text function are passed in so tests need no environment
// and can use small pages and a fixed wording.
import { MessageComponentTypes, ButtonStyleTypes } from 'discord-interactions';
import { encode } from '../../lib/customId.js';
import { BUTTONS_PER_ROW, MESSAGE_CONTENT_MAX_LENGTH } from '../../lib/discordLimits.js';
import { formatPredictionEntry, truncate } from './predictionsListFormat.js';

export const PREDICTIONS_PAGE_NAMESPACE = 'predictions_page';
const BET_NAMESPACE = 'bet';

export function countPages(predictionCount, pageSize) {
  return Math.max(1, Math.ceil(predictionCount / pageSize));
}

// A stale button can name a page that no longer exists, so any input lands on a real page.
function clampPage(requestedPage, pageCount) {
  if (!Number.isInteger(requestedPage)) return 0;
  return Math.min(Math.max(requestedPage, 0), pageCount - 1);
}

// Each slot on the page gets an equal share of what the header and page line leave.
function entryBudget(pageSize, pageIndex, pageCount, text) {
  const pageLine = pageCount > 1 ? formatPageLine(pageIndex, pageCount, text) : '';
  const spare = MESSAGE_CONTENT_MAX_LENGTH - text('predictions.header').length - pageLine.length;
  return Math.floor(spare / pageSize);
}

const formatPageLine = (pageIndex, pageCount, text) =>
  text('predictions.pageLine', { page: pageIndex + 1, pageCount });

const actionRow = (components) => ({ type: MessageComponentTypes.ACTION_ROW, components });

const button = (label, customId) => ({
  type: MessageComponentTypes.BUTTON,
  style: ButtonStyleTypes.PRIMARY,
  label,
  custom_id: customId,
});

function buildBetRows(predictions, text) {
  const buttons = predictions.map(p =>
    button(text('predictions.betButton', { predictionId: p.id }), encode(BET_NAMESPACE, p.id)));
  const rows = [];
  for (let i = 0; i < buttons.length; i += BUTTONS_PER_ROW) {
    rows.push(actionRow(buttons.slice(i, i + BUTTONS_PER_ROW)));
  }
  return rows;
}

function buildPagingRow(pageIndex, pageCount, text) {
  const buttons = [];
  if (pageIndex > 0) {
    buttons.push(button(text('predictions.previous'), encode(PREDICTIONS_PAGE_NAMESPACE, pageIndex - 1)));
  }
  if (pageIndex < pageCount - 1) {
    buttons.push(button(text('predictions.next'), encode(PREDICTIONS_PAGE_NAMESPACE, pageIndex + 1)));
  }
  return actionRow(buttons);
}

// Discord rejects a message over its limit, so a layout that outgrows the budget is cut
// rather than failing; `cut` lets a test catch that before it is pushed.
function fitToMessageLimit(content, text) {
  const cutContent = truncate(content, MESSAGE_CONTENT_MAX_LENGTH, text('predictions.cutMarker'));
  return { content: cutContent, cut: cutContent !== content };
}

export function buildPredictionsListPage(predictions, requestedPage, pageSize, text) {
  if (predictions.length === 0) {
    return { content: text('predictions.empty'), components: [], pageIndex: 0, pageCount: 1, cut: false };
  }

  const pageCount = countPages(predictions.length, pageSize);
  const pageIndex = clampPage(requestedPage, pageCount);
  const onPage = predictions.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const budget = entryBudget(pageSize, pageIndex, pageCount, text);
  let content = text('predictions.header') + onPage.map(p => formatPredictionEntry(p, budget, text)).join('');
  const components = buildBetRows(onPage, text);

  if (pageCount > 1) {
    content += formatPageLine(pageIndex, pageCount, text);
    components.push(buildPagingRow(pageIndex, pageCount, text));
  }
  return { ...fitToMessageLimit(content, text), components, pageIndex, pageCount };
}
