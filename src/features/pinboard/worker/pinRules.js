import { PIN_STATE } from '../data.js';

const NONE = { action: 'none' };

// What a reaction count does to the pin. Pure: the worker does the Discord and database work.
export function decideReactionOutcome({ row, reactionCount, threshold }) {
  if (row?.pin_state === PIN_STATE.banned) return NONE;
  if (row && reactionCount === 0) return { action: 'remove' };
  if (!row && reactionCount < threshold) return NONE;

  const keepsForced = row?.pin_state === PIN_STATE.forced && reactionCount < threshold;
  return { action: 'publish', pinState: keepsForced ? PIN_STATE.forced : PIN_STATE.natural };
}

// What a deleted message means for the row that names it. Only a person deleting a pin post
// reaches ban or forget; the bot's own removals delete the row first, so they find no row.
export function decideDeletionOutcome(deletedId, row) {
  if (row.message_id === deletedId) return 'removePin';
  if (row.pinboard_message_id !== deletedId) return 'nothing';
  if (row.pin_state === PIN_STATE.forced) return 'forget';
  if (row.pin_state === PIN_STATE.natural) return 'ban';
  return 'nothing';
}
