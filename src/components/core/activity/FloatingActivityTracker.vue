<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { Square, ChevronDown, ChevronUp, Circle, GripVertical } from 'lucide-vue-next';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { useTimer } from '@/composables/useTimer';
import { useDraggable } from '@/composables/useDraggable';
import { formatTime } from '@/utils/time';
import { cn } from '@/lib/utils';
import { toast } from 'vue-sonner';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { trackingActivity, actionLoading } = storeToRefs(activitiesStore);

const minimized = ref(false);
const { x, y, startDrag } = useDraggable({ storageKey: 'floating-tracker-pos' });

const isRunning = computed(() => !!trackingActivity.value);

const { elapsedSeconds } = useTimer({
  isRunning,
  getStartTime: () => (trackingActivity.value ? new Date(trackingActivity.value.started_at).getTime() : null),
});

const formattedTime = computed(() => formatTime(elapsedSeconds.value));

async function handleStop() {
  if (!trackingActivity.value || actionLoading.value) {
    return;
  }
  const finished = await activitiesStore.finishRecordingActivity(trackingActivity.value.id, {
    description: trackingActivity.value.description ?? '',
    tags: (trackingActivity.value.tags as string[]) ?? [],
  });
  if (finished) {
    toast.success(t('app.toast_notification.activity.finished_success'));
  }
}
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-95"
  >
    <div
      v-if="isRunning"
      :class="
        cn(
          'fixed z-50 flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/10 overflow-hidden',
          minimized ? 'w-auto' : 'w-72',
        )
      "
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div
        class="h-5 w-full bg-chart-3/20 hover:bg-chart-3/30 flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors"
        @pointerdown="startDrag"
      >
        <GripVertical class="w-3.5 h-3.5 text-chart-3/60" />
      </div>
      <div class="flex items-center gap-3 px-4 py-3">
        <div class="relative flex-shrink-0">
          <Circle class="w-2.5 h-2.5 fill-chart-3 text-chart-3" />
          <span class="absolute inset-0 rounded-full bg-chart-3 animate-ping opacity-60" />
        </div>
        <template v-if="!minimized">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold truncate leading-tight">
              {{ trackingActivity?.description || t('app.module.calendar.no_description') }}
            </p>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              {{ t('app.module.overview.today_activities.in_progress') }}
            </p>
          </div>
          <span class="text-sm font-mono font-bold tabular-nums text-chart-3 flex-shrink-0">
            {{ formattedTime }}
          </span>
          <button
            class="flex-shrink-0 w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-colors"
            :disabled="actionLoading"
            @click="handleStop"
            :title="t('app.module.overview.activity_tracker.title')"
          >
            <Square class="w-3 h-3 fill-destructive" />
          </button>
        </template>
        <template v-else>
          <span class="text-sm font-mono font-bold tabular-nums text-chart-3">
            {{ formattedTime }}
          </span>
        </template>
        <button
          class="flex-shrink-0 w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground"
          @click="minimized = !minimized"
        >
          <ChevronDown v-if="!minimized" class="w-3.5 h-3.5" />
          <ChevronUp v-else class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </transition>
</template>
