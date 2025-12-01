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

export function getTodayDateString(): string {
  const now = new Date();

  return now.toISOString().split('T')[0]!;
}
