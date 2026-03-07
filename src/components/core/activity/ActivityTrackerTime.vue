<script setup lang="ts">
import { formatTime } from '@/utils/time';
import { computed } from 'vue';
import { Play, Loader2, Clock } from 'lucide-vue-next';
import type { TimerState } from '@/components/core/activity/ActivityTrackerForm.vue';

interface ActivityTrackerTimeProps {
  totalSeconds: number;
  state: TimerState;
}

const props = defineProps<ActivityTrackerTimeProps>();

const emit = defineEmits<{
  (e: 'toggleTimer'): void;
}>();

const radius = 45;
const circumference = computed(() => 2 * Math.PI * radius);

const dashOffset = computed(() => {
  if (props.state !== 'playing') {
    return circumference.value;
  }

  const secondsInCycle = props.totalSeconds % 60;
  const offset = circumference.value * (1 - secondsInCycle / 60);
  return offset;
});

const formattedTime = computed(() => formatTime(props.totalSeconds));

function toggleTimer() {
  if (props.state === 'playing' || props.state === 'ready') {
    emit('toggleTimer');
    return;
  }
}
</script>

<template>
  <div class="relative aspect-square w-full">
    <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--color-primary)" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" stroke="currentColor" class="text-border" stroke-width="3" fill="none" />
      <circle
        v-if="state === 'playing'"
        cx="50" cy="50" r="45"
        stroke="url(#timerGradient)"
        stroke-width="3"
        fill="none"
        stroke-linecap="round"
        class="transition-all duration-300 ease-linear"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>

    <button
      @click="toggleTimer"
      :disabled="state === 'disabled' || state === 'loading'"
      :type="state !== 'playing' ? 'submit' : 'button'"
      :form="state !== 'playing' ? 'activityForm' : ''"
      class="absolute inset-0 flex flex-col items-center justify-center rounded-full w-full h-full transition-all duration-200 group"
      :class="{
        'cursor-pointer hover:bg-destructive/10 active:bg-destructive/20': state === 'playing',
        'cursor-pointer hover:bg-success/10 active:bg-success/20': state === 'ready',
        'cursor-not-allowed opacity-50': state === 'disabled',
        'cursor-default': state === 'loading',
      }"
    >
      <template v-if="state === 'playing'">
        <div class="font-mono text-3xl md:text-2xl xl:text-3xl font-light text-foreground tracking-tight select-none tabular-nums">
          {{ formattedTime }}
        </div>
        <span class="w-2 h-2 mt-2 rounded-full bg-destructive animate-pulse"></span>
      </template>

      <Loader2 v-else-if="state === 'loading'" class="w-8 h-8 text-muted-foreground animate-spin" />

      <Play
        v-else-if="state === 'ready'"
        class="w-10 h-10 text-success opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200"
      />

      <Clock v-else class="w-9 h-9 text-muted-foreground/30" />
    </button>
  </div>
</template>
