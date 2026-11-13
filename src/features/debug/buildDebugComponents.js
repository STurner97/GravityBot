// Pure layouts for the reset prompt and the SQL modal, so tests can build them without Discord.
import {
  MessageComponentTypes,
  ButtonStyleTypes,
  TextStyleTypes,
} from 'discord-interactions';
import { ephemeral, modal } from '../../lib/response.js';
import { encode } from '../../lib/customId.js';
import { messageText } from '../../lib/messages/index.js';

const SQL_QUERY_MAX_LENGTH = 2000;

export function buildResetPrompt(text = messageText) {
  return ephemeral(text('debug.reset.prompt'), [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [
        {
          type: MessageComponentTypes.BUTTON,
          style: ButtonStyleTypes.DANGER,
          label: text('debug.reset.confirmButton'),
          custom_id: encode('confirm_reset', 'yes'),
        },
        {
          type: MessageComponentTypes.BUTTON,
          style: ButtonStyleTypes.SECONDARY,
          label: text('debug.reset.cancelButton'),
          custom_id: encode('confirm_reset', 'no'),
        },
      ],
    },
  ]);
}

export function buildSqlModal(text = messageText) {
  return modal('debug_sql_modal', text('debug.sqlModal.title'), [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'sql_query_input',
        label: text('debug.sqlModal.queryLabel'),
        style: TextStyleTypes.PARAGRAPH,
        placeholder: text('debug.sqlModal.queryPlaceholder'),
        required: true,
        max_length: SQL_QUERY_MAX_LENGTH,
      }],
    },
  ]);
}
