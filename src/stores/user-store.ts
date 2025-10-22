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
      const { data, error } = await SupabaseClient.signUp(email, password);
      if (error) {
        throw error;
      } else {
        if (data.user) {
          setUser(data.user);
        }
        return data.user;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = String(err);
      }
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
      const { data, error } = await SupabaseClient.signIn(email, password);
      if (error) {
        throw error;
      } else {
        if (data.user) {
          setUser(data.user);
        }
        return data.user;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = String(err);
      }
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
      const { error } = await SupabaseClient.signOut();
      if (error) {
        throw error;
      } else {
        clearUser();
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = String(err);
      }
      clearUser();
      return;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const {
        data: { user: currentUser },
        error,
      } = await SupabaseClient.getUser();
      if (error) {
        throw error;
      } else {
        if (currentUser) {
          setUser(currentUser);
        } else {
          clearUser();
        }
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = String(err);
      }
      clearUser();
      return;
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
  };
});
