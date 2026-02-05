import { computed, type Ref } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';

export function useActivitiesTable(activities: Ref<ITableRow<'activities'>[]>, currentMonth: Ref<string>) {
  const filteredActivities = computed(() =>
    activities.value.filter((a) => a.started_at?.startsWith(currentMonth.value)),
  );

  const sortedActivities = computed(() =>
    filteredActivities.value
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );

  return { sortedActivities };
}
