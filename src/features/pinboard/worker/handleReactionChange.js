import { getPinboardConfig, getPinboardPost } from '../data.js';
import {
  ensureMessage,
  shouldProcessReaction,
  getReactionCount,
  removeFromPinboard,
  publishOrUpdatePin,
} from './helpers.js';
import { decideReactionOutcome } from './pinRules.js';
import { messageText } from '../../../lib/messages/index.js';

export async function handleReactionChange(client, reaction, user) {
  const config = await getPinboardConfig();

  if (!await shouldProcessReaction(reaction, user, config)) return;

  const message = await ensureMessage(reaction);
  const authorId = message.author?.id;
  const reactionCount = await getReactionCount(reaction, authorId);
  const existing = await getPinboardPost(message.id);
  const { target_channel_id: targetChannelId, threshold } = config;

  console.log(`[Pinboard] userId=${user?.id} messageId=${message.id} reactionCount=${reactionCount} threshold=${threshold} existing=${!!existing}`);

  const outcome = decideReactionOutcome({ row: existing, reactionCount, threshold });
  if (outcome.action === 'remove') {
    await removeFromPinboard(client, targetChannelId, existing, message.id);
    return;
  }
  if (outcome.action === 'publish') {
    await publishOrUpdatePin(client, targetChannelId, message, reactionCount, existing, messageText, outcome.pinState);
  }
}
