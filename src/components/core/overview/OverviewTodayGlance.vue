<script setup lang="ts">
import { computed } from 'vue';
import { Flame, TrendingUp, TrendingDown, Activity } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useTranslation, useLocale } from '@/composables';
import { useOverviewData } from './useOverviewData';
import type { OverviewRange } from '@/stores/overviewStore';
import { cn } from '@/lib/utils';
import CommonHeader from '@/components/CommonHeader.vue';
import CommonLabel from '@/components/CommonLabel.vue';

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
  <Card
    class="p-6 rounded-2xl border border-border/40 flex flex-col gap-6 shadow-sm h-full bg-card/60 backdrop-blur-md relative overflow-hidden"
  >
    <div class="flex items-center justify-between gap-4 flex-shrink-0">
      <CommonHeader :title="t('app.module.overview.today_glance.title')" :desc="rangeDateLabel" />

      <div class="flex items-center gap-0.5 bg-muted/50 rounded-xl p-1 border border-border/20 flex-shrink-0">
        <button
          v-for="opt in rangeOptions"
          :key="opt.value"
          class="text-[11px] px-3 py-1 rounded-lg font-bold transition-all duration-200"
          :class="
            selectedRange === opt.value
              ? 'bg-card text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          "
          @click="selectedRange = opt.value"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
    </div>

    <div
      class="flex flex-col gap-1 flex-shrink-0 transition-opacity duration-200"
      :class="{ 'opacity-40 w-full': loading }"
    >
      <CommonLabel :label="t('app.module.overview.today_glance.total_time')" />

      <div class="flex items-baseline gap-3">
        <p class="text-4xl font-black font-mono tabular-nums text-foreground tracking-tight leading-none">
          {{ rangeTotalFormatted }}
        </p>

        <span
          v-if="vsPercent !== null"
          :class="
            cn(
              'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border leading-none shrink-0 transition-all shadow-2xs',
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
        <span v-else class="text-2xs font-medium text-muted-foreground/40 leading-none">{{ vsLabel }}</span>
      </div>
    </div>

    <div
      class="grid grid-cols-3 bg-muted/30 rounded-xl border border-border/20 p-3 flex-shrink-0 transition-opacity duration-200"
      :class="{ 'opacity-40': loading }"
    >
      <div class="flex flex-col justify-between pr-2 border-r border-border/20">
        <div class="flex items-center gap-1 mb-2">
          <Flame
            class="w-3.5 h-3.5 shrink-0"
            :class="streakAtRisk ? 'text-amber-500 animate-pulse' : 'text-muted-foreground/70'"
          />
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.streak') }}
          </p>
        </div>
        <div class="flex items-baseline gap-0.5">
          <span
            class="text-xl font-black font-mono leading-none"
            :class="streakAtRisk ? 'text-amber-500' : 'text-foreground'"
          >
            {{ currentStreak }}
          </span>
          <span class="text-[10px] font-medium text-muted-foreground/50 tracking-tight">
            {{ t('app.module.overview.today_glance.streak_days') }}
          </span>
        </div>
      </div>

      <div class="flex flex-col justify-between px-3 border-r border-border/20">
        <div class="flex items-center gap-1 mb-2">
          <Activity class="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.sessions') }}
          </p>
        </div>
        <p class="text-xl font-black font-mono leading-none text-foreground">
          {{ rangeSessionCount }}
        </p>
      </div>

      <div class="flex flex-col justify-between pl-2 gap-2">
        <div class="flex flex-col gap-0.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
            {{ t('app.module.overview.today_glance.milestone') }}
          </p>
          <p v-if="nextMilestone" class="text-xl font-black font-mono leading-none text-foreground">
            {{ milestoneProgress }}<span class="text-xs font-semibold text-muted-foreground/40">%</span>
          </p>
          <p v-else class="text-xl font-black font-mono leading-none text-primary">Max</p>
        </div>

        <div class="flex flex-col gap-1 w-full mt-auto">
          <div class="h-1.5 rounded-full bg-muted overflow-hidden w-full relative">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              :class="streakAtRisk ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-primary'"
              :style="{ width: milestoneProgress + '%' }"
            />
          </div>

          <p v-if="nextMilestone" class="text-[9px] font-medium text-muted-foreground/50 truncate leading-none">
            {{ t('app.module.overview.today_glance.to_milestone', { days: nextMilestone }) }}
          </p>
          <p v-else class="text-[9px] text-primary font-bold tracking-tight leading-none">
            {{ t('app.module.overview.today_glance.max_streak_milestone') }}
          </p>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col gap-4 flex-1 min-h-[140px] transition-opacity duration-200"
      :class="{ 'opacity-40': loading }"
    >
      <div class="flex items-center justify-between shrink-0">
        <CommonLabel :label="chartLabel" />
      </div>

      <div class="flex items-end gap-1.5 flex-1 min-h-0 border-b border-border/20 pb-2 px-1">
        <div
          v-for="(bar, i) in rangeBarData"
          :key="i"
          class="flex-1 transition-all duration-500 min-h-0 relative group/bar flex items-end justify-center"
          :style="{
            height: '100%',
            opacity: bar.isFuture ? '0.15' : '1',
          }"
        >
          <div
            class="w-full rounded-t-[4px] transition-all duration-500 shadow-2xs"
            :class="[
              bar.isCurrent
                ? 'bg-primary'
                : 'bg-gradient-to-t from-primary/25 to-primary/40 group-hover/bar:from-primary/40 group-hover/bar:to-primary/60',
            ]"
            :style="{
              height: bar.seconds > 0 ? Math.max(6, (bar.seconds / maxBarSec) * 100) + '%' : '4px',
              borderRadius: bar.seconds > 0 ? '4px 4px 0 0' : '9999px', // Dot-style when empty
            }"
          />

          <div
            class="absolute bottom-full mb-1.5 opacity-0 group-hover/bar:opacity-100 bg-foreground text-background font-mono text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none transition-all scale-95 group-hover/bar:scale-100 z-30 shadow-md"
          >
            {{ bar.seconds > 0 ? Math.round(bar.seconds / 60) + 'm' : '0m' }}
          </div>
        </div>
      </div>

      <div class="flex-shrink-0">
        <div v-if="selectedRange === 'today'" class="flex justify-between px-1">
          <span
            v-for="h in [0, 6, 12, 18, 24]"
            :key="h"
            class="text-[10px] font-mono font-bold text-muted-foreground/40 tabular-nums leading-none"
          >
            {{ String(h).padStart(2, '0') }}
          </span>
        </div>
        <div v-else class="flex gap-1.5 px-1">
          <div v-for="(bar, i) in rangeBarData" :key="i" class="flex-1 text-center">
            <span
              class="text-2xs font-mono font-bold tracking-tight leading-none block uppercase"
              :class="bar.isCurrent ? 'text-primary font-black' : 'text-muted-foreground/30'"
            >
              {{ bar.label.substring(0, 2) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
