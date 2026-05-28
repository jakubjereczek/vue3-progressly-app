import { ref, computed } from 'vue';

const STORAGE_KEY = 'progressly_onboarding_v1';

// Module-level so state is shared across all instances
const _completed = ref(typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true');

export function useOnboarding() {
  const isOnboardingDone = computed(() => _completed.value);

  function complete() {
    _completed.value = true;
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  }

  /** For dev/testing only */
  function reset() {
    _completed.value = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return { isOnboardingDone, complete, reset };
}
