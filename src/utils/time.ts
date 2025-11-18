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

