import type { TableRow } from '@/api/supabase';
import { getTodayDateString, localDateToString } from '@/utils/time';
export { buildCategoryMap } from '@/utils/category';

/**
 * Returns the duration of a finished activity in seconds.
 * Returns 0 for in-progress (no finished_at) activities.
 */
export function getActivityDurationSeconds(a: TableRow<'activities'>): number {
  if (!a.finished_at) return 0;
  return (new Date(a.finished_at).getTime() - new Date(a.started_at).getTime()) / 1000;
}

/**
 * Calculates the current consecutive-day streak from an array of activities.
 * Counts backwards from today (or yesterday if today has no activity).
 */
export function calculateStreak(activities: TableRow<'activities'>[]): number {
  if (activities.length === 0) return 0;
  const days = new Set(activities.map((a) => localDateToString(new Date(a.started_at))));
  const today = getTodayDateString();
  const d = new Date();
  if (!days.has(today)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(localDateToString(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Groups activities by their local date string (YYYY-MM-DD) derived from started_at.
 */
export function groupActivitiesByDate(
  activities: TableRow<'activities'>[],
): Map<string, TableRow<'activities'>[]> {
  const map = new Map<string, TableRow<'activities'>[]>();
  for (const a of activities) {
    const dateStr = localDateToString(new Date(a.started_at));
    if (!map.has(dateStr)) map.set(dateStr, []);
    map.get(dateStr)!.push(a);
  }
  return map;
}

/**
 * Extracts all unique non-empty tags from a list of activities, sorted alphabetically.
 */
export function extractUniqueTags(activities: TableRow<'activities'>[]): string[] {
  const set = new Set<string>();
  for (const a of activities) {
    for (const t of (a.tags as string[]) ?? []) {
      if (t.trim()) set.add(t.trim());
    }
  }
  return Array.from(set).sort();
}
