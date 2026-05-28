import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableRow } from '@/api/supabase';
import { getDuration, formatTotalDuration } from '@/utils/time';
import { buildCategoryMap, extractUniqueTags } from '@/utils/activity';
import { startOfDay, endOfDay, addDays, getMondayOfWeek } from '@/utils/date';

export type AnalyticsPeriod = 'week' | 'month' | 'year';

export interface BarSegment {
  categoryId: string | null;
  color: string;
  name: string;
  seconds: number;
}

export interface BarItem {
  key: string;
  label: string;
  subLabel?: string;
  totalSeconds: number;
  prevSeconds: number;
  formattedTotal: string;
  formattedPrev: string;
  segments: BarSegment[];
  isCurrentPeriod?: boolean;
  isFuture?: boolean;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  color: string;
  totalSeconds: number;
  sessionCount: number;
  percentage: number;
  formattedTotal: string;
  prevSeconds: number;
  changePercent: number | null;
}

export interface TagBreakdown {
  tag: string;
  totalSeconds: number;
  sessionCount: number;
  percentage: number;
  formattedTotal: string;
}

export interface PeriodSummary {
  periodLabel: string;
  prevPeriodLabel: string;
  totalSeconds: number;
  formattedTotal: string;
  sessionCount: number;
  activePeriods: number;
  totalPeriods: number;
  avgPerActivePeriod: number;
  formattedAvg: string;
  bestBarLabel: string;
  bestBarSeconds: number;
  formattedBest: string;
  prevTotalSeconds: number;
  changePercent: number | null;
}

export interface CategoryFilterOption {
  id: string | null;
  name: string;
  color: string;
}

function durationSec(a: TableRow<'activities'>): number {
  return getDuration(a.started_at, a.finished_at) / 1000;
}

function inRange(activities: TableRow<'activities'>[], from: Date, to: Date): TableRow<'activities'>[] {
  return activities.filter((a) => {
    if (!a.started_at) return false;
    const d = new Date(a.started_at);
    return d >= from && d <= to;
  });
}

function applyFilters(
  acts: TableRow<'activities'>[],
  catIds: Set<string | null>,
  tags: Set<string>,
): TableRow<'activities'>[] {
  if (catIds.size === 0 && tags.size === 0) return acts;
  return acts.filter((a) => {
    const catMatch = catIds.size === 0 || catIds.has(a.category_id ?? null);
    const tagMatch = tags.size === 0 || ((a.tags as string[]) ?? []).some((t) => tags.has(t));
    return catMatch && tagMatch;
  });
}

function buildSegments(
  activities: TableRow<'activities'>[],
  categoryMap: Map<string, TableRow<'categories'>>,
): BarSegment[] {
  const map = new Map<string, { seconds: number; color: string; name: string }>();
  for (const a of activities) {
    const sec = durationSec(a);
    if (sec <= 0) continue;
    const key = a.category_id ?? '__none__';
    if (!map.has(key)) {
      const cat = a.category_id ? categoryMap.get(a.category_id) : null;
      map.set(key, {
        seconds: 0,
        color: cat?.color ?? 'var(--color-muted-foreground)',
        name: cat?.name ?? '__uncategorized__',
      });
    }
    map.get(key)!.seconds += sec;
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      categoryId: key === '__none__' ? null : key,
      color: v.color,
      name: v.name,
      seconds: v.seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

// ---- Bounds helpers ----

interface Bounds {
  start: Date;
  end: Date;
  label: string;
}

function weekBounds(offset: number, locale: string, currentPeriodSuffix: string): Bounds {
  const monday = getMondayOfWeek(new Date());
  const start = addDays(monday, offset * 7);
  const end = endOfDay(addDays(start, 6));
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const label = offset === 0 ? `${fmt(start)} – ${fmt(end)} ${currentPeriodSuffix}` : `${fmt(start)} – ${fmt(end)}`;
  return { start, end, label };
}

function monthBounds(offset: number, locale: string): Bounds {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + offset;
  const start = startOfDay(new Date(year, month, 1));
  const end = endOfDay(new Date(year, month + 1, 0));
  const label = start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function yearBounds(offset: number): Bounds {
  const year = new Date().getFullYear() + offset;
  const start = startOfDay(new Date(year, 0, 1));
  const end = endOfDay(new Date(year, 11, 31));
  return { start, end, label: String(year) };
}

// ---- Main composable ----

export function useAnalyticsData(
  activities: Ref<TableRow<'activities'>[]>,
  categories: Ref<TableRow<'categories'>[]>,
  period: Ref<AnalyticsPeriod>,
  offset: Ref<number>,
  filterCategoryIds: Ref<Set<string | null>>,
  filterTags: Ref<Set<string>>,
) {
  const { t, locale } = useI18n();

  const categoryMap = computed(() => buildCategoryMap(categories.value));

  // Locale-aware short weekday labels: index 0 = Monday
  const shortDays = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 1 + i); // Jan 1 2024 = Monday
      return date.toLocaleDateString(locale.value, { weekday: 'short' });
    }),
  );

  // Locale-aware short month labels: index 0 = January
  const shortMonths = computed(() =>
    Array.from({ length: 12 }, (_, m) => new Date(2024, m, 1).toLocaleDateString(locale.value, { month: 'short' })),
  );

  const bounds = computed((): Bounds => {
    const currentPeriodSuffix = `(${t('app.module.analytics.current_period')})`;
    switch (period.value) {
      case 'week':
        return weekBounds(offset.value, locale.value, currentPeriodSuffix);
      case 'month':
        return monthBounds(offset.value, locale.value);
      case 'year':
        return yearBounds(offset.value);
      default:
        throw new Error('Invalid period');
    }
  });

  const prevBounds = computed((): Bounds => {
    switch (period.value) {
      case 'week':
        return weekBounds(offset.value - 1, locale.value, '');
      case 'month':
        return monthBounds(offset.value - 1, locale.value);
      case 'year':
        return yearBounds(offset.value - 1);
      default:
        throw new Error('Invalid period');
    }
  });

  // Raw date-filtered activities (used for building filter options)
  const currentActivities = computed(() => inRange(activities.value, bounds.value.start, bounds.value.end));
  const prevActivities = computed(() => inRange(activities.value, prevBounds.value.start, prevBounds.value.end));

  // Filter-applied activities (used for all metrics)
  const filteredCurrentActivities = computed(() =>
    applyFilters(currentActivities.value, filterCategoryIds.value, filterTags.value),
  );
  const filteredPrevActivities = computed(() =>
    applyFilters(prevActivities.value, filterCategoryIds.value, filterTags.value),
  );

  // ---- Filter options (derived from unfiltered period data) ----

  const allCategoriesInPeriod = computed<CategoryFilterOption[]>(() => {
    const map = new Map<string | null, { name: string; color: string }>();
    for (const a of currentActivities.value) {
      const key = a.category_id ?? null;
      if (!map.has(key)) {
        const cat = key ? categoryMap.value.get(key) : null;
        map.set(key, {
          name: cat?.name ?? '__uncategorized__',
          color: cat?.color ?? 'var(--color-muted-foreground)',
        });
      }
    }
    return Array.from(map.entries())
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => {
        if (a.id === null) return 1;
        if (b.id === null) return -1;
        return a.name.localeCompare(b.name);
      });
  });

  const allTagsInPeriod = computed<string[]>(() => extractUniqueTags(currentActivities.value));

  const bars = computed<BarItem[]>(() => {
    const catMap = categoryMap.value;
    const today = new Date();

    if (period.value === 'week') {
      const { start } = bounds.value;
      const { start: prevStart } = prevBounds.value;
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const dayActs = inRange(filteredCurrentActivities.value, startOfDay(day), endOfDay(day));
        const prevDay = addDays(prevStart, i);
        const prevActs = inRange(filteredPrevActivities.value, startOfDay(prevDay), endOfDay(prevDay));
        const totalSeconds = dayActs.reduce((s, a) => s + durationSec(a), 0);
        const prevSeconds = prevActs.reduce((s, a) => s + durationSec(a), 0);
        return {
          key: startOfDay(day).toISOString(),
          label: shortDays.value[i] ?? '',
          subLabel: `${day.getDate()}/${day.getMonth() + 1}`,
          totalSeconds,
          prevSeconds,
          formattedTotal: formatTotalDuration(totalSeconds),
          formattedPrev: formatTotalDuration(prevSeconds),
          segments: buildSegments(dayActs, catMap),
          isCurrentPeriod: startOfDay(day).getTime() === startOfDay(today).getTime(),
          isFuture: startOfDay(day) > startOfDay(today),
        };
      });
    }

    if (period.value === 'month') {
      const { start } = bounds.value;
      const { start: prevStart } = prevBounds.value;
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const daysInPrevMonth = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0).getDate();

      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const date = new Date(start.getFullYear(), start.getMonth(), d);
        const dayActs = inRange(filteredCurrentActivities.value, startOfDay(date), endOfDay(date));
        const prevDayNum = Math.min(d, daysInPrevMonth);
        const prevDate = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevDayNum);
        const prevActs = inRange(filteredPrevActivities.value, startOfDay(prevDate), endOfDay(prevDate));
        const totalSeconds = dayActs.reduce((s, a) => s + durationSec(a), 0);
        const prevSeconds = prevActs.reduce((s, a) => s + durationSec(a), 0);
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
        return {
          key: `${start.getFullYear()}-${start.getMonth()}-${d}`,
          label: String(d),
          subLabel: dayOfWeek === 1 ? 'W' : undefined,
          totalSeconds,
          prevSeconds,
          formattedTotal: formatTotalDuration(totalSeconds),
          formattedPrev: formatTotalDuration(prevSeconds),
          segments: buildSegments(dayActs, catMap),
          isCurrentPeriod: startOfDay(date).getTime() === startOfDay(today).getTime(),
          isFuture: date > today,
        };
      });
    }

    // year
    const { start } = bounds.value;
    const { start: prevStart } = prevBounds.value;
    const isCurrentYear = start.getFullYear() === today.getFullYear();
    return Array.from({ length: 12 }, (_, m) => {
      const mStart = new Date(start.getFullYear(), m, 1, 0, 0, 0, 0);
      const mEnd = new Date(start.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      const mActs = inRange(filteredCurrentActivities.value, mStart, mEnd);
      const pmStart = new Date(prevStart.getFullYear(), m, 1, 0, 0, 0, 0);
      const pmEnd = new Date(prevStart.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      const pmActs = inRange(filteredPrevActivities.value, pmStart, pmEnd);
      const totalSeconds = mActs.reduce((s, a) => s + durationSec(a), 0);
      const prevSeconds = pmActs.reduce((s, a) => s + durationSec(a), 0);
      return {
        key: `${start.getFullYear()}-${m}`,
        label: shortMonths.value[m] ?? '',
        totalSeconds,
        prevSeconds,
        formattedTotal: formatTotalDuration(totalSeconds),
        formattedPrev: formatTotalDuration(prevSeconds),
        segments: buildSegments(mActs, catMap),
        isCurrentPeriod: isCurrentYear && m === today.getMonth(),
        isFuture: isCurrentYear && m > today.getMonth(),
      };
    });
  });

  const maxBarSeconds = computed(() => Math.max(1, ...bars.value.map((b) => Math.max(b.totalSeconds, b.prevSeconds))));

  const summary = computed<PeriodSummary>(() => {
    const acts = filteredCurrentActivities.value;
    const prevActs = filteredPrevActivities.value;
    const totalSeconds = acts.reduce((s, a) => s + durationSec(a), 0);
    const prevTotalSeconds = prevActs.reduce((s, a) => s + durationSec(a), 0);
    const sessionCount = acts.filter((a) => a.finished_at).length;
    const nonFutureBars = bars.value.filter((b) => !b.isFuture);
    const activePeriods = nonFutureBars.filter((b) => b.totalSeconds > 0).length;
    const totalPeriods = nonFutureBars.length;
    const avgPerActivePeriod = activePeriods > 0 ? totalSeconds / activePeriods : 0;
    const bestBar = bars.value.reduce(
      (best, b) => (b.totalSeconds > best.totalSeconds ? b : best),
      bars.value[0] ?? { label: '—', totalSeconds: 0 },
    );
    const changePercent = prevTotalSeconds > 0 ? ((totalSeconds - prevTotalSeconds) / prevTotalSeconds) * 100 : null;

    return {
      periodLabel: bounds.value.label,
      prevPeriodLabel: prevBounds.value.label,
      totalSeconds,
      formattedTotal: formatTotalDuration(totalSeconds),
      sessionCount,
      activePeriods,
      totalPeriods,
      avgPerActivePeriod,
      formattedAvg: formatTotalDuration(avgPerActivePeriod),
      bestBarLabel: bestBar?.label ?? '—',
      bestBarSeconds: bestBar?.totalSeconds ?? 0,
      formattedBest: formatTotalDuration(bestBar?.totalSeconds ?? 0),
      prevTotalSeconds,
      changePercent,
    };
  });

  const categoryBreakdown = computed<CategoryBreakdown[]>(() => {
    const acts = filteredCurrentActivities.value;
    const prevActs = filteredPrevActivities.value;
    const total = acts.reduce((s, a) => s + durationSec(a), 0);
    const catMap = categoryMap.value;
    const curr = new Map<string, { seconds: number; sessions: number }>();
    const prev = new Map<string, { seconds: number }>();

    for (const a of acts) {
      const sec = durationSec(a);
      if (sec <= 0) continue;
      const key = a.category_id ?? '__none__';
      if (!curr.has(key)) curr.set(key, { seconds: 0, sessions: 0 });
      curr.get(key)!.seconds += sec;
      if (a.finished_at) curr.get(key)!.sessions++;
    }
    for (const a of prevActs) {
      const sec = durationSec(a);
      if (sec <= 0) continue;
      const key = a.category_id ?? '__none__';
      if (!prev.has(key)) prev.set(key, { seconds: 0 });
      prev.get(key)!.seconds += sec;
    }

    return Array.from(curr.entries())
      .map(([key, data]) => {
        const cat = key !== '__none__' ? (catMap.get(key) ?? null) : null;
        const prevSeconds = prev.get(key)?.seconds ?? 0;
        return {
          categoryId: key === '__none__' ? null : key,
          name: cat?.name ?? '__uncategorized__',
          color: cat?.color ?? 'var(--color-muted-foreground)',
          totalSeconds: data.seconds,
          sessionCount: data.sessions,
          percentage: total > 0 ? (data.seconds / total) * 100 : 0,
          formattedTotal: formatTotalDuration(data.seconds),
          prevSeconds,
          changePercent: prevSeconds > 0 ? ((data.seconds - prevSeconds) / prevSeconds) * 100 : null,
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  const tagBreakdown = computed<TagBreakdown[]>(() => {
    const acts = filteredCurrentActivities.value;
    const total = acts.reduce((s, a) => s + durationSec(a), 0);
    const map = new Map<string, { seconds: number; sessions: number }>();

    for (const a of acts) {
      const sec = durationSec(a);
      if (sec <= 0) continue;
      for (const tag of (a.tags as string[]) ?? []) {
        if (!tag.trim()) continue;
        if (!map.has(tag)) map.set(tag, { seconds: 0, sessions: 0 });
        map.get(tag)!.seconds += sec;
        if (a.finished_at) map.get(tag)!.sessions++;
      }
    }

    return Array.from(map.entries())
      .map(([tag, data]) => ({
        tag,
        totalSeconds: data.seconds,
        sessionCount: data.sessions,
        percentage: total > 0 ? (data.seconds / total) * 100 : 0,
        formattedTotal: formatTotalDuration(data.seconds),
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  return {
    bars,
    maxBarSeconds,
    summary,
    categoryBreakdown,
    tagBreakdown,
    bounds,
    prevBounds,
    allCategoriesInPeriod,
    allTagsInPeriod,
  };
}
