import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TableRow } from '@/api/supabase';
import CategoriesService from '@/api/services/categoriesService';
import { getFriendlyErrorTranslationLabel } from '@/api/supabaseErrors';
import { useUserStore } from '@/stores';

export const useCategoriesStore = defineStore('categories', () => {
  const userStore = useUserStore();

  const categories = ref<TableRow<'categories'>[]>([]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | undefined>();
  const demoMode = ref(false);

  function updateLocal(updated: TableRow<'categories'>) {
    const idx = categories.value.findIndex((c) => c.id === updated.id);
    if (idx !== -1) categories.value[idx] = updated;
  }

  const privateCategories = computed(() => categories.value.filter((c) => c.user_id !== null));
  const publicCategories = computed(() => categories.value.filter((c) => c.user_id === null));
  // Excludes archived — mirrors the DB trigger's count used for plan limit enforcement
  const activePrivateCategories = computed(() =>
    categories.value.filter((c) => c.user_id !== null && c.archived_at === null),
  );
  const archivedCategories = computed(() =>
    categories.value.filter((c) => c.user_id !== null && c.archived_at !== null),
  );

  async function getCategories(): Promise<void> {
    if (demoMode.value) return;
    if (!userStore.user) return;
    loading.value = true;
    error.value = undefined;
    try {
      // Promise.allSettled: if one fetch fails, the other still populates the store.
      // Private categories failing is more critical but we still load what we can.
      const [privResult, pubResult] = await Promise.allSettled([
        CategoriesService.get({ user_id: userStore.user.id }),
        CategoriesService.get({ user_id: null }),
      ]);

      const priv = privResult.status === 'fulfilled' ? privResult.value : [];
      const pub = pubResult.status === 'fulfilled' ? pubResult.value : [];

      // Report whichever error occurred (prefer private failure as more impactful)
      if (privResult.status === 'rejected') {
        error.value = getFriendlyErrorTranslationLabel(privResult.reason);
      } else if (pubResult.status === 'rejected') {
        error.value = getFriendlyErrorTranslationLabel(pubResult.reason);
      }

      categories.value = [...priv, ...pub];
    } finally {
      loading.value = false;
    }
  }

  async function createCategory(name: string, color: string): Promise<{ success: boolean; limitReached?: boolean }> {
    if (!userStore.user) return { success: false };

    // Enforce plan limit client-side before hitting the API
    const limit = userStore.plan?.categoryLimit;
    if (limit != null && activePrivateCategories.value.length >= limit) {
      return { success: false, limitReached: true };
    }

    actionLoading.value = true;
    error.value = undefined;
    try {
      const created = await CategoriesService.insert({ name, color, user_id: userStore.user.id });
      categories.value = [...categories.value, created];
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function updateCategory(id: string, name: string, color: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      const updated = await CategoriesService.update({ name, color }, { id, user_id: userStore.user.id });
      updateLocal(updated);
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function archiveCategory(id: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      updateLocal(
        await CategoriesService.update({ archived_at: new Date().toISOString() }, { id, user_id: userStore.user.id }),
      );
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function unarchiveCategory(id: string): Promise<{ success: boolean; limitReached?: boolean }> {
    if (!userStore.user) return { success: false };

    // Restoring an archived category counts toward the active limit
    const limit = userStore.plan?.categoryLimit;
    if (limit != null && activePrivateCategories.value.length >= limit) {
      return { success: false, limitReached: true };
    }

    actionLoading.value = true;
    error.value = undefined;
    try {
      updateLocal(await CategoriesService.update({ archived_at: null }, { id, user_id: userStore.user.id }));
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function deleteCategory(id: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      await CategoriesService.delete({ id, user_id: userStore.user.id });
      categories.value = categories.value.filter((c) => c.id !== id);
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  return {
    categories,
    loading,
    actionLoading,
    error,
    demoMode,
    privateCategories,
    activePrivateCategories,
    archivedCategories,
    publicCategories,
    getCategories,
    createCategory,
    updateCategory,
    archiveCategory,
    unarchiveCategory,
    deleteCategory,
  };
});
