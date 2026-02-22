import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
} from 'discord.js';
import {
    getPinboardConfig,
    listPinboardWhitelist,
    getPinboardPost,
    upsertPinboardPost,
    deletePinboardPost,
    PINBOARD_EMOJI,
} from './pinboard.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        ...(process.env.PINBOARD_MESSAGE_CONTENT_INTENT === 'true'
            ? [GatewayIntentBits.MessageContent]
            : []),
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

async function getReactionCount(reaction, messageAuthorId) {
    const users = await reaction.users.fetch();
    return users.filter(user => !user.bot && user.id !== messageAuthorId).size;
}

function buildPinboardContent({ count, channelId, messageUrl, messageContent }) {
    const header = `📌 ${count} | <#${channelId}> | ${messageUrl}`;
    if (!messageContent) {
        return header;
    }

    const combined = `${header}\n${messageContent}`;
    if (combined.length <= 2000) {
        return combined;
    }

    return `${header}\n${messageContent.slice(0, 1950).trimEnd()}...`;
}

async function ensureMessage(reaction) {
    if (reaction.partial) {
        await reaction.fetch();
    }
    if (reaction.message.partial) {
        await reaction.message.fetch();
    }
    return reaction.message;
}

async function handleReactionChange(reaction, user) {
    const config = await getPinboardConfig();
    const { emoji: configEmoji } = config;

    // Match both emoji character and Discord name
    const emojiMatches = reaction.emoji.name === configEmoji ||
        (reaction.emoji.name === PINBOARD_EMOJI.discordName && configEmoji === PINBOARD_EMOJI.character);

    if (!emojiMatches) {
        console.log(`[Pinboard] Emoji mismatch: reaction=${reaction.emoji.name}, config=${configEmoji}`);
        return;
    }

    console.log(`[Pinboard] Emoji matched: ${reaction.emoji.name}`);

    const message = await ensureMessage(reaction);
    console.log(`[Pinboard] Message from channel ${message.channelId}, author ${message.author?.id}`);

    if (!message.guild || message.channel?.type === ChannelType.DM) {
        console.log(`[Pinboard] Skipped: DM or no guild`);
        return;
    }

    if (user?.bot) {
        console.log(`[Pinboard] Skipped: bot user`);
        return;
    }

    const authorId = message.author?.id;
    if (authorId && user?.id === authorId) {
        console.log(`[Pinboard] Skipped: self-pin`);
        return;
    }

    const whitelist = await listPinboardWhitelist();
    console.log(`[Pinboard] Whitelist: ${whitelist.join(', ') || 'empty'} | Current channel: ${message.channelId}`);
    if (whitelist.length === 0 || !whitelist.includes(message.channelId)) {
        console.log(`[Pinboard] Skipped: channel not whitelisted`);
        return;
    }

    const { target_channel_id: targetChannelId, threshold } = config;
    if (!targetChannelId) {
        console.log(`[Pinboard] Skipped: target channel not set`);
        return;
    }

    const reactionCount = await getReactionCount(reaction, authorId);
    const existing = await getPinboardPost(message.id);

    console.log(`[Pinboard] Reaction count: ${reactionCount} | Threshold: ${threshold} | Existing: ${!!existing}`);

    if (reactionCount < threshold && !existing) {
        console.log(`[Pinboard] Below threshold and not already pinned`);
        return;
    }

    console.log(`[Pinboard] Publishing to pinboard (${targetChannelId})`);

    const targetChannel = await client.channels.fetch(targetChannelId);
    if (!targetChannel || !targetChannel.isTextBased()) {
        return;
    }

    const content = buildPinboardContent({
        count: reactionCount,
        channelId: message.channelId,
        messageUrl: message.url,
        messageContent: message.content,
    });

    const embeds = message.embeds ? [...message.embeds].slice(0, 10) : [];
    const files = message.attachments
        ? Array.from(message.attachments.values()).map(attachment => ({
            attachment: attachment.url,
            name: attachment.name || undefined,
        }))
        : [];

    if (existing?.pinboard_message_id) {
        const pinMessage = await targetChannel.messages.fetch(existing.pinboard_message_id).catch(() => null);
        if (pinMessage) {
            await pinMessage.edit({ content, embeds, files: files.length > 0 ? files : undefined });
            await upsertPinboardPost({
                messageId: message.id,
                sourceChannelId: message.channelId,
                pinboardMessageId: existing.pinboard_message_id,
                authorId: authorId || 'unknown',
                reactionCount,
            });
            return;
        }
    }

    const sent = await targetChannel.send({
        content,
        embeds,
        files: files.length > 0 ? files : undefined,
    });

    await upsertPinboardPost({
        messageId: message.id,
        sourceChannelId: message.channelId,
        pinboardMessageId: sent.id,
        authorId: authorId || 'unknown',
        reactionCount,
    });
}

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        await handleReactionChange(reaction, user);
    } catch (err) {
        console.error('Pinboard reaction add failed', err);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try {
        await handleReactionChange(reaction, user);
    } catch (err) {
        console.error('Pinboard reaction remove failed', err);
    }
});

client.on('messageDelete', async (message) => {
    try {
        const existing = await getPinboardPost(message.id);
        if (!existing) {
            return;
        }

        const { target_channel_id: targetChannelId } = await getPinboardConfig();
        if (!targetChannelId) {
            return;
        }

        const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
        if (targetChannel?.isTextBased()) {
            await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
        }

        await deletePinboardPost(message.id);
    } catch (err) {
        console.error('Pinboard delete handling failed', err);
    }
});

client.once('ready', () => {
    console.log(`[Pinboard] Worker logged in as ${client.user?.tag}`);
    console.log(`[Pinboard] Message Content Intent enabled: ${client.options.intents.has('MessageContent')}`);
});

client.login(process.env.DISCORD_TOKEN);
