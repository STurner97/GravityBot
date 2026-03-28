import { InteractionType } from 'discord-interactions';
import { commandHandlers, modalHandlers, buttonHandlers } from './registry.js';
import { ALLOWED_CHANNEL_IDS } from '../config.js';
import { pong, ephemeral } from '../lib/response.js';
import { decode } from '../lib/customId.js';

export async function handleInteraction(req, res) {
  try {
    const { type, data } = req.body;
    const userId = req.body.member?.user?.id || req.body.user?.id;

    if (type === InteractionType.PING) {
      return res.send(pong());
    }

    if (ALLOWED_CHANNEL_IDS.length > 0) {
      const channelId = req.body.channel?.id || req.body.channel_id;
      if (channelId && !ALLOWED_CHANNEL_IDS.includes(channelId)) {
        return res.send(ephemeral('❌ This bot can only be used in specific channels.'));
      }
    }

    const interaction = { ...req.body, userId };

    if (type === InteractionType.APPLICATION_COMMAND) {
      const handler = commandHandlers.get(data.name);
      if (!handler) {
        console.error(`[Router] Unknown command: ${data.name}`);
        return res.status(400).json({ error: 'unknown command' });
      }
      return res.send(await handler(interaction));
    }

    if (type === InteractionType.MODAL_SUBMIT) {
      const { namespace } = decode(data.custom_id);
      const handler = modalHandlers.get(namespace);
      if (!handler) {
        console.error(`[Router] Unknown modal: ${data.custom_id}`);
        return res.status(400).json({ error: 'unknown modal' });
      }
      return res.send(await handler(interaction));
    }

    if (type === InteractionType.MESSAGE_COMPONENT) {
      const { namespace } = decode(data.custom_id);
      const handler = buttonHandlers.get(namespace);
      if (!handler) {
        console.error(`[Router] Unknown component: ${data.custom_id}`);
        return res.status(400).json({ error: 'unknown component' });
      }
      return res.send(await handler(interaction));
    }

    console.error(`[Router] Unknown interaction type: ${type}`);
    return res.status(400).json({ error: 'unknown interaction type' });
  } catch (err) {
    console.error('[Router] Unhandled error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
