/**
 * Shared date manipulation helpers.
 * All functions operate in local timezone unless otherwise noted.
 */

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Returns a new Date set to the Monday of the week containing `d` (ISO week, Monday = day 1).
 * Time is reset to 00:00:00.000.
 */
export function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Returns the ISO 8601 week number for the given date.
 * Uses the Thursday-based definition: week 1 is the week containing the first Thursday.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Returns the ISO week label string, e.g. "W42". */
export function isoWeekLabel(date: Date): string {
  return `W${getISOWeekNumber(date)}`;
}

/**
 * Parses a YYYY-MM-DD date string as local midnight (00:00:00).
 * Avoids the UTC-offset shift that `new Date('YYYY-MM-DD')` causes.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Parses a YYYY-MM-DD date string as local end-of-day (23:59:59.999).
 */
export function parseLocalDateEnd(dateStr: string): Date {
  return new Date(dateStr + 'T23:59:59.999');
}
