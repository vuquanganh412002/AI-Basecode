import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd, { message } from 'ant-design-vue';
// Antd reset is imported INSIDE styles/tailwind.css with `layer(antd)` so
// Tailwind utilities (in layer(utilities), declared later) win the cascade.
// Importing reset.css directly here would put it unlayered, which wins
// over every layer per the CSS spec.
import './styles/tailwind.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  /**
   * Global handler for Vue render / setup / lifecycle / async errors that
   * escape any local try/catch and any onErrorCaptured boundary.
   * `App.vue`'s onErrorCaptured already shows a toast for typical render
   * errors; this is the truly-last fallback (e.g. unhandled promise
   * rejection inside a setup() block) so the user always sees something
   * and the error is logged for debugging.
   */
  app.config.errorHandler = (err, _vm, info) => {
    // Avoid pulling in useNotify here — at this point Vue may be in a
    // partial state. Use antd's global `message` API directly (statically
    // imported above; Antd is already in the main bundle via `app.use`).
    message.error('予期しないエラーが発生しました。');
    console.error('[Vue errorHandler]', err, info);
  };

  // Try to restore session via refresh_token cookie BEFORE mounting router guards.
  const authStore = useAuthStore();
  await authStore.refreshSession();

  app.use(router);
  app.use(Antd);
  app.mount('#app');
}

void bootstrap();
