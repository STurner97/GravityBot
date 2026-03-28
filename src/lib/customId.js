// Encodes and decodes custom_id values for Discord modals and buttons.
// Format: "namespace:part1:part2:..."
// Colons are safe as separators because Discord snowflakes and option names never contain them.

const SEP = ':';

export const encode = (namespace, ...parts) => [namespace, ...parts].join(SEP);

export const decode = (id) => {
  const [namespace, ...parts] = id.split(SEP);
  return { namespace, parts };
};
