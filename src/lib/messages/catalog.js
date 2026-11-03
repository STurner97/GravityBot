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

const CHANGE_BALANCE_VALUES = ['amount', 'userId', 'oldBalance', 'newBalance'];

export const catalog = {
  'balance.own': textMessage(['balance']),
  'balance.other': textMessage(['userId', 'balance']),
  'balance.invalidUser': textMessage(),
  'balances': listMessage({ itemValues: ['userId', 'balance'] }),
  'denied.admin': textMessage(),
  'prediction.notFound': textMessage(['predictionId']),
  'bet.notFoundWithHint': textMessage(['predictionId']),
  'myBets': listMessage({ itemValues: ['predictionId', 'question', 'option', 'amount'] }),
  'beg.tooRich': textMessage(),
  'beg.request': textMessage(['username']),
  'donate.button': pluralMessage('amount'),
  'donate.donated': pluralMessage('amount', ['donorId', 'recipientId']),
  'donate.self': textMessage(),
  'changeBalance.set': textMessage(CHANGE_BALANCE_VALUES),
  'changeBalance.add': textMessage(CHANGE_BALANCE_VALUES),
  'changeBalance.remove': textMessage(CHANGE_BALANCE_VALUES),
};
