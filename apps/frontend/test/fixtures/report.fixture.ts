// Screen: ACSMS-SCR-026 — 購読者名簿出力画面
//
// Fixtures for MeiboReportView.spec.ts — preview response envelopes,
// dropdown lookups, and the authenticated user.

import type { MeiboPreviewEnvelope } from '@/api/report/report';

/** CHUOKAI user holding report.export_meibo (a JA account, per §1.2). */
export function buildReportUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 2,
    login_id: 'chuokai01',
    account_name: '中央会 太郎',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    kanri_shiten_id: null,
    permissions: ['report.export_meibo'],
    ...overrides,
  };
}

/** NICHINO_ADMIN — blocked on this screen (§1.2 → ACSMS-MSG-026-001). */
export function buildNichinoUser(overrides: Record<string, unknown> = {}) {
  return buildReportUser({
    account_id: 1,
    login_id: 'admin01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    permissions: ['ja.view'],
    ...overrides,
  });
}

/** 販売店別 preview envelope (`{ data: {...} }`, mirrors API-026-001). */
export function buildHanbaitenPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      report_type: 'hanbaiten',
      tekiyo_date: '2026-04-01',
      ja_name: 'JA東京中央会',
      ja_tel: '03-0000-0000',
      grand_total_busu: 3,
      hanbaiten_groups: [
        {
          hanbaiten_id: 1,
          hanbaiten_name: '東京中央販売店',
          hanbaiten_code: 'H001',
          hanbaiten_tel: '03-1111-1111',
          hanbaiten_fax: '03-1111-1112',
          total_busu: 3,
          kanri_shiten_groups: [
            {
              kanri_shiten_id: 10,
              kanri_shiten_name: '中央管理支店',
              subtotal_busu: 3,
              rows: [
                {
                  dokusya_id: 1001,
                  shimei: '農業 太郎',
                  shimei_kana: 'ﾉｳｷﾞｮｳ ﾀﾛｳ',
                  haitatsu_address: '〒1000001東京都千代田区千代田1-1',
                  kanri_shiten_name: '中央管理支店',
                  haitatsu_tel: '03-1234-5678',
                  dokusya_kaishi_date: '2025-04-01',
                  dokusya_busu: 3,
                },
              ],
            },
          ],
        },
      ],
      kanri_shiten_groups: [],
      ...overrides,
    },
  } as MeiboPreviewEnvelope;
}

/** 管理支店別 preview envelope. */
export function buildKanriShitenPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      report_type: 'kanri_shiten',
      tekiyo_date: '2026-04-01',
      ja_name: 'JA東京中央会',
      ja_tel: '03-0000-0000',
      grand_total_busu: 2,
      hanbaiten_groups: [],
      kanri_shiten_groups: [
        {
          kanri_shiten_id: 10,
          kanri_shiten_name: '中央管理支店',
          subtotal_busu: 2,
          total_busu: 2,
          rows: [
            {
              dokusya_id: 1001,
              dokusya_shubetsu: 1,
              shimei: '農業 太郎',
              shimei_kana: 'ﾉｳｷﾞｮｳ ﾀﾛｳ',
              kumiaiin_code: 'K0001',
              haitatsu_tel: '03-1234-5678',
              shiten_name: '千代田支店',
              haitatsu_address: '〒1000001東京都千代田区千代田1-1',
              dokusya_busu: 2,
              shiharai_hoho: 1,
              dokusya_kaishi_date: '2025-04-01',
              hanbaiten_name: '東京中央販売店',
            },
          ],
        },
      ],
      ...overrides,
    },
  } as MeiboPreviewEnvelope;
}

/** Empty preview (0 rows) → FE shows ACSMS-MSG-026-004. */
export function buildEmptyPreviewResponse() {
  return {
    data: {
      report_type: 'hanbaiten',
      tekiyo_date: '2026-04-01',
      ja_name: 'JA東京中央会',
      ja_tel: '03-0000-0000',
      grand_total_busu: 0,
      hanbaiten_groups: [],
      kanri_shiten_groups: [],
    },
  } as MeiboPreviewEnvelope;
}

/** 販売店プルダウン (ACSMS-API-COMMON-007). */
export function buildHanbaitenDropdownResponse() {
  return {
    data: [
      { hanbaiten_id: 1, hanbaiten_code: '1000000001', hanbaiten_name: '東京中央販売店' },
      { hanbaiten_id: 2, hanbaiten_code: '9999999999', hanbaiten_name: '電子版ダミー販売店' },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  };
}

/** 管理支店プルダウン (ACSMS-API-COMMON-004). */
export function buildKanriShitenDropdownResponse() {
  return {
    data: [
      { kanri_shiten_id: 10, kanri_shiten_code: '0010', kanri_shiten_name: '中央管理支店', paper_flg: true, denshi_flg: true },
      { kanri_shiten_id: 11, kanri_shiten_code: '0011', kanri_shiten_name: '北部管理支店', paper_flg: true, denshi_flg: true },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  };
}
