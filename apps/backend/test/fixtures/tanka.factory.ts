// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面
//          ACSMS-SCR-003 — 単価マスタ登録画面 (forward — same entity)
//
// Fixture builder for the Tanka entity. Values mirror m_tanka schema
// (docs/database/database-design.md §m_tanka).
//
// `tanka_type` valid values come from m_code category 'TANKA_TYPE':
//   1 = 購読料, 2 = 配達手数料 (per docs/database/seeder.md §5.8)
//
// Used in: tanka.service.spec, tanka.controller.spec, tanka.integration.spec.

import type { Tanka } from '@/database/entities/tanka.entity';

let seq = 0;
const nextId = () => ++seq;

/**
 * `today + days` as a JST `YYYY-MM-DD` string. Used so the CREATE payload's
 * 適用開始日 stays in the future relative to the real clock — the service's
 * create date-range guard rejects past start dates, and a hardcoded literal
 * would rot into the past over time.
 */
function jstIsoPlusDays(days: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + days * 86_400_000));
}

export function buildTanka(overrides: Partial<Tanka> = {}): Tanka {
  // Wall-clock now — avoid hardcoded literal so the fixture doesn't
  // become a time-bomb against the service's own date-based checks
  // (`tekiyo_end_date >= CURRENT_DATE`).
  const now = new Date();
  return {
    tankaId: nextId(),
    jaId: 1,
    tankaCode: 'T001',
    tankaType: 1,
    tankaName: '基本購読料（月額）',
    kingakuZeikomi: 4900,
    kingakuZeinuki: 4455,
    taxRate: 10.0,
    tekiyoStartDate: '2026-01-01',
    tekiyoEndDate: null,
    biko: '',
    activeFlg: true,
    campaignFlg: false,
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Tanka;
}

export function buildTankaList(
  count: number,
  overrides: Partial<Tanka> = {},
): Tanka[] {
  return Array.from({ length: count }, () => buildTanka(overrides));
}

/**
 * Default-valid CreateTankaDto payload — every required field per
 * `docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md` §ACSMS-API-003-002
 * リクエストパラメータ. Optional fields included with sensible defaults so
 * happy-path tests don't have to repeat them.
 */
export function buildCreateTankaPayload(overrides: Record<string, unknown> = {}) {
  return {
    tanka_type: 1,
    tanka_code: 'T100',
    tanka_name: '新規単価',
    tax_rate: 10,
    kingaku_zeikomi: 1100,
    kingaku_zeinuki: 1000,
    // Future-relative so the create date-range guard (適用開始日 >= today)
    // never rots against the real clock.
    tekiyo_start_date: jstIsoPlusDays(14),
    tekiyo_end_date: jstIsoPlusDays(379),
    biko: '',
    active_flg: true,
    campaign_flg: false,
    ...overrides,
  };
}

/**
 * Default-valid UpdateTankaDto payload. Same shape as Create MINUS
 * `tanka_code` — per api.md §ACSMS-API-003-003 note: "tanka_code は更新不可".
 */
export function buildUpdateTankaPayload(overrides: Record<string, unknown> = {}) {
  return {
    tanka_type: 1,
    tanka_name: '基本購読料（月額）改定',
    tax_rate: 10,
    kingaku_zeikomi: 5200,
    kingaku_zeinuki: 4727,
    tekiyo_start_date: '2026-04-01',
    tekiyo_end_date: '2027-03-31',
    biko: '',
    active_flg: true,
    campaign_flg: false,
    ...overrides,
  };
}
