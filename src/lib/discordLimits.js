// Fixed limits of Discord's API, not settings: changing a value here does not change Discord.

export const MESSAGE_CONTENT_MAX_LENGTH = 2000;
export const MAX_ACTION_ROWS = 5;
export const BUTTONS_PER_ROW = 5;

// Longest text Discord accepts where a message is shown (from @discordjs/builders). Discord
// rejects the whole response when one is exceeded, so a reword must not outgrow them.
export const TEXT_LIMITS = {
  modalTitle: { max: 45, label: 'a modal title' },
  inputLabel: { max: 45, label: 'an input label' },
  inputPlaceholder: { max: 100, label: 'an input placeholder' },
  buttonLabel: { max: 80, label: 'a button label' },
  embedAuthorName: { max: 256, label: 'an embed author name' },
  embedFieldName: { max: 256, label: 'an embed field name' },
  embedFieldValue: { max: 1024, label: 'an embed field value' },
};

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
