import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables';
import { getColumnDefinitions } from '@/components/core/activities-history-list/config';

const STORAGE_KEY = 'progressly:column-visibility';

function loadSaved(defaults: Record<string, boolean>): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    // Merge: keep defaults for any new columns not in storage
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function useActivitiesTableColumns() {
  const { t } = useTranslation();
  const columns = getColumnDefinitions(t);

  const defaults = columns.reduce(
    (acc, col) => {
      acc[col.id] = col.visible;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const columnVisibility = ref<Record<string, boolean>>(loadSaved(defaults));

  watch(
    columnVisibility,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    },
    { deep: true },
  );

  function toggleColumnVisibility(id: string) {
    columnVisibility.value[id] = !columnVisibility.value[id];
  }

  const visibleColumns = computed(() => columns.filter((col) => columnVisibility.value[col.id]));

  return { columns, columnVisibility, visibleColumns, toggleColumnVisibility };
}
