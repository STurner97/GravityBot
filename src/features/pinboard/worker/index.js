import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { getPinboardConfig, getPinboardPost, deletePinboardPost } from '../data.js';
import { handleReactionChange } from './handleReactionChange.js';

export function startWorker() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      ...(process.env.PINBOARD_MESSAGE_CONTENT_INTENT?.toLowerCase() === 'true'
        ? [GatewayIntentBits.MessageContent]
        : []),
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      await handleReactionChange(client, reaction, user);
    } catch (err) {
      console.error('[Pinboard] Reaction add failed', err);
    }
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    try {
      await handleReactionChange(client, reaction, user);
    } catch (err) {
      console.error('[Pinboard] Reaction remove failed', err);
    }
  });

  client.on('messageDelete', async (message) => {
    try {
      const existing = await getPinboardPost(message.id);
      if (!existing) return;

      const { target_channel_id: targetChannelId } = await getPinboardConfig();
      if (!targetChannelId) return;

      const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (targetChannel?.isTextBased()) {
        await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
      }

      await deletePinboardPost(message.id);
    } catch (err) {
      console.error('[Pinboard] Message delete handling failed', err);
    }
  });

  client.once('ready', () => {
    console.log(`[Pinboard] Worker logged in as ${client.user?.tag}`);
    console.log(`[Pinboard] Message Content Intent enabled: ${client.options.intents.has('MessageContent')}`);
  });

  client.on('error', (err) => {
    console.error('[Pinboard] Gateway client error', err);
  });

  client.login(process.env.DISCORD_TOKEN);
}
