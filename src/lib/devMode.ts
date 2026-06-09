import { ref } from 'vue';

export const isFakeMode = ref(localStorage.getItem('goaletic.devMode') === 'true');

export function setFakeMode(enabled: boolean) {
  isFakeMode.value = enabled;
  localStorage.setItem('goaletic.devMode', String(enabled));
}
