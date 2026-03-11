import { onMounted } from 'vue';
import { useActivitiesStore, useCategoriesStore } from '@/stores';

export function useInitializeStores() {
  const activitiesStore = useActivitiesStore();
  const categoriesStore = useCategoriesStore();

  onMounted(async () => {
    await Promise.all([activitiesStore.getActivities(), categoriesStore.getCategories()]);
  });

  return { activitiesStore, categoriesStore };
}
