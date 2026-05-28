import { ref, nextTick } from 'vue';

export function useGanttScroll(getHourWidth: () => number) {
  const scrollContainer = ref<HTMLElement | null>(null);

  const getNowPosition = () => {
    const hw = getHourWidth();
    const now = new Date();
    const decimalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    return decimalHours * hw;
  };

  const scrollToNow = async () => {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (scrollContainer.value) {
      const hw = getHourWidth();
      const targetScroll = getNowPosition();
      scrollContainer.value.scrollLeft = targetScroll - hw;
    }
  };

  return {
    scrollContainer,
    scrollToNow,
    timeLinePosition: getNowPosition(),
  };
}
