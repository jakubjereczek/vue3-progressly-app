<script setup lang="ts">
import { ref, computed } from 'vue';
import { TrendingUp, TrendingDown, Minus, Flame, CheckCircle2, Zap, Award } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useGoalsStore } from '@/stores/goalsStore';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { formatDurationCompact } from '@/utils/time';
import { useGoalsAnalytics, type AnalyticsRange } from './useGoalsAnalytics';
import { getGoalFirstPeriodKey } from './useGoalDetail';
import { parseLocalDate } from '@/utils/date';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isGoalPeriodMet } from './useGoalProgress';

const { t } = useTranslation();

const { goals } = storeToRefs(useGoalsStore());
const { activities } = storeToRefs(useActivitiesStore());
const { categories } = storeToRefs(useCategoriesStore());

const range = ref<AnalyticsRange>('3m');
const RANGES: { value: AnalyticsRange; labelKey: string }[] = [
  { value: '1m', labelKey: 'app.module.goals.analytics.range.1m' },
  { value: '3m', labelKey: 'app.module.goals.analytics.range.3m' },
  { value: '6m', labelKey: 'app.module.goals.analytics.range.6m' },
  { value: '1y', labelKey: 'app.module.goals.analytics.range.1y' },
  { value: 'all', labelKey: 'app.module.goals.analytics.range.all' },
];

type GoalFilter = 'active' | 'ended' | 'all';
const props = defineProps<{ filter?: GoalFilter }>();

const { analytics: allAnalytics } = useGoalsAnalytics(goals, activities, range);

const analytics = computed(() => {
  const f = props.filter ?? 'active';
  if (f === 'active') return allAnalytics.value.filter((i) => i.status === 'active');
  if (f === 'ended') return allAnalytics.value.filter((i) => i.status === 'ended');
  return allAnalytics.value;
});

const summary = computed(() => {
  const data = analytics.value;
  return {
    total: data.length,
    onTrack: data.filter((d) => d.isOnTrack).length,
    avgRate: data.length ? Math.round(data.reduce((s, d) => s + d.completionRate, 0) / data.length) : 0,
    bestStreak: data.length ? Math.max(...data.map((d) => d.streak), 0) : 0,
  };
});

// Ring r=30, viewBox 72x72
const CIRC = +(2 * Math.PI * 30).toFixed(2);

function ringOffset(pct: number): number {
  return CIRC * (1 - Math.min(pct, 100) / 100);
}

function ringStroke(item: AnalyticsItem): string {
  if (item.currentPct >= 100) return 'var(--color-success)';
  if (item.isOnTrack) return 'var(--color-chart-3)';
  return item.goal.color;
}

function getCat(categoryId: string | null) {
  if (!categoryId) return null;
  return categories.value.find((c) => c.id === categoryId) ?? null;
}

function getPeriodLabel(item: AnalyticsItem): string {
  const g = item.goal;
  if (g.type === 'total') return t('app.module.goals.type.total');
  if (g.period === 'daily') return t('app.module.goals.period.daily');
  if (g.period === 'weekly') return t('app.module.goals.period.weekly');
  return t('app.module.goals.period.monthly');
}

type AnalyticsItem = (typeof analytics.value)[0];
type Bar = AnalyticsItem['bars'][0];

function isCount(item: AnalyticsItem): boolean {
  return item.goal.metric === 'count';
}

function getTarget(item: AnalyticsItem): number {
  return isCount(item) ? (item.goal.target_count ?? 0) : (item.goal.target_seconds ?? 0);
}

function barValue(bar: Bar, item: AnalyticsItem): number {
  return isCount(item) ? bar.count : bar.seconds;
}

function targetLinePct(item: AnalyticsItem): number {
  if (item.maxBarValue <= 0) return 0;
  return Math.min(97, (getTarget(item) / item.maxBarValue) * 100);
}

function barGradient(bar: Bar, item: AnalyticsItem): string {
  if (bar.isFuture) return 'var(--color-border)';
  const hit = isGoalPeriodMet(barValue(bar, item), getTarget(item), isCount(item));
  const base = hit ? 'var(--color-success)' : (bar.isCurrentPeriod ? item.goal.color : item.goal.color + '88');
  if (bar.isFuture) return base;
  const fade = hit ? '28' : '12';
  if (base.startsWith('var(')) return base;
  return `linear-gradient(to top, ${base}${fade}, ${base})`;
}

function fmtCurrent(item: AnalyticsItem): string {
  return isCount(item) ? String(item.currentCount) : formatDurationCompact(item.currentSeconds);
}

function fmtTarget(item: AnalyticsItem): string {
  return isCount(item) ? String(item.goal.target_count ?? 0) : formatDurationCompact(item.goal.target_seconds ?? 0);
}

function fmtBest(item: AnalyticsItem): string {
  return isCount(item) ? String(item.bestCount) : formatDurationCompact(item.bestSeconds);
}

function fmtAvg(item: AnalyticsItem): string {
  return isCount(item) ? String(item.avgCount) : formatDurationCompact(item.avgSeconds);
}

function targetUnit(item: AnalyticsItem): string {
  return isCount(item) ? t('app.module.goals.form.activities') : '';
}

function barDateRange(bar: Bar, goal: AnalyticsItem['goal']): string {
  const d = parseLocalDate(bar.key);
  if (goal.period === 'daily') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (goal.period === 'weekly' || goal.type === 'total') {
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(d)} – ${fmt(end)}`;
  }
  if (goal.period === 'monthly') {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return bar.key;
}

function barValueFmt(bar: Bar, item: AnalyticsItem): string {
  return isCount(item) ? String(bar.count) : formatDurationCompact(bar.seconds);
}

function barPct(bar: Bar, item: AnalyticsItem): number {
  const target = getTarget(item);
  if (target <= 0) return 0;
  return Math.min(100, Math.round((barValue(bar, item) / target) * 100));
}

function barStatusKey(bar: Bar, item: AnalyticsItem): string {
  if (bar.isFuture) return 'app.module.goals.analytics.tooltip.future';
  if (bar.isCurrentPeriod) return 'app.module.goals.analytics.tooltip.in_progress';
  if (isGoalPeriodMet(barValue(bar, item), getTarget(item), isCount(item))) return 'app.module.goals.analytics.tooltip.completed';
  return 'app.module.goals.analytics.tooltip.missed';
}

function barStatusColor(bar: Bar, item: AnalyticsItem): string {
  if (bar.isFuture) return 'var(--color-muted-foreground)';
  if (bar.isCurrentPeriod) return item.goal.color;
  if (isGoalPeriodMet(barValue(bar, item), getTarget(item), isCount(item))) return 'var(--color-success)';
  return 'var(--color-muted-foreground)';
}

// Consistency dots — last 16 non-future bars, only from goal start onward
function getConsistencyDots(item: AnalyticsItem): Bar[] {
  const firstKey = getGoalFirstPeriodKey(item.goal);
  return item.bars.filter((b) => !b.isFuture && b.key >= firstKey).slice(-16);
}

function dotStyle(bar: Bar, item: AnalyticsItem): Record<string, string> {
  if (bar.isCurrentPeriod) {
    return {
      backgroundColor: item.goal.color + '33',
      border: `2px solid ${item.goal.color}`,
      boxShadow: `0 0 5px ${item.goal.color}66`,
    };
  }
  const hit = isGoalPeriodMet(barValue(bar, item), getTarget(item), isCount(item));
  const partial = !hit && barValue(bar, item) > 0;
  if (hit) return { backgroundColor: 'var(--color-success)', opacity: '0.9' };
  if (partial) return { backgroundColor: item.goal.color, opacity: '0.4' };
  return { backgroundColor: 'var(--color-muted)', opacity: '0.4' };
}

// Insight
type InsightType = 'completed' | 'streak' | 'on_track' | 'behind' | 'great_consistency';
interface Insight {
  type: InsightType;
  value?: number;
}

function getInsight(item: AnalyticsItem): Insight | null {
  if (item.status !== 'active') return null;
  if (item.currentPct >= 100) return { type: 'completed' };
  if (item.streak >= 2) return { type: 'streak', value: item.streak };
  if (item.completionRate >= 70 && item.streak < 2) return { type: 'great_consistency', value: item.completionRate };
  if (item.isOnTrack && item.expectedPct > 0) return { type: 'on_track', value: item.expectedPct };
  if (!item.isOnTrack && item.expectedPct > 5) return { type: 'behind', value: item.expectedPct - item.currentPct };
  return null;
}

function insightText(insight: Insight): string {
  switch (insight.type) {
    case 'completed': return t('app.module.goals.analytics.insight.completed');
    case 'streak': return t('app.module.goals.analytics.insight.streak', { n: insight.value });
    case 'on_track': return t('app.module.goals.analytics.insight.on_track', { n: insight.value });
    case 'behind': return t('app.module.goals.analytics.insight.behind', { n: insight.value });
    case 'great_consistency': return t('app.module.goals.analytics.insight.great_consistency', { n: insight.value });
  }
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
  <div class="flex flex-col gap-6">

    <!-- Empty: no goals at all -->
    <div
      v-if="allAnalytics.length === 0"
      class="flex flex-col items-center justify-center py-24 text-center gap-2"
    >
      <p class="text-muted-foreground text-sm">{{ t('app.module.goals.analytics.empty') }}</p>
    </div>

    <template v-else>
      <!-- Top bar: summary + range selector -->
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <!-- Summary stats (only when multiple goals) -->
        <div v-if="analytics.length >= 2" class="flex items-center gap-4">
          <div class="flex flex-col">
            <span class="text-sm font-semibold tabular-nums">{{ summary.total }}</span>
            <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.analytics.summary.goals') }}</span>
          </div>
          <div class="w-px h-8 bg-border/40" />
          <div class="flex flex-col">
            <span
              class="text-sm font-semibold tabular-nums"
              :style="{ color: summary.avgRate >= 70 ? 'var(--color-success)' : summary.avgRate >= 40 ? 'var(--color-chart-3)' : undefined }"
            >{{ summary.avgRate }}%</span>
            <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.analytics.summary.avg') }}</span>
          </div>
          <div class="w-px h-8 bg-border/40" />
          <div class="flex flex-col">
            <span class="text-sm font-semibold tabular-nums">
              <span :style="{ color: summary.onTrack === summary.total && summary.total > 0 ? 'var(--color-success)' : undefined }">{{ summary.onTrack }}</span>
              <span class="text-muted-foreground font-normal text-xs">/{{ summary.total }}</span>
            </span>
            <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.analytics.summary.on_track_of') }}</span>
          </div>
          <div class="w-px h-8 bg-border/40" />
          <div class="flex flex-col">
            <span class="text-sm font-semibold tabular-nums" :style="{ color: summary.bestStreak > 0 ? 'var(--color-chart-3)' : undefined }">{{ summary.bestStreak }}</span>
            <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.analytics.summary.best_streak') }}</span>
          </div>
        </div>
        <div v-else class="flex-1" />

        <!-- Range selector -->
        <div class="flex items-center gap-0.5 bg-muted/40 rounded-lg p-1 border border-border/40">
          <button
            v-for="r in RANGES"
            :key="r.value"
            class="text-xs px-3 py-1 rounded-md font-medium transition-all duration-200"
            :class="
              range === r.value
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="range = r.value"
          >
            {{ t(r.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Filtered empty -->
      <div
        v-if="analytics.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center gap-2"
      >
        <p class="text-muted-foreground text-sm">{{ t('app.module.goals.analytics.filtered_empty') }}</p>
      </div>

      <!-- Per-goal analytics cards -->
      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          v-for="item in analytics"
          :key="item.goal.id"
          class="bg-card border border-border/40 rounded-xl overflow-hidden flex flex-col"
        >
          <!-- Top color strip -->
          <div class="h-[3px] w-full flex-shrink-0" :style="{ backgroundColor: item.goal.color }" />

          <!-- Header: same structure as GoalsManagementCard -->
          <div class="px-5 pt-4 pb-0 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.goal.color }" />
                <p class="font-semibold text-sm leading-tight truncate">{{ item.goal.name }}</p>
              </div>
              <div class="flex items-center gap-1.5 mt-1 ml-4 flex-wrap">
                <span class="text-2xs text-muted-foreground">{{ getPeriodLabel(item) }}</span>
                <template v-if="getCat(item.goal.category_id)">
                  <span class="text-muted-foreground/30 text-2xs">·</span>
                  <span
                    class="inline-flex items-center gap-1 text-2xs"
                    :style="{ color: getCat(item.goal.category_id)!.color }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getCat(item.goal.category_id)!.color }" />
                    {{ getCat(item.goal.category_id)!.name }}
                  </span>
                </template>
              </div>
            </div>

            <!-- Trend + pace badges -->
            <div class="flex items-center gap-1.5 flex-shrink-0 mt-0.5 flex-wrap justify-end">
              <span class="inline-flex items-center gap-1 text-2xs font-medium px-2 py-1 rounded-md bg-muted/60 border border-border/30">
                <TrendingUp v-if="item.trend === 'up'" class="w-3 h-3" style="color: var(--color-success)" />
                <TrendingDown v-else-if="item.trend === 'down'" class="w-3 h-3" style="color: var(--color-destructive)" />
                <Minus v-else class="w-3 h-3 text-muted-foreground" />
                <span
                  :class="item.trend === 'stable' ? 'text-muted-foreground' : ''"
                  :style="{
                    color: item.trend === 'up' ? 'var(--color-success)' : item.trend === 'down' ? 'var(--color-destructive)' : undefined,
                  }"
                >
                  {{ item.trend === 'up' ? t('app.module.goals.analytics.trend.improving') : item.trend === 'down' ? t('app.module.goals.analytics.trend.declining') : t('app.module.goals.analytics.trend.stable') }}
                </span>
              </span>
              <span
                v-if="item.status === 'active'"
                class="text-2xs font-semibold px-2 py-1 rounded-md border"
                :style="item.isOnTrack
                  ? { color: 'var(--color-success)', borderColor: 'color-mix(in oklab, var(--color-success) 25%, transparent)', backgroundColor: 'color-mix(in oklab, var(--color-success) 8%, transparent)' }
                  : { color: 'var(--color-destructive)', borderColor: 'color-mix(in oklab, var(--color-destructive) 25%, transparent)', backgroundColor: 'color-mix(in oklab, var(--color-destructive) 8%, transparent)' }"
              >
                {{ item.isOnTrack ? t('app.module.goals.analytics.status.on_track') : t('app.module.goals.analytics.status.behind') }}
              </span>
            </div>
          </div>

          <!-- Progress area: large ring + stats -->
          <div class="px-5 pt-5 pb-4">
            <div class="flex items-start gap-4">

              <!-- Large ring with glow -->
              <div class="relative flex-shrink-0" style="width: 72px; height: 72px;">
                <svg class="w-full h-full" viewBox="0 0 72 72" fill="none">
                  <!-- Track -->
                  <circle cx="36" cy="36" r="30" stroke="var(--color-muted)" stroke-width="5" />
                  <!-- Progress arc -->
                  <circle
                    cx="36" cy="36" r="30"
                    :stroke="ringStroke(item)"
                    stroke-width="5"
                    stroke-linecap="round"
                    :stroke-dasharray="CIRC"
                    :stroke-dashoffset="ringOffset(item.currentPct)"
                    transform="rotate(-90 36 36)"
                    class="transition-all duration-700 ease-out"
                    :style="{ filter: `drop-shadow(0 0 5px ${ringStroke(item)})` }"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-0">
                  <span
                    class="text-[13px] font-semibold tabular-nums leading-none"
                    :style="{ color: ringStroke(item) }"
                  >{{ item.currentPct }}%</span>
                  <span class="text-2xs text-muted-foreground/50 mt-0.5 uppercase tracking-wide">{{ t('app.module.goals.type.per_period') }}</span>
                </div>
              </div>

              <!-- Stats -->
              <div class="flex-1 min-w-0 flex flex-col gap-3">
                <!-- Current / Target headline -->
                <div>
                  <p class="text-2xs text-muted-foreground mb-0.5">{{ t('app.module.goals.analytics.current') }}</p>
                  <p class="text-base font-semibold tabular-nums leading-none" :style="{ color: ringStroke(item) }">
                    {{ fmtCurrent(item) }}
                    <span class="text-sm font-normal text-muted-foreground"> / {{ fmtTarget(item) }}{{ targetUnit(item) ? ' ' + targetUnit(item) : '' }}</span>
                  </p>
                </div>

                <!-- Stats row: rate + streak -->
                <div class="grid grid-cols-2 gap-x-5 gap-y-1">
                  <div>
                    <p class="text-2xs text-muted-foreground mb-0.5">{{ t('app.module.goals.analytics.rate') }}</p>
                    <p class="text-sm font-semibold tabular-nums leading-none">
                      {{ item.completionRate }}<span class="text-xs font-normal text-muted-foreground">%</span>
                      <span class="text-2xs font-normal text-muted-foreground ml-1">({{ item.completedPeriods }}/{{ item.totalPeriods }})</span>
                    </p>
                  </div>
                  <div>
                    <p class="text-2xs text-muted-foreground mb-0.5">{{ t('app.module.goals.analytics.streak') }}</p>
                    <p class="text-sm font-semibold tabular-nums leading-none" :style="{ color: item.streak > 0 ? item.goal.color : undefined }">
                      {{ item.streak }}
                      <span class="text-2xs font-normal text-muted-foreground ml-0.5">{{ t('app.module.goals.analytics.periods') }}</span>
                    </p>
                  </div>
                </div>

                <!-- Progress bar with glow + expected marker -->
                <div>
                  <div class="relative">
                    <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{
                          width: item.currentPct + '%',
                          backgroundColor: ringStroke(item),
                          boxShadow: `0 0 6px ${ringStroke(item)}99`,
                        }"
                      />
                    </div>
                    <div
                      v-if="item.status === 'active' && item.expectedPct > 0"
                      class="absolute top-0 w-[2px] h-1.5 rounded-full bg-foreground/30"
                      :style="{ left: `calc(${Math.min(item.expectedPct, 99)}% - 1px)` }"
                    />
                  </div>
                  <p v-if="item.status === 'active' && item.expectedPct > 0" class="text-2xs text-muted-foreground/60 mt-1">
                    {{ item.expectedPct }}% {{ t('app.module.goals.analytics.of_period_elapsed') }}
                    <span class="mx-1 opacity-30">·</span>
                    <span
                      class="font-medium"
                      :style="{ color: item.isOnTrack ? 'var(--color-success)' : 'var(--color-destructive)' }"
                    >{{ item.isOnTrack ? t('app.module.goals.analytics.pace.on_track') : t('app.module.goals.analytics.pace.behind') }}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Consistency dots row -->
            <div class="mt-4 pt-3.5 border-t border-border/20">
              <p class="text-2xs text-muted-foreground/50 uppercase tracking-widest mb-2">{{ t('app.module.goals.analytics.consistency') }}</p>
              <div class="flex items-center gap-1 flex-wrap">
                <Tooltip v-for="dot in getConsistencyDots(item)" :key="dot.key">
                  <TooltipTrigger as-child>
                    <div
                      class="w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-default hover:scale-125"
                      :style="dotStyle(dot, item)"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    :hide-arrow="true"
                    class="bg-card border border-border shadow-lg p-2.5 rounded-lg min-w-[120px]"
                  >
                    <p class="text-2xs font-semibold">{{ dot.label }}</p>
                    <p class="text-2xs text-muted-foreground mt-0.5 tabular-nums">{{ barValueFmt(dot, item) }} / {{ fmtTarget(item) }}</p>
                    <p
                      class="text-2xs font-medium mt-0.5"
                      :style="{ color: barStatusColor(dot, item) }"
                    >{{ t(barStatusKey(dot, item)) }}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <!-- Contextual insight banner -->
          <div
            v-if="getInsight(item)"
            class="mx-5 mb-4 px-3 py-3 rounded-lg flex items-center gap-2.5 text-2xs font-medium"
            :style="{
              backgroundColor: `${item.goal.color}0e`,
              border: `1px solid ${item.goal.color}28`,
            }"
          >
            <Flame
              v-if="getInsight(item)!.type === 'streak'"
              class="w-3.5 h-3.5 flex-shrink-0"
              :style="{ color: item.goal.color }"
            />
            <CheckCircle2
              v-else-if="getInsight(item)!.type === 'completed'"
              class="w-3.5 h-3.5 flex-shrink-0"
              style="color: var(--color-success)"
            />
            <Award
              v-else-if="getInsight(item)!.type === 'great_consistency'"
              class="w-3.5 h-3.5 flex-shrink-0"
              style="color: var(--color-chart-3)"
            />
            <TrendingUp
              v-else-if="getInsight(item)!.type === 'on_track'"
              class="w-3.5 h-3.5 flex-shrink-0"
              style="color: var(--color-chart-3)"
            />
            <Zap
              v-else
              class="w-3.5 h-3.5 flex-shrink-0"
              style="color: var(--color-warning)"
            />
            <span class="text-foreground/75">{{ insightText(getInsight(item)!) }}</span>
          </div>

          <!-- Bar chart -->
          <div class="px-5 pb-4 border-t border-border/20 pt-3.5">
            <div class="relative h-24">
              <!-- Target dashed line -->
              <div
                v-if="targetLinePct(item) > 0"
                class="absolute left-0 right-0 pointer-events-none z-10"
                :style="{ bottom: targetLinePct(item) + '%' }"
              >
                <div
                  class="w-full h-px opacity-40"
                  :style="{
                    background: `repeating-linear-gradient(90deg, ${item.goal.color} 0, ${item.goal.color} 4px, transparent 4px, transparent 8px)`,
                  }"
                />
              </div>

              <!-- Bars -->
              <div class="absolute inset-0 flex items-end gap-[2px]">
                <Tooltip v-for="bar in item.bars" :key="bar.key">
                  <TooltipTrigger as-child>
                    <div
                      class="flex-1 rounded-t-[3px] transition-all duration-300 cursor-default hover:brightness-110"
                      :style="{
                        minHeight: '2px',
                        height: item.maxBarValue > 0
                          ? Math.max((barValue(bar, item) / item.maxBarValue) * 100, barValue(bar, item) > 0 ? 4 : 0) + '%'
                          : '2px',
                        background: barGradient(bar, item),
                        opacity: bar.isFuture ? 0.2 : 1,
                        outline: bar.isCurrentPeriod && !bar.isFuture ? `1.5px solid ${item.goal.color}` : undefined,
                        outlineOffset: '0px',
                      }"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    :hide-arrow="true"
                    class="bg-card text-card-foreground border border-border shadow-xl p-0 min-w-[160px] rounded-lg overflow-hidden"
                  >
                    <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-3">
                      <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: item.goal.color }" />
                        <span class="font-semibold text-2xs leading-tight">{{ bar.label }}</span>
                      </div>
                      <span class="text-2xs text-muted-foreground leading-tight">{{ barDateRange(bar, item.goal) }}</span>
                    </div>
                    <div class="px-3 py-2 flex flex-col gap-1.5">
                      <div class="flex items-baseline justify-between gap-3">
                        <span class="text-2xs text-muted-foreground">{{ t('app.module.goals.analytics.tooltip.value') }}</span>
                        <span class="text-xs font-semibold tabular-nums">
                          {{ barValueFmt(bar, item) }}
                          <span class="text-2xs font-normal text-muted-foreground"> / {{ fmtTarget(item) }}{{ targetUnit(item) ? ' ' + targetUnit(item) : '' }}</span>
                        </span>
                      </div>
                      <div v-if="!bar.isFuture && getTarget(item) > 0" class="flex items-baseline justify-between gap-3">
                        <span class="text-2xs text-muted-foreground">{{ t('app.module.goals.analytics.tooltip.progress') }}</span>
                        <span class="text-xs font-semibold tabular-nums">{{ barPct(bar, item) }}%</span>
                      </div>
                      <div class="flex items-center justify-between gap-3 pt-0.5 border-t border-border/30">
                        <span class="text-2xs text-muted-foreground">{{ t('app.module.goals.analytics.tooltip.status') }}</span>
                        <span
                          class="text-2xs font-semibold"
                          :style="{ color: barStatusColor(bar, item) }"
                        >{{ t(barStatusKey(bar, item)) }}</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <!-- X-axis labels -->
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-2xs text-muted-foreground/40 tabular-nums">{{ item.bars[0]?.label }}</span>
              <span class="text-2xs font-medium tabular-nums" :style="{ color: item.goal.color + 'aa' }">▸ {{ t('app.module.goals.analytics.now') }}</span>
              <span class="text-2xs text-muted-foreground/40 tabular-nums">{{ item.bars[item.bars.length - 1]?.label }}</span>
            </div>
          </div>

          <!-- Stats footer -->
          <div class="grid grid-cols-4 border-t border-border/30 mt-auto">
            <div class="p-3 flex flex-col items-center gap-0.5 border-r border-border/20">
              <span
                class="text-xs font-semibold tabular-nums"
                :style="{ color: item.streak > 0 ? item.goal.color : undefined }"
              >{{ item.streak }}</span>
              <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.analytics.streak') }}</span>
            </div>
            <div class="p-3 flex flex-col items-center gap-0.5 border-r border-border/20">
              <span class="text-xs font-semibold tabular-nums">{{ fmtBest(item) }}</span>
              <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.detail.best') }}</span>
            </div>
            <div class="p-3 flex flex-col items-center gap-0.5 border-r border-border/20">
              <span class="text-xs font-semibold tabular-nums">{{ fmtAvg(item) }}</span>
              <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.detail.avg') }}</span>
            </div>
            <div class="p-3 flex flex-col items-center gap-0.5">
              <span class="text-xs font-semibold tabular-nums">{{ item.daysRemaining ?? '∞' }}</span>
              <span class="text-2xs text-muted-foreground uppercase tracking-wide">{{ t('app.module.goals.detail.days_remaining') }}</span>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
  </TooltipProvider>
</template>
