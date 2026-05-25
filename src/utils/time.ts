/** Seconds in a full day — use instead of the magic literal 86400. */
export const SECONDS_PER_DAY = 86400;

/** Milliseconds in a full day — use instead of the magic literal 86400000. */
export const MS_PER_DAY = 86_400_000;

/**
 * Compact human-readable duration: "1h 30m", "45m", "2h".
 * Use for space-constrained UI (chart labels, badges).
 * Use formatTotalDuration for precise hh:mm:ss display.
 */
export function formatDurationCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return '0m';
}

export function formatTime(totalSeconds: number): string {
  const pad = (num: number): string => String(num).padStart(2, '0');
  const totalSecs = Math.max(0, totalSeconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = Math.floor(totalSecs % 60);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return `00:${pad(minutes)}:${pad(seconds)}`;
  }
}

export function getDuration(startedAt: string, finishedAt: string | null): number {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : new Date().getTime();
  const durationMs = end - start;

  return Math.max(0, durationMs);
}

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  return formatTime(getDuration(startedAt, finishedAt) / 1000);
}

/**
 * Formats an ISO datetime string as a locale-aware HH:MM time string.
 * Returns '—' when iso is null.
 */
export function formatISOTime(iso: string | null, locale?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTotalDuration(totalSeconds: number): string {
  const totalSecs = Math.max(0, Math.floor(totalSeconds));
  const pad = (num: number): string => String(num).padStart(2, '0');

  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return `${days}d ${pad(h)}:${pad(minutes)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getTodayDateString(): string {
  return localDateToString(new Date());
}

export function localDateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatActivityDateTime(
  dateString: string | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
