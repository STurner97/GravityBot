// Pure: turns the active predictions into one page of the /predictions message.
// The page size is passed in so tests need no environment and can use small pages.
import { MessageComponentTypes, ButtonStyleTypes } from 'discord-interactions';
import { encode } from '../../lib/customId.js';
import { BUTTONS_PER_ROW } from '../../lib/discordLimits.js';
import {
  PREDICTIONS_HEADER,
  NO_PREDICTIONS_TEXT,
  PREVIOUS_LABEL,
  NEXT_LABEL,
  formatPageLine,
  formatBetButtonLabel,
  formatPredictionEntry,
} from './predictionsListFormat.js';

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

const actionRow = (components) => ({ type: MessageComponentTypes.ACTION_ROW, components });

const button = (label, customId) => ({
  type: MessageComponentTypes.BUTTON,
  style: ButtonStyleTypes.PRIMARY,
  label,
  custom_id: customId,
});

function buildBetRows(predictions) {
  const buttons = predictions.map(p => button(formatBetButtonLabel(p.id), encode(BET_NAMESPACE, p.id)));
  const rows = [];
  for (let i = 0; i < buttons.length; i += BUTTONS_PER_ROW) {
    rows.push(actionRow(buttons.slice(i, i + BUTTONS_PER_ROW)));
  }
  return rows;
}

function buildPagingRow(pageIndex, pageCount) {
  const buttons = [];
  if (pageIndex > 0) {
    buttons.push(button(PREVIOUS_LABEL, encode(PREDICTIONS_PAGE_NAMESPACE, pageIndex - 1)));
  }
  if (pageIndex < pageCount - 1) {
    buttons.push(button(NEXT_LABEL, encode(PREDICTIONS_PAGE_NAMESPACE, pageIndex + 1)));
  }
  return actionRow(buttons);
}

export function buildPredictionsListPage(predictions, requestedPage, pageSize) {
  if (predictions.length === 0) {
    return { content: NO_PREDICTIONS_TEXT, components: [], pageIndex: 0, pageCount: 1 };
  }

  const pageCount = countPages(predictions.length, pageSize);
  const pageIndex = clampPage(requestedPage, pageCount);
  const onPage = predictions.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  let content = PREDICTIONS_HEADER + onPage.map(formatPredictionEntry).join('');
  const components = buildBetRows(onPage);

  if (pageCount > 1) {
    content += formatPageLine(pageIndex, pageCount);
    components.push(buildPagingRow(pageIndex, pageCount));
  }
  return { content, components, pageIndex, pageCount };
}
