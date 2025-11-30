import type { RouteRecordRaw } from 'vue-router';
import { LoginPage, RegisterPage, DashboardPage } from '../app/pages';
import DashboardLayout from '@/components/DashboardLayout.vue';
import ActivitiesPage from '@/app/pages/dashboard/ActivitiesPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true, breadcrumb: 'Dashboard' },
    children: [
      {
        path: '',
        name: 'Dashboard_Overview',
        component: DashboardPage,
        meta: {
          breadcrumb: ''
        },
      },
      {
        path: 'activities',
        name: 'Dashboard_Activities',
        component: ActivitiesPage,
        meta: {
          breadcrumb: 'Activities'
        },
      },
    ],
  },
];

export default routes;
