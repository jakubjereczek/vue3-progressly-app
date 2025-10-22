import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User } from '@supabase/supabase-js';
import SupabaseClient from '../api';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const loggedIn = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setUser(newUser: User) {
    user.value = newUser;
    loggedIn.value = true;
  }

  function clearUser() {
    user.value = null;
    loggedIn.value = false;
  }

  async function register(email: string, password: string): Promise<User | null> {
    loading.value = true;
    error.value = null;

    try {
      const { user: newUser } = await SupabaseClient.signUp(email, password);
      if (newUser) {
        setUser(newUser);
      } else {
        clearUser();
      }
      return newUser;
    } catch (err: unknown) {
      console.log('err register', err);
      error.value = err?.message ?? '';

      clearUser();
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string): Promise<User | null> {
    loading.value = true;
    error.value = null;

    try {
      const { user: newUser } = await SupabaseClient.signIn(email, password);
      if (newUser) {
        setUser(newUser);
      } else {
        clearUser();
      }
      return newUser;
    } catch (err: unknown) {
      console.log('err login', err);

      error.value = err?.message ?? '';

      clearUser();
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await SupabaseClient.signOut();
      clearUser();
    } catch (err: unknown) {
      error.value = err?.message ?? '';

      clearUser();
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const { user: currentUser } = await SupabaseClient.getUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        clearUser();
      }
    } catch (err: unknown) {
      error.value = err?.message ?? '';

      clearUser();
    } finally {
      loading.value = false;
    }
  }

  async function restoreSession() {
    loading.value = true;
    try {
      const { session } = await SupabaseClient.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        clearUser();
      }
    } catch (err: unknown) {
      error.value = err?.message ?? '';

      clearUser();
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loggedIn,
    loading,
    error,
    setUser,
    clearUser,
    register,
    login,
    logout,
    fetchUser,
    restoreSession,
  };
});
