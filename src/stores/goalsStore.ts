import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TableRow } from '@/api/supabase';
import GoalsService from '@/api/services/goalsService';
import type { TablesInsert } from '@/api/db-types';
import { getFriendlyErrorTranslationLabel } from '@/api/supabaseErrors';
import { useUserStore } from '@/stores';
import { localDateToString } from '@/utils/time';

export const useGoalsStore = defineStore('goals', () => {
  const userStore = useUserStore();

  const goals = ref<TableRow<'goals'>[]>([]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | undefined>();
  const demoMode = ref(false);

  const today = computed(() => localDateToString(new Date()));

  const activeGoals = computed(() => {
    const t = today.value;
    return goals.value.filter((g) => !g.archived_at && !(g.ended_at && g.ended_at < t));
  });

  const endedGoals = computed(() => {
    const t = today.value;
    return goals.value.filter((g) => !g.archived_at && !!g.ended_at && g.ended_at < t);
  });

  const archivedGoals = computed(() => goals.value.filter((g) => !!g.archived_at));

  async function getGoals(): Promise<void> {
    if (demoMode.value) return;
    if (!userStore.user) return;
    loading.value = true;
    error.value = undefined;
    try {
      goals.value = await GoalsService.get({ user_id: userStore.user.id });
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      loading.value = false;
    }
  }

  async function createGoal(data: Omit<TablesInsert<'goals'>, 'user_id'>): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      const created = await GoalsService.insert({ ...data, user_id: userStore.user.id });
      // Only append to local state after confirmed server success
      if (!created) return { success: false };
      goals.value = [...goals.value, created];
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function updateGoal(
    id: string,
    updates: Partial<Omit<TableRow<'goals'>, 'id' | 'user_id' | 'created_at'>>,
  ): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      const updated = await GoalsService.update(
        { ...updates, updated_at: new Date().toISOString() },
        { id, user_id: userStore.user.id },
      );
      const idx = goals.value.findIndex((g) => g.id === id);
      if (idx !== -1) goals.value[idx] = updated;
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function archiveGoal(id: string): Promise<{ success: boolean }> {
    return updateGoal(id, { archived_at: new Date().toISOString() });
  }

  async function unarchiveGoal(id: string): Promise<{ success: boolean }> {
    return updateGoal(id, { archived_at: null });
  }

  async function deleteGoal(id: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      await GoalsService.delete({ id, user_id: userStore.user.id });
      goals.value = goals.value.filter((g) => g.id !== id);
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  return {
    goals,
    loading,
    actionLoading,
    error,
    demoMode,
    activeGoals,
    endedGoals,
    archivedGoals,
    getGoals,
    createGoal,
    updateGoal,
    archiveGoal,
    unarchiveGoal,
    deleteGoal,
  };
});
