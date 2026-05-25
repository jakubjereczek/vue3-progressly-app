import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@supabase/supabase-js';
import SupabaseClient from '@/api';
import PlanService, { type PlanInfo } from '@/api/services/planService';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const loggedIn = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const planName = ref<string | null>(null);
  const plan = ref<PlanInfo | null>(null);
  const isPremium = computed(() => planName.value === 'Premium');

  function setUser(newUser: User) {
    user.value = newUser;
    loggedIn.value = true;
  }

  function clearUser() {
    user.value = null;
    loggedIn.value = false;
    planName.value = null;
    plan.value = null;
  }

  async function fetchPlan(userId: string): Promise<void> {
    const planInfo = await PlanService.getByUserId(userId);
    plan.value = planInfo;
    planName.value = planInfo?.name ?? null;
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
      error.value = (err as Error)?.message ?? '';

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
        await fetchPlan(newUser.id);
      } else {
        clearUser();
      }
      return newUser;
    } catch (err: unknown) {
      error.value = (err as Error)?.message ?? '';

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
      error.value = (err as Error)?.message ?? '';

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
      error.value = (err as Error)?.message ?? '';

      clearUser();
    } finally {
      loading.value = false;
    }
  }

  async function updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; invalidCurrent?: boolean }> {
    loading.value = true;
    error.value = null;
    try {
      const email = user.value?.email;
      if (!email) return { success: false };
      const { user: reauthed } = await SupabaseClient.signIn(email, currentPassword);
      if (!reauthed) return { success: false, invalidCurrent: true };
      await SupabaseClient.updatePassword(newPassword);
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? '';
      const isInvalid = msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials');
      error.value = msg;
      return { success: false, invalidCurrent: isInvalid };
    } finally {
      loading.value = false;
    }
  }

  async function updateDisplayName(fullName: string): Promise<{ success: boolean }> {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await SupabaseClient.updateDisplayName(fullName);
      setUser(updatedUser);
      return { success: true };
    } catch (err: unknown) {
      error.value = (err as Error)?.message ?? '';
      return { success: false };
    } finally {
      loading.value = false;
    }
  }

  async function deleteAccount(): Promise<{ success: boolean }> {
    loading.value = true;
    error.value = null;
    try {
      await SupabaseClient.deleteUser();
      clearUser();
      return { success: true };
    } catch (err: unknown) {
      error.value = (err as Error)?.message ?? '';
      return { success: false };
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
        await fetchPlan(session.user.id);
      } else {
        clearUser();
      }
    } catch (err: unknown) {
      error.value = (err as Error)?.message ?? '';

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
    planName,
    plan,
    isPremium,
    setUser,
    clearUser,
    register,
    login,
    logout,
    fetchUser,
    restoreSession,
    fetchPlan,
    updatePassword,
    updateDisplayName,
    deleteAccount,
  };
});
