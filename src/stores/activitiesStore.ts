import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import SupabaseClient from '@/api/supabase';
import ActivitiesService from '@/api/services/activitiesService';
import type { Json, TablesInsert } from '@/api/db-types';
import { getFriendlyErrorTranslationLabel } from '@/api/supabaseErrors';
import { useUserStore } from '@/stores';
import { localDateToString } from '@/utils/time';

export const useActivitiesStore = defineStore('activities', () => {
  const userStore = useUserStore();

  const trackingActivity = ref<TableRow<'activities'> | undefined>();
  const activities = ref<TableRow<'activities'>[]>([]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | undefined>();
  const demoMode = ref(false);

  // Generation counter: prevents stale fetch responses from overwriting newer data.
  // Each call to getActivities/getActivitiesInRange increments this; only the
  // response whose generation matches the current value is allowed to commit.
  let fetchGeneration = 0;

  // Mutex for tag operations: prevents two concurrent rename/remove calls from
  // producing an inconsistent local state.
  const tagOperationLoading = ref(false);

  /** Returns true when the user's plan daily limit is reached for the given day string. */
  function isAtDailyLimit(dayStr: string): boolean {
    const dailyLimit = userStore.plan?.dailyActivitiesLimit;
    if (dailyLimit == null) return false;
    const count = activities.value.filter(
      (a) => a.finished_at != null && !!a.started_at && localDateToString(new Date(a.started_at)) === dayStr,
    ).length;
    return count >= dailyLimit;
  }

  /** Applies tag updates optimistically to the local activities array. */
  function applyTagUpdates(updates: { id: string; newTags: string[] }[]) {
    for (const { id, newTags } of updates) {
      const idx = activities.value.findIndex((a) => a.id === id);
      // @ts-expect-error Type instantiation is excessively deep and possibly infinite.
      if (idx !== -1) activities.value[idx] = { ...activities.value[idx], tags: newTags };
    }
  }

  /** Reverts tag updates using a snapshot produced before the optimistic update. */
  function revertTagUpdates(snapshot: { id: string; tags: unknown }[]) {
    for (const { id, tags } of snapshot) {
      const idx = activities.value.findIndex((a) => a.id === id);
      // @ts-expect-error Type instantiation is excessively deep and possibly infinite.
      if (idx !== -1) activities.value[idx] = { ...activities.value[idx], tags };
    }
  }

  function sortedByStartDesc(arr: TableRow<'activities'>[]): TableRow<'activities'>[] {
    return [...arr].sort((a, b) => {
      if (!a.started_at) return 1;
      if (!b.started_at) return -1;
      return a.started_at < b.started_at ? 1 : a.started_at > b.started_at ? -1 : 0;
    }) as TableRow<'activities'>[];
  }

  async function getPendingActivity(userId: string): Promise<TableRow<'activities'> | null> {
    const { data } = await SupabaseClient.raw()
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .is('finished_at', null)
      .maybeSingle();
    return data as TableRow<'activities'> | null;
  }

  // ─── startup ────────────────────────────────────────────────────────────────

  async function loadPendingActivity(): Promise<void> {
    if (!userStore.user) return;
    // Startup fetch — uses loading (not actionLoading) to not block UI actions.
    loading.value = true;
    error.value = undefined;
    try {
      const activity = await getPendingActivity(userStore.user.id);
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
    if (!userStore.user) return undefined;

    // Enforce daily activities plan limit before hitting the API
    if (isAtDailyLimit(localDateToString(new Date()))) {
      error.value = 'app.api_error.daily_limit_reached';
      return undefined;
    }

    actionLoading.value = true;
    error.value = undefined;
    try {
      const userId = userStore.user.id;
      const pending = await getPendingActivity(userId);
      if (pending === null) {
        const newActivityData: TablesInsert<'activities'> = {
          user_id: userId,
          description,
          started_at: new Date().toISOString(),
          category_id: categoryId,
          tags,
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
      actionLoading.value = false;
    }
  }

  async function finishRecordingActivity(
    activityId: string,
    updates?: { description?: string; category_id?: string | null; tags?: Json },
  ): Promise<TableRow<'activities'> | undefined> {
    if (!userStore.user) return undefined;
    actionLoading.value = true;
    error.value = undefined;
    try {
      const updateData = { ...updates, finished_at: new Date().toISOString() };
      const filter = { id: activityId, user_id: userStore.user.id, finished_at: null };
      const updatedActivity = await ActivitiesService.update(updateData, filter);
      if (updatedActivity) {
        if (trackingActivity.value?.id === activityId) {
          trackingActivity.value = undefined;
        }
        const index = activities.value.findIndex((a) => a.id === activityId);
        if (index !== -1) {
          activities.value[index] = updatedActivity;
        }
        return updatedActivity;
      }
      error.value = 'app.toast_notification.activity.finish_error';
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      actionLoading.value = false;
    }
  }

  async function getActivitiesInRange(from: Date, to: Date): Promise<void> {
    if (demoMode.value) return;
    if (!userStore.user) return;

    const gen = ++fetchGeneration;
    loading.value = true;
    error.value = undefined;
    try {
      const result = await ActivitiesService.getInRange(userStore.user.id, from, to);
      // Discard if a newer fetch has already started.
      if (gen !== fetchGeneration) return;
      activities.value = result;
    } catch (err: unknown) {
      if (gen !== fetchGeneration) return;
      error.value = getFriendlyErrorTranslationLabel(err);
    } finally {
      if (gen === fetchGeneration) loading.value = false;
    }
  }

  async function getActivities(): Promise<TableRow<'activities'>[] | undefined> {
    if (demoMode.value) return undefined;
    if (!userStore.user) return undefined;

    const gen = ++fetchGeneration;
    loading.value = true;
    error.value = undefined;
    try {
      const userActivities = await ActivitiesService.getAll(userStore.user.id);
      if (gen !== fetchGeneration) return undefined;
      activities.value = userActivities as typeof activities.value;
      return userActivities;
    } catch (err: unknown) {
      if (gen !== fetchGeneration) return undefined;
      error.value = getFriendlyErrorTranslationLabel(err);
      return undefined;
    } finally {
      if (gen === fetchGeneration) loading.value = false;
    }
  }

  async function deleteActivityById(activityId: string): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      await ActivitiesService.delete({ id: activityId, user_id: userStore.user.id });
      activities.value = activities.value.filter((a) => a.id !== activityId) as unknown as TableRow<'activities'>[];
      if (trackingActivity.value?.id === activityId) {
        trackingActivity.value = undefined;
      }
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function updateActivityById(
    activityId: string,
    updatedFields: Partial<Omit<TableRow<'activities'>, 'id' | 'user_id' | 'created_at'>>,
  ): Promise<{ success: boolean }> {
    if (!userStore.user) return { success: false };
    actionLoading.value = true;
    error.value = undefined;
    try {
      const filter = { id: activityId, user_id: userStore.user.id };
      const activity = await ActivitiesService.update(updatedFields, filter);
      const index = activities.value.findIndex((a) => a.id === activityId);
      if (activity && index !== -1) {
        activities.value[index] = activity;
        if ('started_at' in updatedFields) {
          activities.value = sortedByStartDesc(activities.value);
        }
        if (trackingActivity.value?.id === activityId) {
          trackingActivity.value = activity;
        }
      }
      return { success: !!activity };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  async function insertManualActivity(data: {
    description: string;
    category_id: string | null;
    tags: string[];
    started_at: string;
    finished_at: string;
  }): Promise<{ success: boolean; limitReached?: boolean }> {
    if (!userStore.user) return { success: false };

    // Enforce daily activities plan limit for the day being inserted into
    if (isAtDailyLimit(localDateToString(new Date(data.started_at)))) {
      return { success: false, limitReached: true };
    }

    actionLoading.value = true;
    error.value = undefined;
    try {
      const activity = await ActivitiesService.insert({
        user_id: userStore.user.id,
        description: data.description,
        category_id: data.category_id,
        tags: data.tags,
        started_at: data.started_at,
        finished_at: data.finished_at,
      });
      if (!activity) return { success: false };
      // Re-sort the whole array after insert — avoids fragile index-calculation logic.
      activities.value = sortedByStartDesc([...activities.value, activity]);
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      return { success: false };
    } finally {
      actionLoading.value = false;
    }
  }

  // ─── bulk operations ────────────────────────────────────────────────────────

  async function bulkDeleteActivities(ids: string[]): Promise<{ success: boolean }> {
    if (!userStore.user || ids.length === 0) return { success: false };

    const snapshot = activities.value.filter((a) => ids.includes(a.id));
    activities.value = activities.value.filter((a) => !ids.includes(a.id)) as unknown as TableRow<'activities'>[];
    if (trackingActivity.value && ids.includes(trackingActivity.value.id)) {
      trackingActivity.value = undefined;
    }

    try {
      await Promise.all(ids.map((id) => ActivitiesService.delete({ id, user_id: userStore.user!.id })));
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      activities.value = sortedByStartDesc([...activities.value, ...snapshot]);
      return { success: false };
    }
  }

  async function bulkSetTags(
    ids: string[],
    tagsToAdd: string[],
    tagsToRemove: string[],
  ): Promise<{ success: boolean }> {
    if (!userStore.user || ids.length === 0) return { success: false };

    const toUpdate = activities.value.filter((a) => ids.includes(a.id));
    const snapshot = toUpdate.map((a) => ({ id: a.id, tags: a.tags }));

    const updates = toUpdate.map((activity) => {
      const current = (activity.tags as string[]) ?? [];
      const next = [...new Set([...current.filter((t) => !tagsToRemove.includes(t)), ...tagsToAdd])];
      return { id: activity.id, newTags: next };
    });

    applyTagUpdates(updates);

    try {
      await Promise.all(
        updates.map(({ id, newTags }) =>
          ActivitiesService.update({ tags: newTags }, { id, user_id: userStore.user!.id }),
        ),
      );
      return { success: true };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      revertTagUpdates(snapshot);
      return { success: false };
    }
  }

  async function renameTag(oldTag: string, newTag: string): Promise<{ success: boolean; count: number }> {
    if (!userStore.user) return { success: false, count: 0 };
    if (tagOperationLoading.value) return { success: false, count: 0 };

    const toUpdate = activities.value.filter((a) => ((a.tags as string[]) ?? []).includes(oldTag));
    if (toUpdate.length === 0) return { success: true, count: 0 };

    tagOperationLoading.value = true;
    const snapshot = toUpdate.map((a) => ({ id: a.id, tags: a.tags }));

    const updates = toUpdate.map((activity) => ({
      id: activity.id,
      newTags: ((activity.tags as string[]) ?? []).map((t) => (t === oldTag ? newTag : t)),
    }));

    applyTagUpdates(updates);

    try {
      await Promise.all(
        updates.map(({ id, newTags }) =>
          ActivitiesService.update({ tags: newTags }, { id, user_id: userStore.user!.id }),
        ),
      );
      return { success: true, count: toUpdate.length };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      revertTagUpdates(snapshot);
      return { success: false, count: 0 };
    } finally {
      tagOperationLoading.value = false;
    }
  }

  async function removeTag(tag: string): Promise<{ success: boolean; count: number }> {
    if (!userStore.user) return { success: false, count: 0 };
    if (tagOperationLoading.value) return { success: false, count: 0 };

    const toUpdate = activities.value.filter((a) => ((a.tags as string[]) ?? []).includes(tag));
    if (toUpdate.length === 0) return { success: true, count: 0 };

    tagOperationLoading.value = true;
    const snapshot = toUpdate.map((a) => ({ id: a.id, tags: a.tags }));

    const updates = toUpdate.map((activity) => ({
      id: activity.id,
      newTags: ((activity.tags as string[]) ?? []).filter((t) => t !== tag),
    }));

    applyTagUpdates(updates);

    try {
      await Promise.all(
        updates.map(({ id, newTags }) =>
          ActivitiesService.update({ tags: newTags }, { id, user_id: userStore.user!.id }),
        ),
      );
      return { success: true, count: toUpdate.length };
    } catch (err: unknown) {
      error.value = getFriendlyErrorTranslationLabel(err);
      revertTagUpdates(snapshot);
      return { success: false, count: 0 };
    } finally {
      tagOperationLoading.value = false;
    }
  }

  return {
    trackingActivity,
    activities,
    loading,
    actionLoading,
    tagOperationLoading,
    error,
    demoMode,
    loadPendingActivity,
    startRecordingActivity,
    finishRecordingActivity,
    getActivities,
    getActivitiesInRange,
    deleteActivityById,
    updateActivityById,
    insertManualActivity,
    renameTag,
    removeTag,
    bulkDeleteActivities,
    bulkSetTags,
  };
});
