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
                { label: 'JAマスタ明細検索', to: { name: 'JaList' } },
                { label: 'JAマスタ登録画面' },
              ],
              permission: 'ja.create',
            },
          },
          {
            path: ':id/edit',
            name: 'JaEdit',
            component: () => import('@/views/ja/JaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: 'JAマスタ明細検索', to: { name: 'JaList' } },
                { label: 'JAマスタ編集画面' },
              ],
              permission: 'ja.update',
            },
          },
        ],
      },

      // 管理支店マスタ (ACSMS-SCR-008 list, ACSMS-SCR-009 form).
      // KanriShitenCreate / KanriShitenEdit point at a TODO placeholder
      // until SCR-009 ships — see src/views/kanri-shiten/KanriShitenFormView.vue.
      // Registered now so the list view's `router.push({ name:
      // 'KanriShitenCreate' })` resolves at runtime instead of silent-failing.
      {
        path: 'kanri-shiten',
        children: [
          {
            path: '',
            name: 'KanriShitenList',
            component: () => import('@/views/kanri-shiten/KanriShitenListView.vue'),
            meta: {
              breadcrumb: '管理支店マスタ明細検索',
              permission: 'kanri_shiten.view',
            },
          },
          {
            path: 'create',
            name: 'KanriShitenCreate',
            component: () => import('@/views/kanri-shiten/KanriShitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '管理支店マスタ明細検索', to: { name: 'KanriShitenList' } },
                { label: '管理支店マスタ登録画面' },
              ],
              permission: 'kanri_shiten.create',
            },
          },
          {
            path: ':id/edit',
            name: 'KanriShitenEdit',
            component: () => import('@/views/kanri-shiten/KanriShitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '管理支店マスタ明細検索', to: { name: 'KanriShitenList' } },
                { label: '管理支店マスタ編集画面' },
              ],
              permission: 'kanri_shiten.update',
            },
          },
        ],
      },

      // 販売店マスタ (ACSMS-SCR-018 list, ACSMS-SCR-017 form).
      // HanbaitenCreate / HanbaitenEdit point at a TODO placeholder until
      // SCR-017 ships — see src/views/hanbaiten/HanbaitenFormView.vue.
      // Registered now so the list view's `router.push({ name:
      // 'HanbaitenCreate' })` resolves at runtime instead of silent-failing.
      {
        path: 'hanbaiten',
        children: [
          {
            path: '',
            name: 'HanbaitenList',
            component: () => import('@/views/hanbaiten/HanbaitenListView.vue'),
            meta: {
              breadcrumb: '販売店明細検索',
              // [perm-any-of] NICHINO_STAFF holds `hanbaiten.daiko_input`
              // (代行入力) but not `hanbaiten.view`; the search screen
              // unifies both flows behind a role-aware JA filter.
              permission: ['hanbaiten.view', 'hanbaiten.daiko_input'],
            },
          },
          {
            path: 'create',
            name: 'HanbaitenCreate',
            component: () => import('@/views/hanbaiten/HanbaitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '販売店明細検索', to: { name: 'HanbaitenList' } },
                { label: '販売店情報登録画面' },
              ],
              // [perm-any-of] see HanbaitenList — NICHINO_STAFF creates
              // via `hanbaiten.daiko_input`, other JA roles via
              // `hanbaiten.create`.
              permission: ['hanbaiten.create', 'hanbaiten.daiko_input'],
            },
          },
          {
            path: ':id/edit',
            name: 'HanbaitenEdit',
            component: () => import('@/views/hanbaiten/HanbaitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '販売店明細検索', to: { name: 'HanbaitenList' } },
                { label: '販売店情報編集画面' },
              ],
              // [perm-any-of] NICHINO_STAFF edits via `hanbaiten.daiko_input`,
              // other JA roles via `hanbaiten.update`.
              permission: ['hanbaiten.update', 'hanbaiten.daiko_input'],
            },
          },
          // ACSMS-SCR-019 — 販売店Excelデータ取込画面.
          {
            path: 'import',
            name: 'HanbaitenImport',
            component: () => import('@/views/hanbaiten/HanbaitenImportView.vue'),
            meta: {
              breadcrumb: '販売店Excelデータ取込',
              permission: 'hanbaiten.import',
            },
          },
        ],
      },

      // 支店マスタ (ACSMS-SCR-006 list, ACSMS-SCR-007 form).
      {
        path: 'shiten',
        children: [
          {
            path: '',
            name: 'ShitenList',
            component: () => import('@/views/shiten/ShitenListView.vue'),
            meta: {
              breadcrumb: '支店マスタ明細検索',
              permission: 'shiten.view',
            },
          },
          {
            path: 'create',
            name: 'ShitenCreate',
            component: () => import('@/views/shiten/ShitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '支店マスタ明細検索', to: { name: 'ShitenList' } },
                { label: '支店マスタ登録画面' },
              ],
              permission: 'shiten.create',
            },
          },
          {
            path: ':id/edit',
            name: 'ShitenEdit',
            component: () => import('@/views/shiten/ShitenFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '支店マスタ明細検索', to: { name: 'ShitenList' } },
                { label: '支店マスタ編集画面' },
              ],
              permission: 'shiten.update',
            },
          },
        ],
      },

      // アカウントマスタ (ACSMS-SCR-024 list, ACSMS-SCR-025 form).
      // NICHINO_ADMIN-only (`account.view` per seeder.md §3). AccountCreate
      // / AccountEdit point at a TODO placeholder until SCR-025 ships —
      // see src/views/account/AccountFormView.vue. Registered now so the
      // list view's `router.push({ name: 'AccountCreate' })` resolves
      // at runtime instead of silently skipping.
      {
        path: 'accounts',
        children: [
          {
            path: '',
            name: 'AccountList',
            component: () => import('@/views/account/AccountsListView.vue'),
            meta: {
              breadcrumb: 'アカウントマスタ明細検索',
              permission: 'account.view',
            },
          },
          {
            path: 'create',
            name: 'AccountCreate',
            component: () => import('@/views/account/AccountFormView.vue'),
            meta: {
              breadcrumb: [
                { label: 'アカウントマスタ明細検索', to: { name: 'AccountList' } },
                { label: 'アカウントマスタ登録画面' },
              ],
              permission: 'account.create',
            },
          },
          {
            path: ':id/edit',
            name: 'AccountEdit',
            component: () => import('@/views/account/AccountFormView.vue'),
            meta: {
              breadcrumb: [
                { label: 'アカウントマスタ明細検索', to: { name: 'AccountList' } },
                { label: 'アカウントマスタ編集画面' },
              ],
              permission: 'account.update',
            },
          },
        ],
      },

      // ロール管理画面 (ACSMS-SCR-027). Single view hosts both list AND
      // inline edit form per screen-design.md — no separate create/edit
      // route. NICHINO_ADMIN-only; the view itself enforces role check
      // (ACSMS-MSG-027-006). No `meta.permission` because seeder.md has
      // no dedicated role.* permission_code — adding one is BE work and
      // would risk hiding the menu from NICHINO_ADMIN if seeded wrong.
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('@/views/roles/RoleManagementView.vue'),
        meta: { breadcrumb: 'ロール管理画面' },
      },

      // ログ参照画面 (ACSMS-SCR-030). Read-only list + CSV export.
      // All 5 roles hold `log.view`; DataScope is enforced server-side.
      {
        path: 'log',
        name: 'LogList',
        component: () => import('@/views/log/LogListView.vue'),
        meta: { breadcrumb: 'ログ参照', permission: 'log.view' },
      },

      // 口座振替データ出力画面 (ACSMS-SCR-020). JASTEM 委託者/支店情報入力 →
      // 作成開始（全銀フォーマット CSV 出力）。koza_furikae.export を持つ JA
      // ロール (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) のみ。route 名は
      // MENU_SECTIONS の KozaFurikaeExport と一致させる。
      {
        path: 'koza-furikae',
        name: 'KozaFurikaeExport',
        component: () => import('@/views/koza-furikae/KozaFurikaeExportView.vue'),
        meta: {
          breadcrumb: '口座振替データ出力',
          permission: 'koza_furikae.export',
        },
      },

      // 配達手数料支払情報出力画面 (ACSMS-SCR-021). 出力条件（年月日 +
      // 配達手数料支払サイクル）→ 検索（販売店ごとの集計）+ Excel出力。
      // haitatsuryo.export を持つ JA ロール (CHUOKAI / JA_HONTEN /
      // JA_KANRI_SHITEN) のみ。route 名は MENU_SECTIONS と一致させる。
      {
        path: 'haitatsuryo',
        name: 'HaitatsuryoExport',
        component: () => import('@/views/haitatsuryo/HaitatsuryoExportView.vue'),
        meta: {
          breadcrumb: '配達手数料支払情報出力',
          permission: 'haitatsuryo.export',
        },
      },

      // 購読者名簿出力画面 (ACSMS-SCR-026). 出力条件 → プレビュー / Excel出力。
      // report.export_meibo を持つ JA ロール (CHUOKAI / JA_HONTEN /
      // JA_KANRI_SHITEN) のみ。日農アカウントは画面内で MSG-026-001 を表示。
      {
        path: 'report/meibo',
        name: 'ReportMeibo',
        component: () => import('@/views/report/MeiboReportView.vue'),
        meta: { breadcrumb: '購読者名簿出力', permission: 'report.export_meibo' },
      },

      // 増減連絡票（販売店）出力画面 (ACSMS-SCR-028). 出力条件 →
      // プレビュー / 電子帳票(PDF)出力。販売店＋管理支店ごとに増部/減部/
      // 住所変更の3区分。report.export_zougen_hanbaiten を持つ JA ロール
      // (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) のみ。日農アカウントは
      // 画面内で MSG-028-001 を表示。route 名は MENU_SECTIONS と一致させる。
      {
        path: 'report/zougen-hanbaiten',
        name: 'ReportZougenHanbaiten',
        component: () => import('@/views/report/ZougenHanbaitenReportView.vue'),
        meta: {
          breadcrumb: '増減連絡票（販売店）出力',
          permission: 'report.export_zougen_hanbaiten',
        },
      },

      // 増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029). 出力条件 →
      // プレビュー / 電子帳票(PDF / 複数管理支店は ZIP)出力。管理支店ごとに
      // 1帳票。電子帳票作成は MSG-029-005 の確認ダイアログ（日農担当者へメール
      // 送信）を挟む。report.export_zougen_nichino を持つ JA ロール
      // (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) のみ。日農アカウントは
      // 画面内で MSG-029-001 を表示。route 名は MENU_SECTIONS と一致させる。
      {
        path: 'report/zougen-nichino',
        name: 'ReportZougenNichino',
        component: () => import('@/views/report/ZougenNichinoReportView.vue'),
        meta: {
          breadcrumb: '増減通知（日本農業新聞）出力',
          permission: 'report.export_zougen_nichino',
        },
      },

      // ファイルダウンロード画面 (ACSMS-SCR-022). Read-only list +
      // preview (S3 presigned URL) + binary download. All 5 roles hold
      // `file.download`; DataScope is enforced server-side.
      {
        path: 'file-download',
        name: 'FileDownload',
        component: () => import('@/views/file-download/FileDownloadView.vue'),
        meta: { breadcrumb: 'ファイルダウンロード', permission: 'file.download' },
      },

      // ファイルアップロード画面 (ACSMS-SCR-023). Multi-JA × multi-file
      // upload with notification queue + soft delete. 2026-06 以降は日農
      // (NICHINO_ADMIN / NICHINO_STAFF) のみが `file.upload` を保持する
      // (migration 1711900900020); DataScope is enforced server-side.
      {
        path: 'file-upload',
        name: 'FileUpload',
        component: () => import('@/views/file-upload/FileUploadView.vue'),
        meta: { breadcrumb: 'ファイルアップロード', permission: 'file.upload' },
      },

      // お知らせ一覧画面 (ACSMS-SCR-031). Single view hosts list + create/edit
      // form per screen-design.md (no separate create/edit route). NICHINO_ADMIN-
      // only via `oshirase.view` permission per seeder.md §3. The view itself
      // re-checks the permission so a non-admin landing on the URL sees
      // ACSMS-MSG-031-006 instead of firing the API.
      {
        path: 'oshirase',
        name: 'OshiraseList',
        component: () => import('@/views/oshirase/OshiraseManagementView.vue'),
        meta: { breadcrumb: 'お知らせ一覧', permission: 'oshirase.view' },
      },

      // 購読者マスタ (ACSMS-SCR-011 form). DokusyaList / DokusyaImport /
      // DokusyaReplaceHanbaiten target TODO placeholder views until
      // their dedicated SCRs ship — registered now so MENU_SECTIONS
      // entries (購読者明細検索 / 購読者Excelデータ取込 / 購読者販売店
      // 一括置換) resolve at runtime via `router.hasRoute(name)` instead
      // of silently no-op'ing on click.
      {
        path: 'dokusya',
        children: [
          {
            path: '',
            name: 'DokusyaList',
            component: () => import('@/views/dokusya/DokusyaListView.vue'),
            meta: {
              breadcrumb: '購読者明細検索',
              permission: 'dokusya.view',
            },
          },
          {
            path: 'create',
            name: 'DokusyaCreate',
            component: () => import('@/views/dokusya/DokusyaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '購読者明細検索', to: { name: 'DokusyaList' } },
                { label: '購読者情報登録画面' },
              ],
              permission: 'dokusya.create',
            },
          },
          {
            path: ':id/edit',
            name: 'DokusyaEdit',
            component: () => import('@/views/dokusya/DokusyaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '購読者明細検索', to: { name: 'DokusyaList' } },
                { label: '購読者情報編集画面' },
              ],
              permission: 'dokusya.update',
            },
          },
          {
            // ACSMS-SCR-013 — 購読者履歴情報画面 (read-only history list).
            path: ':id/rireki',
            name: 'DokusyaRireki',
            component: () => import('@/views/dokusya/DokusyaRirekiView.vue'),
            meta: {
              breadcrumb: [
                { label: '購読者明細検索', to: { name: 'DokusyaList' } },
                { label: '購読者履歴情報画面' },
              ],
              permission: 'dokusya.view',
            },
          },
          {
            path: 'import',
            name: 'DokusyaImport',
            component: () => import('@/views/dokusya/DokusyaImportView.vue'),
            meta: {
              breadcrumb: '購読者Excelデータ取込',
              permission: 'dokusya.import',
            },
          },
          {
            path: 'replace-hanbaiten',
            name: 'DokusyaReplaceHanbaiten',
            component: () => import('@/views/dokusya/DokusyaReplaceHanbaitenView.vue'),
            meta: {
              breadcrumb: '購読者販売店一括置換',
              permission: 'dokusya.replace_hanbaiten',
            },
          },
        ],
      },

      // 単価マスタ (ACSMS-SCR-002 list, ACSMS-SCR-003 form). TankaCreate
      // / TankaEdit point at a TODO placeholder until SCR-003 ships —
      // see src/views/tanka/TankaFormView.vue. Registered now so the
      // list view's `router.push({ name: 'TankaCreate' })` resolves at
      // runtime instead of silent-failing with "no match for route".
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
          {
            path: 'create',
            name: 'TankaCreate',
            component: () => import('@/views/tanka/TankaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '単価マスタ明細検索画面', to: { name: 'TankaList' } },
                { label: '単価マスタ登録画面' },
              ],
              permission: 'tanka.create',
            },
          },
          {
            path: ':id/edit',
            name: 'TankaEdit',
            component: () => import('@/views/tanka/TankaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '単価マスタ明細検索画面', to: { name: 'TankaList' } },
                { label: '単価マスタ編集画面' },
              ],
              permission: 'tanka.update',
            },
          },
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

// Modern vue-router API — return a route target (or `true` to proceed)
// instead of calling next(). The next() callback is deprecated in
// vue-router 4.x.
router.beforeEach((to) => {
  const authStore = useAuthStore();

  // Already-authenticated users should skip the login / mfa screens.
  if (
    authStore.isAuthenticated &&
    (to.name === 'Login' || to.name === 'MfaVerify')
  ) {
    return { name: 'Dashboard' };
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }

  // [permission-any-of] meta.permission accepts either a single perm
  // string OR a string[] for "any-of" semantics. Used by routes that
  // unify two roles' entry points — e.g. HanbaitenList accepts both
  // `hanbaiten.view` (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) and
  // `hanbaiten.daiko_input` (NICHINO_STAFF 代行入力).
  if (to.meta.permission) {
    const required = to.meta.permission as string | string[];
    const perms = Array.isArray(required) ? required : [required];
    const allowed = perms.some((p) => authStore.hasPermission(p));
    if (!allowed) {
      // No /403 page — toast + bounce to dashboard. Avoids leaving the
      // user on a dead-end error screen; they always have a place to go.
      message.error('この画面へのアクセス権限がありません。');
      return { name: 'Dashboard' };
    }
  }

  return true;
});

export default router;
