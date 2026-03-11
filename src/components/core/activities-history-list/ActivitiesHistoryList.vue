<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { Card } from '@/components/ui/card';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useActivitiesTable } from '@/components/core/activities-history-list/useActivitiesTable';
import { useActivitiesTableColumns } from '@/components/core/activities-history-list/useActivitiesTableColumns';
import ActivitiesHistoryListTable from '@/components/core/activities-history-list/ActivitiesHistoryListTable.vue';
import ActivitiesHistoryListHeader from '@/components/core/activities-history-list/ActivitiesHistoryListHeader.vue';
import { useMonthNavigation } from '@/components/core/activities-history-list//useMonthNavigation';

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { loading, activities } = storeToRefs(activitiesStore);

const { currentMonth, changeMonth } = useMonthNavigation();
const { sortedActivities } = useActivitiesTable(activities);
const { columns, columnVisibility, visibleColumns, toggleColumnVisibility } = useActivitiesTableColumns();

function getMonthRange(yearMonth: string): { from: Date; to: Date } {
  const [year, month] = yearMonth.split('-').map(Number);
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

watch(currentMonth, (ym) => {
  const { from, to } = getMonthRange(ym);
  activitiesStore.getActivitiesInRange(from, to);
}, { immediate: true });

onMounted(() => categoriesStore.getCategories());
</script>

<template>
  <Card class="p-8 flex flex-col gap-4 rounded-2xl border border-border/40 h-full">
    <div class="w-full flex-shrink-0">
      <ActivitiesHistoryListHeader
        :current-month="currentMonth"
        :columns="columns"
        :column-visibility="columnVisibility"
        @toggle="(id) => toggleColumnVisibility(id)"
        @change-month="(direction) => changeMonth(direction)"
      />
    </div>
    <div class="flex-1 min-h-0 relative">
      <ActivitiesHistoryListTable
        :visible-columns="visibleColumns"
        :activities="sortedActivities"
        :loading="loading"
      />
    </div>
  </Card>
</template>
