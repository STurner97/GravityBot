// The one place options are joined, so the separator is wording the file owns.
export const formatOptionList = (options, text) =>
  text('optionList', { items: options.map(option => ({ option })) });
