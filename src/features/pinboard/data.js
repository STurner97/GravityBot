import { query } from '../../../db.js';

export const DEFAULT_THRESHOLD = 3;
export const PINBOARD_EMOJI = {
  character: '📌',
  discordName: 'pushpin',
};
export const DEFAULT_EMOJI = PINBOARD_EMOJI.character;
export const PIN_STATE = {
  natural: 'natural',
  forced: 'forced',
  banned: 'banned',
};

export async function getPinboardConfig() {
  const result = await query(
    'SELECT target_channel_id, threshold, emoji FROM pinboard_config WHERE id = 1'
  );

  if (result.rowCount > 0) {
    return result.rows[0];
  }

  // Only insert the default row if none exists yet — avoids an unnecessary write on every call.
  await query(
    `INSERT INTO pinboard_config (id, target_channel_id, threshold, emoji)
     VALUES (1, NULL, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_THRESHOLD, DEFAULT_EMOJI]
  );

  return { target_channel_id: null, threshold: DEFAULT_THRESHOLD, emoji: DEFAULT_EMOJI };
}

export async function setPinboardChannel(channelId) {
  await query(
    'UPDATE pinboard_config SET target_channel_id = $1 WHERE id = 1',
    [channelId]
  );
}

export async function listPinboardWhitelist() {
  const result = await query(
    'SELECT channel_id FROM pinboard_whitelist ORDER BY channel_id ASC'
  );
  return result.rows.map(row => row.channel_id);
}

export async function addPinboardWhitelist(channelId) {
  await query(
    'INSERT INTO pinboard_whitelist (channel_id) VALUES ($1) ON CONFLICT (channel_id) DO NOTHING',
    [channelId]
  );
}

export async function removePinboardWhitelist(channelId) {
  await query(
    'DELETE FROM pinboard_whitelist WHERE channel_id = $1',
    [channelId]
  );
}

export async function getPinboardPost(messageId) {
  const result = await query(
    `SELECT message_id, source_channel_id, pinboard_message_id, author_id, reaction_count, pin_state
     FROM pinboard_posts
     WHERE message_id = $1`,
    [messageId]
  );
  return result.rows[0] || null;
}

// Rows whose source message or pin post has this id. A deletion event does not say which.
export async function findPinboardPostsByAnyMessageId(id) {
  const result = await query(
    `SELECT message_id, source_channel_id, pinboard_message_id, author_id, reaction_count, pin_state
     FROM pinboard_posts
     WHERE message_id = $1 OR pinboard_message_id = $1`,
    [id]
  );
  return result.rows;
}

export async function markPinboardPostBanned(messageId) {
  await query(
    'UPDATE pinboard_posts SET pin_state = $2 WHERE message_id = $1',
    [messageId, PIN_STATE.banned]
  );
}

export async function upsertPinboardPost({
  messageId, sourceChannelId, pinboardMessageId, authorId, reactionCount, pinState = PIN_STATE.natural,
}) {
  await query(
    `INSERT INTO pinboard_posts (message_id, source_channel_id, pinboard_message_id, author_id, reaction_count, pin_state)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (message_id)
     DO UPDATE SET
       pinboard_message_id = EXCLUDED.pinboard_message_id,
       reaction_count      = EXCLUDED.reaction_count,
       pin_state           = EXCLUDED.pin_state`,
    [messageId, sourceChannelId, pinboardMessageId, authorId, reactionCount, pinState]
  );
}

export async function deletePinboardPost(messageId) {
  await query('DELETE FROM pinboard_posts WHERE message_id = $1', [messageId]);
}
