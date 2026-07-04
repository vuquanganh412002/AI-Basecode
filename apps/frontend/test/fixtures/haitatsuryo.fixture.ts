// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// Fixtures for HaitatsuryoExportView.spec.ts — the aggregated preview envelope
// (`{ data, meta }`) + the authenticated user. Returns plain objects (no
// wrapper-type import) so the fixture compiles during the TDD red phase before
// /gen-code-frontend writes the wrapper.

/** CHUOKAI user holding haitatsuryo.export (route-guarded; the view has no in-view perm gate). */
export function buildHaitatsuryoUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 2,
    login_id: 'chuokai01',
    account_name: '中央会 太郎',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    kanri_shiten_id: null,
    permissions: ['haitatsuryo.export'],
    ...overrides,
  };
}

/**
 * Preview envelope (`{ data: [...], meta: {...} }`, mirrors API-021-001
 * レスポンス成功例). Two 販売店 aggregation rows + a meta summary (zei_kubun=1 内税).
 */
export function buildHaitatsuryoPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      {
        target_month: '202604',
        hanbaiten_id: 101,
        hanbaiten_code: 'H001',
        hanbaiten_name: '東京中央販売店',
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
        tesuryo: 4900,
        furikomi_tesuryo_futan_kubun: 1,
        biko: '',
      },
      {
        target_month: '202604',
        hanbaiten_id: 102,
        hanbaiten_code: 'H002',
        hanbaiten_name: '北支店販売店',
        total_busu: 80,
        total_kingaku: 392000,
        haitatsuryo_shiharai_cycle: 6,
        bank_code: '0001',
        bank_name: 'みずほ銀行',
        bank_branch_code: '002',
        bank_branch_name: '北支店',
        yokin_shubetsu: 2,
        koza_no: '7654321',
        koza_meigi: 'ｷﾀｼﾃﾝﾊﾝﾊﾞｲﾃﾝ',
        tesuryo: 4900,
        furikomi_tesuryo_futan_kubun: 2,
        biko: '月末締め',
      },
    ],
    meta: {
      total: 2,
      page: 1,
      per_page: 20,
      total_pages: 1,
      grand_total_busu: 200,
      grand_total_kingaku: 980000,
      zei_kubun: 1,
    },
    ...overrides,
  };
}

/** Empty preview (0 rows) → 200 + data:[] → FE shows ACSMS-MSG-021-003. */
export function buildEmptyHaitatsuryoPreviewResponse() {
  return {
    data: [],
    meta: {
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0,
      grand_total_busu: 0,
      grand_total_kingaku: 0,
      zei_kubun: 1,
    },
  };
}
