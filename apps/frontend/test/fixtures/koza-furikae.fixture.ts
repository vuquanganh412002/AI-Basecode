// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// Fixtures for KozaFurikaeExportView.spec.ts — the initial-data envelope
// (ACSMS-API-020-001), dropdown envelopes (COMMON-004/006/008) + the authenticated
// user. Returns plain objects (no wrapper-type import) so the fixture compiles
// during the TDD red phase before /gen-code-frontend writes the wrapper.

/** CHUOKAI user holding koza_furikae.export (route-guarded; no in-view perm gate). */
export function buildKozaFurikaeUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 2,
    login_id: 'chuokai01',
    account_name: '中央会 太郎',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    kanri_shiten_id: null,
    permissions: ['koza_furikae.export'],
    ...overrides,
  };
}

/** 初期データ（ACSMS-API-020-001 §レスポンス成功例）。JASTEM 委託者 + 最終使用支店。 */
export function buildKozaFurikaeInitial(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      ja_id: 1,
      jastem_itakusha_code: '1234567890',
      jastem_itakusha_name: 'ニホンノウギョウシンブン',
      jastem_ja_code: '1234',
      jastem_ja_name: 'ニホンノウギョウ',
      jastem_toriatsukai_tenpo_code: '001',
      jastem_tenpo_name: 'ホンテン',
      jastem_tyokin_shubetsu: '1',
      jastem_koza_no: '1234567',
      ...overrides,
    },
  };
}

/** 管理支店ドロップダウン（COMMON-004）。 */
export function buildKanriShitenDropdown() {
  return {
    data: [
      { kanri_shiten_id: 1, kanri_shiten_code: 'KS01', kanri_shiten_name: '千代田支所', paper_flg: true, denshi_flg: true },
      { kanri_shiten_id: 2, kanri_shiten_code: 'KS02', kanri_shiten_name: '渋谷支所', paper_flg: true, denshi_flg: true },
    ],
  };
}

/** 支店ドロップダウン（COMMON-006）。`ShitenDropdownEnvelope` の形に合わせる。 */
export function buildShitenDropdown() {
  return {
    data: [
      { shiten_id: 100, shiten_code: '001', shiten_name: '千代田支店', kanri_shiten_id: 1, kinyu_shiten_flg: false },
      { shiten_id: 101, shiten_code: '002', shiten_name: '渋谷支店', kanri_shiten_id: 2, kinyu_shiten_flg: false },
    ],
  };
}

/** 口座支店ドロップダウン（COMMON-008、kinyu_shiten_flg=TRUE）。 */
export function buildKozaShitenDropdown() {
  return {
    data: [
      {
        shiten_id: 10,
        shiten_code: '001',
        shiten_name: '本店',
        kanri_shiten_id: 1,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: 'ホンテン',
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      },
      {
        shiten_id: 11,
        shiten_code: '002',
        shiten_name: '北支店',
        kanri_shiten_id: 1,
        jastem_toriatsukai_tenpo_code: '002',
        jastem_tenpo_name: 'キタシテン',
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '7654321',
      },
    ],
  };
}

/** Valid 作成開始 フォーム値（必須項目すべて埋まった状態）。 */
export function buildKozaFurikaeForm(overrides: Record<string, unknown> = {}) {
  return {
    target_month: '2026-05-01',
    hikiotoshi_date: '2026-05-27',
    kanri_shiten_ids: [],
    shiten_ids: [],
    // 口座支店を選択 → Part B 店舗情報が選択した shiten から自動補完される。
    koza_shiten_ids: [10],
    jastem_itakusha_code: '1234567890',
    jastem_itakusha_name: 'ニホンノウギョウシンブン',
    jastem_ja_code: '1234',
    jastem_ja_name: 'ニホンノウギョウ',
    jastem_toriatsukai_tenpo_code: '001',
    jastem_tenpo_name: 'ホンテン',
    jastem_tyokin_shubetsu: '1',
    jastem_koza_no: '1234567',
    ...overrides,
  };
}

/** プレビュー一覧レスポンス（ACSMS-API-020-003, v1.1）。既定は2件。 */
export function buildKozaPreview(overrides: Record<string, unknown> = {}) {
  const data = [
    {
      dokusya_id: 1,
      koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
      kanri_shiten_id: 1,
      bank_branch_code: '001',
      bank_branch_name: 'ﾎﾝﾃﾝ',
      hikiotoshi_yokin_shubetsu: 1,
      hikiotoshi_koza_no: '1234567',
      furikae_kingaku: 4900,
    },
    {
      dokusya_id: 2,
      koza_meigi: 'ｽｽﾞｷ ﾊﾅｺ',
      kanri_shiten_id: 1,
      bank_branch_code: '002',
      bank_branch_name: 'ｷﾀｼﾃﾝ',
      hikiotoshi_yokin_shubetsu: 1,
      hikiotoshi_koza_no: '7654321',
      furikae_kingaku: 4900,
    },
  ];
  return {
    data,
    meta: { total: data.length, page: 1, per_page: data.length, total_pages: 1 },
    ...overrides,
  };
}
