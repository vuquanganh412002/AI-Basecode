/**
 * メニュー定義の正 — AppSidebar（左レール）と DashboardView（ACSMS-SCR-010 メニューカード）
 * 双方の唯一の情報源。両者は同じプロダクトメニューを 2 通りに可視化したもの。このリストを二重定義しない。
 *
 * 権限監査: docs/requirement/account_concept.md（権限マトリクス）+
 * docs/database/seeder.md §3（m_roles_permissions）。表示フィルタは
 * `useMenu()`（src/composables/useMenu.ts）。
 */

export interface MenuItem {
  /** Vue Router のルート名。 */
  name: string;
  /** 日本語表示ラベル（account_concept.md マトリクスと一字一句一致）。 */
  label: string;
  /** Material Symbols / Material Icons 名。 */
  icon: string;
  /** 表示に必要な権限。常時表示（Dashboard 自身等）は省略。 */
  permission?: string;
  /**
   * true のとき、アカウントが少なくとも 1 つの 購読種別 フラグ
   * （m_account.paper_flg / denshi_flg）を持つことも要求する。権限はあるがどちらのフラグも無い
   * アカウントは項目が DISABLED（グレー、非表示ではない）— 購読者 の 登録/取込/一括置換 ができない
   * （account_concept.md §139-145）。ランタイムの `disabled` 状態は `useMenu()` が算出する。
   */
  requiresAnyDokusyaFlag?: boolean;
}

export interface MenuSection {
  /** セクション見出し。ルート無しの最上位項目（Dashboard）は省略。 */
  heading?: string;
  items: MenuItem[];
  /** サイドバー専用の余白調整（最終セクションの下 padding）。Dashboard は無視。 */
  extraClass?: string;
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    items: [{ name: 'Dashboard', label: 'メニュー', icon: 'home' }],
  },
  {
    heading: '購読者管理',
    items: [
      { name: 'DokusyaCreate', label: '購読者情報登録', icon: 'person_add', permission: 'dokusya.create', requiresAnyDokusyaFlag: true },
      { name: 'DokusyaImport', label: '購読者Excelデータ取込', icon: 'upload_file', permission: 'dokusya.import', requiresAnyDokusyaFlag: true },
      { name: 'DokusyaList', label: '購読者明細検索', icon: 'search', permission: 'dokusya.view' },
      { name: 'DokusyaReplaceHanbaiten', label: '統廃合販売店読者移行', icon: 'published_with_changes', permission: 'dokusya.replace_hanbaiten', requiresAnyDokusyaFlag: true },
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
      { name: 'KanriShitenList', label: '管理支店マスタ', icon: 'admin_panel_settings', permission: 'kanri_shiten.view' },
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
      { name: 'AccountList', label: 'アカウント管理', icon: 'manage_accounts', permission: 'account.view' },
      // NOTE: 独立した 販売店代行入力 項目は削除（2026-06）。NICHINO_STAFF は今や
      // 販売店管理 セクションの項目から 代行 フローに入り、`useMenu()` が当該ロール向けに
      // 販売店情報登録（代行）/ 販売店明細検索（代行）にラベルを付け替える。
      // `hanbaiten.daiko_input` 権限は残存 — HanbaitenFormView がスタッフの
      // JA ピッカー / 作成可否をこれで判定し続けるため。
      { name: 'RoleList', label: 'ロール管理', icon: 'security', permission: 'role.view' },
    ],
  },
];
