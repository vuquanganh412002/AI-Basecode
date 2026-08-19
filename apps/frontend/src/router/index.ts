import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth.store';
import { pageTitleFromMatched } from '@/composables/useBreadcrumb';

/**
 * ブランド名（index.html の初期 <title> と同じ VITE_APP_TITLE、未設定時は
 * agrinews）。タブタイトルは基本ページ名のみで、パンくずが無い画面のみ
 * このブランド名にフォールバックする。
 */
const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'agrinews';

const routes: RouteRecordRaw[] = [
  // ─── 認証（AuthLayout は各 view 内で適用） ─────────────────
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
  // ACSMS-SCR-012 — パスワードの再設定（リセットメール要求）
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },
  },
  // ACSMS-SCR-012 — パスワードの変更（トークン消費 + 新パスワード設定）
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { requiresAuth: false },
  },

  // ─── メインアプリ（MainLayout が全体をラップ） ────────────────────────
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
        meta: { breadcrumb: 'メニュー' },
      },

      // ─── パンくず規約（プロジェクト共通） ───────────────────────
      // 一覧 view: 2階層 — `ホーム > {Module}一覧`（sidebar / dashboard から入る。
      // 中間の「マスタ管理」グループラベルは持たない）。
      // 登録/編集 view: 3階層 — `ホーム > {Module}一覧 > {form-title}`。
      // 配列形式で中間ノードを一覧へ戻るリンクにする。
      // よって wrapper 親 route はパンくずを持たない（単なるパス接頭辞で、
      // ユーザーは `/ja` を直接訪れない）。
      // ────────────────────────────────────────────────────────────────

      // JAマスタ（ACSMS-SCR-004 一覧 / -005 フォーム）。フォーム view は
      // 登録・編集で共用。
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
                { label: 'JAマスタ登録' },
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
                { label: 'JAマスタ編集' },
              ],
              permission: 'ja.update',
            },
          },
        ],
      },

      // 管理支店マスタ（ACSMS-SCR-008 一覧、ACSMS-SCR-009 フォーム）。
      // KanriShitenCreate / KanriShitenEdit は ACSMS-SCR-009 出荷まで TODO placeholder
      // を指す — src/views/kanri-shiten/KanriShitenFormView.vue 参照。
      // 一覧 view の `router.push({ name: 'KanriShitenCreate' })` が無音失敗せず
      // 実行時に解決するよう今登録しておく。
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
                { label: '管理支店マスタ登録' },
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
                { label: '管理支店マスタ編集' },
              ],
              permission: 'kanri_shiten.update',
            },
          },
        ],
      },

      // 販売店マスタ（ACSMS-SCR-018 一覧、ACSMS-SCR-017 フォーム）。
      // HanbaitenCreate / HanbaitenEdit は ACSMS-SCR-017 出荷まで TODO placeholder
      // を指す — src/views/hanbaiten/HanbaitenFormView.vue 参照。
      // 一覧 view の `router.push({ name: 'HanbaitenCreate' })` が無音失敗せず
      // 実行時に解決するよう今登録しておく。
      {
        path: 'hanbaiten',
        children: [
          {
            path: '',
            name: 'HanbaitenList',
            component: () => import('@/views/hanbaiten/HanbaitenListView.vue'),
            meta: {
              breadcrumb: '販売店明細検索',
              // [perm-any-of] NICHINO_STAFF は `hanbaiten.daiko_input`（代行入力）を
              // 持つが `hanbaiten.view` は持たない。検索画面はロール対応の JA フィルタで
              // 両フローを統合する。
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
                { label: '販売店情報登録' },
              ],
              // [perm-any-of] HanbaitenList 参照 — NICHINO_STAFF は
              // `hanbaiten.daiko_input`、他の JA ロールは `hanbaiten.create` で作成。
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
                { label: '販売店情報編集' },
              ],
              // [perm-any-of] NICHINO_STAFF は `hanbaiten.daiko_input`、
              // 他の JA ロールは `hanbaiten.update` で編集。
              permission: ['hanbaiten.update', 'hanbaiten.daiko_input'],
            },
          },
          // ACSMS-SCR-019 — 販売店Excelデータ取込画面。
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

      // 支店マスタ（ACSMS-SCR-006 一覧、ACSMS-SCR-007 フォーム）。
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
                { label: '支店マスタ登録' },
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
                { label: '支店マスタ編集' },
              ],
              permission: 'shiten.update',
            },
          },
        ],
      },

      // アカウントマスタ（ACSMS-SCR-024 一覧、ACSMS-SCR-025 フォーム）。
      // NICHINO_ADMIN 専用（seeder.md §3 の `account.view`）。AccountCreate /
      // AccountEdit は ACSMS-SCR-025 出荷まで TODO placeholder を指す —
      // src/views/account/AccountFormView.vue 参照。一覧 view の
      // `router.push({ name: 'AccountCreate' })` が無音スキップせず実行時に
      // 解決するよう今登録しておく。
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
                { label: 'アカウントマスタ登録' },
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
                { label: 'アカウントマスタ編集' },
              ],
              permission: 'account.update',
            },
          },
        ],
      },

      // ロール管理画面（ACSMS-SCR-027）。screen-design.md に従い単一 view が
      // 一覧とインライン編集フォームの両方を担う（登録/編集の別 route なし）。
      // NICHINO_ADMIN 専用で、view 自体がロールチェック（ACSMS-MSG-027-006）を行う。
      // seeder.md に専用の role.* permission_code が無いため `meta.permission` なし
      // — 追加は BE 作業で、誤シードすると NICHINO_ADMIN からメニューを隠す恐れ。
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('@/views/roles/RoleManagementView.vue'),
        meta: { breadcrumb: 'ロール管理' },
      },

      // ログ参照画面（ACSMS-SCR-030）。読み取り専用一覧 + CSV 出力。
      // 全5ロールが `log.view` を持つ。DataScope はサーバ側で強制。
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

      // ファイルダウンロード画面（ACSMS-SCR-022）。読み取り専用一覧 +
      // プレビュー（S3 署名付き URL）+ バイナリダウンロード。全5ロールが
      // `file.download` を持つ。DataScope はサーバ側で強制。
      {
        path: 'file-download',
        name: 'FileDownload',
        component: () => import('@/views/file-download/FileDownloadView.vue'),
        meta: { breadcrumb: 'ファイルダウンロード', permission: 'file.download' },
      },

      // ファイルアップロード画面（ACSMS-SCR-023）。複数JA × 複数ファイルの
      // アップロード + 通知キュー + 論理削除。2026-06 以降は日農
      // （NICHINO_ADMIN / NICHINO_STAFF）のみが `file.upload` を保持
      // （migration 1711900900020）。DataScope はサーバ側で強制。
      {
        path: 'file-upload',
        name: 'FileUpload',
        component: () => import('@/views/file-upload/FileUploadView.vue'),
        meta: { breadcrumb: 'ファイルアップロード', permission: 'file.upload' },
      },

      // お知らせ一覧画面（ACSMS-SCR-031）。screen-design.md に従い単一 view が
      // 一覧 + 登録/編集フォームを担う（登録/編集の別 route なし）。seeder.md §3 の
      // `oshirase.view` 権限で NICHINO_ADMIN 専用。view 自体が権限を再チェックし、
      // 非 admin が URL に来ても API を叩かず ACSMS-MSG-031-006 を表示する。
      {
        path: 'oshirase',
        name: 'OshiraseList',
        component: () => import('@/views/oshirase/OshiraseManagementView.vue'),
        meta: { breadcrumb: 'お知らせ一覧', permission: 'oshirase.view' },
      },

      // 購読者マスタ（ACSMS-SCR-011 フォーム）。DokusyaList / DokusyaImport /
      // DokusyaReplaceHanbaiten は専用 SCR 出荷まで TODO placeholder view を指す。
      // MENU_SECTIONS エントリ（購読者明細検索 / 購読者Excelデータ取込 /
      // 統廃合販売店読者移行）がクリック時に無音失敗せず `router.hasRoute(name)`
      // で実行時解決するよう今登録しておく。
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
                { label: '購読者情報登録' },
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
                { label: '購読者情報編集' },
              ],
              permission: 'dokusya.update',
            },
          },
          {
            // ACSMS-SCR-013 — 購読者履歴情報画面（読み取り専用の履歴一覧）。
            path: ':id/rireki',
            name: 'DokusyaRireki',
            component: () => import('@/views/dokusya/DokusyaRirekiView.vue'),
            meta: {
              breadcrumb: [
                { label: '購読者明細検索', to: { name: 'DokusyaList' } },
                { label: '購読者履歴情報' },
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
              breadcrumb: '統廃合販売店読者移行',
              permission: 'dokusya.replace_hanbaiten',
            },
          },
        ],
      },

      // 単価マスタ（ACSMS-SCR-002 一覧、ACSMS-SCR-003 フォーム）。TankaCreate /
      // TankaEdit は ACSMS-SCR-003 出荷まで TODO placeholder を指す —
      // src/views/tanka/TankaFormView.vue 参照。一覧 view の
      // `router.push({ name: 'TankaCreate' })` が「no match for route」で
      // 無音失敗せず実行時に解決するよう今登録しておく。
      {
        path: 'tanka',
        children: [
          {
            path: '',
            name: 'TankaList',
            component: () => import('@/views/tanka/TankaListView.vue'),
            meta: {
              breadcrumb: '単価マスタ明細検索',
              permission: 'tanka.view',
            },
          },
          {
            path: 'create',
            name: 'TankaCreate',
            component: () => import('@/views/tanka/TankaFormView.vue'),
            meta: {
              breadcrumb: [
                { label: '単価マスタ明細検索', to: { name: 'TankaList' } },
                { label: '単価マスタ登録' },
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
                { label: '単価マスタ明細検索', to: { name: 'TankaList' } },
                { label: '単価マスタ編集' },
              ],
              permission: 'tanka.update',
            },
          },
        ],
      },
    ],
  },

  // ─── Catch-all ─────────────────────────────────────────────────────
  // /403 や /404 の専用ページは持たず、どちらも dashboard へ戻す。
  // 権限拒否は下のグローバルガードが処理（トースト + 遷移）。不明なパスは
  // 無音でリダイレクト（トーストなし — ユーザーが打った不正 URL を咎めない）。
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'Dashboard' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// vue-router 4.x の API — next() を呼ばず route ターゲット（または続行なら
// `true`）を返す。next() コールバックは 4.x で非推奨。
router.beforeEach((to) => {
  const authStore = useAuthStore();

  // 認証済みユーザーは login / mfa 画面をスキップする。
  if (
    authStore.isAuthenticated &&
    (to.name === 'Login' || to.name === 'MfaVerify')
  ) {
    return { name: 'Dashboard' };
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }

  // [permission-any-of] meta.permission は単一 perm 文字列、または「いずれか」
  // 意味の string[] を受ける。2ロールの入口を統合する route が使う — 例:
  // HanbaitenList は `hanbaiten.view`（CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN）と
  // `hanbaiten.daiko_input`（NICHINO_STAFF 代行入力）の両方を受け入れる。
  if (to.meta.permission) {
    const required = to.meta.permission as string | string[];
    const perms = Array.isArray(required) ? required : [required];
    const allowed = perms.some((p) => authStore.hasPermission(p));
    if (!allowed) {
      // /403 ページなし — トースト + dashboard へ戻す。行き止まりのエラー画面に
      // 留めず、常に行き先を用意する。
      message.error('この画面へのアクセス権限がありません。');
      return { name: 'Dashboard' };
    }
  }

  return true;
});

// ブラウザタブのタイトルをページごとに更新する。ページ名はパンくずの
// leaf ラベル（画面ヘッダと同一ソース = meta.breadcrumb）を再利用するため、
// ヘッダ表示とタブタイトルが常に一致する。ページ名が無い画面のみブランド名。
router.afterEach((to) => {
  document.title = pageTitleFromMatched(to.matched) ?? APP_TITLE;
  // 画面遷移時に開きっぱなしの Modal.confirm を強制的に閉じる（SPA route-change
  // クリーンアップ用の AntD 公式 API）。dropdown/select のポップアップは対象外
  // — 未確認のまま DOM を直接いじるのは Vue の仮想 DOM と齟齬を起こすリスクが
  // あるため触らない。
  Modal.destroyAll();
});

// デプロイでチャンクハッシュが変わった後、古いタブが遅延 import ルートの
// チャンクを 404 で取りに行くと reject される。ここで拾わないと
// `router.push`（サイドバー等）が黙って失敗し、クリックしても何も起きない
// ように見える。同じ遷移を繰り返しても直らないので、行き先へフルリロード
// して最新の manifest を取り直す。
router.onError((error, to) => {
  const isChunkLoadError =
    /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
      error.message,
    );
  if (isChunkLoadError) {
    window.location.assign(to.fullPath);
  }
});

export default router;
