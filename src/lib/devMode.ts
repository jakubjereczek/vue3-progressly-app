import { ref } from 'vue';

export const isFakeMode = ref(localStorage.getItem('progressly.devMode') === 'true');

export function setFakeMode(enabled: boolean) {
  isFakeMode.value = enabled;
  localStorage.setItem('progressly.devMode', String(enabled));
}
