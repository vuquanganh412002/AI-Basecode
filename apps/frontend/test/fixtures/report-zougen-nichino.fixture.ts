// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// Fixtures for ZougenNichinoReportView.spec.ts — preview response envelopes +
// the authenticated users (JA account vs blocked 日農 account). Returns plain
// objects (no wrapper-type import) so the fixture compiles during the TDD red
// phase before /gen-code-frontend writes the wrapper.

/** CHUOKAI user holding report.export_zougen_nichino (a JA account, §1.2). */
export function buildNichinoReportUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 2,
    login_id: 'chuokai01',
    account_name: '中央会 太郎',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    kanri_shiten_id: null,
    permissions: ['report.export_zougen_nichino'],
    ...overrides,
  };
}

/** NICHINO_ADMIN — blocked on this screen (§1.2 → ACSMS-MSG-029-001). */
export function buildNichinoBlockedUser(overrides: Record<string, unknown> = {}) {
  return buildNichinoReportUser({
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
 * Preview envelope (`{ data: {...} }`, mirrors ACSMS-API-029-001 レスポンス成功例).
 * One report (= 1 管理支店) carrying two 明細行 + a 合計行. Row 1 is 免税
 * (（免）prefix) + 委託; row 2 is non-委託 with a diff_mark.
 */
export function buildNichinoPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      tekiyo_date: '2026-03-01',
      reports: [
        {
          kanri_shiten_id: 20,
          kanri_shiten_code: '1AA3300001',
          kanri_shiten_name: '本店管理支店',
          ja_name: 'JA東京中央',
          todofuken_name: '東京都',
          tanto_busho: '業務部',
          tanto_name: '農協 太郎',
          tel: '03-1234-5678',
          fax: '03-1234-5679',
          rows: [
            {
              hanbaiten_id: 200,
              itaku_label: '委託',
              hanbaiten_code: '12345678',
              hanbaiten_name: '（免）A販売店',
              genzai_busu: 10,
              zou_busu: 0,
              gen_busu: 1,
              shin_busu: 9,
              diff_mark: false,
            },
            {
              hanbaiten_id: 201,
              itaku_label: '',
              hanbaiten_code: '12345679',
              hanbaiten_name: 'B販売店',
              genzai_busu: 5,
              zou_busu: 2,
              gen_busu: 0,
              shin_busu: 7,
              diff_mark: true,
            },
          ],
          total: { genzai_busu: 15, zou_busu: 2, gen_busu: 1, shin_busu: 16 },
        },
      ],
      ...overrides,
    },
  };
}

/** Empty preview (0 reports) → FE shows ACSMS-MSG-029-002. */
export function buildEmptyNichinoPreviewResponse() {
  return {
    data: {
      tekiyo_date: '2026-03-01',
      reports: [],
    },
  };
}
