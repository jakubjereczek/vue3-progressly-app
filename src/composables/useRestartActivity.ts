import { ref } from 'vue';

export interface RestartData {
  description: string;
  category_id: string | null;
  tags: string[];
}

const _pendingRestart = ref<RestartData | null>(null);

export function useRestartActivity() {
  function requestRestart(data: RestartData) {
    _pendingRestart.value = data;
  }

  function consumeRestart(): RestartData | null {
    const data = _pendingRestart.value;
    _pendingRestart.value = null;
    return data;
  }

  return { pendingRestart: _pendingRestart, requestRestart, consumeRestart };
}
