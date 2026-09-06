// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// Fixtures for the 配達手数料支払情報 endpoints.
//   - buildHaitatsuryoQuery(...)  → HaitatsuryoQueryDto-shaped input (preview/export)
//   - buildHaitatsuryoAggRow(...) → one aggregated row from dataSource.query()
//
// The service runs a raw aggregation (CTE + DISTINCT ON latest snapshot, grouped
// by 販売店) and maps the resulting flat rows into `data[]` + a `meta` summary.
// These fixtures produce the per-販売店 aggregated row shape (snake_case, the SQL
// column aliases) the service consumes BEFORE mapping.

/** Valid query/body (target_month + optional cycle). */
export function buildHaitatsuryoQuery(overrides: Record<string, unknown> = {}) {
  return {
    target_month: '2026-04-01',
    haitatsuryo_shiharai_cycle: 3,
    ...overrides,
  } as any;
}

/**
 * One aggregated row as returned by the raw `dataSource.query(...)`. Defaults to
 * 東京中央販売店 (yokin_shubetsu=1 普通, 内税 588000 円). total_kingaku is already
 * computed in-DB using the JA's zei_kubun, so the service maps it straight through.
 */
export function buildHaitatsuryoAggRow(overrides: Record<string, unknown> = {}) {
  return {
    target_month: '202604',
    hanbaiten_id: 101,
    hanbaiten_code: 'H001',
    hanbaiten_name: '東京中央販売店',
    // 委託区分（m_code ITAKU_KUBUN）— 既定 1:振込。
    itaku_kubun: 1,
    total_busu: 120,
    total_kingaku: 588000,
    haitatsuryo_shiharai_cycle: 3,
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    bank_branch_code: '001',
    bank_branch_name: '本店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾄｳｷｮｳﾁｭｳｵｳﾊﾝﾊﾞｲﾃﾝ',
    // 配達手数料単価（1部）。total_kingaku 588000 ÷ total_busu 120 = 4900。
    tesuryo: 4900,
    biko: '',
    ...overrides,
  };
}
