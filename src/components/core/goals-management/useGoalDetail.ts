import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableRow } from '@/api/supabase';
import { isGoalPeriodMet } from './useGoalProgress';
import { getActivityDurationSeconds } from '@/utils/activity';
import { localDateToString } from '@/utils/time';
import { getMondayOfWeek, addDays, isoWeekLabel, parseLocalDate } from '@/utils/date';

export interface GoalPeriodBar {
  key: string;
  label: string;
  subLabel?: string;
  seconds: number;
  count: number;
  isCurrentPeriod: boolean;
  isFuture: boolean;
}

function weekStart(refDate: Date, offsetWeeks: number): Date {
  return addDays(getMondayOfWeek(refDate), offsetWeeks * 7);
}

/**
 * Returns the bar key of the first period that overlaps with goal.started_at.
 * For daily/total goals: the started_at date itself.
 * For weekly goals: the Monday of the week containing started_at.
 * For monthly goals: the first day of the month containing started_at.
 */
export function getGoalFirstPeriodKey(goal: TableRow<'goals'>): string {
  if (goal.type === 'total' || goal.period === 'daily') return goal.started_at;
  const d = parseLocalDate(goal.started_at);
  if (goal.period === 'weekly') return localDateToString(getMondayOfWeek(d));
  return localDateToString(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function buildPeriodBars(
  goal: TableRow<'goals'>,
  activities: TableRow<'activities'>[],
  maxPeriods?: number | null,
  offsetPeriods?: number,
  locale?: string,
): GoalPeriodBar[] {
  const today = new Date();
  const todayStr = localDateToString(today);
  const shift = offsetPeriods ?? 0;
  const relevant = activities.filter((a) => !goal.category_id || a.category_id === goal.category_id);

  function sliceSecs(from: string, to: string): number {
    return relevant
      .filter(
        (a) => localDateToString(new Date(a.started_at)) >= from && localDateToString(new Date(a.started_at)) <= to,
      )
      .reduce((s, a) => s + getActivityDurationSeconds(a), 0);
  }

  function sliceCount(from: string, to: string): number {
    return relevant.filter(
      (a) => localDateToString(new Date(a.started_at)) >= from && localDateToString(new Date(a.started_at)) <= to,
    ).length;
  }

  if (goal.type === 'total') {
    const start = parseLocalDate(goal.started_at);
    const end = goal.ended_at ? parseLocalDate(goal.ended_at) : today;
    const bars: GoalPeriodBar[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const weekEnd = new Date(cur);
      weekEnd.setDate(cur.getDate() + 6);
      const from = localDateToString(cur);
      const to = localDateToString(weekEnd > end ? end : weekEnd);
      bars.push({
        key: from,
        label: isoWeekLabel(cur),
        seconds: sliceSecs(from, to),
        count: sliceCount(from, to),
        isCurrentPeriod: todayStr >= from && todayStr <= to,
        isFuture: from > todayStr,
      });
      cur.setDate(cur.getDate() + 7);
    }
    return bars;
  }

  if (goal.period === 'daily') {
    const count =
      maxPeriods === null
        ? Math.max(1, Math.ceil((today.getTime() - parseLocalDate(goal.started_at).getTime()) / 86400000) + 1)
        : (maxPeriods ?? 14);
    const dayShift = shift * count;
    const bars: GoalPeriodBar[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i - dayShift);
      const dateStr = localDateToString(d);
      const dow = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).slice(0, 2);
      bars.push({
        key: dateStr,
        label: dow,
        subLabel: `${d.getDate()}`,
        seconds: sliceSecs(dateStr, dateStr),
        count: sliceCount(dateStr, dateStr),
        isCurrentPeriod: shift === 0 && dateStr === todayStr,
        isFuture: shift === 0 && dateStr > todayStr,
      });
    }
    return bars;
  }

  if (goal.period === 'weekly') {
    const count =
      maxPeriods === null
        ? Math.max(
            1,
            Math.ceil((today.getTime() - weekStart(parseLocalDate(goal.started_at), 0).getTime()) / (7 * 86400000)) + 1,
          )
        : (maxPeriods ?? 8);
    const weekShift = shift * count;
    const bars: GoalPeriodBar[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const wStart = weekStart(today, -(i + weekShift));
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      const from = localDateToString(wStart);
      const to = localDateToString(wEnd);
      bars.push({
        key: from,
        label: isoWeekLabel(wStart),
        seconds: sliceSecs(from, to),
        count: sliceCount(from, to),
        isCurrentPeriod: shift === 0 && todayStr >= from && todayStr <= to,
        isFuture: shift === 0 && from > todayStr,
      });
    }
    return bars;
  }

  if (goal.period === 'monthly') {
    const count =
      maxPeriods === null
        ? Math.max(
            1,
            (today.getFullYear() - parseLocalDate(goal.started_at).getFullYear()) * 12 +
              (today.getMonth() - parseLocalDate(goal.started_at).getMonth()) +
              1,
          )
        : (maxPeriods ?? 6);
    const monthShift = shift * count;
    const bars: GoalPeriodBar[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i - monthShift, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const from = localDateToString(new Date(year, month, 1));
      const to = localDateToString(new Date(year, month + 1, 0));
      const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, month, 1));
      bars.push({
        key: from,
        label: monthLabel,
        subLabel: `${year}`,
        seconds: sliceSecs(from, to),
        count: sliceCount(from, to),
        isCurrentPeriod: shift === 0 && todayStr >= from && todayStr <= to,
        isFuture: shift === 0 && from > todayStr,
      });
    }
    return bars;
  }

  return [];
}

export function useGoalDetail(goal: TableRow<'goals'>, activities: TableRow<'activities'>[]) {
  const { locale } = useI18n();
  const relevant = computed(() =>
    activities.filter(
      (a) =>
        a.finished_at &&
        (!goal.category_id || a.category_id === goal.category_id) &&
        localDateToString(new Date(a.started_at)) >= goal.started_at &&
        (!goal.ended_at || localDateToString(new Date(a.started_at)) <= goal.ended_at),
    ),
  );

  const bars = computed(() => buildPeriodBars(goal, activities, undefined, undefined, locale.value));

  const isCount = goal.metric === 'count';

  // maxBarValue is metric-aware: count goals use bar.count, duration goals use bar.seconds
  const maxBarValue = computed(() =>
    isCount ? Math.max(...bars.value.map((b) => b.count), 1) : Math.max(...bars.value.map((b) => b.seconds), 1),
  );

  const completedPeriods = computed(() => {
    const target = isCount ? (goal.target_count ?? 0) : (goal.target_seconds ?? 0);
    return bars.value.filter((b) => !b.isFuture && isGoalPeriodMet(isCount ? b.count : b.seconds, target, isCount))
      .length;
  });

  const nonFutureBars = computed(() =>
    bars.value.filter((b) => !b.isFuture && (isCount ? b.count > 0 : b.seconds > 0)),
  );

  // bestValue / avgValue are metric-aware (count or seconds depending on goal.metric)
  const bestValue = computed(() =>
    nonFutureBars.value.length ? Math.max(...nonFutureBars.value.map((b) => (isCount ? b.count : b.seconds))) : 0,
  );

  const avgValue = computed(() =>
    nonFutureBars.value.length
      ? Math.round(
          nonFutureBars.value.reduce((s, b) => s + (isCount ? b.count : b.seconds), 0) / nonFutureBars.value.length,
        )
      : 0,
  );

  // const totalSeconds = computed(() =>
  //   relevant.value.reduce((s, a) => s + getActivityDurationSeconds(a), 0),
  // );

  const totalSessions = computed(() => relevant.value.length);

  const daysRemaining = computed(() => {
    if (!goal.ended_at) return null;
    const today = localDateToString(new Date());
    if (goal.ended_at < today) return 0;
    const diff = parseLocalDate(goal.ended_at).getTime() - parseLocalDate(today).getTime();
    return Math.ceil(diff / 86400000);
  });

  const recentActivities = computed(() =>
    [...relevant.value].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 20),
  );

  return {
    bars,
    maxBarValue,
    completedPeriods,
    bestValue,
    avgValue,
    totalSessions,
    daysRemaining,
    recentActivities,
  };
}
