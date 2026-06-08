// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//
// Fixture builder for the Ja entity. Values mirror m_ja schema
// (docs/database/database-design.md §m_ja) and the seeder
// (docs/database/seeder.md §m_ja).
//
// Used in: ja.service.spec, ja.integration.spec.

import type { Ja } from '@/database/entities/ja.entity';

export function buildJa(overrides: Partial<Ja> = {}): Ja {
  const now = new Date('2026-04-07T10:00:00Z');
  return {
    jaId: 1,
    jaCode: '1301001001',
    jaName: 'JA東京中央',
    jaNameKana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳ',
    todofukenCode: '13',
    yubinNo: '1000001',
    address: '東京都千代田区丸の内1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    email: 'info@ja-tokyo-chuo.or.jp',
    tantoBusho: '総務部',
    tantoName: '田中太郎',
    jastemItakushaCode: '',
    jastemItakushaName: '',
    jastemJaCode: '',
    jastemJaName: '',
    chuokaiFlg: true,
    zeiKubun: 1,
    biko: '',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Ja;
}
