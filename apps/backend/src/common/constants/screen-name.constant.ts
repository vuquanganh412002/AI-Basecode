/**
 * 監査ログ（`t_log.gamen_name` / `buildAuditCtx` の `screenName` 引数）へ書き込む
 * 画面名の一覧。
 *
 * 各 `*.service.ts` にローカル定義されていたのを集約した（不具合修正2026-08）。
 * それまでは `SCREEN_NAME` / `SCR017_SCREEN_NAME` / `SCREEN_NAME_SCR002` /
 * `ZOUGEN_SCREEN_NAME` のようにファイルごとに命名がバラバラで、同じ画面
 * （ACSMS-SCR-014・ACSMS-SCR-022）の文字列が複数ファイルに重複定義されている
 * ケースもあった。
 *
 * キーは `ACSMS_SCR_0XX`（画面設計書の番号そのまま）で統一。番号を持たない
 * 例外が `ACCOUNT_SETTINGS_HEADER`（ヘッダーからのアカウント設定操作 —
 * 特定の画面番号に紐付かないため）と `*_BATCH`（`src/modules/batch/**`
 * の各バッチが `t_log.gamen_name` へ書き込む識別名 — 画面ではなく実行体だが
 * 同じ集約先に置くことで重複定義を防ぐ）。
 */
export const ScreenName = {
  ACSMS_SCR_002: '単価マスタ明細検索画面 (ACSMS-SCR-002)',
  ACSMS_SCR_003: '単価マスタ登録画面 (ACSMS-SCR-003)',
  ACSMS_SCR_004: 'JAマスタ明細検索画面 (ACSMS-SCR-004)',
  ACSMS_SCR_005: 'JAマスタ登録画面 (ACSMS-SCR-005)',
  ACSMS_SCR_006: '支店マスタ明細検索画面 (ACSMS-SCR-006)',
  ACSMS_SCR_007: '支店マスタ登録画面 (ACSMS-SCR-007)',
  ACSMS_SCR_008: '管理支店マスタ明細検索画面 (ACSMS-SCR-008)',
  ACSMS_SCR_009: '管理支店マスタ登録画面 (ACSMS-SCR-009)',
  ACSMS_SCR_011: '購読者情報登録画面 (ACSMS-SCR-011)',
  ACSMS_SCR_012: 'パスワード再設定画面 (ACSMS-SCR-012)',
  ACSMS_SCR_013: '購読者履歴情報画面 (ACSMS-SCR-013)',
  ACSMS_SCR_014: '購読者明細検索画面 (ACSMS-SCR-014)',
  ACSMS_SCR_015: '統廃合販売店読者移行画面 (ACSMS-SCR-015)',
  ACSMS_SCR_016: '購読者Excelデータ取込画面 (ACSMS-SCR-016)',
  ACSMS_SCR_017: '販売店情報登録画面 (ACSMS-SCR-017)',
  ACSMS_SCR_018: '販売店明細検索画面 (ACSMS-SCR-018)',
  ACSMS_SCR_019: '販売店Excelデータ取込画面 (ACSMS-SCR-019)',
  ACSMS_SCR_020: '口座振替データ出力画面 (ACSMS-SCR-020)',
  ACSMS_SCR_021: '配達手数料支払情報出力画面 (ACSMS-SCR-021)',
  ACSMS_SCR_022: 'ファイルダウンロード画面 (ACSMS-SCR-022)',
  ACSMS_SCR_023: 'ファイルアップロード画面 (ACSMS-SCR-023)',
  ACSMS_SCR_024: 'アカウントマスタ明細検索画面 (ACSMS-SCR-024)',
  ACSMS_SCR_025: 'アカウントマスタ登録画面 (ACSMS-SCR-025)',
  ACSMS_SCR_026: '購読者名簿出力画面 (ACSMS-SCR-026)',
  ACSMS_SCR_027: 'ロール管理画面 (ACSMS-SCR-027)',
  ACSMS_SCR_028: '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)',
  ACSMS_SCR_029: '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)',
  ACSMS_SCR_030: 'ログ参照画面 (ACSMS-SCR-030)',
  ACSMS_SCR_031: 'お知らせ一覧画面 (ACSMS-SCR-031)',
  ACCOUNT_SETTINGS_HEADER: 'アカウント設定 (HEADER)',
  DOKUSYA_SYNC_BATCH: '電子版読者同期バッチ (DOKUSYA-SYNC)',
  TANKA_EXPIRE_BATCH: '単価有効期限切れバッチ (TANKA-EXPIRE)',
  FILE_CLEANUP_BATCH: 'ファイル削除バッチ (FILE-CLEANUP)',
  LOG_CLEANUP_BATCH: 'ログ保持期間クリーンアップバッチ (LOG-CLEANUP)',
} as const;
export type ScreenName = (typeof ScreenName)[keyof typeof ScreenName];
