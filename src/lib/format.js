export function formatTimestamp(dateStr, format = 'F') {
  if (!dateStr) return 'unknown';
  const unixSeconds = Math.floor(new Date(dateStr).getTime() / 1000);
  return `<t:${unixSeconds}:${format}>`;
}
