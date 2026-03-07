<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Card } from '@/components/ui/card';
import { toast } from 'vue-sonner';
import { useActivitiesStore } from '@/stores';
import { storeToRefs } from 'pinia';
import ActivityTrackerTime from '@/components/core/activity/ActivityTrackerTime.vue';
import { splitAndTrim } from '@/utils/string';
import { useTimer } from '@/composables/useTimer';
import ActivityTrackerForm, { type TimerState } from '@/components/core/activity/ActivityTrackerForm.vue';
import { useTranslation } from '@/composables';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();

const { trackingActivity, actionLoading, error } = storeToRefs(activitiesStore);
const { loadPendingActivity, startRecordingActivity, finishRecordingActivity } = activitiesStore;

const description = ref('');
const category = ref('');
const tagsInput = ref('');

const isRunning = computed(() => !!trackingActivity.value);

const getStartedAtTimestamp = () => {
  if (trackingActivity.value) {
    return new Date(trackingActivity.value.started_at).getTime();
  }
  return null;
};

const synchronizeFormOnActivityChange = () => {
  if (trackingActivity.value) {
    description.value = trackingActivity.value.description || '';
    tagsInput.value = (trackingActivity.value.tags as string[])?.join(', ') || '';
    category.value = ''; // todo: find category by its id
  } else {
    description.value = '';
    category.value = '';
    tagsInput.value = '';
  }
};

const { elapsedSeconds } = useTimer({
  isRunning,
  getStartTime: getStartedAtTimestamp,
});

watch(
  isRunning,
  (newValue) => {
    if (newValue) {
      synchronizeFormOnActivityChange();
    }
  },
  { immediate: true },
);

const canStarts = computed(() => description.value.trim().length > 0);

const state = computed<TimerState>(() => {
  if (actionLoading.value) {
    return 'loading';
  }
  if (isRunning.value) {
    return 'playing';
  }
  if (canStarts.value) {
    return 'ready';
  }
  return 'disabled';
});

onMounted(async () => {
  await loadPendingActivity();
  synchronizeFormOnActivityChange();
});

async function handleSubmit() {
  if (state.value !== 'ready') {
    return;
  }

  const tagsArray = splitAndTrim(tagsInput.value);
  const newActivity = await startRecordingActivity(
    description.value.trim(),
    '0ec862e8-b478-4711-864a-2878b5faac93', // todo: categories are not implemented yet, temp category id
    tagsArray,
  );

  if (newActivity) {
    toast.success(t('app.toast_notification.activity.started_success'));
  } else if (error.value) {
    toast.error(t(error.value));
  } else {
    toast.error(t('app.toast_notification.activity.start_error'));
  }
}

async function handleFinish() {
  if (!trackingActivity.value || state.value !== 'playing') {
    return;
  }
  const activityId = trackingActivity.value.id;
  const descriptionUpdate = description.value.trim();
  const tagsArray = splitAndTrim(tagsInput.value);

  const finished = await finishRecordingActivity(activityId, {
    description: descriptionUpdate,
    tags: tagsArray,
  });

  if (finished) {
    toast.success(t('app.toast_notification.activity.finished_success'));
    synchronizeFormOnActivityChange();
  } else if (error.value) {
    toast.error(t(error.value));
  }
}

function toggleTimer() {
  if (state.value === 'loading' || state.value === 'disabled') {
    return;
  }

  if (state.value === 'playing') {
    handleFinish();
  } else {
    handleSubmit();
  }
}
</script>

<template>
  <Card class="p-8 flex flex-col gap-6 md:flex-row md:gap-0 rounded-2xl border border-border/40 h-full">
    <div class="md:flex-grow md:pr-8">
      <h2 class="text-xl font-semibold mb-6">{{ t('app.module.overview.activity_tracker.title') }}</h2>
      <ActivityTrackerForm
        v-model:description="description"
        v-model:category="category"
        v-model:tagsInput="tagsInput"
        :state="state"
        :elapsedSeconds="elapsedSeconds"
        @submitForm="handleSubmit"
      />
    </div>

    <div class="flex items-center justify-center w-[160px] mx-auto md:mx-0 md:pl-8 md:w-[200px] xl:w-[240px] md:flex-shrink-0">
      <ActivityTrackerTime :totalSeconds="elapsedSeconds" :state="state" @toggleTimer="toggleTimer" />
    </div>
  </Card>
</template>
