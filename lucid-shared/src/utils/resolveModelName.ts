const GENERIC_TITLES = new Set([
  '', 'blank diagram', 'blank', 'default', 'untitled', 'untitled document', 'untitled diagram',
]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Locale-independent "Mon D, YYYY h:mm AM/PM" (deterministic for tests). */
export function formatStamp(now: Date): string {
  const h24 = now.getHours();
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} ${h12}:${mm} ${ampm}`;
}

/** The model name to use at registration: a timestamp name when the diagram
 *  title is empty or a generic Lucid default; otherwise the (trimmed) title. */
export function resolveModelName(rawTitle: string | null | undefined, now: Date): string {
  const trimmed = (rawTitle ?? '').trim();
  if (GENERIC_TITLES.has(trimmed.toLowerCase())) {
    return `Model — ${formatStamp(now)}`;
  }
  return trimmed;
}
