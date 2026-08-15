export function timeAgo(utc) {
  if (!utc) return '';
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
