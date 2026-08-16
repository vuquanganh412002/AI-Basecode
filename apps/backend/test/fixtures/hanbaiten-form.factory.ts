// Screen: ACSMS-SCR-017 — 販売店情報登録画面
//
// Fixture builders for the hanbaiten DETAIL / CREATE / UPDATE flow
// shared between ACSMS-SCR-017 service / controller / dto / integration
// specs. The ACSMS-SCR-018 fixture (`hanbaiten.factory.ts`) covers only the
// LIST shape — ACSMS-SCR-017 surfaces ~28 columns (bank/koza/torihikisaki_no
// etc.) so we keep a separate factory rather than widening the list
// factory and forcing every ACSMS-SCR-018 spec to ignore extra props.

import type { Hanbaiten } from '@/database/entities/hanbaiten.entity';

/**
 * Joined detail row shape returned by ACSMS-API-017-001 /-002 /-003.
 * Mirrors api.md §3 レスポンスデータ verbatim.
 */
export interface HanbaitenDetailResponse {
  hanbaiten_id: number;
  ja_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana: string;
  torihikisaki_no: string;
  todofuken_code: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_tanka_id: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  haiten_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export function buildHanbaitenDetailResponse(
  overrides: Partial<HanbaitenDetailResponse> = {},
): HanbaitenDetailResponse {
  return {
    hanbaiten_id: 1,
    ja_id: 1,
    hanbaiten_code: 'H001',
    hanbaiten_name: '販売店A',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
    torihikisaki_no: '1234567890123',
    todofuken_code: '13',
    yubin_no: '1000001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_tanka_id: 10,
    haitatsuryo_shiharai_cycle: 1,
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 500,
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    bank_branch_code: '001',
    bank_branch_name: '東京支店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ ﾀﾞｲﾋｮｳ',
    haiten_flg: false,
    biko: '特別な対応なし',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Entity-shape row — used as `repo.findOne` return value for UPDATE existence checks. */
export function buildHanbaitenDetailEntity(
  overrides: Partial<Hanbaiten> = {},
): Hanbaiten {
  const now = new Date();
  return {
    hanbaitenId: 1,
    jaId: 1,
    hanbaitenCode: 'H001',
    hanbaitenName: '販売店A',
    hanbaitenNameKana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
    torihikisakiNo: '1234567890123',
    todofukenCode: '13',
    yubinNo: '1000001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shochoName: '山田太郎',
    itakuKubun: 1,
    haitatsuryoTankaId: 10,
    haitatsuryoShiharaiCycle: 1,
    furikomiTesuryoFutanKubun: 1,
    furikomiTesuryo: 500,
    bankCode: '0001',
    bankName: 'みずほ銀行',
    bankBranchCode: '001',
    bankBranchName: '東京支店',
    yokinShubetsu: 1,
    kozaNo: '1234567',
    kozaMeigi: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ ﾀﾞｲﾋｮｳ',
    haitenFlg: false,
    biko: '特別な対応なし',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Hanbaiten;
}

/** Canonical raw row shape returned by `qb.getRawOne()` from buildDetailQuery. */
export function buildHanbaitenDetailRawRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hanbaiten_id: 1,
    ja_id: 1,
    hanbaiten_code: 'H001',
    hanbaiten_name: '販売店A',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
    torihikisaki_no: '1234567890123',
    todofuken_code: '13',
    yubin_no: '1000001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_tanka_id: 10,
    haitatsuryo_shiharai_cycle: 1,
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 500,
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    bank_branch_code: '001',
    bank_branch_name: '東京支店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ ﾀﾞｲﾋｮｳ',
    haiten_flg: false,
    biko: '特別な対応なし',
    created_at: new Date('2026-01-15T10:00:00Z'),
    updated_at: new Date('2026-03-10T14:30:00Z'),
    ...overrides,
  };
}

/**
 * Canonical valid CREATE body per api.md §リクエスト例 — committed
 * (振込) so every conditional-required field (No.17~23) is present.
 */
export function buildCreateHanbaitenBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hanbaiten_code: 'H001',
    hanbaiten_name: '販売店A',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
    torihikisaki_no: '1234567890123',
    todofuken_code: '13',
    yubin_no: '1000001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_tanka_id: 10,
    haitatsuryo_shiharai_cycle: 1,
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 500,
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    bank_branch_code: '001',
    bank_branch_name: '東京支店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ ﾀﾞｲﾋｮｳ',
    haiten_flg: false,
    biko: '特別な対応なし',
    ...overrides,
  };
}

/** Canonical valid UPDATE body per api.md §リクエスト例 (no hanbaiten_code — 更新不可). */
export function buildUpdateHanbaitenBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hanbaiten_name: '販売店A改定',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
    torihikisaki_no: '1234567890123',
    todofuken_code: '13',
    yubin_no: '1000001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_tanka_id: 10,
    haitatsuryo_shiharai_cycle: 1,
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 600,
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    bank_branch_code: '001',
    bank_branch_name: '東京支店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ ﾀﾞｲﾋｮｳ',
    haiten_flg: false,
    biko: '更新しました',
    ...overrides,
  };
}
