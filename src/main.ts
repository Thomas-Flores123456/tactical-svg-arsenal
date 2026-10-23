import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import CatalogView from './views/CatalogView.vue';
import './styles/main.css';
const router = createRouter({ history: createWebHashHistory(), routes: [{ path: '/', component: CatalogView }] });
createApp(App).use(createPinia()).use(router).mount('#app');
