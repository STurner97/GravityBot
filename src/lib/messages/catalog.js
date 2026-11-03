// The code's half of the contract with messages.json: every message the bot needs and the
// values the code gives it. checkMessages holds the file to this.

export const textMessage = (values = []) => ({ kind: 'text', values });

export const pluralMessage = (countName, otherValues = []) => ({
  kind: 'plural',
  countName,
  values: [countName, ...otherValues],
});

// `values` are shared by the header and the empty text; `itemValues` belong to each item.
export const listMessage = ({ itemValues, values = [] }) => ({ kind: 'list', itemValues, values });

export const catalog = {
  'balance.own': textMessage(['balance']),
  'balance.other': textMessage(['userId', 'balance']),
  'balance.invalidUser': textMessage(),
  'balances': listMessage({ itemValues: ['userId', 'balance'] }),
};
