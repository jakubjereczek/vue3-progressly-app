import { onUnmounted } from 'vue';
import SupabaseClient from '../api';
import { useUserStore } from '../stores'

export function useAuthListener() {
  const userStore = useUserStore();

  const { data: listener } = SupabaseClient.onAuthStateChange((_event, session) => {
    if (session?.user) {
      userStore.setUser(session.user);
    } else {
      userStore.clearUser();
    }
  });

  onUnmounted(() => {
    listener?.subscription.unsubscribe();
  });

  userStore.restoreSession();
}