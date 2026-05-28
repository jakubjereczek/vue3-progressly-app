import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableRow } from '@/api/supabase';
import { buildPeriodBars, getGoalFirstPeriodKey, type GoalPeriodBar } from './useGoalDetail';
import { getGoalStatus, getGoalTarget, isGoalPeriodMet, getGoalExpectedPct } from './useGoalProgress';
import { localDateToString, MS_PER_DAY } from '@/utils/time';
import { parseLocalDate } from '@/utils/date';

export type AnalyticsRange = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_PERIODS: Record<string, Record<Exclude<AnalyticsRange, 'all'>, number>> = {
  daily:   { '1m': 30, '3m': 90,  '6m': 180, '1y': 365 },
  weekly:  { '1m': 4,  '3m': 13,  '6m': 26,  '1y': 52  },
  monthly: { '1m': 1,  '3m': 3,   '6m': 6,   '1y': 12  },
};

// Returns null for 'all' (buildPeriodBars computes from goal.started_at)
// Returns undefined for 'total' type (uses its own logic)
function rangeToMaxPeriods(goal: TableRow<'goals'>, range: AnalyticsRange): number | null | undefined {
  if (goal.type === 'total') return undefined;
  if (range === 'all') return null;
  return RANGE_PERIODS[goal.period!]?.[range];
}

export interface GoalAnalyticsData {
  goal: TableRow<'goals'>;
  status: ReturnType<typeof getGoalStatus>;
  bars: GoalPeriodBar[];
  maxBarSeconds: number;
  maxBarValue: number; // seconds or count depending on metric
  currentSeconds: number;
  currentCount: number;
  currentPct: number;
  expectedPct: number;
  isOnTrack: boolean;
  streak: number;
  completedPeriods: number;
  totalPeriods: number;
  completionRate: number;
  bestSeconds: number;
  bestCount: number;
  avgSeconds: number;
  avgCount: number;
  trend: 'up' | 'down' | 'stable';
  daysRemaining: number | null;
}

export interface AnalyticsSummary {
  totalActive: number;
  onTrackCount: number;
  avgCompletionRate: number;
  bestStreak: number;
}


function computeStreak(bars: GoalPeriodBar[], goal: TableRow<'goals'>): number {
  const target = getGoalTarget(goal);
  const isCount = goal.metric === 'count';
  const pastBars = [...bars].filter((b) => !b.isFuture && !b.isCurrentPeriod).reverse();
  let streak = 0;
  for (const bar of pastBars) {
    if (isGoalPeriodMet(isCount ? bar.count : bar.seconds, target, isCount)) streak++;
    else break;
  }
  return streak;
}

function computeTrend(bars: GoalPeriodBar[], isCount: boolean): 'up' | 'down' | 'stable' {
  const past = bars.filter((b) => !b.isFuture && !b.isCurrentPeriod);
  if (past.length < 4) return 'stable';
  const recent = past.slice(-3);
  const older = past.slice(-6, -3);
  if (older.length === 0) return 'stable';
  const val = (b: GoalPeriodBar) => (isCount ? b.count : b.seconds);
  const recentAvg = recent.reduce((s, b) => s + val(b), 0) / recent.length;
  const olderAvg = older.reduce((s, b) => s + val(b), 0) / older.length;
  if (olderAvg === 0) return recentAvg > 0 ? 'up' : 'stable';
  const ratio = recentAvg / olderAvg;
  if (ratio > 1.1) return 'up';
  if (ratio < 0.9) return 'down';
  return 'stable';
}

export function useGoalsAnalytics(
  goals: Ref<TableRow<'goals'>[]>,
  activities: Ref<TableRow<'activities'>[]>,
  range: Ref<AnalyticsRange> = ref('3m'),
  offset: Ref<number> = ref(0),
) {
  const { locale } = useI18n();
  const activeGoals = computed(() =>
    goals.value.filter((g) => !g.archived_at),
  );

  const analytics = computed<GoalAnalyticsData[]>(() =>
    activeGoals.value.map((goal) => {
      const isCount = goal.metric === 'count';
      const target = getGoalTarget(goal);
      const barVal = (b: GoalPeriodBar) => (isCount ? b.count : b.seconds);

      const firstPeriodKey = getGoalFirstPeriodKey(goal);
      const maxPeriods = rangeToMaxPeriods(goal, range.value);
      // All bars for the selected range (used for chart rendering)
      const bars = buildPeriodBars(goal, activities.value, maxPeriods, offset.value, locale.value);
      // Only bars from goal start onward (used for statistics)
      const goalBars = bars.filter((b) => b.key >= firstPeriodKey);
      const nonFutureBars = goalBars.filter((b) => !b.isFuture);
      const activeBars = nonFutureBars.filter((b) => barVal(b) > 0);
      const currentBar = bars.find((b) => b.isCurrentPeriod);

      const completedPeriods = nonFutureBars.filter(
        (b) => isGoalPeriodMet(barVal(b), target, isCount),
      ).length;
      const totalPeriods = nonFutureBars.length;
      const completionRate =
        totalPeriods > 0
          ? Math.round((completedPeriods / totalPeriods) * 100)
          : 0;

      const bestSeconds = activeBars.length
        ? Math.max(...activeBars.map((b) => b.seconds))
        : 0;
      const bestCount = activeBars.length
        ? Math.max(...activeBars.map((b) => b.count))
        : 0;
      const avgSeconds = activeBars.length
        ? Math.round(activeBars.reduce((s, b) => s + b.seconds, 0) / activeBars.length)
        : 0;
      const avgCount = activeBars.length
        ? Math.round(activeBars.reduce((s, b) => s + b.count, 0) / activeBars.length)
        : 0;

      const currentSeconds = goal.type === 'total'
        ? nonFutureBars.reduce((s, b) => s + b.seconds, 0)
        : (currentBar?.seconds ?? 0);
      const currentCount = goal.type === 'total'
        ? nonFutureBars.reduce((s, b) => s + b.count, 0)
        : (currentBar?.count ?? 0);
      const currentValue = isCount ? currentCount : currentSeconds;
      const currentPct =
        target > 0 ? Math.min(100, Math.round((currentValue / target) * 100)) : 0;
      const expectedPct = getGoalExpectedPct(goal);
      const status = getGoalStatus(goal);
      const isOnTrack = status === 'active' ? currentPct >= expectedPct : false;

      const maxBarSeconds = Math.max(...bars.map((b) => b.seconds), 1);
      const maxBarValue = Math.max(...bars.map((b) => barVal(b)), 1);
      const streak = computeStreak(goalBars, goal);
      const trend = computeTrend(goalBars, isCount);

      const todayLocal = localDateToString(new Date());
      const daysRemaining = goal.ended_at
        ? Math.max(0, Math.ceil((parseLocalDate(goal.ended_at).getTime() - parseLocalDate(todayLocal).getTime()) / MS_PER_DAY))
        : null;

      return {
        goal,
        status,
        bars,
        maxBarSeconds,
        maxBarValue,
        currentSeconds,
        currentCount,
        currentPct,
        expectedPct,
        isOnTrack,
        streak,
        completedPeriods,
        totalPeriods,
        completionRate,
        bestSeconds,
        bestCount,
        avgSeconds,
        avgCount,
        trend,
        daysRemaining,
      };
    }),
  );

  const summary = computed<AnalyticsSummary>(() => {
    const data = analytics.value;
    return {
      totalActive: data.length,
      onTrackCount: data.filter((d) => d.isOnTrack).length,
      avgCompletionRate: data.length
        ? Math.round(
            data.reduce((s, d) => s + d.completionRate, 0) / data.length,
          )
        : 0,
      bestStreak: data.length ? Math.max(...data.map((d) => d.streak), 0) : 0,
    };
  });

  return { analytics, summary };
}
