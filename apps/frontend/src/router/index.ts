import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
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

      // Tanka (単価マスタ)
      {
        path: 'tanka',
        meta: { breadcrumb: 'マスタ管理' },
        children: [
          {
            path: '',
            name: 'TankaList',
            component: () => import('@/views/tanka/TankaListView.vue'),
            meta: { breadcrumb: '単価マスタ明細検索画面', permission: 'tanka.view' },
          },
          // Reserved — build when SCR-003 work starts
          // { path: 'create', name: 'TankaCreate', ... }
          // { path: ':id/edit', name: 'TankaEdit', ... }
        ],
      },
    ],
  },

  // ─── Error pages ───────────────────────────────────────────────────
  {
    path: '/403',
    name: 'Forbidden',
    component: {
      template:
        '<div class="flex items-center justify-center h-screen"><h1 class="text-2xl">403 — アクセス権限がありません</h1></div>',
    },
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: {
      template:
        '<div class="flex items-center justify-center h-screen"><h1 class="text-2xl">404 — ページが見つかりません</h1></div>',
    },
    meta: { requiresAuth: false },
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
    return next({ name: 'Forbidden' });
  }

  next();
});

export default router;
