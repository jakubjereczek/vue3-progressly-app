import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore, useActivitiesStore, useCategoriesStore } from '@/stores';
import { getDuration, formatTotalDuration, getTodayDateString, localDateToString } from '@/utils/time';
import { calculateStreak } from '@/utils/activity';

export function useAccountData() {
  const userStore = useUserStore();
  const { user, plan, isPremium } = storeToRefs(userStore);

  const activitiesStore = useActivitiesStore();
  const { activities } = storeToRefs(activitiesStore);

  const categoriesStore = useCategoriesStore();
  const { privateCategories, activePrivateCategories } = storeToRefs(categoriesStore);

  const memberSince = computed(() => {
    const createdAt = user.value?.created_at;
    if (!createdAt) return '—';
    return new Date(createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  const displayName = computed(() => user.value?.user_metadata?.full_name ?? '');
  const email = computed(() => user.value?.email ?? '');
  const avatarInitials = computed(() => {
    const name = displayName.value || email.value;
    return name.slice(0, 2).toUpperCase();
  });

  const finishedActivities = computed(() => activities.value.filter((a) => a.finished_at));

  const totalSessions = computed(() => finishedActivities.value.length);

  const totalSeconds = computed(() =>
    finishedActivities.value.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
  );

  const totalTimeFormatted = computed(() => formatTotalDuration(totalSeconds.value));

  const avgSessionSeconds = computed(() => {
    if (finishedActivities.value.length === 0) return 0;
    return totalSeconds.value / finishedActivities.value.length;
  });

  const avgSessionFormatted = computed(() => formatTotalDuration(avgSessionSeconds.value));

  const longestSessionSeconds = computed(() => {
    if (finishedActivities.value.length === 0) return 0;
    return Math.max(...finishedActivities.value.map((a) => getDuration(a.started_at, a.finished_at) / 1000));
  });

  const longestSessionFormatted = computed(() => formatTotalDuration(longestSessionSeconds.value));

  const currentStreak = computed(() => calculateStreak(activities.value));

  const todayActivitiesCount = computed(() => {
    const today = getTodayDateString();
    return activities.value.filter((a) => localDateToString(new Date(a.started_at)) === today).length;
  });

  const categoryUsagePercent = computed(() => {
    if (!plan.value?.categoryLimit) return 0;
    return Math.min(100, (activePrivateCategories.value.length / plan.value.categoryLimit) * 100);
  });

  const dailyUsagePercent = computed(() => {
    if (!plan.value?.dailyActivitiesLimit) return 0;
    return Math.min(100, (todayActivitiesCount.value / plan.value.dailyActivitiesLimit) * 100);
  });

  onMounted(async () => {
    await Promise.all([activitiesStore.getActivities(), categoriesStore.getCategories()]);
  });

  return {
    user,
    displayName,
    email,
    avatarInitials,
    memberSince,
    plan,
    isPremium,
    totalSessions,
    totalTimeFormatted,
    avgSessionFormatted,
    longestSessionFormatted,
    currentStreak,
    privateCategories,
    activePrivateCategories,
    todayActivitiesCount,
    categoryUsagePercent,
    dailyUsagePercent,
  };
}
