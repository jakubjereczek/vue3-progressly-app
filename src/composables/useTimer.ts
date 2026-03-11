import { ref, watch, onBeforeUnmount, onMounted, type Ref } from 'vue';

interface UseTimerOptions {
  isRunning: Ref<boolean>;
  getStartTime: () => number | null;
  onTick?: (seconds: number) => void;
}

export function useTimer({ getStartTime, isRunning, onTick }: UseTimerOptions) {
  const elapsedSeconds = ref(0);
  let intervalId: number | null = null;

  function syncFromStartTime() {
    const startedAt = getStartTime();
    if (startedAt !== null) {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }
  }

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
      syncFromStartTime();

      intervalId = window.setInterval(() => {
        syncFromStartTime();
        if (onTick) {
          onTick(elapsedSeconds.value);
        }
      }, 1000);
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && isRunning.value) {
      syncFromStartTime();
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

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    stopClock();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  return {
    elapsedSeconds,
  };
}
