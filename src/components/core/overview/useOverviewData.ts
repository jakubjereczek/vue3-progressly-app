import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useActivitiesStore, useCategoriesStore, useOverviewStore } from '@/stores';
import { getDuration, getTodayDateString, formatTotalDuration, localDateToString } from '@/utils/time';
import { calculateStreak, groupActivitiesByDate } from '@/utils/activity';
import { startOfDay, endOfDay, addDays } from '@/utils/date';
import type { TableRow } from '@/api/supabase';

interface BarItem {
  label: string;
  seconds: number;
  isCurrent: boolean;
  isFuture: boolean;
}

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 100, 180, 365];

export function getOverviewFetchRange(): { from: Date; to: Date } {
  return {
    from: startOfDay(addDays(new Date(), -30)),
    to: endOfDay(new Date()),
  };
}

export function useOverviewData() {
  const activitiesStore = useActivitiesStore();
  const categoriesStore = useCategoriesStore();
  const { activities, loading } = storeToRefs(activitiesStore);
  const { categories } = storeToRefs(categoriesStore);

  const todayString = computed(() => getTodayDateString());

  const yesterdayString = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localDateToString(d);
  });

  /** Single-pass date grouping — reused by weekDailyData, rangeBarData, etc. */
  const activitiesByDate = computed(() => groupActivitiesByDate(activities.value as TableRow<'activities'>[]));

  const todayActivities = computed(() => activitiesByDate.value.get(todayString.value) ?? []);

  const yesterdayActivities = computed(() => activitiesByDate.value.get(yesterdayString.value) ?? []);

  const todayTotalSeconds = computed(() =>
    todayActivities.value
      .filter((a) => a.finished_at)
      .reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
  );

  const todaySessionCount = computed(() => todayActivities.value.length);
  const todayTotalFormatted = computed(() => formatTotalDuration(todayTotalSeconds.value));

  const yesterdayTotalSeconds = computed(() => {
    const finished = yesterdayActivities.value.filter((a) => a.finished_at);
    return finished.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
  });

  const vsYesterdayPercent = computed<number | null>(() => {
    if (yesterdayTotalSeconds.value === 0) return null;
    return ((todayTotalSeconds.value - yesterdayTotalSeconds.value) / yesterdayTotalSeconds.value) * 100;
  });

  const currentStreak = computed(() => calculateStreak(activities.value as TableRow<'activities'>[]));

  const weekDailyData = computed(() => {
    const todayDate = todayString.value;
    const byDate = activitiesByDate.value;
    const base = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(base, -(6 - i)); // 6 days ago → today
      const dateStr = localDateToString(d);
      const isToday = dateStr === todayDate;
      const isFuture = dateStr > todayDate;
      const seconds = (byDate.get(dateStr) ?? []).reduce((sum, a) => {
        if (!a.finished_at) return sum;
        return sum + getDuration(a.started_at, a.finished_at) / 1000;
      }, 0);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      return { dateStr, seconds, label, isToday, isFuture };
    });
  });

  const weekMaxSeconds = computed(() => Math.max(1, ...weekDailyData.value.map((d) => d.seconds)));

  const weekActivities = computed(() => {
    const fromStr = localDateToString(startOfDay(addDays(new Date(), -6)));
    return (activities.value as TableRow<'activities'>[])
      .filter((a) => localDateToString(new Date(a.started_at)) >= fromStr)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  });

  const last30DaysActivity = computed(() => {
    const byDate = activitiesByDate.value;
    const todayDate = todayString.value;
    const base = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (29 - i));
      const dateStr = localDateToString(d);
      const seconds = (byDate.get(dateStr) ?? []).reduce((sum, a) => {
        if (!a.finished_at) return sum;
        return sum + getDuration(a.started_at, a.finished_at) / 1000;
      }, 0);
      return { dateStr, hasActivity: seconds > 0, seconds, isToday: dateStr === todayDate };
    });
  });

  const nextMilestone = computed(() => STREAK_MILESTONES.find((m) => m > currentStreak.value) ?? null);

  const milestoneProgress = computed(() => {
    const next = nextMilestone.value;
    if (next === null) {
      return 100;
    }
    const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= currentStreak.value) ?? 0;
    if (next === prev) {
      return 100;
    }
    return Math.round(((currentStreak.value - prev) / (next - prev)) * 100);
  });

  const streakAtRisk = computed(() => currentStreak.value > 0 && todayTotalSeconds.value === 0);

  const weekTotalSeconds = computed(() => weekDailyData.value.reduce((sum, d) => sum + d.seconds, 0));

  const weekBestDateStr = computed(() => {
    const max = Math.max(...weekDailyData.value.map((d) => d.seconds));
    if (max === 0) return null;
    return weekDailyData.value.find((d) => d.seconds === max)?.dateStr ?? null;
  });

  const { selectedRange } = storeToRefs(useOverviewStore());

  const rangeActivities = computed<TableRow<'activities'>[]>(() => {
    const all = activities.value as TableRow<'activities'>[];
    if (selectedRange.value === 'today') return todayActivities.value;
    const days = selectedRange.value === 'week' ? 6 : 29;
    const fromStr = localDateToString(startOfDay(addDays(new Date(), -days)));
    return all
      .filter((a) => localDateToString(new Date(a.started_at)) >= fromStr)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  });

  const rangeTotalSeconds = computed(() =>
    rangeActivities.value
      .filter((a) => a.finished_at)
      .reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
  );

  const rangeTotalFormatted = computed(() => formatTotalDuration(rangeTotalSeconds.value));

  const rangeSessionCount = computed(() => rangeActivities.value.length);

  const prevPeriodTotalSeconds = computed(() => {
    const all = activities.value as TableRow<'activities'>[];
    if (selectedRange.value === 'today') return yesterdayTotalSeconds.value;
    const days = selectedRange.value === 'week' ? 7 : 30;
    const periodEnd = endOfDay(addDays(new Date(), -days));
    const periodStart = startOfDay(addDays(periodEnd, -days + 1));
    const fromStr = localDateToString(periodStart);
    const toStr = localDateToString(periodEnd);
    return all
      .filter((a) => {
        const dateStr = localDateToString(new Date(a.started_at));
        return dateStr >= fromStr && dateStr <= toStr && a.finished_at;
      })
      .reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
  });

  const vsPercent = computed<number | null>(() => {
    if (prevPeriodTotalSeconds.value === 0) return null;
    return ((rangeTotalSeconds.value - prevPeriodTotalSeconds.value) / prevPeriodTotalSeconds.value) * 100;
  });

  const rangeBarData = computed<BarItem[]>(() => {
    const byDate = activitiesByDate.value;
    const currentHour = new Date().getHours();

    if (selectedRange.value === 'today') {
      const buckets = new Array<number>(24).fill(0);
      for (const a of todayActivities.value) {
        if (!a.finished_at) continue;
        const h = new Date(a.started_at).getHours();
        buckets[h]! += getDuration(a.started_at, a.finished_at) / 1000;
      }
      return buckets.map(
        (seconds, hour): BarItem => ({
          label: String(hour).padStart(2, '0'),
          seconds,
          isCurrent: hour === currentHour,
          isFuture: hour > currentHour,
        }),
      );
    }

    const days = selectedRange.value === 'week' ? 7 : 30;
    const base = new Date();
    return Array.from({ length: days }, (_, i): BarItem => {
      const d = new Date(base);
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = localDateToString(d);
      const isToday = dateStr === todayString.value;
      const isFuture = dateStr > todayString.value;
      const seconds = (byDate.get(dateStr) ?? []).reduce((sum, a) => {
        if (!a.finished_at) return sum;
        return sum + getDuration(a.started_at, a.finished_at) / 1000;
      }, 0);
      let label = '';
      if (selectedRange.value === 'week') {
        label = d.toLocaleDateString(undefined, { weekday: 'short' });
      } else {
        label = i % 5 === 0 || i === days - 1 ? String(d.getDate()) : '';
      }
      return { label, seconds, isCurrent: isToday, isFuture };
    });
  });

  return {
    loading,
    activities: activities as unknown as ReturnType<typeof computed<TableRow<'activities'>[]>>,
    categories,
    todayActivities,
    todayTotalSeconds,
    todayTotalFormatted,
    todaySessionCount,
    yesterdayTotalSeconds,
    vsYesterdayPercent,
    currentStreak,
    weekDailyData,
    weekMaxSeconds,
    last30DaysActivity,
    nextMilestone,
    milestoneProgress,
    streakAtRisk,
    weekTotalSeconds,
    weekActivities,
    weekBestDateStr,
    todayString,
    selectedRange,
    rangeActivities,
    rangeTotalSeconds,
    rangeTotalFormatted,
    rangeSessionCount,
    vsPercent,
    rangeBarData,
  };
}
