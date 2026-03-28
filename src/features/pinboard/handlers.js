import {
  getPinboardConfig,
  setPinboardChannel,
  listPinboardWhitelist,
  addPinboardWhitelist,
  removePinboardWhitelist,
  buildPinboardEmbed,
  upsertPinboardPost,
} from './data.js';
import { DiscordRequest } from '../../../utils.js';
import { ephemeral } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';

export async function handlePinboard(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral('❌ You do not have permission to use this command.');
  }

  const subcommand = data.options?.[0];
  if (!subcommand) {
    return ephemeral('❌ Missing pinboard subcommand.');
  }

  if (subcommand.name === 'setchannel') {
    return handleSetChannel(subcommand);
  }
  if (subcommand.name === 'whitelist_add') {
    return handleWhitelistAdd(subcommand);
  }
  if (subcommand.name === 'whitelist_remove') {
    return handleWhitelistRemove(subcommand);
  }
  if (subcommand.name === 'whitelist_list') {
    return handleWhitelistList();
  }
  if (subcommand.name === 'forcepin') {
    return handleForcePin(subcommand);
  }

  return ephemeral('❌ Unknown pinboard subcommand.');
}

async function handleSetChannel(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral('❌ Missing channel for pinboard target.');
  }
  await setPinboardChannel(channelId);
  return ephemeral(`📌 Pinboard channel set to <#${channelId}>.`);
}

async function handleWhitelistAdd(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral('❌ Missing channel to whitelist.');
  }
  await addPinboardWhitelist(channelId);
  return ephemeral(`✅ Added <#${channelId}> to the pinboard whitelist.`);
}

async function handleWhitelistRemove(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral('❌ Missing channel to remove.');
  }
  await removePinboardWhitelist(channelId);
  return ephemeral(`✅ Removed <#${channelId}> from the pinboard whitelist.`);
}

async function handleWhitelistList() {
  const [channels, config] = await Promise.all([
    listPinboardWhitelist(),
    getPinboardConfig(),
  ]);
  const targetText = config?.target_channel_id
    ? `<#${config.target_channel_id}>`
    : 'not set';

  if (channels.length === 0) {
    return ephemeral(`📌 Pinboard channel: ${targetText}\nWhitelist is empty.`);
  }

  const lines = channels.map(id => `<#${id}>`).join('\n');
  return ephemeral(`📌 Pinboard channel: ${targetText}\nWhitelisted channels:\n${lines}`);
}

async function handleForcePin(subcommand) {
  const messageUrl = subcommand.options?.find(opt => opt.name === 'message_url')?.value;
  if (!messageUrl) {
    return ephemeral('❌ Message URL is required.');
  }

  const urlMatch = messageUrl.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!urlMatch) {
    return ephemeral('❌ Invalid message URL format. Right-click a message and select "Copy Message Link".');
  }

  const [, guildId, channelId, messageId] = urlMatch;

  const config = await getPinboardConfig();
  if (!config?.target_channel_id) {
    return ephemeral('❌ Pinboard target channel not set.');
  }

  try {
    const messageRes = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, { method: 'GET' });
    const message = await messageRes.json();

    const sourceMessageUrl = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

    const imageAttachment = message.attachments?.find(att =>
      att.content_type?.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp)$/i.test(att.filename || att.url)
    );

    const gifEmbed = message.embeds?.find(e =>
      e.type === 'gifv' || e.type === 'image' || e.image || e.video || e.thumbnail
    );
    const gifUrl = gifEmbed?.image?.url || gifEmbed?.video?.url || gifEmbed?.thumbnail?.url;

    const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
    const pinboardEmbed = buildPinboardEmbed({
      count: 1,
      messageUrl: sourceMessageUrl,
      messageContent: message.content,
      authorId: message.author.id,
      createdAt: timestamp,
      imageUrl: imageAttachment?.url || gifUrl,
    });

    pinboardEmbed.author.name = '📌 1 Pin (forced)';

    const embeds = [pinboardEmbed];
    if (message.embeds?.length > 0) {
      const filteredEmbeds = message.embeds.filter(e =>
        !(e.type === 'gifv' || e.type === 'image' || e.image || e.video)
      );
      if (filteredEmbeds.length > 0) {
        embeds.push(...filteredEmbeds.slice(0, 10));
      }
    }

    const postRes = await DiscordRequest(`channels/${config.target_channel_id}/messages`, {
      method: 'POST',
      body: { embeds },
    });
    const sentMessage = await postRes.json();

    await upsertPinboardPost({
      messageId,
      sourceChannelId: channelId,
      pinboardMessageId: sentMessage.id,
      authorId: message.author.id,
      reactionCount: 1,
    });

    return ephemeral(`✅ Force pinned message: https://discord.com/channels/${guildId}/${config.target_channel_id}/${sentMessage.id}`);
  } catch (err) {
    console.error('[Pinboard] Force pin failed', err);
    return ephemeral(`❌ Failed to force pin: ${err.message}`);
  }
}
