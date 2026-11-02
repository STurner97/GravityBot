import { InteractionResponseType } from 'discord-interactions';

const EPHEMERAL_FLAG = 64;

export const pong = () => ({
  type: InteractionResponseType.PONG,
});

export const ephemeral = (content, components) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: { content, flags: EPHEMERAL_FLAG, ...(components ? { components } : {}) },
});

// Edits the message a clicked button belongs to, keeping its visibility.
export const updateMessage = (content, components) => ({
  type: InteractionResponseType.UPDATE_MESSAGE,
  data: { content, components },
});

export const public_ = (content, components) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: { content, ...(components ? { components } : {}) },
});

export const modal = (custom_id, title, components) => ({
  type: InteractionResponseType.MODAL,
  data: { custom_id, title, components },
});
