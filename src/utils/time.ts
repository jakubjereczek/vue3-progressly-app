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

  return durationMs;
}

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  const durationMs = getDuration(startedAt, finishedAt);
  const seconds = Math.floor(durationMs / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Formats total duration in seconds as HH:MM:SS.
 * When total >= 24h, returns "[days]d HH:MM" (e.g. "2d 08:12").
 * Uses base-60 conversion (seconds → minutes → hours).
 */
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
  const now = new Date();

  return now.toISOString().split('T')[0]!;
}
