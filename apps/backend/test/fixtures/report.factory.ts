// Screen: ACSMS-SCR-026 — 購読者名簿出力画面
//
// Fixtures for the 購読者名簿 (subscriber meibo) report endpoints:
//   - buildMeiboQuery(...)   → MeiboReportQueryDto-shaped query
//   - buildMeiboRawRow(...)  → one flat getRawMany() row (joined columns)
//
// The service runs a single QueryBuilder (`rirekiRepo.createQueryBuilder`)
// and calls `.getRawMany()`, then groups the rows in JS. These fixtures
// produce the flat row shape (snake_case, joined master names) the service
// consumes BEFORE grouping. Response-side keys (shimei / haitatsu_address /
// haitatsu_tel …) are asserted in the spec, not built here.

let seq = 0;
const nextId = () => ++seq;

/** Valid query for the 販売店別 (hanbaiten) report. */
export function buildMeiboQuery(overrides: Record<string, unknown> = {}) {
  return {
    tekiyo_date: '2026-04-01',
    report_type: 'hanbaiten',
    hanbaiten_ids: [1],
    kanri_shiten_ids: undefined,
    dokusya_shubetsu: undefined,
    shiharai_cycle: undefined,
    ...overrides,
  } as any;
}

/** Valid query for the 管理支店別 (kanri_shiten) report. */
export function buildKanriShitenMeiboQuery(overrides: Record<string, unknown> = {}) {
  return buildMeiboQuery({
    report_type: 'kanri_shiten',
    hanbaiten_ids: undefined,
    kanri_shiten_ids: [10],
    ...overrides,
  });
}

/**
 * One flat row as returned by `getRawMany()` — the joined snapshot of a
 * subscriber's latest t_dokusya_rireki record plus master names.
 * tetsuzuki_shurui=1 (新規) and dokusya_shubetsu=1 (紙版) by default.
 */
export function buildMeiboRawRow(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    dokusya_id: 1000 + id,
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    // 購読者氏名 / かな
    shimei_sei: '農業',
    shimei_mei: '太郎',
    shimei_kana_sei: 'ﾉｳｷﾞｮｳ',
    shimei_kana_mei: 'ﾀﾛｳ',
    // 配達先氏名 (used only when haitatsu_same_flg = false)
    haitatsu_same_flg: true,
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    kumiaiin_code: 'K0001',
    // 配達先住所 parts
    haitatsu_yubin_no: '1000001',
    haitatsu_shikuchoson: '東京都千代田区',
    haitatsu_chome_banchi: '千代田1-1',
    haitatsu_tatemono_mei: 'サンプルビル101',
    haitatsu_renrakusaki_1: '03-1234-5678',
    dokusya_kaishi_date: '2025-04-01',
    dokusya_busu: 1,
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    // joined master names
    kanri_shiten_id: 10,
    kanri_shiten_name: '中央管理支店',
    shiten_id: 20,
    shiten_name: '千代田支店',
    hanbaiten_id: 1,
    hanbaiten_name: '東京中央販売店',
    ...overrides,
  };
}

export function buildMeiboRawRows(
  count: number,
  overrides: Record<string, unknown> = {},
) {
  return Array.from({ length: count }, () => buildMeiboRawRow(overrides));
}
