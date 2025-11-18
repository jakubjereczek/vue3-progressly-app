import { ref, watch, onBeforeUnmount, type Ref } from 'vue';

interface UseTimerOptions {
  isRunning: Ref<boolean>;
  getStartTime: () => number | null;
  onTick?: (seconds: number) => void;
}

export function useTimer({ getStartTime, isRunning, onTick }: UseTimerOptions) {
  const elapsedSeconds = ref(0);
  let intervalId: number | null = null;

  function stopClock() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      elapsedSeconds.value = 0;
    }
  }

  function startClock() {
    if (intervalId !== null) {
      return;
    }
    const startedAt = getStartTime();
    if (startedAt !== null) {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);

      intervalId = window.setInterval(() => {
        elapsedSeconds.value++;
        if (onTick) {
          onTick(elapsedSeconds.value);
        }
      }, 1000);
    }
  }

  watch(
    isRunning,
    (newValue) => {
      if (newValue) {
        startClock();
      } else {
        stopClock();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopClock();
  });

  return {
    elapsedSeconds,
  };
}
