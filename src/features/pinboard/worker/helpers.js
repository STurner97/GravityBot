import { ChannelType } from 'discord.js';
import { buildPinboardEmbed } from '../pinboardEmbed.js';
import { messageText } from '../../../lib/messages/index.js';
import {
  PIN_STATE,
  PINBOARD_EMOJI,
  listPinboardWhitelist,
  upsertPinboardPost,
  deletePinboardPost,
} from '../data.js';

// Returns the number of non-bot, non-author reactions on a message.
export async function getReactionCount(reaction, messageAuthorId) {
  const users = await reaction.users.fetch();
  return users.filter(user => !user.bot && user.id !== messageAuthorId).size;
}

// Fetches partial reaction/message data if not already cached.
export async function ensureMessage(reaction) {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  return reaction.message;
}

// Returns true if the reaction event should be processed; false (with reason) if it should be skipped.
export async function shouldProcessReaction(reaction, user, config) {
  const { emoji: configEmoji } = config;

  const emojiMatches =
    reaction.emoji.name === configEmoji ||
    (reaction.emoji.name === PINBOARD_EMOJI.discordName && configEmoji === PINBOARD_EMOJI.character);

  if (!emojiMatches) return false;

  const message = await ensureMessage(reaction);

  if (!message.guild || message.channel?.type === ChannelType.DM) return false;
  if (user?.bot) return false;

  const authorId = message.author?.id;
  if (authorId && user?.id === authorId) return false;

  const whitelist = await listPinboardWhitelist();
  if (whitelist.length === 0 || !whitelist.includes(message.channelId)) return false;
  if (!config.target_channel_id) return false;

  return true;
}

// Extracts image/GIF URL from a message's attachments and embeds.
export function resolveMediaUrl(message) {
  const attachments = Array.from(message.attachments.values());
  const imageAttachment = attachments.find(att =>
    att.contentType?.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp)$/i.test(att.name || att.url)
  );

  if (imageAttachment) return { imageUrl: imageAttachment.url, hasImageAttachment: true };

  const gifEmbed = message.embeds?.find(e =>
    e.type === 'gifv' || e.type === 'image' || e.image || e.video || e.thumbnail
  );
  const gifUrl = gifEmbed?.image?.url || gifEmbed?.video?.url || gifEmbed?.thumbnail?.url;

  return { imageUrl: gifUrl || null, hasImageAttachment: false };
}

// Builds the embed array and file list to send/edit a pinboard post.
export function buildPostPayload(message, reactionCount, text = messageText, pinState = PIN_STATE.natural) {
  const { imageUrl, hasImageAttachment } = resolveMediaUrl(message);

  const pinboardEmbed = buildPinboardEmbed({
    count: reactionCount,
    forced: pinState === PIN_STATE.forced,
    messageUrl: message.url,
    messageContent: message.content,
    authorId: message.author?.id,
    createdAt: message.createdAt,
    imageUrl,
  }, text);

  const embeds = message.embeds
    ? message.embeds
        .filter(e => !(e.type === 'gifv' || e.type === 'image' || e.image || e.video))
        .slice(0, 10)
        .map(e => e.toJSON())
    : [];

  const files = !hasImageAttachment
    ? Array.from(message.attachments.values()).map(att => ({
        attachment: att.url,
        name: att.name || undefined,
      }))
    : [];

  return { embeds: [pinboardEmbed, ...embeds], files };
}

// Deletes the row first: the bot's own post deletion then reaches the worker as an event that
// finds no row, so it cannot be mistaken for a person taking the pin down.
export async function removeFromPinboard(client, targetChannelId, existing, messageId, deleteRow = deletePinboardPost) {
  await deleteRow(messageId);
  const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (targetChannel?.isTextBased()) {
    await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
  }
}

// Creates or updates a pinboard post for the given message.
export async function publishOrUpdatePin(
  client, targetChannelId, message, reactionCount, existing,
  text = messageText, pinState = PIN_STATE.natural, upsert = upsertPinboardPost
) {
  const targetChannel = await client.channels.fetch(targetChannelId);
  if (!targetChannel?.isTextBased()) return;

  const { embeds, files } = buildPostPayload(message, reactionCount, text, pinState);
  const fileOption = files.length > 0 ? files : undefined;
  const savePin = (pinboardMessageId) => upsert({
    messageId: message.id,
    sourceChannelId: message.channelId,
    pinboardMessageId,
    authorId: message.author?.id || 'unknown',
    reactionCount,
    pinState,
  });

  if (existing?.pinboard_message_id) {
    const pinMessage = await targetChannel.messages.fetch(existing.pinboard_message_id).catch(() => null);
    if (pinMessage) {
      await pinMessage.edit({ embeds, files: fileOption });
      await savePin(existing.pinboard_message_id);
      return;
    }
  }

  const sent = await targetChannel.send({ embeds, files: fileOption });
  await savePin(sent.id);
}
