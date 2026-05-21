// Screen: ACSMS-SCR-007 — 支店マスタ登録画面 (also used by SCR-006 list)
//
// Fixture builder for the Shiten entity. Values mirror m_shiten schema
// (docs/database/database-design.md §m_shiten — biko column added v1.3).
//
// Used in: shiten.service.spec, shiten.controller.spec, shiten.integration.spec.

import type { Shiten } from '@/database/entities/shiten.entity';

export function buildShiten(overrides: Partial<Shiten> = {}): Shiten {
  const now = new Date();
  return {
    shitenId: 1,
    jaId: 1,
    shitenCode: 'S01',
    shitenName: '本店営業部',
    shitenNameKana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
    kinyuShitenFlg: false,
    jastemToriatsukaiTenpoCode: '',
    jastemTenpoName: '',
    jastemTyokinShubetsu: '',
    jastemKozaNo: '',
    kanriShitenId: 1,
    biko: '',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Shiten;
}
