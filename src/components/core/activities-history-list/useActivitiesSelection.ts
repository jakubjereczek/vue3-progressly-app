import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import type { TableRow } from '@/api/supabase';

export function useActivitiesSelection(activities: Ref<TableRow<'activities'>[]>) {
  const selectedIds = ref<Set<string>>(new Set());

  watch(activities, () => {
    selectedIds.value = new Set();
  });

  function toggleOne(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function togglePage(pageIds: string[]) {
    const allSelected = pageIds.every((id) => selectedIds.value.has(id));
    const next = new Set(selectedIds.value);
    if (allSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    selectedIds.value = next;
  }

  function clear() {
    selectedIds.value = new Set();
  }

  const selectedCount = computed(() => selectedIds.value.size);
  const hasSelection = computed(() => selectedIds.value.size > 0);

  return { selectedIds, selectedCount, hasSelection, toggleOne, togglePage, clear };
}
