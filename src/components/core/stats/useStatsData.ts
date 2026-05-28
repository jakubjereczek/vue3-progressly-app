import { computed, type Ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import { getDuration, formatTotalDuration } from '@/utils/time';
import { buildCategoryMap, extractUniqueTags } from '@/utils/activity';
import { startOfDay, endOfDay, addDays } from '@/utils/date';

export type DateRangePreset = '7d' | '30d' | '90d' | 'month' | 'all';

export interface TagStat {
  tag: string;
  totalSeconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  percentage: number;
  formattedTotal: string;
  formattedAvg: string;
  /** 7 equal-width time buckets spanning the selected period (oldest → newest) */
  sparklineSeconds: number[];
}

export interface CategoryStat {
  categoryId: string | null;
  name: string;
  color: string;
  totalSeconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  percentage: number;
  formattedTotal: string;
  formattedAvg: string;
  /** 7 equal-width time buckets spanning the selected period (oldest → newest) */
  sparklineSeconds: number[];
}

export interface SummaryStats {
  totalSeconds: number;
  formattedTotal: string;
  sessionCount: number;
  avgSessionSeconds: number;
  formattedAvg: string;
  uniqueTagCount: number;
  activeCategoryCount: number;
}

export function getDateRangeBounds(preset: DateRangePreset): { from: Date; to: Date } {
  const to = endOfDay(new Date());

  switch (preset) {
    case '7d':
      return { from: startOfDay(addDays(new Date(), -6)), to };
    case '30d':
      return { from: startOfDay(addDays(new Date(), -29)), to };
    case '90d':
      return { from: startOfDay(addDays(new Date(), -89)), to };
    case 'month': {
      const from = new Date();
      from.setDate(1);
      return { from: startOfDay(from), to };
    }
    case 'all': {
      const from = new Date(2000, 0, 1);
      return { from: startOfDay(from), to };
    }
  }
}

const SPARKLINE_BUCKETS = 7;

interface StatAccum {
  totalSeconds: number;
  sessionCount: number;
  buckets: number[];
}

function makeAccum(): StatAccum {
  return { totalSeconds: 0, sessionCount: 0, buckets: new Array(SPARKLINE_BUCKETS).fill(0) };
}

export function useStatsData(
  activities: Ref<TableRow<'activities'>[]>,
  categories: Ref<TableRow<'categories'>[]>,
  dateRangePreset: Ref<DateRangePreset>,
  selectedTags: Ref<Set<string>>,
) {
  const dateRange = computed(() => getDateRangeBounds(dateRangePreset.value));

  const filteredActivities = computed(() => {
    const { from, to } = dateRange.value;
    return activities.value.filter((a) => {
      if (!a.started_at) return false;
      const start = new Date(a.started_at);
      return start >= from && start <= to;
    });
  });

  const allTags = computed<string[]>(() => extractUniqueTags(filteredActivities.value));

  /**
   * Single pass over filteredActivities — builds tag accumulators, category
   * accumulators, and untagged accumulator all at once, including sparkline
   * buckets. Replaces the previous pattern of calling getSparklineBuckets()
   * once per tag/category (N+M separate full-array iterations).
   */
  const statsCore = computed(() => {
    const { from, to } = dateRange.value;
    const rangeMs = Math.max(1, to.getTime() - from.getTime());
    const bucketMs = rangeMs / SPARKLINE_BUCKETS;
    const fromMs = from.getTime();

    const tagMap = new Map<string, StatAccum>();
    const catMap = new Map<string, StatAccum>();
    const untagged = makeAccum();
    let totalSec = 0;
    let finishedCount = 0;

    for (const activity of filteredActivities.value) {
      const durationSec = getDuration(activity.started_at, activity.finished_at) / 1000;
      if (durationSec <= 0) continue;

      totalSec += durationSec;
      if (activity.finished_at) finishedCount++;

      const startMs = new Date(activity.started_at).getTime();
      const bucketIdx = Math.min(SPARKLINE_BUCKETS - 1, Math.floor((startMs - fromMs) / bucketMs));

      // Category accumulation
      const catKey = activity.category_id ?? '__uncategorized__';
      if (!catMap.has(catKey)) catMap.set(catKey, makeAccum());
      const catEntry = catMap.get(catKey)!;
      catEntry.totalSeconds += durationSec;
      catEntry.sessionCount++;
      catEntry.buckets[bucketIdx]! += durationSec;

      // Tag accumulation
      const tags = (activity.tags as string[]) ?? [];
      const hasValidTags = tags.some((t) => t.trim());
      if (!hasValidTags) {
        untagged.totalSeconds += durationSec;
        untagged.sessionCount++;
        untagged.buckets[bucketIdx]! += durationSec;
      } else {
        for (const tag of tags) {
          if (!tag.trim()) continue;
          if (selectedTags.value.size > 0 && !selectedTags.value.has(tag)) continue;
          if (!tagMap.has(tag)) tagMap.set(tag, makeAccum());
          const entry = tagMap.get(tag)!;
          entry.totalSeconds += durationSec;
          entry.sessionCount++;
          entry.buckets[bucketIdx]! += durationSec;
        }
      }
    }

    return { tagMap, catMap, untagged, totalSec, finishedCount };
  });

  const tagStats = computed<TagStat[]>(() => {
    const { tagMap, totalSec } = statsCore.value;
    return Array.from(tagMap.entries())
      .map(([tag, data]) => {
        const avgSessionSeconds = data.sessionCount > 0 ? data.totalSeconds / data.sessionCount : 0;
        return {
          tag,
          totalSeconds: data.totalSeconds,
          sessionCount: data.sessionCount,
          avgSessionSeconds,
          percentage: totalSec > 0 ? (data.totalSeconds / totalSec) * 100 : 0,
          formattedTotal: formatTotalDuration(data.totalSeconds),
          formattedAvg: formatTotalDuration(avgSessionSeconds),
          sparklineSeconds: data.buckets,
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  const untaggedStats = computed(() => {
    const { untagged, totalSec } = statsCore.value;
    if (untagged.totalSeconds <= 0) return null;
    const avgSec = untagged.totalSeconds / untagged.sessionCount;
    return {
      tag: '__untagged__',
      totalSeconds: untagged.totalSeconds,
      sessionCount: untagged.sessionCount,
      avgSessionSeconds: avgSec,
      percentage: totalSec > 0 ? (untagged.totalSeconds / totalSec) * 100 : 0,
      formattedTotal: formatTotalDuration(untagged.totalSeconds),
      formattedAvg: formatTotalDuration(avgSec),
      sparklineSeconds: untagged.buckets,
    } satisfies TagStat;
  });

  const categoryStats = computed<CategoryStat[]>(() => {
    const { catMap, totalSec } = statsCore.value;
    const categoryMap = buildCategoryMap(categories.value);
    return Array.from(catMap.entries())
      .map(([key, data]) => {
        const cat = key !== '__uncategorized__' ? (categoryMap.get(key) ?? null) : null;
        const avgSessionSeconds = data.sessionCount > 0 ? data.totalSeconds / data.sessionCount : 0;
        return {
          categoryId: key === '__uncategorized__' ? null : key,
          name: cat?.name ?? '__uncategorized__',
          color: cat?.color ?? 'var(--color-muted-foreground)',
          totalSeconds: data.totalSeconds,
          sessionCount: data.sessionCount,
          avgSessionSeconds,
          percentage: totalSec > 0 ? (data.totalSeconds / totalSec) * 100 : 0,
          formattedTotal: formatTotalDuration(data.totalSeconds),
          formattedAvg: formatTotalDuration(avgSessionSeconds),
          sparklineSeconds: data.buckets,
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  const summaryStats = computed<SummaryStats>(() => {
    const { tagMap, catMap, totalSec, finishedCount } = statsCore.value;
    const sessions = filteredActivities.value.length;
    const avgSessionSeconds = finishedCount > 0 ? totalSec / finishedCount : 0;
    const uniqueTagCount = tagMap.size;
    const activeCategoryCount = [...catMap.keys()].filter((k) => k !== '__uncategorized__').length;
    return {
      totalSeconds: totalSec,
      formattedTotal: formatTotalDuration(totalSec),
      sessionCount: sessions,
      avgSessionSeconds,
      formattedAvg: formatTotalDuration(avgSessionSeconds),
      uniqueTagCount,
      activeCategoryCount,
    };
  });

  return {
    filteredActivities,
    allTags,
    tagStats,
    untaggedStats,
    categoryStats,
    summaryStats,
    dateRange,
  };
}
