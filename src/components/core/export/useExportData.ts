import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useCategoryName } from '@/composables';
import { getDuration, formatTotalDuration, localDateToString, MS_PER_DAY } from '@/utils/time';
import { parseLocalDate, parseLocalDateEnd, endOfDay, startOfDay } from '@/utils/date';
import type { TableRow } from '@/api/supabase';

export type ExportPreset = 'last7' | 'last30' | 'thisMonth' | 'last90' | 'thisYear' | 'allTime' | 'custom';

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

function getDateRange(
  preset: ExportPreset,
  customFrom?: string,
  customTo?: string,
): { from: Date | null; to: Date | null } {
  if (preset === 'allTime') {
    return { from: null, to: null };
  }

  if (preset === 'custom') {
    if (!customFrom || !customTo) return { from: null, to: null };
    const from = parseLocalDate(customFrom);
    const to = parseLocalDateEnd(customTo);
    return { from, to };
  }

  const to = endOfDay(new Date());
  const from = startOfDay(new Date());

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
  const { resolveCategoryName } = useCategoryName();

  const selectedPreset = ref<ExportPreset>('thisMonth');
  const selectedCategoryIds = ref<Set<string>>(new Set());

  // Custom range dates (YYYY-MM-DD strings)
  const today = localDateToString(new Date());
  const thirtyDaysAgo = localDateToString(new Date(Date.now() - 29 * MS_PER_DAY));
  const customFrom = ref<string>(thirtyDaysAgo);
  const customTo = ref<string>(today);

  const categoryMap = computed(() => {
    const map = new Map<string, string>();
    for (const cat of categories.value) {
      map.set(cat.id, resolveCategoryName(cat.name));
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

  const countByCategory = computed(() => {
    const map = new Map<string, number>();
    for (const a of allEnrichedActivities.value) {
      if (a.categoryId) map.set(a.categoryId, (map.get(a.categoryId) ?? 0) + 1);
    }
    return map;
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
    // For custom range, only fetch when both dates are set
    if (selectedPreset.value === 'custom' && (!customFrom.value || !customTo.value)) return;

    const { from, to } = getDateRange(selectedPreset.value, customFrom.value, customTo.value);
    await categoriesStore.getCategories();
    if (from === null) {
      await activitiesStore.getActivities();
    } else {
      await activitiesStore.getActivitiesInRange(from, to!);
    }
  }

  watch(selectedPreset, fetchData, { immediate: true });
  watch([customFrom, customTo], () => {
    if (selectedPreset.value === 'custom') fetchData();
  });

  return {
    selectedPreset,
    selectedCategoryIds,
    customFrom,
    customTo,
    toggleCategory,
    categories,
    loading,
    enrichedActivities,
    countByCategory,
    totalSeconds,
    uniqueCategoryCount,
  };
}
