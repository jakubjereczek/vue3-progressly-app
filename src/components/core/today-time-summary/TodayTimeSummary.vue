<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Card } from '@/components/ui/card';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { storeToRefs } from 'pinia';
import { Clock3, Loader2 } from 'lucide-vue-next';
import type { TableRow as ActivityType } from '@/api/supabase';
import { formatDuration, getDuration, getTodayDateString } from '@/utils/time';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { loading, activities } = storeToRefs(activitiesStore);

// todo: categories are not implemented yet
const MOCK_CATEGORIES = [
  { id: '0ec862e8-b478-4711-864a-2878b5faac93', name: 'Personal', color: '#388E3C' },
  { id: '5e219548-2cbd-498d-b96e-2c0da35ce60a', name: 'Projects', color: '#7B1FA2' },
  { id: '5ff2e7bc-82a9-4a3d-8a1c-9686155129f2', name: 'Work', color: '#D32F2F' },
];

function getMockCategory(categoryId: string | null) {
  return MOCK_CATEGORIES.find((c) => c.id === categoryId);
}

// todo: fetch current today activities per request
const todayActivities = computed(() => {
  const today = getTodayDateString();
  const activitiesList = (activities.value || []) as ActivityType<'activities'>[];

  return activitiesList.filter((activity) => {
    return activity.started_at && activity.started_at.startsWith(today);
  });
});

const categorySummary = computed(() => {
  const summary: Record<string, { duration: number; name: string; color: string }> = {};
  let totalDuration = 0;

  for (const activity of todayActivities.value) {
    const durationInSec = getDuration(activity.started_at, activity.finished_at) / 1000;
    if (durationInSec > 0) {
      const categoryId = activity.category_id || 'uncategorized';
      totalDuration += durationInSec;
      const category = getMockCategory(categoryId)!;

      if (!summary[categoryId]) {
        summary[categoryId] = {
          duration: 0,
          name: category.name,
          color: category.color,
        };
      }
      summary[categoryId].duration += durationInSec;
    }
  }

  const summaryArray = Object.values(summary).map((item) => ({
    ...item,
    percentage: totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0,
    formattedDuration: formatDuration(
      new Date(0, 0, 0, 0, 0, 0).toString(),
      new Date(0, 0, 0, 0, 0, item.duration).toString(),
    ),
  }));
  summaryArray.sort((a, b) => b.duration - a.duration);

  return {
    summary: summaryArray,
    totalDuration: formatDuration(
      new Date(0, 0, 0, 0, 0, 0).toString(),
      new Date(0, 0, 0, 0, 0, totalDuration).toString(),
    ),
    totalDurationSeconds: totalDuration,
  };
});

onMounted(async () => {
  // todo: revalidate key
  await activitiesStore.getActivities();
});
</script>

<template>
  <Card class="p-8 rounded-2xl border border-border/40 h-full">
    <h2 class="text-xl font-semibold mb-4">{{ t('dashboard.todaySummaryTitle') }}</h2>

    <div v-if="loading" class="flex justify-center items-center h-40">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="categorySummary.totalDurationSeconds === 0"
      class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed"
    >
      <Clock3 class="w-10 h-10 mx-auto text-gray-400" />
      <p class="text-lg font-medium">
        {{ t('dashboard.noTimeTrackedToday') }}
      </p>
    </div>

    <div v-else>
      <div class="mb-6">
        <p class="text-md font-semibold">
          {{ t('dashboard.totalTimeToday') }}
        </p>
        <p class="text-3xl font-medium text-indigo-400">
          {{ categorySummary.totalDuration }}
        </p>
      </div>

      <div class="mb-6">
        <h3 class="text-md font-semibold mb-3">
          {{ t('dashboard.timeDistribution') }}
        </h3>

        <div class="space-y-3">
          <div v-for="item in categorySummary.summary" :key="item.name" class="flex flex-col">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm font-medium flex items-center gap-2">
                <div :style="{ backgroundColor: item.color }" class="w-3 h-3 rounded-full"></div>
                {{ item.name }}
              </span>
              <span class="text-sm font-semibold text-gray-700">
                {{ item.formattedDuration }} ({{ item.percentage.toFixed(1) }}%)
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div
                class="h-2.5 rounded-full transition-all duration-500"
                :style="{ width: item.percentage + '%', backgroundColor: item.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
