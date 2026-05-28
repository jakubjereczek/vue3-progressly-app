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
import { PencilLine, RotateCcw } from 'lucide-vue-next';
import InfoTooltip from '@/components/ui/info-tooltip/InfoTooltip.vue';

const { t } = useTranslation();
const { pendingRestart, consumeRestart } = useRestartActivity();
const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();

const { trackingActivity, actionLoading, error, activities } = storeToRefs(activitiesStore);
const { activePrivateCategories, publicCategories } = storeToRefs(categoriesStore);
const categories = computed(() => [...activePrivateCategories.value, ...publicCategories.value]);
const { loadPendingActivity, startRecordingActivity, finishRecordingActivity } = activitiesStore;

const description = ref('');
const category = ref('');
const tagsInput = ref('');
const manualEntryOpen = ref(false);
const initializing = ref(true);

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
  () => {
    synchronizeFormOnActivityChange();
  },
  { immediate: true },
);

const canStarts = computed(() => description.value.trim().length >= 2);

const lastFinishedActivity = computed(() => {
  if (isRunning.value) return null;
  return activities.value.find((a) => a.finished_at) ?? null;
});

const isColdStart = computed(
  () => !initializing.value && !isRunning.value && activities.value.filter((a) => a.finished_at).length === 0,
);

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
  initializing.value = false;
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

async function handleQuickRestart() {
  const a = lastFinishedActivity.value;
  if (!a || state.value === 'loading') return;
  const newActivity = await startRecordingActivity(a.description || '', a.category_id, (a.tags as string[]) ?? []);
  if (newActivity) {
    toast.success(t('app.toast_notification.activity.started_success'));
  } else if (error.value) {
    toast.error(t(error.value));
  } else {
    toast.error(t('app.toast_notification.activity.start_error'));
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
  <Card
    data-tour="activity-tracker"
    class="rounded-2xl border border-border/40 h-full overflow-hidden py-0 shadow-none"
  >
    <div
      class="h-0.5 w-full transition-all duration-500"
      :class="isRunning ? 'bg-gradient-to-r from-primary via-chart-3 to-primary/50' : 'bg-transparent'"
    />

    <div class="p-4 flex flex-col gap-4 md:flex-row md:gap-0 h-full">
      <div class="md:flex-grow md:pr-6 flex flex-col gap-4 min-h-0">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-sm font-medium text-muted-foreground">
                {{ t('app.module.overview.activity_tracker.title') }}
              </h2>
              <span
                v-if="isRunning"
                class="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded-full bg-chart-3/15 text-chart-3 border border-chart-3/25 leading-none"
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
          <div class="flex items-center gap-4">
            <div v-if="lastFinishedActivity && !isRunning" class="flex items-center gap-1">
              <button
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors max-w-[180px] group/repeat"
                :aria-label="t('app.module.overview.activity_tracker.repeat_last')"
                :disabled="actionLoading"
                @click="handleQuickRestart"
              >
                <RotateCcw
                  class="w-3 h-3 flex-shrink-0 group-hover/repeat:rotate-[-30deg] transition-transform duration-200"
                />
                <span class="truncate">{{
                  lastFinishedActivity.description || t('app.module.overview.activity_tracker.repeat_last')
                }}</span>
              </button>
              <InfoTooltip :text="t('app.core.hint.repeat_last')" side="bottom" />
            </div>
            <div class="flex items-center gap-1">
              <button
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                @click="manualEntryOpen = true"
              >
                <PencilLine class="w-3 h-3" />
                {{ t('app.module.manual_entry.button') }}
              </button>
              <InfoTooltip :text="t('app.core.hint.manual_entry')" side="bottom" />
            </div>
          </div>
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
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="isColdStart"
            class="flex items-start gap-2 px-3 py-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
            {{ t('app.core.hint.cold_start') }}
          </div>
        </Transition>
      </div>
      <div
        class="flex items-center justify-center w-[140px] mx-auto md:mx-0 md:w-[160px] xl:w-[180px] md:flex-shrink-0 self-stretch"
      >
        <ActivityTrackerTime :totalSeconds="elapsedSeconds" :state="state" @toggleTimer="toggleTimer" />
      </div>
    </div>
  </Card>

  <ManualEntryDialog v-model:open="manualEntryOpen" />
</template>
