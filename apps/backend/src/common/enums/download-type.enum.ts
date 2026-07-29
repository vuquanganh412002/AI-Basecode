/**
 * 出力種別。`t_file_download.download_type` (帳票ごとに1値)。
 * Mirror of `m_code.code_category = 'DOWNLOAD_TYPE'` (seeder.md §5)。
 *
 * Group A: 各値は export サービスが書く固定の BE 所有 ID。set は設計上 closed
 * (新種別 = 新帳票画面 + code review、runtime 拡張ではない)。
 *
 * BE-only: FE は VALUE で分岐しない (履歴は
 * `useCodesStore().label('DOWNLOAD_TYPE', value)` 表示) → FE mirror / enum-sync
 * なし。FE が分岐し始めたら追加する。
 */
export const DownloadType = {
  /** 口座振替 (SCR-020) */
  KOZA_FURIKAE: 1,
  /** その他 — 配達手数料支払情報 (SCR-021) や命名規則に合致しないファイル等。 */
  OTHER: 2,
  /** 増減連絡票（販売店） (SCR-028) */
  ZOUGEN: 3,
  /** 増減通知書（日本農業新聞） (SCR-029) */
  ZOUGEN_NICHINO: 4,
  /** 購読者名簿 (SCR-026) */
  MEIBO: 5,
} as const;
export type DownloadType = (typeof DownloadType)[keyof typeof DownloadType];
