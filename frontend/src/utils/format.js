/**
 * Safe timestamp parsing — handles both ISO 8601 and SQLite datetime formats
 * SQLite datetime('now') returns "2026-09-05 10:30:00" which Date.parse can't handle
 */

function toISOString(input) {
  if (!input) return new Date().toISOString();

  // Already ISO? Return as-is
  if (typeof input === 'string' && input.includes('T')) {
    return input;
  }

  // SQLite format: "2026-09-05 10:30:00" → "2026-09-05T10:30:00"
  if (typeof input === 'string') {
    const iso = input.replace(' ', 'T');
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return iso;
  }

  // Try native Date parsing
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString();

  return new Date().toISOString();
}

export function safeDate(input) {
  return new Date(toISOString(input));
}

export function safeTimestamp(input) {
  return toISOString(input);
}
