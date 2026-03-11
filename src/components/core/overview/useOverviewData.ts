import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { getDuration, getTodayDateString, formatTotalDuration } from '@/utils/time';
import type { TableRow } from '@/api/supabase';

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 100, 180, 365];

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getOverviewFetchRange(): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);

  return { from, to };
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
    return localDateStr(d);
  });

  const todayActivities = computed(() =>
    (activities.value as TableRow<'activities'>[]).filter(
      (a) => localDateStr(new Date(a.started_at)) === todayString.value,
    ),
  );

  const yesterdayActivities = computed(() =>
    (activities.value as TableRow<'activities'>[]).filter(
      (a) => localDateStr(new Date(a.started_at)) === yesterdayString.value,
    ),
  );

  const todayTotalSeconds = computed(() => {
    const finished = todayActivities.value.filter((a) => a.finished_at);
    return finished.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
  });

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

  const currentStreak = computed(() => {
    if (activities.value.length === 0) {
      return 0;
    }
    const days = new Set(
      (activities.value as TableRow<'activities'>[]).map((a) => localDateStr(new Date(a.started_at))),
    );
    const today = getTodayDateString();
    const d = new Date();
    if (!days.has(today)) {
      d.setDate(d.getDate() - 1);
    }
    let streak = 0;
    while (days.has(localDateStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  });

  const weekDailyData = computed(() => {
    const todayDate = todayString.value;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i)); // 6 days ago → today
      const dateStr = localDateStr(d);
      const dayActivities = (activities.value as TableRow<'activities'>[]).filter(
        (a) => localDateStr(new Date(a.started_at)) === dateStr && a.finished_at,
      );
      const seconds = dayActivities.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const isToday = dateStr === todayDate;
      const isFuture = dateStr > todayDate;
      return { dateStr, seconds, label, isToday, isFuture };
    });
  });

  const weekMaxSeconds = computed(() => Math.max(1, ...weekDailyData.value.map((d) => d.seconds)));

  const weekActivities = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    const fromStr = localDateStr(d);
    return (activities.value as TableRow<'activities'>[])
      .filter((a) => localDateStr(new Date(a.started_at)) >= fromStr)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  });

  const last30DaysActivity = computed(() =>
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = localDateStr(d);
      const dayActivities = (activities.value as TableRow<'activities'>[]).filter(
        (a) => localDateStr(new Date(a.started_at)) === dateStr && a.finished_at,
      );
      const seconds = dayActivities.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
      return { dateStr, hasActivity: seconds > 0, seconds, isToday: dateStr === todayString.value };
    }),
  );

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
  };
}
