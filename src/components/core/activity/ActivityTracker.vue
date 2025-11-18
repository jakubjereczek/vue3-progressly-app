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

const { currentActivity, loading, error } = storeToRefs(activitiesStore);
const { loadPendingActivity, startRecordingActivity, finishRecordingActivity } = activitiesStore;

const description = ref('');
const category = ref('');
const tagsInput = ref('');

const isRunning = computed(() => !!currentActivity.value);

const getStartedAtTimestamp = () => {
  if (currentActivity.value) {
    return new Date(currentActivity.value.started_at).getTime();
  }
  return null;
};

const synchronizeFormOnActivityChange = () => {
  if (currentActivity.value) {
    description.value = currentActivity.value.description || '';
    tagsInput.value = currentActivity.value.tags?.join(', ') || '';
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
  if (loading.value) {
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
    toast.success(t('toast.activityStartedSuccess'));
  } else if (error.value) {
    toast.error(t(error.value));
  } else {
    toast.error(t('toast.activityStartError'));
  }
}

async function handleFinish() {
  if (!currentActivity.value || state.value !== 'playing') {
    return;
  }
  const activityId = currentActivity.value.id;
  const descriptionUpdate = description.value.trim();
  const tagsArray = splitAndTrim(tagsInput.value);

  const finished = await finishRecordingActivity(activityId, {
    description: descriptionUpdate,
    tags: tagsArray,
  });

  if (finished) {
    toast.success(t('toast.activityFinishedSuccess'));
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
  <div>
    <Card class="p-8 flex flex-col gap-10 md:flex-row md:gap-10 rounded-2xl border border-border/40">
      <div class="md:flex-grow">
        <h2 class="text-xl font-semibold mb-4">{{ t('activityTracker.title') }}</h2>
        <ActivityTrackerForm
          v-model:description="description"
          v-model:category="category"
          v-model:tagsInput="tagsInput"
          :state="state"
          :elapsedSeconds="elapsedSeconds"
          @submitForm="handleSubmit"
        />
      </div>

      <div class="flex flex-col items-center space-y-6 md:w-[220px] xl:w-[280px] md:flex-shrink-0">
        <ActivityTrackerTime :totalSeconds="elapsedSeconds" :state="state" @toggleTimer="toggleTimer" />
      </div>
    </Card>
  </div>
</template>
