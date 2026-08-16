// Screen: ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// Fixtures for ZougenHanbaitenReportView.spec.ts — preview response
// envelopes + the authenticated users (JA account vs blocked 日農 account).
// Returns plain objects (no wrapper-type import) so the fixture compiles
// during the TDD red phase before /gen-code-frontend writes the wrapper.

/** CHUOKAI user holding report.export_zougen_hanbaiten (a JA account, §1.2). */
export function buildZougenReportUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 2,
    login_id: 'chuokai01',
    account_name: '中央会 太郎',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    kanri_shiten_id: null,
    permissions: ['report.export_zougen_hanbaiten'],
    ...overrides,
  };
}

/** NICHINO_ADMIN — blocked on this screen (§1.2 → ACSMS-MSG-028-001). */
export function buildZougenNichinoUser(overrides: Record<string, unknown> = {}) {
  return buildZougenReportUser({
    account_id: 1,
    login_id: 'admin01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    permissions: ['ja.view'],
    ...overrides,
  });
}

/**
 * Preview envelope (`{ data: {...} }`, mirrors ACSMS-API-028-001 レスポンス成功例).
 * One report carrying 増部 / 減部 / 住所変更 records.
 */
export function buildZougenPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      tekiyo_date: '2026-05-01',
      reports: [
        {
          hanbaiten_id: 200,
          hanbaiten_code: 'H001',
          hanbaiten_name: '千代田販売店',
          kanri_shiten_id: 20,
          kanri_shiten_name: 'JA東京中央 本店管理支店',
          kanri_shiten_tel: '03-1234-5678',
          kanri_shiten_fax: '03-1234-5679',
          zoubu: [
            {
              busu: '1 → 2',
              address: '東京都千代田区神田1-1-1 神田ビル101',
              name: '農業 太郎',
              delivery_name: '農業 太郎',
              phone: '03-1111-2222',
              biko: '',
            },
          ],
          genbu: [
            {
              busu: '3 → 1',
              address: '東京都千代田区丸の内2-2-2',
              name: '新聞 次郎',
              delivery_name: '新聞 次郎',
              phone: '03-3333-4444',
              biko: '',
            },
          ],
          address_change: [
            {
              label: '変更前',
              address: '東京都中央区銀座3-3-3',
              name: '購読 花子',
              delivery_name: '購読 花子',
              phone: '03-5555-6666',
              biko: '',
            },
            {
              label: '変更後',
              address: '東京都港区赤坂4-4-4 赤坂タワー505',
              name: '購読 花子',
              delivery_name: '購読 花子',
              phone: '03-5555-6666',
              biko: '',
            },
          ],
        },
      ],
      ...overrides,
    },
  };
}

/** Empty preview (0 reports) → FE shows ACSMS-MSG-028-002. */
export function buildEmptyZougenPreviewResponse() {
  return {
    data: {
      tekiyo_date: '2026-05-01',
      reports: [],
    },
  };
}
