<template>
  <div class="flex flex-col gap-4 h-full">
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start flex-shrink-0">
      <div class="xl:col-span-3">
        <ActivityTracker />
      </div>
      <div class="xl:col-span-2">
        <OverviewTodayGlance />
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
      <div class="xl:col-span-3 h-full">
        <OverviewTodayActivities />
      </div>
      <div class="xl:col-span-2 flex flex-col gap-4 h-full">
        <OverviewCategoryBreakdown class="flex-shrink-0" />
        <div class="flex-1 min-h-0">
          <GoalsOverviewWidget />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ActivityTracker from '@/components/core/activity/ActivityTracker.vue';
import OverviewTodayGlance from '@/components/core/overview/OverviewTodayGlance.vue';
import OverviewCategoryBreakdown from '@/components/core/overview/OverviewCategoryBreakdown.vue';
import OverviewTodayActivities from '@/components/core/overview/OverviewTodayActivities.vue';
import GoalsOverviewWidget from '@/components/core/goals-management/GoalsOverviewWidget.vue';
import { useActivitiesStore, useCategoriesStore, useGoalsStore } from '@/stores';
import { getOverviewFetchRange } from '@/components/core/overview/useOverviewData';

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const goalsStore = useGoalsStore();

async function fetchData() {
  const { from, to } = getOverviewFetchRange();
  await Promise.all([
    activitiesStore.getActivitiesInRange(from, to),
    categoriesStore.getCategories(),
    goalsStore.getGoals(),
  ]);
}

onMounted(fetchData);
</script>
