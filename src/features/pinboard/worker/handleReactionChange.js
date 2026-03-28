import { getPinboardConfig, getPinboardPost } from '../data.js';
import {
  ensureMessage,
  shouldProcessReaction,
  getReactionCount,
  removeFromPinboard,
  publishOrUpdatePin,
} from './helpers.js';

export async function handleReactionChange(client, reaction, user) {
  const config = await getPinboardConfig();

  if (!await shouldProcessReaction(reaction, user, config)) return;

  const message = await ensureMessage(reaction);
  const authorId = message.author?.id;
  const reactionCount = await getReactionCount(reaction, authorId);
  const existing = await getPinboardPost(message.id);
  const { target_channel_id: targetChannelId, threshold } = config;

  console.log(`[Pinboard] userId=${user?.id} messageId=${message.id} reactionCount=${reactionCount} threshold=${threshold} existing=${!!existing}`);

  if (existing && reactionCount === 0) {
    await removeFromPinboard(client, targetChannelId, existing, message.id);
    return;
  }

  if (reactionCount < threshold && !existing) return;

  await publishOrUpdatePin(client, targetChannelId, message, reactionCount, existing);
}
