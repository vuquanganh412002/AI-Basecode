import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { message } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth.store';

const routes: RouteRecordRaw[] = [
  // ─── Auth (AuthLayout is applied inside each view) ─────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/mfa-verify',
    name: 'MfaVerify',
    component: () => import('@/views/auth/MfaVerifyView.vue'),
    meta: { requiresAuth: false },
  },
  // SCR-012 — パスワードの再設定 (request reset email)
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },
  },
  // SCR-012 — パスワードの変更 (consume token + set new password)
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { requiresAuth: false },
  },

  // ─── Main app (MainLayout wraps everything) ────────────────────────
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'Dashboard' } },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { breadcrumb: 'メニュー画面' },
      },

      // ─── Breadcrumb convention (project-wide) ───────────────────────
      // List view: 2 levels — `ホーム > {Module}一覧` (entered from
      // sidebar / dashboard, no intermediate "マスタ管理" group label).
      // Create / Edit view: 3 levels — `ホーム > {Module}一覧 > {form-title}`
      // — array form makes the middle node a clickable link back to list.
      // The wrapper parent route therefore carries NO breadcrumb of its
      // own (it's just a path prefix; users never visit `/ja` literally).
      // ────────────────────────────────────────────────────────────────

      // JAマスタ (ACSMS-SCR-004 list / -005 form). Form view shared
      // between create & edit.
      {
        path: 'ja',
        children: [
          {
            path: '',
            name: 'JaList',
            component: () => import('@/views/ja/JaListView.vue'),
            meta: { breadcrumb: 'JAマスタ明細検索', permission: 'ja.view' },
          },
          {
            path: 'create',
            name: 'JaCreate',
            component: () => import('@/views/ja/JaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: 'JAマスタ明細検索', to: '/ja' },
                { label: 'JAマスタ登録画面' },
              ],
              permission: 'ja.create',
            },
          },
          {
            path: ':ja_id/edit',
            name: 'JaEdit',
            component: () => import('@/views/ja/JaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: 'JAマスタ明細検索', to: '/ja' },
                { label: 'JAマスタ編集画面' },
              ],
              permission: 'ja.update',
            },
          },
        ],
      },

      // 単価マスタ (ACSMS-SCR-003)
      {
        path: 'tanka',
        children: [
          {
            path: '',
            name: 'TankaList',
            component: () => import('@/views/tanka/TankaListView.vue'),
            meta: {
              breadcrumb: '単価マスタ明細検索画面',
              permission: 'tanka.view',
            },
          },
          // Reserved — build when SCR-003 form work starts. Use the same
          // breadcrumb shape as JaCreate / JaEdit:
          // { path: 'create', name: 'TankaCreate', meta: { breadcrumb: [
          //     { label: '単価マスタ明細検索画面', to: '/tanka' },
          //     { label: '単価マスタ登録画面' },
          //   ], permission: 'tanka.create' } }
          // { path: ':id/edit', name: 'TankaEdit', meta: { breadcrumb: [
          //     { label: '単価マスタ明細検索画面', to: '/tanka' },
          //     { label: '単価マスタ編集画面' },
          //   ], permission: 'tanka.update' } }
        ],
      },
    ],
  },

  // ─── Catch-all ─────────────────────────────────────────────────────
  // No standalone /403 or /404 pages — both flow back to the dashboard.
  // Permission-denied is handled by the global guard below (toast +
  // redirect). Unknown paths silently redirect (no toast — user typed
  // a junk URL, no need to lecture them about it).
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'Dashboard' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  // Already-authenticated users should skip the login / mfa screens.
  if (
    authStore.isAuthenticated &&
    (to.name === 'Login' || to.name === 'MfaVerify')
  ) {
    return next({ name: 'Dashboard' });
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
    // No /403 page — toast + bounce to dashboard. Avoids leaving the
    // user on a dead-end error screen; they always have a place to go.
    message.error('この画面へのアクセス権限がありません');
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;
