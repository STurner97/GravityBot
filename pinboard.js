import { query } from './db.js';

export const DEFAULT_THRESHOLD = 3;
export const PINBOARD_EMOJI = {
    character: '📌',
    discordName: 'pushpin',
};

export const DEFAULT_EMOJI = PINBOARD_EMOJI.character;

export function buildPinboardEmbed({ count, messageUrl, messageContent, authorId, createdAt, imageUrl }) {
    const timestamp = createdAt ? Math.floor(createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

    const embed = {
        color: 0xED4245,
        author: {
            name: `📌 ${count} Pin${count !== 1 ? 's' : ''}`,
        },
        description: messageContent || ' ',
        fields: [
            {
                name: 'Posted by',
                value: `<@${authorId}> · ${messageUrl}`,
                inline: false,
            },
        ],
        timestamp: new Date(timestamp * 1000).toISOString(),
        url: messageUrl,
    };

    if (imageUrl) {
        embed.image = { url: imageUrl };
    }

    return embed;
}

async function ensurePinboardConfig() {
    await query(
        `
    INSERT INTO pinboard_config (id, target_channel_id, threshold, emoji)
    VALUES (1, NULL, $1, $2)
    ON CONFLICT (id) DO UPDATE SET
      threshold = EXCLUDED.threshold,
      emoji = EXCLUDED.emoji
    `,
        [DEFAULT_THRESHOLD, DEFAULT_EMOJI]
    );
}

export async function getPinboardConfig() {
    await ensurePinboardConfig();
    const result = await query(
        'SELECT target_channel_id, threshold, emoji FROM pinboard_config WHERE id = 1'
    );
    return result.rows[0];
}

export async function setPinboardChannel(channelId) {
    await ensurePinboardConfig();
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
        `
    SELECT message_id, source_channel_id, pinboard_message_id, author_id, reaction_count
    FROM pinboard_posts
    WHERE message_id = $1
    `,
        [messageId]
    );
    return result.rows[0] || null;
}

export async function upsertPinboardPost({
    messageId,
    sourceChannelId,
    pinboardMessageId,
    authorId,
    reactionCount,
}) {
    await query(
        `
    INSERT INTO pinboard_posts (
      message_id,
      source_channel_id,
      pinboard_message_id,
      author_id,
      reaction_count
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (message_id)
    DO UPDATE SET
      pinboard_message_id = EXCLUDED.pinboard_message_id,
      reaction_count = EXCLUDED.reaction_count
    `,
        [messageId, sourceChannelId, pinboardMessageId, authorId, reactionCount]
    );
}

export async function deletePinboardPost(messageId) {
    await query('DELETE FROM pinboard_posts WHERE message_id = $1', [messageId]);
}
