import type { RouteRecordRaw } from 'vue-router';
import { LoginPage, RegisterPage, OverviewPage, TimesheetPage } from '@/app/pages';
import DashboardLayout from '@/components/DashboardLayout.vue';
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
        path: 'overview',
        name: 'Dashboard_Overview',
        component: OverviewPage,
        meta: {
          breadcrumb: 'Overview',
        },
      },
      {
        path: 'timesheet',
        name: 'Dashboard_Timesheet',
        component: TimesheetPage,
        meta: {
          breadcrumb: 'Timesheet',
        },
      },
      {
        path: '/dashboard',
        redirect: '/dashboard/overview',
      },
    ],
  },
];

export default routes;
