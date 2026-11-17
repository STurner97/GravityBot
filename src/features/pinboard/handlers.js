import {
  getPinboardConfig,
  setPinboardChannel,
  listPinboardWhitelist,
  addPinboardWhitelist,
  removePinboardWhitelist,
  upsertPinboardPost,
  PIN_STATE,
} from './data.js';
import { buildPinboardEmbed } from './pinboardEmbed.js';
import { DiscordRequest } from '../../../utils.js';
import { ephemeral } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';
import { messageText } from '../../lib/messages/index.js';
import { formatWhitelist } from './formatWhitelist.js';

// The handlers are function declarations below, hoisted, so the map can name them directly.
const SUBCOMMANDS = {
  setchannel: handleSetChannel,
  whitelist_add: handleWhitelistAdd,
  whitelist_remove: handleWhitelistRemove,
  whitelist_list: handleWhitelistList,
  forcepin: handleForcePin,
};

export async function handlePinboard(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('denied.admin'));
  }

  const subcommand = data.options?.[0];
  if (!subcommand) {
    return ephemeral(messageText('pinboard.missingSubcommand'));
  }

  const run = SUBCOMMANDS[subcommand.name];
  if (!run) {
    return ephemeral(messageText('pinboard.unknownSubcommand'));
  }
  return run(subcommand);
}

async function handleSetChannel(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral(messageText('pinboard.setChannel.missing'));
  }
  await setPinboardChannel(channelId);
  return ephemeral(messageText('pinboard.setChannel.done', { channelId }));
}

async function handleWhitelistAdd(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral(messageText('pinboard.whitelistAdd.missing'));
  }
  await addPinboardWhitelist(channelId);
  return ephemeral(messageText('pinboard.whitelistAdd.done', { channelId }));
}

async function handleWhitelistRemove(subcommand) {
  const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
  if (!channelId) {
    return ephemeral(messageText('pinboard.whitelistRemove.missing'));
  }
  await removePinboardWhitelist(channelId);
  return ephemeral(messageText('pinboard.whitelistRemove.done', { channelId }));
}

async function handleWhitelistList() {
  const [channels, config] = await Promise.all([
    listPinboardWhitelist(),
    getPinboardConfig(),
  ]);
  return ephemeral(formatWhitelist(config?.target_channel_id, channels));
}

async function handleForcePin(subcommand) {
  const messageUrl = subcommand.options?.find(opt => opt.name === 'message_url')?.value;
  if (!messageUrl) {
    return ephemeral(messageText('pinboard.forcepin.missingUrl'));
  }

  const urlMatch = messageUrl.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!urlMatch) {
    return ephemeral(messageText('pinboard.forcepin.invalidUrl'));
  }

  const [, guildId, channelId, messageId] = urlMatch;

  const config = await getPinboardConfig();
  if (!config?.target_channel_id) {
    return ephemeral(messageText('pinboard.forcepin.noTarget'));
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
      forced: true,
      messageUrl: sourceMessageUrl,
      messageContent: message.content,
      authorId: message.author.id,
      createdAt: timestamp,
      imageUrl: imageAttachment?.url || gifUrl,
    });

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
      pinState: PIN_STATE.forced,
    });

    return ephemeral(messageText('pinboard.forcepin.done', {
      pinUrl: `https://discord.com/channels/${guildId}/${config.target_channel_id}/${sentMessage.id}`,
    }));
  } catch (err) {
    console.error('[Pinboard] Force pin failed', err);
    return ephemeral(messageText('pinboard.forcepin.failed'));
  }
}
