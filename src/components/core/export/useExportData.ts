import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { getDuration, formatTotalDuration } from '@/utils/time';
import type { TableRow } from '@/api/supabase';

export type ExportPreset = 'last7' | 'last30' | 'thisMonth' | 'last90' | 'thisYear' | 'allTime';

export interface EnrichedActivity {
  id: string;
  started_at: string;
  finished_at: string;
  description: string;
  categoryName: string;
  categoryId: string | null;
  tags: string[];
  durationSeconds: number;
  durationFormatted: string;
}

function getDateRange(preset: ExportPreset): { from: Date | null; to: Date | null } {
  if (preset === 'allTime') {
    return { from: null, to: null };
  }

  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'last7':
      from.setDate(from.getDate() - 6);
      break;
    case 'last30':
      from.setDate(from.getDate() - 29);
      break;
    case 'thisMonth':
      from.setDate(1);
      break;
    case 'last90':
      from.setDate(from.getDate() - 89);
      break;
    case 'thisYear':
      from.setMonth(0, 1);
      break;
  }

  return { from, to };
}

export function useExportData() {
  const activitiesStore = useActivitiesStore();
  const categoriesStore = useCategoriesStore();
  const { activities, loading } = storeToRefs(activitiesStore);
  const { categories } = storeToRefs(categoriesStore);

  const selectedPreset = ref<ExportPreset>('thisMonth');
  const selectedCategoryIds = ref<Set<string>>(new Set());

  const categoryMap = computed(() => {
    const map = new Map<string, string>();
    for (const cat of categories.value) {
      map.set(cat.id, cat.name);
    }
    return map;
  });

  const allEnrichedActivities = computed<EnrichedActivity[]>(() => {
    return (activities.value as unknown as TableRow<'activities'>[])
      .filter((a): a is TableRow<'activities'> & { finished_at: string } => !!a.finished_at)
      .map((a) => {
        const durationSeconds = getDuration(a.started_at, a.finished_at) / 1000;
        return {
          id: a.id,
          started_at: a.started_at,
          finished_at: a.finished_at,
          description: a.description,
          categoryName: a.category_id ? (categoryMap.value.get(a.category_id) ?? '') : '',
          categoryId: a.category_id ?? null,
          tags: (a.tags as string[]) ?? [],
          durationSeconds,
          durationFormatted: formatTotalDuration(durationSeconds),
        };
      });
  });

  const enrichedActivities = computed<EnrichedActivity[]>(() => {
    if (selectedCategoryIds.value.size === 0) return allEnrichedActivities.value;
    return allEnrichedActivities.value.filter(
      (a) => a.categoryId !== null && selectedCategoryIds.value.has(a.categoryId),
    );
  });

  function toggleCategory(id: string) {
    const next = new Set(selectedCategoryIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedCategoryIds.value = next;
  }

  const totalSeconds = computed(() => enrichedActivities.value.reduce((sum, a) => sum + a.durationSeconds, 0));

  const uniqueCategoryCount = computed(
    () => new Set(enrichedActivities.value.map((a) => a.categoryName).filter(Boolean)).size,
  );

  async function fetchData() {
    const { from, to } = getDateRange(selectedPreset.value);
    await categoriesStore.getCategories();
    if (from === null) {
      await activitiesStore.getActivities();
    } else {
      await activitiesStore.getActivitiesInRange(from, to!);
    }
  }

  watch(selectedPreset, fetchData, { immediate: true });

  return {
    selectedPreset,
    selectedCategoryIds,
    toggleCategory,
    categories,
    loading,
    enrichedActivities,
    totalSeconds,
    uniqueCategoryCount,
  };
}
