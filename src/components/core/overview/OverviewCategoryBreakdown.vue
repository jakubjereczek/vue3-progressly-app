<script setup lang="ts">
import { computed } from 'vue';
import { Layers } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/composables';
import { useOverviewData } from './useOverviewData';
import { formatTotalDuration, getDuration } from '@/utils/time';
import CommonHeader from '@/components/CommonHeader.vue';

const { t } = useTranslation();
const { rangeActivities, categories, loading, rangeTotalSeconds, selectedRange } = useOverviewData();

const rangeSubtitle = computed(() => {
  if (selectedRange.value === 'today') return t('app.module.overview.category_breakdown.subtitle_today');
  if (selectedRange.value === 'month') return t('app.module.overview.category_breakdown.subtitle_month');
  return t('app.module.overview.category_breakdown.subtitle');
});

const rangeEmpty = computed(() => {
  if (selectedRange.value === 'today') return t('app.module.overview.category_breakdown.empty_today');
  if (selectedRange.value === 'month') return t('app.module.overview.category_breakdown.empty_month');
  return t('app.module.overview.category_breakdown.empty');
});

interface CategoryRow {
  id: string | null;
  name: string;
  color: string | null;
  seconds: number;
  percentage: number;
}

const breakdown = computed<CategoryRow[]>(() => {
  const map = new Map<string | null, number>();
  for (const activity of rangeActivities.value) {
    if (!activity.finished_at) continue;
    const key = activity.category_id;
    map.set(key, (map.get(key) ?? 0) + getDuration(activity.started_at, activity.finished_at) / 1000);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(map.entries())
    .map(([id, seconds]) => {
      const category = id ? categories.value.find((c) => c.id === id) : null;
      return {
        id,
        name: category?.name ?? t('app.module.overview.category_breakdown.uncategorized'),
        color: category?.color ?? null,
        seconds,
        percentage: Math.round((seconds / total) * 100),
      };
    })
    .sort((a, b) => b.seconds - a.seconds);
});

const isEmpty = computed(() => breakdown.value.length === 0);

// Conic gradient for donut
const donutGradient = computed(() => {
  if (isEmpty.value) return 'var(--color-muted)';
  let angle = 0;
  const parts: string[] = [];
  const GAP = 2;
  for (let i = 0; i < breakdown.value.length; i++) {
    const row = breakdown.value[i]!;
    const color = row.color ?? 'var(--color-muted-foreground)';
    const sweep = (row.seconds / (rangeTotalSeconds.value || 1)) * 360;
    const startGap = i === 0 ? 0 : GAP / 2;
    const endGap = i === breakdown.value.length - 1 ? 0 : GAP / 2;
    const segStart = angle + startGap;
    const segEnd = angle + sweep - endGap;
    if (segStart < segEnd) {
      if (startGap > 0) parts.push(`transparent ${angle}deg ${segStart}deg`);
      parts.push(`${color} ${segStart}deg ${segEnd}deg`);
      if (endGap > 0) parts.push(`transparent ${segEnd}deg ${angle + sweep}deg`);
    } else {
      parts.push(`${color} ${angle}deg ${angle + sweep}deg`);
    }
    angle += sweep;
  }
  return `conic-gradient(from -90deg, ${parts.join(', ')})`;
});
</script>

<template>
  <Card class="p-6 rounded-2xl border border-border/40 flex flex-col gap-4 shadow-none">
    <!-- Header -->
    <div class="flex items-start justify-between flex-shrink-0">
      <CommonHeader :title="t('app.module.overview.category_breakdown.title')" :desc="rangeSubtitle" />
      <span v-if="rangeTotalSeconds > 0" class="text-xs font-mono tabular-nums text-muted-foreground">
        {{ formatTotalDuration(rangeTotalSeconds) }}
      </span>
      <Layers v-else class="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
    </div>

    <!-- Content -->
    <div class="transition-opacity duration-200" :class="{ 'opacity-50': loading }">
      <!-- Empty state -->
      <div v-if="isEmpty && !loading" class="flex flex-col items-center justify-center py-6 gap-2 text-center">
        <Layers class="w-6 h-6 text-muted-foreground/25" />
        <p class="text-xs text-muted-foreground">{{ rangeEmpty }}</p>
      </div>

      <!-- Donut left + legend right -->
      <div v-else class="flex items-center gap-4">
        <!-- Donut 108px -->
        <div class="relative w-[108px] h-[108px] flex-shrink-0">
          <div class="w-full h-full rounded-full transition-all duration-700" :style="{ background: donutGradient }" />
          <div class="absolute inset-[14px] rounded-full bg-card flex flex-col items-center justify-center">
            <span class="text-xs font-bold tabular-nums leading-none text-foreground">
              {{ formatTotalDuration(rangeTotalSeconds) }}
            </span>
            <span class="text-2xs text-muted-foreground/50 mt-0.5">
              {{ t('app.module.overview.category_breakdown.total') }}
            </span>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          <div v-for="row in breakdown" :key="row.id ?? 'none'" class="flex items-center gap-2 min-w-0">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: row.color ?? 'var(--color-muted-foreground)' }"
            />
            <span class="text-xs text-muted-foreground truncate flex-1 min-w-0">{{ row.name }}</span>
            <span class="text-xs font-mono tabular-nums font-medium text-foreground flex-shrink-0">
              {{ formatTotalDuration(row.seconds) }}
            </span>
            <span class="text-2xs tabular-nums text-muted-foreground/50 w-7 text-right flex-shrink-0">
              {{ row.percentage }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
