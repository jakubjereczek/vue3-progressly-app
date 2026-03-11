<template>
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
      <div class="xl:col-span-3 h-full">
        <ActivityTracker />
      </div>
      <div class="xl:col-span-2 h-full">
        <OverviewTodayGlance />
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
      <div class="xl:col-span-3 h-full">
        <OverviewTodayActivities />
      </div>
      <div class="xl:col-span-2 h-full">
        <OverviewCategoryBreakdown />
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
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { getOverviewFetchRange } from '@/components/core/overview/useOverviewData';

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();

onMounted(async () => {
  const { from, to } = getOverviewFetchRange();
  await Promise.all([
    activitiesStore.getActivitiesInRange(from, to),
    categoriesStore.getCategories(),
  ]);
});
</script>
