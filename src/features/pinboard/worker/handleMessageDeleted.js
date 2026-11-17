import {
  findPinboardPostsByAnyMessageId,
  getPinboardConfig,
  deletePinboardPost,
  markPinboardPostBanned,
} from '../data.js';
import { removeFromPinboard } from './helpers.js';
import { decideDeletionOutcome } from './pinRules.js';

const defaultDeps = {
  findRows: findPinboardPostsByAnyMessageId,
  getConfig: getPinboardConfig,
  removePin: removeFromPinboard,
  deleteRow: deletePinboardPost,
  markBanned: markPinboardPostBanned,
  log: console.log,
};

// A deleted id is either a source message or a pin post; each matching row gets its own outcome.
export async function handleMessageDeleted(client, deletedId, deps = defaultDeps) {
  const rows = await deps.findRows(deletedId);
  for (const row of rows) {
    await applyDeletionOutcome(client, deletedId, row, deps);
  }
}

async function applyDeletionOutcome(client, deletedId, row, deps) {
  const outcome = decideDeletionOutcome(deletedId, row);
  if (outcome === 'nothing') return;

  if (outcome === 'removePin') {
    const { target_channel_id: targetChannelId } = await deps.getConfig();
    if (!targetChannelId) return;
    deps.log(`[Pinboard] messageId=${row.message_id} pinboardMessageId=${row.pinboard_message_id} action=takedown outcome=removePin`);
    await deps.removePin(client, targetChannelId, row, row.message_id);
    return;
  }

  deps.log(`[Pinboard] messageId=${row.message_id} pinboardMessageId=${row.pinboard_message_id} action=takedown outcome=${outcome}`);
  if (outcome === 'forget') await deps.deleteRow(row.message_id);
  if (outcome === 'ban') await deps.markBanned(row.message_id);
}
