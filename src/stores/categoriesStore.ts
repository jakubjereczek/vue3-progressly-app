import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TableRow } from '@/api/supabase';
import CategoriesService from '@/api/services/categoriesService';
import { useUserStore } from '@/stores';

export const useCategoriesStore = defineStore('categories', () => {
  const userStore = useUserStore();

  const categories = ref<TableRow<'categories'>[]>([]);
  const loading = ref(false);

  const privateCategories = computed(() => categories.value.filter((c) => c.user_id !== null));
  const publicCategories = computed(() => categories.value.filter((c) => c.user_id === null));

  async function getCategories(): Promise<void> {
    if (!userStore.user) return;
    loading.value = true;
    try {
      const [priv, pub] = await Promise.all([
        CategoriesService.get({ user_id: userStore.user.id }),
        CategoriesService.get({ user_id: null }),
      ]);
      categories.value = [...priv, ...pub];
    } finally {
      loading.value = false;
    }
  }

  async function createCategory(name: string, color: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    try {
      const created = await CategoriesService.insert({
        name,
        color,
        user_id: userStore.user.id,
      });
      categories.value = [...categories.value, created];
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async function updateCategory(id: string, name: string, color: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    try {
      const updated = await CategoriesService.update({ name, color }, { id, user_id: userStore.user.id });
      const idx = categories.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        categories.value[idx] = updated;
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async function deleteCategory(id: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    try {
      await CategoriesService.delete({ id, user_id: userStore.user.id });
      categories.value = categories.value.filter((c) => c.id !== id);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  return {
    categories,
    loading,
    privateCategories,
    publicCategories,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
});
