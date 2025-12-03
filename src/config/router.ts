import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";
import { useUserStore } from "../stores";

export const router = createRouter({
  history: createWebHistory('/vue3-progressly-app/'),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();

  if (!userStore.loggedIn) {
    await userStore.restoreSession();
  }

  if (to.meta.requiresAuth && !userStore.loggedIn) {
    return next({ name: 'Login' });
  }

  if (to.meta.guest && userStore.loggedIn) {
    return next({ name: 'Dashboard' });
    
  }

  next();
});