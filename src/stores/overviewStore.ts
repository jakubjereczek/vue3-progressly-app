import { defineStore } from 'pinia';
import { ref } from 'vue';

export type OverviewRange = 'today' | 'week' | 'month';

export const useOverviewStore = defineStore('overview', () => {
  const selectedRange = ref<OverviewRange>('week');

  return { selectedRange };
});
