// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面
//
// Fixture builder for the KanriShiten entity. Values mirror m_kanri_shiten
// schema (docs/database/database-design.md §m_kanri_shiten).
//
// Used in: kanri-shiten.service.spec, kanri-shiten.integration.spec.

import type { KanriShiten } from '@/database/entities/kanri-shiten.entity';

export function buildKanriShiten(overrides: Partial<KanriShiten> = {}): KanriShiten {
  const now = new Date();
  return {
    kanriShitenId: 1,
    jaId: 1,
    kanriShitenCode: '013-3300-001',
    kanriShitenName: 'JA北海道中央管理支店',
    kanriShitenNameKana: 'ジェイエイホッカイドウチュウオウカンリシテン',
    yubinNo: '0600001',
    todofukenCode: '01',
    address: '札幌市中央区北1条西2丁目',
    tel: '0112223333',
    fax: '0112223334',
    paperFlg: true,
    denshiFlg: true,
    biko: '',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as KanriShiten;
}
