import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './styles/tailwind.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Try to restore session via refresh_token cookie BEFORE mounting router guards.
  const authStore = useAuthStore();
  await authStore.refreshSession();

  app.use(router);
  app.use(Antd);
  app.mount('#app');
}

void bootstrap();
