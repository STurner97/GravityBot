// Fixed limits of Discord's API, not settings: changing a value here does not change Discord.

export const MESSAGE_CONTENT_MAX_LENGTH = 2000;
export const MAX_ACTION_ROWS = 5;
export const BUTTONS_PER_ROW = 5;

// The list gives its paging buttons one row and packs the page's Bet buttons into the rest.
const PAGING_ROWS = 1;

export function assertPageSizeFitsRows(pageSize) {
  const betRows = Math.ceil(pageSize / BUTTONS_PER_ROW);
  const fits = Number.isInteger(pageSize) && pageSize >= 1 && betRows + PAGING_ROWS <= MAX_ACTION_ROWS;
  if (!fits) {
    const largest = (MAX_ACTION_ROWS - PAGING_ROWS) * BUTTONS_PER_ROW;
    throw new Error(`PREDICTIONS_PAGE_SIZE must be a whole number from 1 to ${largest}, got ${pageSize}`);
  }
}
