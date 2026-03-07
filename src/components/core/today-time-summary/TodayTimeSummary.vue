<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { storeToRefs } from 'pinia';
import { Clock3, Loader2, Hash, Hourglass, TrendingUp } from 'lucide-vue-next';
import type { TableRow as ActivityType } from '@/api/supabase';
import { formatTotalDuration, getDuration, getTodayDateString } from '@/utils/time';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { loading, activities } = storeToRefs(activitiesStore);

// todo: categories are not implemented yet
const MOCK_CATEGORIES = [
  { id: '0ec862e8-b478-4711-864a-2878b5faac93', name: 'Personal', color: '#388E3C' },
  { id: '5e219548-2cbd-498d-b96e-2c0da35ce60a', name: 'Projects', color: '#7B1FA2' },
  { id: '5ff2e7bc-82a9-4a3d-8a1c-9686155129f2', name: 'Work', color: '#D32F2F' },
];
function getMockCategory(categoryId: string | null): { name: string; color: string } {
  if (!categoryId) {
    return { name: t('app.module.activities_history.uncategorized'), color: 'var(--color-muted-foreground)' };
  }
  return (
    MOCK_CATEGORIES.find((c) => c.id === categoryId) ?? {
      name: t('app.module.activities_history.uncategorized'),
      color: 'var(--color-muted-foreground)',
    }
  );
}

// todo: fetch current today activities per request
const isInitialLoading = computed(() => loading.value && activities.value.length === 0);

const todayActivities = computed(() => {
  const today = getTodayDateString();
  const list = (activities.value || []) as unknown as ActivityType<'activities'>[];
  return list.filter((a) => a.started_at?.startsWith(today));
});

const sessionCount = computed(() => todayActivities.value.length);

const longestSessionSeconds = computed(() => {
  if (todayActivities.value.length === 0) return 0;
  return Math.max(...todayActivities.value.map((a) => getDuration(a.started_at, a.finished_at) / 1000));
});

const avgSessionSeconds = computed(() => {
  const finished = todayActivities.value.filter((a) => a.finished_at);
  if (finished.length === 0) return 0;
  const total = finished.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
  return Math.floor(total / finished.length);
});

const categorySummary = computed(() => {
  const summary: Record<string, { duration: number; name: string; color: string }> = {};
  let totalDuration = 0;

  for (const activity of todayActivities.value) {
    const durationInSec = getDuration(activity.started_at, activity.finished_at) / 1000;
    if (durationInSec > 0) {
      const categoryId = activity.category_id ?? 'uncategorized';
      totalDuration += durationInSec;
      const category = getMockCategory(activity.category_id);

      if (!summary[categoryId]) {
        summary[categoryId] = { duration: 0, name: category.name, color: category.color };
      }
      summary[categoryId].duration += durationInSec;
    }
  }

  const summaryArray = Object.values(summary).map((item) => ({
    ...item,
    percentage: totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0,
    formattedDuration: formatTotalDuration(item.duration),
  }));
  summaryArray.sort((a, b) => b.duration - a.duration);

  return {
    summary: summaryArray,
    totalDuration: formatTotalDuration(totalDuration),
    totalDurationSeconds: totalDuration,
  };
});

onMounted(async () => {
  await activitiesStore.getActivities();
});
</script>

<template>
  <Card class="p-8 rounded-2xl border-border/40 h-full flex flex-col shadow-none">
    <CardHeader class="flex flex-row items-center justify-between mb-6 flex-shrink-0 p-0 gap-0">
      <CardTitle class="text-xl">{{ t('app.module.overview.time_summary.title') }}</CardTitle>
      <Loader2 v-if="loading && !isInitialLoading" class="w-4 h-4 animate-spin text-muted-foreground" />
    </CardHeader>

    <div v-if="isInitialLoading" class="flex-1 flex justify-center items-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <ErrorMessage
      v-else-if="categorySummary.totalDurationSeconds === 0"
      :icon="Clock3"
      :title="t('app.module.overview.time_summary.no_time_tracked_today')"
    />

    <CardContent
      v-else
      class="p-0 flex flex-col gap-5 flex-1 min-h-0 overflow-auto transition-opacity duration-200"
      :class="{ 'opacity-50 pointer-events-none': loading }"
    >
      <div>
        <p class="text-sm text-muted-foreground mb-1.5">
          {{ t('app.module.overview.time_summary.total_time_today') }}
        </p>
        <p class="text-3xl font-semibold text-primary tabular-nums font-mono leading-none">
          {{ categorySummary.totalDuration }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5 rounded-lg border border-border/50 p-3">
          <div class="flex items-center gap-1.5">
            <Hash class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">
              {{ t('app.module.overview.time_summary.sessions') }}
            </p>
          </div>
          <p class="text-xl tabular-nums leading-none">{{ sessionCount }}</p>
        </div>
        <div class="flex flex-col gap-1.5 rounded-lg border border-border/50 p-3">
          <div class="flex items-center gap-1.5">
            <Hourglass class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">
              {{ t('app.module.overview.time_summary.longest') }}
            </p>
          </div>
          <p class="text-base tabular-nums font-mono leading-none">{{ formatTotalDuration(longestSessionSeconds) }}</p>
        </div>
        <div class="flex flex-col gap-1.5 rounded-lg border border-border/50 p-3">
          <div class="flex items-center gap-1.5">
            <TrendingUp class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p class="text-xs text-muted-foreground truncate">
              {{ t('app.module.overview.time_summary.avg_session') }}
            </p>
          </div>
          <p class="text-base tabular-nums font-mono leading-none">{{ formatTotalDuration(avgSessionSeconds) }}</p>
        </div>
      </div>

      <div>
        <p class="text-sm text-muted-foreground mb-3">
          {{ t('app.module.overview.time_summary.time_distribution') }}
        </p>
        <div class="space-y-3">
          <div v-for="item in categorySummary.summary" :key="item.name" class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center gap-2">
              <span class="text-sm flex items-center gap-2 min-w-0">
                <span :style="{ backgroundColor: item.color }" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                <span class="truncate">{{ item.name }}</span>
              </span>
              <span class="text-xs text-muted-foreground tabular-nums font-mono flex-shrink-0">
                {{ item.formattedDuration }} · {{ item.percentage.toFixed(0) }}%
              </span>
            </div>
            <div class="w-full bg-muted rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all duration-500"
                :style="{ width: item.percentage + '%', backgroundColor: item.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
