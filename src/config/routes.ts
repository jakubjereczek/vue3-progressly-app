
import type {  RouteRecordRaw } from 'vue-router';
import App from '../App.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: App,
  },
  {
    path: '/about',
    name: 'About',
    component: App,
  },
];

export default routes;
