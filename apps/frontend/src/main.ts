import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd, { message } from 'ant-design-vue';
// Antd reset は styles/tailwind.css 内で `layer(antd)` として import する。
// これにより Tailwind ユーティリティ（後で宣言する layer(utilities)）が
// カスケードで勝つ。ここで reset.css を直接 import すると unlayered になり、
// CSS 仕様上あらゆる layer に勝ってしまう。
import './styles/tailwind.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  /**
   * ローカルの try/catch と onErrorCaptured 境界をすり抜けた Vue の
   * render / setup / lifecycle / async エラーのグローバルハンドラ。
   * 典型的な render エラーには `App.vue` の onErrorCaptured が既にトーストを出す。
   * これは真の最終フォールバック（例: setup() 内の未処理 promise reject）で、
   * ユーザーに必ず何か見せ、デバッグ用にエラーをログする。
   */
  app.config.errorHandler = (err, _vm, info) => {
    // ここで useNotify を持ち込まない — この時点で Vue は部分状態のことがある。
    // antd のグローバル `message` API を直接使う（上で静的 import 済み。Antd は
    // `app.use` で既にメインバンドルに入っている）。
    message.error('予期しないエラーが発生しました。');
    console.error('[Vue errorHandler]', err, info);
  };

  // router ガードをマウントする前に refresh_token cookie でセッション復元を試みる。
  const authStore = useAuthStore();
  await authStore.refreshSession();

  app.use(router);
  app.use(Antd);
  app.mount('#app');
}

void bootstrap();
