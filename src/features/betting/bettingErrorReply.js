import { ephemeral } from '../../lib/response.js';
import { messageText } from '../../lib/messages/index.js';
import { formatOptionList } from './formatOptionList.js';

// betting.js returns a code and values; the wording for each code lives in messages.json.
export function bettingErrorReply({ code, ...values }, text = messageText) {
  const options = values.options && formatOptionList(values.options, text);
  return ephemeral(text(`bettingErrors.${code}`, options ? { ...values, options } : values));
}
