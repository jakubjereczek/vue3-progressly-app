import type { RouteRecordRaw } from 'vue-router';
import DashboardLayout from '@/components/DashboardLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/app/pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/app/pages/auth/RegisterPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true, breadcrumb: 'app.core.navbar.dashboard' },
    children: [
      {
        path: 'overview',
        name: 'Dashboard_Overview',
        component: () => import('@/app/pages/dashboard/OverviewPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.time_tracking' },
      },
      {
        path: 'timesheet',
        name: 'Dashboard_Timesheet',
        component: () => import('@/app/pages/dashboard/TimesheetPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.timesheet' },
      },
      {
        path: 'gantt',
        name: 'Dashboard_Gantt',
        component: () => import('@/app/pages/dashboard/GanttPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.gantt' },
      },
      {
        path: 'categories',
        name: 'Dashboard_Categories',
        component: () => import('@/app/pages/dashboard/CategoriesPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.categories' },
      },
      {
        path: 'stats',
        name: 'Dashboard_Stats',
        component: () => import('@/app/pages/dashboard/StatsPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.stats' },
      },
      {
        path: 'analytics',
        name: 'Dashboard_Analytics',
        component: () => import('@/app/pages/dashboard/AnalyticsPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.analytics' },
      },
      {
        path: 'settings',
        name: 'Dashboard_Settings',
        component: () => import('@/app/pages/dashboard/SettingsPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.settings' },
      },
      {
        path: 'account',
        name: 'Dashboard_Account',
        component: () => import('@/app/pages/dashboard/AccountPage.vue'),
        meta: { breadcrumb: 'app.core.common.account' },
      },
      {
        path: 'upgrade',
        name: 'Dashboard_Upgrade',
        component: () => import('@/app/pages/dashboard/UpgradePage.vue'),
        meta: { breadcrumb: 'app.core.navbar.upgrade' },
      },
      {
        path: 'export',
        name: 'Dashboard_Export',
        component: () => import('@/app/pages/dashboard/ExportPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.export' },
      },
      {
        path: 'calendar',
        name: 'Dashboard_Calendar',
        component: () => import('@/app/pages/dashboard/CalendarPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.calendar' },
      },
      {
        path: 'goals',
        name: 'Dashboard_Goals',
        component: () => import('@/app/pages/dashboard/GoalsPage.vue'),
        meta: { breadcrumb: 'app.core.navbar.goals' },
      },
      {
        path: '/dashboard',
        redirect: '/dashboard/overview',
      },
    ],
  },
];

export default routes;
