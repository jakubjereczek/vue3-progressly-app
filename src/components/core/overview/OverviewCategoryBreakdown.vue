<script setup lang="ts">
import { computed } from 'vue';
import { Layers, Clock } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/composables';
import { useOverviewData } from './useOverviewData';
import { formatTotalDuration, getDuration } from '@/utils/time';

const { t } = useTranslation();
const { weekActivities, categories, loading, weekTotalSeconds } = useOverviewData();

interface CategoryRow {
  id: string | null;
  name: string;
  color: string | null;
  seconds: number;
  percentage: number;
}

const breakdown = computed<CategoryRow[]>(() => {
  const map = new Map<string | null, number>();

  for (const activity of weekActivities.value) {
    if (!activity.finished_at) {
      continue;
    }
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
</script>

<template>
  <Card class="p-8 rounded-2xl border border-border/40 flex flex-col gap-6 shadow-none h-full">
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 class="text-xl font-semibold">{{ t('app.module.overview.category_breakdown.title') }}</h2>
        <p class="text-sm text-muted-foreground mt-0.5">{{ t('app.module.overview.category_breakdown.subtitle') }}</p>
      </div>
      <span v-if="weekTotalSeconds > 0" class="text-sm font-mono tabular-nums text-muted-foreground">
        {{ formatTotalDuration(weekTotalSeconds) }}
      </span>
      <Layers v-else class="w-4 h-4 text-muted-foreground/30" />
    </div>
    <div
      class="flex-1 min-h-0 border border-border/40 rounded-xl overflow-hidden transition-opacity duration-200"
      :class="{ 'opacity-50': loading }"
    >
      <div
        v-if="breakdown.length === 0 && !loading"
        class="flex flex-col items-center justify-center h-full py-8 gap-2 text-center"
      >
        <Clock class="w-7 h-7 text-muted-foreground/25" />
        <p class="text-sm text-muted-foreground">{{ t('app.module.overview.category_breakdown.empty') }}</p>
      </div>
      <div v-else class="flex flex-col gap-4 p-4 overflow-y-auto h-full">
        <div v-for="row in breakdown" :key="row.id ?? 'none'" class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: row.color ?? 'var(--color-muted-foreground)' }"
              />
              <span class="text-sm font-medium truncate">{{ row.name }}</span>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-xs font-mono tabular-nums font-semibold">
                {{ formatTotalDuration(row.seconds) }}
              </span>
              <span class="text-[11px] tabular-nums text-muted-foreground w-7 text-right"> {{ row.percentage }}% </span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :style="{
                width: row.percentage + '%',
                backgroundColor: row.color ?? 'var(--color-primary)',
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
