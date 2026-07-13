// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// Fixtures for the 口座振替データ出力 endpoints (ACSMS-API-020-001 / 020-002):
//   - buildExportKozaFurikaeQuery(...) → ExportKozaFurikaeDto-shaped POST body
//   - buildKozaFurikaeAggRow(...)      → one aggregated 購読者 row from the
//                                        export aggregation (dataSource.query)
//   - buildJaJastemRow(...)            → m_ja JASTEM 委託者情報 (initial / update)
//   - buildShitenJastemRow(...)        → m_shiten JASTEM 金融機関支店情報 (initial)
//
// The export aggregation is a raw SQL join (t_dokusya × m_hanbaiten × m_tanka ×
// m_shiten); these fixtures produce the per-購読者 flat-row shape (snake_case SQL
// aliases) the service consumes BEFORE building the Zengin CSV.

/**
 * Valid export body (api.md §リクエストパラメータ). v1.1: プレビューで確認・
 * 編集した `rows[]`（dokusya_id + furikae_kingaku）を含む。既定は集計モックの
 * 2 購読者（id 1・2）を各 4900 円で送る＝上書きしても金額は変わらない構成。
 */
export function buildExportKozaFurikaeQuery(
  overrides: Record<string, unknown> = {},
) {
  return {
    target_month: '2026-05-01',
    hikiotoshi_date: '2026-05-27',
    kanri_shiten_ids: [1, 2],
    shiten_ids: [],
    koza_shiten_ids: [10, 11],
    jastem_itakusha_code: '1234567890',
    jastem_itakusha_name: 'ニホンノウギョウシンブン',
    jastem_ja_code: '1234',
    jastem_ja_name: 'ニホンノウギョウ',
    jastem_toriatsukai_tenpo_code: '001',
    jastem_tenpo_name: 'ホンテン',
    jastem_tyokin_shubetsu: '1',
    jastem_koza_no: '1234567',
    rows: [
      { dokusya_id: 1, furikae_kingaku: 4900 },
      { dokusya_id: 2, furikae_kingaku: 4900 },
    ],
    ...overrides,
  } as any;
}

/** Valid preview body (API-020-003, v1.1). 集計フィルタのみ（JASTEM/金額なし）。 */
export function buildPreviewKozaFurikaeQuery(
  overrides: Record<string, unknown> = {},
) {
  return {
    target_month: '2026-05-01',
    hikiotoshi_date: '2026-05-27',
    kanri_shiten_ids: [1, 2],
    shiten_ids: [],
    koza_shiten_ids: [10, 11],
    ...overrides,
  } as any;
}

/**
 * One aggregated 購読者 row as returned by the raw export `dataSource.query(...)`
 * (api.md §4.3). Defaults: 山田 太郎, 口座引落(shiharai_hoho=1), 普通(1), 4900円.
 */
export function buildKozaFurikaeAggRow(overrides: Record<string, unknown> = {}) {
  return {
    dokusya_id: 1,
    koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
    bank_branch_code: '001',
    bank_branch_name: 'ﾎﾝﾃﾝ',
    bank_branch_name_kana: 'ﾎﾝﾃﾝ',
    hikiotoshi_yokin_shubetsu: 1,
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
    ja_id: 1,
    kanri_shiten_id: 1,
    shiten_id: 100,
    furikae_kingaku: 4900,
    koza_shiten_id: 10,
    bank_branch_code_master: '001',
    bank_branch_name_master: 'ﾎﾝﾃﾝ',
    ...overrides,
  };
}

/** m_ja JASTEM 委託者情報 (initial data §4.3 / update §4.5). Entity-shape (camelCase). */
export function buildJaJastemRow(overrides: Record<string, unknown> = {}) {
  return {
    jaId: 1,
    jastemItakushaCode: '1234567890',
    jastemItakushaName: 'ニホンノウギョウシンブン',
    jastemJaCode: '1234',
    jastemJaName: 'ニホンノウギョウ',
    ...overrides,
  };
}

/** m_shiten JASTEM 金融機関支店情報 (last-used, initial data §4.3). Entity-shape. */
export function buildShitenJastemRow(overrides: Record<string, unknown> = {}) {
  return {
    shitenId: 10,
    jaId: 1,
    kinyuShitenFlg: true,
    jastemToriatsukaiTenpoCode: '001',
    jastemTenpoName: 'ホンテン',
    jastemTyokinShubetsu: '1',
    jastemKozaNo: '1234567',
    ...overrides,
  };
}

/** Koza-shiten dropdown row (ACSMS-API-COMMON-008, m_shiten kinyu_shiten_flg=TRUE). */
export function buildKozaShitenDropdownRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    shiten_id: 10,
    shiten_code: '001',
    shiten_name: '本店',
    kanri_shiten_id: 1,
    ...overrides,
  };
}
