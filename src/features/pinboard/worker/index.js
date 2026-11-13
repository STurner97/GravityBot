import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
// Imported for its startup check, which logs the [Messages] line when the worker boots.
import '../../../lib/messages/index.js';
import { getPinboardConfig, getPinboardPost, deletePinboardPost } from '../data.js';
import { handleReactionChange } from './handleReactionChange.js';
import { reportFailures } from './reportFailures.js';

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

  client.on(Events.MessageReactionAdd, reportFailures('messageReactionAdd', (reaction, user) =>
    handleReactionChange(client, reaction, user)));

  client.on(Events.MessageReactionRemove, reportFailures('messageReactionRemove', (reaction, user) =>
    handleReactionChange(client, reaction, user)));

  client.on(Events.MessageDelete, reportFailures('messageDelete', async (message) => {
    const existing = await getPinboardPost(message.id);
    if (!existing) return;

    const { target_channel_id: targetChannelId } = await getPinboardConfig();
    if (!targetChannelId) return;

    const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
    if (targetChannel?.isTextBased()) {
      await targetChannel.messages.delete(existing.pinboard_message_id).catch(() => null);
    }

    await deletePinboardPost(message.id);
  }));

  client.once(Events.ClientReady, () => {
    console.log(`[Pinboard] Worker logged in as ${client.user?.tag}`);
    console.log(`[Pinboard] Message Content Intent enabled: ${client.options.intents.has('MessageContent')}`);
  });

  client.on('error', (err) => {
    console.error('[Pinboard] Gateway client error', err);
  });

  client.login(process.env.DISCORD_TOKEN);
}
