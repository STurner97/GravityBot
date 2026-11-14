import { messageText } from '../../lib/messages/index.js';

// The `whitelist_list` reply: the target channel, then the whitelisted channels.
export function formatWhitelist(targetChannelId, channelIds, text = messageText) {
  const target = targetChannelId
    ? text('pinboard.whitelist.targetChannel', { channelId: targetChannelId })
    : text('pinboard.whitelist.targetNotSet');

  return text('pinboard.whitelist.target', { target }) +
    text('pinboard.whitelist.channels', { items: channelIds.map(channelId => ({ channelId })) });
}
