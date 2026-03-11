<script setup lang="ts">
import { computed } from 'vue';
import { Flame, TrendingUp, TrendingDown, Hash } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useTranslation, useLocale } from '@/composables';
import { useOverviewData } from './useOverviewData';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { locale } = useLocale();
const {
  loading,
  todayTotalFormatted,
  todaySessionCount,
  currentStreak,
  vsYesterdayPercent,
  todayActivities,
  categories,
} = useOverviewData();

const SECONDS_IN_DAY = 86400;
const TIMELINE_TICKS = [0, 6, 12, 18, 24];

const todayDateLabel = computed(() =>
  new Date().toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }),
);

const todayTimeline = computed(() => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  return todayActivities.value
    .filter((a) => a.finished_at)
    .map((a) => {
      const cat = categories.value.find((c) => c.id === a.category_id);
      const startMs = new Date(a.started_at).getTime();
      const endMs = new Date(a.finished_at!).getTime();
      const secFromMidnight = (startMs - dayStartMs) / 1000;
      const durSec = Math.min((endMs - startMs) / 1000, SECONDS_IN_DAY - Math.max(0, secFromMidnight));
      return {
        id: a.id,
        left: Math.max(0, (secFromMidnight / SECONDS_IN_DAY) * 100),
        width: Math.max(0.5, (Math.max(0, durSec) / SECONDS_IN_DAY) * 100),
        color: cat?.color ?? null,
      };
    });
});
</script>

<template>
  <Card class="p-8 rounded-2xl border border-border/40 flex flex-col gap-6 shadow-none h-full">
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 class="text-xl font-semibold">{{ t('app.module.overview.today_glance.title') }}</h2>
        <p class="text-sm text-muted-foreground mt-0.5 capitalize">{{ todayDateLabel }}</p>
      </div>
      <p
        class="text-3xl font-bold font-mono tabular-nums text-primary leading-none transition-opacity duration-200"
        :class="{ 'opacity-40': loading }"
      >
        {{ todayTotalFormatted }}
      </p>
    </div>
    <div
      class="border border-border/40 rounded-xl overflow-hidden transition-opacity duration-200"
      :class="{ 'opacity-50': loading }"
    >
      <div class="grid grid-cols-3 divide-x divide-border/40">
        <div class="flex flex-col gap-1.5 p-4">
          <div class="flex items-center gap-1.5">
            <Hash class="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">{{ t('app.module.overview.today_glance.sessions') }}</p>
          </div>
          <p class="text-2xl font-bold tabular-nums leading-none">{{ todaySessionCount }}</p>
        </div>

        <div class="flex flex-col gap-1.5 p-4">
          <div class="flex items-center gap-1.5">
            <Flame class="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">{{ t('app.module.overview.today_glance.streak') }}</p>
          </div>
          <p class="text-2xl font-bold tabular-nums leading-none">
            {{ currentStreak }}
            <span class="text-xs text-muted-foreground font-normal ml-0.5">{{ t('app.module.overview.today_glance.streak_days') }}</span>
          </p>
        </div>

        <div class="flex flex-col gap-1.5 p-4">
          <div class="flex items-center gap-1.5">
            <TrendingUp v-if="vsYesterdayPercent === null || vsYesterdayPercent >= 0" class="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <TrendingDown v-else class="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">{{ t('app.module.overview.today_glance.vs_yesterday') }}</p>
          </div>
          <p v-if="vsYesterdayPercent === null" class="text-sm text-muted-foreground leading-none mt-1">—</p>
          <p
            v-else
            :class="cn('text-2xl font-bold tabular-nums leading-none', vsYesterdayPercent >= 0 ? 'text-success' : 'text-destructive')"
          >
            {{ vsYesterdayPercent >= 0 ? '+' : '' }}{{ vsYesterdayPercent.toFixed(0) }}%
          </p>
        </div>
      </div>
    </div>

    <div class="mt-auto border border-border/40 rounded-xl p-4">
      <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {{ t('app.module.overview.today_glance.timeline') }}
      </p>
      <div class="h-4 bg-muted/60 rounded overflow-hidden relative">
        <div
          v-for="item in todayTimeline"
          :key="item.id"
          class="absolute top-0 h-full opacity-80"
          :style="{
            left: item.left + '%',
            width: item.width + '%',
            backgroundColor: item.color ?? 'var(--color-primary)',
          }"
        />
      </div>
      <div class="flex justify-between mt-1.5">
        <span
          v-for="h in TIMELINE_TICKS"
          :key="h"
          class="text-[9px] text-muted-foreground/50 tabular-nums"
        >
          {{ String(h).padStart(2, '0') }}
        </span>
      </div>
    </div>

  </Card>
</template>
