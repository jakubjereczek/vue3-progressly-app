<script setup lang="ts">
import { formatTime } from '@/utils/time';
import { computed } from 'vue';
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
    <svg id="timer-svg" class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(240 80% 50%)" />
          <stop offset="100%" stop-color="hsl(240 80% 70%)" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="45" stroke="currentColor" class="text-gray-300" stroke-width="4" fill="none" />

      <circle
        v-if="state === 'playing'"
        cx="50"
        cy="50"
        r="45"
        :stroke="'url(#timerGradient)'"
        stroke-width="4"
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
      class="absolute inset-0 flex items-center justify-center rounded-full w-full h-full cursor-pointer transition-all duration-200 group"
      :class="{
        'hover:bg-red-500/10 active:bg-red-500/20': state === 'playing',
        'hover:bg-green-500/10 active:bg-green-500/20': state === 'ready',
        'cursor-not-allowed opacity-70': state === 'disabled',
      }"
    >
      <div v-if="state === 'playing'" class="flex items-center justify-center space-x-2">
        <svg
          class="w-8 h-8 md:w-6 md:h-6 xl:w-7 xl:w-7 text-red-600 transition-colors duration-300 group-hover:text-red-800 group-hover:scale-125"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
        <div
          class="text-5xl md:text-3xl xl:text-4xl font-extralight font-mono text-gray-900 tracking-tight select-none"
        >
          {{ formattedTime }}
        </div>
      </div>

      <div
        v-else-if="state === 'loading'"
        class="transition-transform duration-300 transform opacity-50 group-hover:opacity-100"
      >
        <svg
          class="w-40 h-40 md:w-32 md:h-32 xl:w-36 xl:h-36 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="8" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="16" cy="12" r="2" />
        </svg>
      </div>

      <div
        v-else
        class="transition-transform duration-300 transform opacity-50 group-hover:opacity-100 group-hover:scale-125"
      >
        <svg
          v-if="state === 'ready'"
          class="w-40 h-40 md:w-32 md:h-32 xl:w-36 xl:h-36 text-green-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg
          v-else
          class="w-40 h-40 md:w-32 md:h-32 xl:w-36 xl:h-36 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
    </button>
  </div>
</template>
