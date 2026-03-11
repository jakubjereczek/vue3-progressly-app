import { computed, type Ref } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';

export function useActivitiesTable(activities: Ref<ITableRow<'activities'>[]>) {
  const sortedActivities = computed(() =>
    activities.value
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );

  return { sortedActivities };
}
