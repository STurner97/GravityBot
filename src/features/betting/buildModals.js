// Pure modal layouts, kept apart from the handlers so tests can build them without a database.
import {
  MessageComponentTypes,
  TextStyleTypes,
} from 'discord-interactions';
import { modal } from '../../lib/response.js';
import { messageText } from '../../lib/messages/index.js';
import { encode } from '../../lib/customId.js';
import { formatOptionList } from './formatOptionList.js';

// Truncates the options list to fit Discord's 100-char placeholder limit.
function buildOptionsPlaceholder(options, text, maxLength = 100) {
  if (!Array.isArray(options) || options.length === 0) return text('optionsPlaceholder.none');
  const optionsText = formatOptionList(options, text);
  if (optionsText.length <= maxLength) return optionsText;
  const cutMarker = text('optionsPlaceholder.cutMarker');
  if (maxLength <= cutMarker.length) return optionsText.slice(0, maxLength);
  return `${optionsText.slice(0, maxLength - cutMarker.length).trimEnd()}${cutMarker}`;
}

export function buildPredictModal(text = messageText) {
  return modal('predict_modal', text('predictModal.title'), [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'question_input',
        label: text('predictModal.questionLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: text('predictModal.questionPlaceholder'),
        required: true,
        max_length: 200,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'options_input',
        label: text('predictModal.optionsLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: text('predictModal.optionsPlaceholder'),
        required: true,
        max_length: 300,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'choice_input',
        label: text('predictModal.choiceLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: text('predictModal.choicePlaceholder'),
        required: true,
        max_length: 100,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'amount_input',
        label: text('predictModal.amountLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: text('predictModal.amountPlaceholder'),
        required: true,
        max_length: 10,
      }],
    },
  ]);
}

export function buildBetModal(predictionId, options, text = messageText) {
  return modal(encode('bet_modal', predictionId), text('betModal.title', { predictionId }), [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'option_input',
        label: text('betModal.optionLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: buildOptionsPlaceholder(options, text),
        required: true,
        max_length: 100,
      }],
    },
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'bet_amount_input',
        label: text('betModal.amountLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: text('betModal.amountPlaceholder'),
        required: true,
        max_length: 10,
      }],
    },
  ]);
}

export function buildResolveModal(predictionId, options, text = messageText) {
  return modal(encode('resolve_modal', predictionId), text('resolveModal.title', { predictionId }), [
    {
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.INPUT_TEXT,
        custom_id: 'outcome_input',
        label: text('resolveModal.outcomeLabel'),
        style: TextStyleTypes.SHORT,
        placeholder: buildOptionsPlaceholder(options, text),
        required: true,
        max_length: 100,
      }],
    },
  ]);
}
