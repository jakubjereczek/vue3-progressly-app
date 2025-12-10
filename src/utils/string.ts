export function splitAndTrim(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function arrayToString(arr: unknown) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}
