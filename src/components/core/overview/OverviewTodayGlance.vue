<script setup lang="ts">
import { computed } from 'vue';
import { Flame, TrendingUp, TrendingDown, Activity } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useTranslation, useLocale } from '@/composables';
import { useOverviewData } from './useOverviewData';
import type { OverviewRange } from '@/stores/overviewStore';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { locale } = useLocale();
const {
  loading,
  currentStreak,
  milestoneProgress,
  nextMilestone,
  streakAtRisk,
  selectedRange,
  rangeTotalFormatted,
  rangeSessionCount,
  vsPercent,
  rangeBarData,
} = useOverviewData();

const rangeOptions: { value: OverviewRange; labelKey: string }[] = [
  { value: 'today', labelKey: 'app.module.overview.range.today' },
  { value: 'week', labelKey: 'app.module.overview.range.week' },
  { value: 'month', labelKey: 'app.module.overview.range.month' },
];

const rangeDateLabel = computed(() => {
  if (selectedRange.value === 'today') {
    return new Date().toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (selectedRange.value === 'week') {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return `${start.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })}`;
  }
  return new Date().toLocaleDateString(locale.value, { month: 'long', year: 'numeric' });
});

const vsLabel = computed(() => {
  if (selectedRange.value === 'week') return t('app.module.overview.today_glance.vs_last_week');
  if (selectedRange.value === 'month') return t('app.module.overview.today_glance.vs_last_month');
  return t('app.module.overview.today_glance.vs_yesterday');
});

const chartLabel = computed(() =>
  selectedRange.value === 'today'
    ? t('app.module.overview.today_glance.timeline')
    : t('app.module.overview.today_glance.timeline_daily'),
);

const maxBarSec = computed(() => Math.max(1, ...rangeBarData.value.map((b) => b.seconds)));
</script>

<template>
  <Card class="p-5 rounded-2xl border border-border/40 flex flex-col gap-5 shadow-none h-full bg-card">
    <div class="flex items-center justify-between gap-4 flex-shrink-0">
      <p class="text-xs font-medium text-muted-foreground/70 capitalize tracking-tight">
        {{ rangeDateLabel }}
      </p>
      <div class="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1 border border-border/40 flex-shrink-0">
        <button
          v-for="opt in rangeOptions"
          :key="opt.value"
          class="text-xs px-3 py-1 rounded-lg font-semibold transition-all duration-150"
          :class="
            selectedRange === opt.value
              ? 'bg-card text-foreground shadow-sm border border-border/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          "
          @click="selectedRange = opt.value"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
    </div>

    <div
      class="flex flex-col gap-1.5 flex-shrink-0 transition-opacity duration-200"
      :class="{ 'opacity-40 w-full': loading }"
    >
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
        {{ t('app.module.overview.today_glance.total_time') }}
      </p>
      <div class="flex items-center gap-3">
        <p class="text-4xl font-extrabold font-mono tabular-nums text-foreground tracking-tight leading-none">
          {{ rangeTotalFormatted }}
        </p>

        <span
          v-if="vsPercent !== null"
          :class="
            cn(
              'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border leading-none shrink-0',
              vsPercent >= 0
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20',
            )
          "
        >
          <TrendingUp v-if="vsPercent >= 0" class="w-3 h-3 shrink-0" />
          <TrendingDown v-else class="w-3 h-3 shrink-0" />
          {{ vsPercent >= 0 ? '+' : '' }}{{ vsPercent.toFixed(0) }}%
        </span>
        <span v-else class="text-xs font-medium text-muted-foreground/40 leading-none">{{ vsLabel }}</span>
      </div>
    </div>

    <div
      class="grid grid-cols-3 divide-x divide-border/40 border-y border-border/40 py-4 flex-shrink-0 transition-opacity duration-200"
      :class="{ 'opacity-40': loading }"
    >
      <div class="flex flex-col justify-between pr-3 min-w-0">
        <div class="flex items-center gap-1.5 mb-1.5">
          <Flame
            class="w-3.5 h-3.5 shrink-0"
            :class="streakAtRisk ? 'text-amber-500 animate-pulse' : 'text-muted-foreground/60'"
          />
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.streak') }}
          </p>
        </div>
        <div class="flex flex-baseline items-baseline gap-1">
          <span
            class="text-2xl font-extrabold font-mono leading-none"
            :class="streakAtRisk ? 'text-amber-500' : 'text-foreground'"
          >
            {{ currentStreak }}
          </span>
          <span class="text-2xs font-medium text-muted-foreground/50 tracking-tight">
            {{ t('app.module.overview.today_glance.streak_days') }}
          </span>
        </div>
      </div>

      <div class="flex flex-col justify-between px-3 min-w-0">
        <div class="flex items-center gap-1.5 mb-1.5">
          <Activity class="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.sessions') }}
          </p>
        </div>
        <p class="text-2xl font-extrabold font-mono leading-none text-foreground">{{ rangeSessionCount }}</p>
      </div>

      <div class="flex flex-col justify-between pl-3 min-w-0 gap-2">
        <div class="flex flex-col gap-1">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.milestone') }}
          </p>
          <p v-if="nextMilestone" class="text-2xl font-extrabold font-mono leading-none text-foreground">
            {{ milestoneProgress }}<span class="text-sm font-semibold text-muted-foreground/50">%</span>
          </p>
          <p v-else class="text-2xl font-extrabold font-mono leading-none text-primary">Max</p>
        </div>

        <div class="flex flex-col gap-1.5 w-full mt-auto">
          <div class="h-1.5 rounded-full bg-muted overflow-hidden w-full border border-border/10">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="streakAtRisk ? 'bg-amber-500' : 'bg-primary'"
              :style="{ width: milestoneProgress + '%' }"
            />
          </div>

          <p v-if="nextMilestone" class="text-2xs font-medium text-muted-foreground/50 truncate leading-none">
            {{ t('app.module.overview.today_glance.to_milestone', { days: nextMilestone }) }}
          </p>
          <p v-else class="text-2xs text-primary font-bold tracking-tight leading-none">
            {{ t('app.module.overview.today_glance.max_streak_milestone') }}
          </p>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col gap-3 flex-1 min-h-[140px] transition-opacity duration-200"
      :class="{ 'opacity-40': loading }"
    >
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
        {{ chartLabel }}
      </p>

      <div class="flex items-end gap-1 flex-1 min-h-0 border-b border-border/30 pb-1">
        <div
          v-for="(bar, i) in rangeBarData"
          :key="i"
          class="flex-1 rounded-t-[3px] transition-all duration-500 min-h-0 relative group/bar"
          :style="{
            height: bar.seconds > 0 ? Math.max(4, (bar.seconds / maxBarSec) * 100) + '%' : '2px',
            backgroundColor: bar.isCurrent
              ? 'var(--color-primary)'
              : bar.seconds > 0
                ? 'color-mix(in oklab, var(--color-primary) 30%, var(--color-muted-foreground)/20%)'
                : 'var(--color-border)',
            opacity: bar.isFuture ? '0.15' : '1',
          }"
        >
          <div
            class="absolute inset-0 bg-foreground/5 opacity-0 group-hover/bar:opacity-100 rounded-t-[3px] transition-opacity"
          />
        </div>
      </div>

      <div class="flex-shrink-0 pt-0.5">
        <div v-if="selectedRange === 'today'" class="flex justify-between px-0.5">
          <span
            v-for="h in [0, 6, 12, 18, 24]"
            :key="h"
            class="text-2xs font-mono font-medium text-muted-foreground/40 tabular-nums leading-none"
          >
            {{ String(h).padStart(2, '0') }}
          </span>
        </div>
        <div v-else class="flex gap-1">
          <div v-for="(bar, i) in rangeBarData" :key="i" class="flex-1 text-center">
            <span
              class="text-2xs font-mono font-bold tracking-tight leading-none block"
              :class="bar.isCurrent ? 'text-primary' : 'text-muted-foreground/40'"
            >
              {{ bar.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
