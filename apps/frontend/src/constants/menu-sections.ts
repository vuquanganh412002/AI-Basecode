/**
 * Canonical menu definition — single source of truth for both AppSidebar
 * (left rail) and DashboardView (SCR-010 menu cards). Both surfaces are the
 * same product menu visualised two ways; do not duplicate this list.
 *
 * Permissions audit: docs/requirement/account_concept.md (権限マトリクス) +
 * docs/database/seeder.md §3 (m_roles_permissions). Visibility filter lives in
 * `useMenu()` (src/composables/useMenu.ts).
 */

export interface MenuItem {
  /** Vue Router route name. */
  name: string;
  /** Japanese display label (matches account_concept.md matrix verbatim). */
  label: string;
  /** Material Symbols / Material Icons name. */
  icon: string;
  /** Required permission to show this item. Omit for always-visible (e.g. Dashboard itself). */
  permission?: string;
}

export interface MenuSection {
  /** Section header. Omit for the rootless top-level entry (Dashboard). */
  heading?: string;
  items: MenuItem[];
  /** Sidebar-only spacing tweak (last section bottom padding). Dashboard ignores. */
  extraClass?: string;
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    items: [{ name: 'Dashboard', label: 'メニュー画面', icon: 'home' }],
  },
  {
    heading: '購読者管理',
    items: [
      { name: 'DokusyaCreate', label: '購読者情報登録', icon: 'person_add', permission: 'dokusya.create' },
      { name: 'DokusyaImport', label: '購読者Excelデータ取込', icon: 'upload_file', permission: 'dokusya.import' },
      { name: 'DokusyaList', label: '購読者明細検索', icon: 'search', permission: 'dokusya.view' },
      { name: 'DokusyaReplaceHanbaiten', label: '購読者販売店一括置換', icon: 'published_with_changes', permission: 'dokusya.replace_hanbaiten' },
    ],
  },
  {
    heading: '販売店管理',
    items: [
      { name: 'HanbaitenCreate', label: '販売店情報登録', icon: 'store', permission: 'hanbaiten.create' },
      { name: 'HanbaitenImport', label: '販売店Excelデータ取込', icon: 'sim_card_download', permission: 'hanbaiten.import' },
      { name: 'HanbaitenList', label: '販売店明細検索', icon: 'find_in_page', permission: 'hanbaiten.view' },
    ],
  },
  {
    heading: 'データ作成',
    items: [
      { name: 'KozaFurikaeExport', label: '口座振替データ出力', icon: 'account_balance', permission: 'koza_furikae.export' },
      { name: 'HaitatsuryoExport', label: '配達手数料支払情報出力', icon: 'payments', permission: 'haitatsuryo.export' },
    ],
  },
  {
    heading: 'レポート作成',
    items: [
      { name: 'ReportMeibo', label: '購読者名簿', icon: 'assignment', permission: 'report.export_meibo' },
      { name: 'ReportZougenHanbaiten', label: '増減連絡票（販売店）', icon: 'trending_up', permission: 'report.export_zougen_hanbaiten' },
      { name: 'ReportZougenNichino', label: '増減通知（日本農業新聞）', icon: 'newspaper', permission: 'report.export_zougen_nichino' },
    ],
  },
  {
    heading: 'マスタ管理',
    items: [
      { name: 'TankaList', label: '単価マスタ', icon: 'settings_suggest', permission: 'tanka.view' },
      { name: 'JaList', label: 'JAマスタ', icon: 'domain', permission: 'ja.view' },
      { name: 'ShitenList', label: '支店マスタ', icon: 'apartment', permission: 'shiten.view' },
    ],
  },
  {
    heading: 'その他',
    items: [
      { name: 'FileUpload', label: 'ファイルアップロード', icon: 'upload', permission: 'file.upload' },
      { name: 'FileDownload', label: 'ファイルダウンロード', icon: 'download', permission: 'file.download' },
    ],
  },
  {
    heading: '管理者機能',
    extraClass: 'pb-10',
    items: [
      { name: 'LogList', label: 'ログ参照', icon: 'history', permission: 'log.view' },
      { name: 'OshiraseList', label: 'お知らせ管理', icon: 'campaign', permission: 'oshirase.view' },
      { name: 'KanriShitenList', label: '管理支店マスタ', icon: 'admin_panel_settings', permission: 'kanri_shiten.view' },
      { name: 'AccountList', label: 'アカウント管理', icon: 'manage_accounts', permission: 'account.view' },
      // 販売店代行入力 = NICHINO_STAFF only (account_concept.md ※2 +
      // ACSMS-SCR-010 §3.2 "HANBAITEN_PROXY_INPUT権限"). Cannot reuse
      // hanbaiten.create — CHUOKAI/JA_HONTEN/JA_KANRI all have it and they
      // already see the regular 販売店情報登録 entry. Dedicated permission is
      // granted exclusively to role_id=2 in migration
      // 1711900900008-SeedRoleAndDaikoPermissions.
      { name: 'HanbaitenDaikoInput', label: '販売店代行入力', icon: 'upload', permission: 'hanbaiten.daiko_input' },
      { name: 'RoleList', label: 'ロール管理', icon: 'security', permission: 'role.view' },
    ],
  },
];
