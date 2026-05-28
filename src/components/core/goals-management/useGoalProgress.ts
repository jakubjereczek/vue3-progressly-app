import { computed } from 'vue';
import type { TableRow } from '@/api/supabase';
import { localDateToString } from '@/utils/time';
import { getActivityDurationSeconds } from '@/utils/activity';
import { getMondayOfWeek, parseLocalDate } from '@/utils/date';

export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalType = 'per_period' | 'total';
export type GoalStatus = 'active' | 'upcoming' | 'ended' | 'archived';

export function getGoalStatus(goal: TableRow<'goals'>): GoalStatus {
  if (goal.archived_at) return 'archived';
  const today = localDateToString(new Date());
  if (goal.started_at > today) return 'upcoming';
  if (goal.ended_at && goal.ended_at < today) return 'ended';
  return 'active';
}

export function getPeriodRange(goal: TableRow<'goals'>): { from: string; to: string } {
  const now = new Date();
  const today = localDateToString(now);
  if (goal.type === 'total') {
    return { from: goal.started_at, to: goal.ended_at ?? today };
  }
  if (goal.period === 'daily') {
    return { from: today, to: today };
  }
  if (goal.period === 'weekly') {
    return { from: localDateToString(getMondayOfWeek(now)), to: today };
  }
  if (goal.period === 'monthly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: localDateToString(monthStart), to: today };
  }
  return { from: today, to: today };
}

export function filterActivitiesForGoal(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
): TableRow<'activities'>[] {
  const { from, to } = getPeriodRange(goal);
  return activities.filter((a) => {
    if (goal.category_id && a.category_id !== goal.category_id) return false;
    const date = localDateToString(new Date(a.started_at));
    return date >= from && date <= to;
  });
}

export function computeGoalCurrentSeconds(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
): number {
  return filterActivitiesForGoal(goal, activities).reduce(
    (sum, a) => sum + getActivityDurationSeconds(a),
    0,
  );
}

export function computeGoalCurrentCount(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
): number {
  return filterActivitiesForGoal(goal, activities).length;
}

export function computeGoalCurrent(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
): number {
  return goal.metric === 'count'
    ? computeGoalCurrentCount(goal, activities)
    : computeGoalCurrentSeconds(goal, activities);
}

export function getGoalTarget(goal: TableRow<'goals'>): number {
  return goal.metric === 'count' ? (goal.target_count ?? 0) : (goal.target_seconds ?? 0);
}

/**
 * Tolerance applied to duration goals: a period is considered met even if the
 * tracked seconds fall within 60 s of the target (covers timer stop imprecision).
 * Count goals use exact comparison — there is no ambiguity in activity counts.
 */
export const GOAL_COMPLETION_TOLERANCE_SECONDS = 60;

export function isGoalPeriodMet(value: number, target: number, isCount: boolean): boolean {
  if (target <= 0) return false;
  if (isCount) return value >= target;
  return value + GOAL_COMPLETION_TOLERANCE_SECONDS >= target;
}

export function getGoalExpectedPct(goal: TableRow<'goals'>): number {
  if (getGoalStatus(goal) !== 'active') return 0;
  const now = new Date();
  if (goal.type === 'total') {
    const start = parseLocalDate(goal.started_at).getTime();
    const end = goal.ended_at ? parseLocalDate(goal.ended_at).getTime() : now.getTime();
    if (now.getTime() >= end) return 100;
    return Math.min(100, Math.round(((now.getTime() - start) / (end - start)) * 100));
  }
  const mins = now.getHours() * 60 + now.getMinutes();
  if (goal.period === 'daily') return Math.round((mins / (24 * 60)) * 100);
  if (goal.period === 'weekly') {
    const dow = now.getDay();
    const dayNum = dow === 0 ? 7 : dow;
    return Math.round(((dayNum - 1 + mins / (24 * 60)) / 7) * 100);
  }
  if (goal.period === 'monthly') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round(((now.getDate() - 1 + mins / (24 * 60)) / daysInMonth) * 100);
  }
  return 0;
}

export function useGoalProgress(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
) {
  const currentSeconds = computed(() => computeGoalCurrentSeconds(goal, activities));
  const percentage = computed(() => {
    const target = getGoalTarget(goal);
    if (target <= 0) return 0;
    return Math.min(100, Math.round((computeGoalCurrent(goal, activities) / target) * 100));
  });

  return { currentSeconds, percentage, targetSeconds: goal.target_seconds };
}
