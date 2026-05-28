import { computed, ref, type Ref } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';

export type SortableField = 'status' | 'description' | 'duration' | 'startedAt' | 'finishedAt';
export type SortDir = 'asc' | 'desc';

export function useActivitiesTable(activities: Ref<ITableRow<'activities'>[]>) {
  const sortField = ref<SortableField | null>(null);
  const sortDir = ref<SortDir>('asc');

  function toggleSort(field: SortableField) {
    if (sortField.value === field) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortField.value = field;
      sortDir.value = 'asc';
    }
  }

  const sortedActivities = computed(() => {
    const field = sortField.value;
    const dir = sortDir.value === 'asc' ? 1 : -1;

    return activities.value.slice().sort((a, b) => {
      if (!field) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (field) {
        case 'status':
          aVal = a.finished_at ? 1 : 0;
          bVal = b.finished_at ? 1 : 0;
          break;
        case 'description':
          aVal = (a.description ?? '').toLowerCase();
          bVal = (b.description ?? '').toLowerCase();
          break;
        case 'duration': {
          const getDur = (x: ITableRow<'activities'>) =>
            x.finished_at ? new Date(x.finished_at).getTime() - new Date(x.started_at).getTime() : 0;
          aVal = getDur(a);
          bVal = getDur(b);
          break;
        }
        case 'startedAt':
          aVal = new Date(a.started_at).getTime();
          bVal = new Date(b.started_at).getTime();
          break;
        case 'finishedAt':
          aVal = a.finished_at ? new Date(a.finished_at).getTime() : 0;
          bVal = b.finished_at ? new Date(b.finished_at).getTime() : 0;
          break;
      }

      if (aVal < bVal) {
        return -1 * dir;
      }
      if (aVal > bVal) {
        return 1 * dir;
      }
      return 0;
    });
  });

  return { sortedActivities, sortField, sortDir, toggleSort };
}
