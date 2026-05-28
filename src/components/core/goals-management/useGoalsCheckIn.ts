import { ref } from 'vue';

// Module-level singleton so any component can trigger the check-in preview
const _devTrigger = ref(0);

export function useGoalsCheckIn() {
  return {
    devTrigger: _devTrigger,
    triggerPreview: () => { _devTrigger.value++; },
  };
}
