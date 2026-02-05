import { computed, ref } from 'vue';
import { useTranslation } from '@/composables';
import { getColumnDefinitions } from '@/components/core/activities-history-list/config';

export function useActivitiesTableColumns() {
  const { t } = useTranslation();
  const columns = getColumnDefinitions(t);
  const columnVisibility = ref(
    columns.reduce(
      (acc, col) => {
        acc[col.id] = col.visible;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  function toggleColumnVisibility(id: string) {
    columnVisibility.value[id] = !columnVisibility.value[id];
  }

  const visibleColumns = computed(() => {
    return columns.filter((col) => columnVisibility.value[col.id]);
  });

  return {
    columns,
    columnVisibility,
    visibleColumns,
    toggleColumnVisibility,
  };
}
