import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SECONDS_PER_DAY } from '@/utils/time';

export function useTimeIndicator(_hourWidth: number = 240) {
  const currentTime = ref(new Date());
  let timer: ReturnType<typeof setInterval> | null = null;

  // Percentage of day elapsed (0–100), same formula as leftPercentage in useGanttData
  const timeLinePercentage = computed(() => {
    const t = currentTime.value;
    const secondsFromMidnight = t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds();
    return (secondsFromMidnight / SECONDS_PER_DAY) * 100;
  });

  onMounted(() => {
    timer = setInterval(() => {
      currentTime.value = new Date();
    }, 30000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    timeLinePercentage,
    currentTime,
  };
}