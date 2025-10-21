import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const name = ref('');
  const loggedIn = ref(false);

  function login(userName: string) {
    name.value = userName;
    loggedIn.value = true;
  }

  function logout() {
    name.value = '';
    loggedIn.value = false;
  }

  return { name, loggedIn, login, logout };
});