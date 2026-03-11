<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Card } from '@/components/ui/card';
import { toast } from 'vue-sonner';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { storeToRefs } from 'pinia';
import ActivityTrackerTime from '@/components/core/activity/ActivityTrackerTime.vue';
import { splitAndTrim } from '@/utils/string';
import { useTimer } from '@/composables/useTimer';
import ActivityTrackerForm, { type TimerState } from '@/components/core/activity/ActivityTrackerForm.vue';
import { useTranslation } from '@/composables';
import { useRestartActivity } from '@/composables/useRestartActivity';
import ManualEntryDialog from '@/components/core/manual-entry/ManualEntryDialog.vue';
import { PencilLine } from 'lucide-vue-next';

const { t } = useTranslation();
const { pendingRestart, consumeRestart } = useRestartActivity();
const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();

const { trackingActivity, actionLoading, error } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);
const { loadPendingActivity, startRecordingActivity, finishRecordingActivity } = activitiesStore;

const description = ref('');
const category = ref('');
const tagsInput = ref('');
const manualEntryOpen = ref(false);

const isRunning = computed(() => !!trackingActivity.value);

const startedAtFormatted = computed(() => {
  if (!trackingActivity.value) {
    return null;
  }
  return new Date(trackingActivity.value.started_at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
});

const trackingCategory = computed(() => {
  if (!trackingActivity.value?.category_id) {
    return null;
  }
  return categories.value.find((c) => c.id === trackingActivity.value!.category_id) ?? null;
});

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
    category.value = trackingActivity.value.category_id ?? '';
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

watch(pendingRestart, (data) => {
  if (data && !isRunning.value) {
    const consumed = consumeRestart();
    if (consumed) {
      description.value = consumed.description;
      category.value = consumed.category_id ?? '';
      tagsInput.value = consumed.tags.join(', ');
    }
  }
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
  await Promise.all([loadPendingActivity(), categoriesStore.getCategories()]);
  synchronizeFormOnActivityChange();
});

async function handleSubmit() {
  if (state.value !== 'ready') {
    return;
  }

  const tagsArray = splitAndTrim(tagsInput.value);
  const newActivity = await startRecordingActivity(description.value.trim(), category.value || null, tagsArray);

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
  <Card class="rounded-2xl border border-border/40 h-full overflow-hidden py-0">
    <div
      class="h-0.5 w-full transition-all duration-500"
      :class="isRunning ? 'bg-gradient-to-r from-primary via-chart-3 to-primary/50' : 'bg-transparent'"
    />

    <div class="p-8 flex flex-col gap-6 md:flex-row md:gap-0 h-full">
      <div class="md:flex-grow md:pr-8 flex flex-col gap-5 min-h-0">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-xl font-semibold">{{ t('app.module.overview.activity_tracker.title') }}</h2>
              <span
                v-if="isRunning"
                class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-chart-3/15 text-chart-3 border border-chart-3/25 leading-none"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse" />
                {{ t('app.module.overview.activity_tracker.recording') }}
              </span>
            </div>
            <div v-if="isRunning" class="flex items-center gap-2 mt-1">
              <span class="text-sm text-muted-foreground">
                {{ t('app.module.overview.activity_tracker.since', { time: startedAtFormatted }) }}
              </span>
              <span
                v-if="trackingCategory"
                class="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-px rounded"
                :style="{
                  backgroundColor: trackingCategory.color + '20',
                  color: trackingCategory.color,
                }"
              >
                {{ trackingCategory.name }}
              </span>
            </div>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            @click="manualEntryOpen = true"
          >
            <PencilLine class="w-3 h-3" />
            {{ t('app.module.manual_entry.button') }}
          </button>
        </div>
        <ActivityTrackerForm
          v-model:description="description"
          v-model:category="category"
          v-model:tagsInput="tagsInput"
          :state="state"
          :elapsedSeconds="elapsedSeconds"
          :categories="categories"
          @submitForm="handleSubmit"
        />
      </div>
      <div
        class="flex items-center justify-center w-[160px] mx-auto md:mx-0 md:w-[200px] xl:w-[220px] md:flex-shrink-0 self-stretch"
      >
        <ActivityTrackerTime :totalSeconds="elapsedSeconds" :state="state" @toggleTimer="toggleTimer" />
      </div>
    </div>
  </Card>

  <ManualEntryDialog v-model:open="manualEntryOpen" />
</template>
