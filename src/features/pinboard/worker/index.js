import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
// Imported for its startup check, which logs the [Messages] line when the worker boots.
import '../../../lib/messages/index.js';
import { handleMessageDeleted } from './handleMessageDeleted.js';
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

  client.on(Events.MessageDelete, reportFailures('messageDelete', (message) =>
    handleMessageDeleted(client, message.id)));

  client.on(Events.MessageBulkDelete, reportFailures('messageBulkDelete', async (messages) => {
    for (const id of messages.keys()) await handleMessageDeleted(client, id);
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
