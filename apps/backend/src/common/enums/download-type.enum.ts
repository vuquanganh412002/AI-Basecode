/**
 * 出力種別 stored in `t_file_download.download_type`. One value per export
 * report. Mirror of `m_code.code_category = 'DOWNLOAD_TYPE'` (seeder.md §5).
 *
 * Group A: each value is a fixed, BE-owned identifier the export services
 * write when registering a download. The set is closed by design — a new
 * download type means a new report screen + code review, not a runtime
 * extension. Centralised here because the same 5 values were previously
 * redefined as local constants across report / koza-furikae / haitatsuryo
 * services.
 *
 * BE-only: the FE never branches on the VALUE (download history shows the
 * label via `useCodesStore().label('DOWNLOAD_TYPE', value)`), so there is no
 * FE mirror / enum-sync pair. Add one if the FE starts branching on it.
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
