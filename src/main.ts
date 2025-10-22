import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import { router } from './config/router';
import preload from './preload';

const app = createApp(App);

const pinia = createPinia();

app.use(pinia);
app.use(router);

preload();

app.mount('#app');
