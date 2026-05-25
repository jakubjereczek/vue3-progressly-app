export function splitAndTrim(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function arrayToString(arr: string[] | unknown): string {
  return Array.isArray(arr) ? (arr as string[]).join(', ') : '';
}
