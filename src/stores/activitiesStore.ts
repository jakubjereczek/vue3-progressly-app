import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import ActivitiesService from '@/api/services/activitiesService';
import type { Json, TablesInsert } from '@/api/db-types';
import { getFriendlyErrorTranslationLabel } from '@/api/supabaseErrors';
import { useUserStore } from '@/stores';

// todo: use vue cache (like react cache)
// todo: fix global loading issue

export const useActivitiesStore = defineStore('activities', () => {
  const userStore = useUserStore();

  const trackingActivity = ref<TableRow<'activities'> | undefined>();
  const activities = ref<TableRow<'activities'>[]>([]);
  const loading = ref(false);
  const error = ref<string | undefined>();

  async function getPendingActivity(userId: string): Promise<TableRow<'activities'> | null> {
    return (await ActivitiesService.get({ user_id: userId, finished_at: null }, true)) as TableRow<'activities'> | null;
  }

  async function loadPendingActivity(): Promise<void> {
    if (!userStore.user) {
      return undefined;
    }
    loading.value = true;
    error.value = undefined;

    try {
      const userId = userStore.user.id;
      const activity = await getPendingActivity(userId);
      trackingActivity.value = activity ?? undefined;
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      loading.value = false;
    }
  }

  async function startRecordingActivity(
    description: string,
    categoryId: string | null = null,
    tags: Json,
  ): Promise<TableRow<'activities'> | undefined> {
    if (!userStore.user) {
      return undefined;
    }
    loading.value = true;
    error.value = undefined;

    try {
      const userId = userStore.user.id;
      try {
        await getPendingActivity(userId);
      } catch {
        const newActivityData: TablesInsert<'activities'> = {
          user_id: userStore.user.id,
          description: description,
          started_at: new Date().toISOString(),
          category_id: categoryId,
          tags: tags,
          finished_at: null,
        };

        const newActivity = await ActivitiesService.insert(newActivityData);
        if (newActivity) {
          trackingActivity.value = newActivity;
          return newActivity;
        }
      }
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      loading.value = false;
    }
  }

  async function finishRecordingActivity(
    activityId: string,
    updates?: {
      description?: string;
      category_id?: string | null;
      tags?: Json;
    },
  ): Promise<TableRow<'activities'> | undefined> {
    if (!userStore.user) {
      return undefined;
    }

    loading.value = true;
    error.value = undefined;

    try {
      const updateData = {
        ...updates,
        finished_at: new Date().toISOString(),
      };

      const filter = {
        id: activityId,
        user_id: userStore.user.id,
        finished_at: null,
      };

      const updatedActivity = await ActivitiesService.update(updateData, filter);
      if (updatedActivity) {
        if (trackingActivity.value?.id === activityId) {
          trackingActivity.value = undefined;
        }
        return updatedActivity;
      }

      error.value = 'toast.activityFinishError';
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      loading.value = false;
    }
  }

  async function getActivities(): Promise<TableRow<'activities'>[] | undefined> {
    if (!userStore.user) {
      return undefined;
    }
    loading.value = true;
    error.value = undefined;

    try {
      const userId = userStore.user.id;
      const userActivities = (await ActivitiesService.get({ user_id: userId })) as TableRow<'activities'>[];
      activities.value = userActivities;
      return userActivities;
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  async function deleteActivityById(activityId: string): Promise<{ success: boolean }> {
    if (!userStore.user) {
      return { success: false };
    }

    error.value = undefined;

    try {
      const filter = {
        id: activityId,
        user_id: userStore.user.id,
      };
      await ActivitiesService.delete(filter);

      activities.value = activities.value.filter(
        (activity: { id: string }) => activity.id !== activityId,
      ) as unknown as TableRow<'activities'>[];

      if (trackingActivity.value?.id === activityId) {
        trackingActivity.value = undefined;
      }

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async function updateActivityById(
    activityId: string,
    updatedFields: Partial<Omit<TableRow<'activities'>, 'id' | 'user_id' | 'created_at' | 'finished_at'>>,
  ): Promise<{ success: boolean }> {
    if (!userStore.user) {
      return { success: false };
    }

    try {
      const filter = {
        id: activityId,
        user_id: userStore.user.id,
      };

      const activity = await ActivitiesService.update(updatedFields, filter);
      const index = activities.value.findIndex((activity: { id: string }) => activity.id === activityId);

      if (activity && index !== -1) {
        // @ts-expect-error Type instantiation is excessively deep and possibly infinite.
        activities.value[index] = activity;

        if (trackingActivity.value?.id === activityId) {
          trackingActivity.value = activity;
        }
      }

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  return {
    trackingActivity,
    activities,
    loading,
    error,
    loadPendingActivity,
    startRecordingActivity,
    finishRecordingActivity,
    getActivities,
    deleteActivityById,
    updateActivityById,
  };
});
