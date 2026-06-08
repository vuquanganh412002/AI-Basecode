// Test fixtures for ACSMS-SCR-017 (販売店情報登録画面).
// Shapes mirror docs/design/ACSMS-SCR-017/ACSMS-SCR-017-api.md.
//
// The SCR-018 fixture (`hanbaiten.fixture.ts`) covers the LIST shape
// (~18 fields). SCR-017 surfaces the DETAIL shape (~28 fields incl.
// bank/koza/torihikisaki_no) — we keep a separate fixture rather than
// widening the list-side and forcing every SCR-018 spec to ignore the
// extra props.

export interface HanbaitenDetail {
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

export interface CreateHanbaitenForm {
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
}

export type UpdateHanbaitenForm = Omit<CreateHanbaitenForm, 'hanbaiten_code'>;

/** Default DETAIL response (API-017-001) used for edit-mode mounts. */
export function buildHanbaitenDetail(
  overrides: Partial<HanbaitenDetail> = {},
): HanbaitenDetail {
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

/**
 * Canonical valid CREATE body — itaku_kubun=1 (振込) so every
 * conditional-required field (No.17-23) is present. Spec uses this
 * as the happy-path baseline and `overrides` to flip individual
 * fields for validation tests.
 */
export function buildCreateHanbaitenForm(
  overrides: Partial<CreateHanbaitenForm> = {},
): CreateHanbaitenForm {
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

/** Canonical valid UPDATE body (no hanbaiten_code — 更新不可). */
export function buildUpdateHanbaitenForm(
  overrides: Partial<UpdateHanbaitenForm> = {},
): UpdateHanbaitenForm {
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

// ─── Todofuken dropdown (COMMON-001) ───────────────────────────────

export interface TodofukenItem {
  todofuken_code: string;
  todofuken_name: string;
}

export function buildTodofukenList(): TodofukenItem[] {
  return [
    { todofuken_code: '01', todofuken_name: '北海道' },
    { todofuken_code: '13', todofuken_name: '東京都' },
    { todofuken_code: '14', todofuken_name: '神奈川県' },
    { todofuken_code: '27', todofuken_name: '大阪府' },
    { todofuken_code: '47', todofuken_name: '沖縄県' },
  ];
}

// ─── m_code seed data for useCodesStore initialState ───────────────
//
// Use this in createTestingPinia({ initialState: { codes: { all: ... } } })
// so that <a-radio v-for="opt in codes.options('X')"> templates render
// their option branches (otherwise the inner template node never
// instantiates and coverage suffers).

export function buildCodesSeed(): Record<string, Array<{
  value: number;
  label: string;
  label_short: string;
}>> {
  return {
    ITAKU_KUBUN: [
      { value: 1, label: '振込', label_short: '振込' },
      { value: 2, label: '日農委託', label_short: '日農委託' },
      { value: 9, label: 'その他', label_short: 'その他' },
    ],
    YOKIN_SHUBETSU: [
      { value: 1, label: '普通', label_short: '普通' },
      { value: 2, label: '当座', label_short: '当座' },
    ],
    TESURYO_KUBUN: [
      { value: 1, label: 'JA', label_short: 'JA' },
      { value: 2, label: '販売店', label_short: '販売店' },
    ],
  };
}
