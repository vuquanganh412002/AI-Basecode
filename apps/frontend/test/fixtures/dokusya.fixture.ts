// Test fixtures for ACSMS-SCR-011 (購読者情報登録画面).
//
// Shapes mirror docs/design/ACSMS-SCR-011/ACSMS-SCR-011-api.md §レスポンス
// + the BE response DTO at apps/backend/src/modules/dokusya/dto/
// dokusya-response.dto.ts. The CREATE / UPDATE form bodies follow the
// CreateDokusyaDto / UpdateDokusyaDto shape from the same BE module
// (snake_case, every required field present so happy-path assertions
// don't have to repeat them).
//
// m_code numeric values (DOKUSYA_SHUBETSU / TETSUZUKI_SHURUI /
// SHIHARAI_HOHO / YUBIN_KUBUN / GENDER / MAIL_MAGAZINE_FLG /
// YOKIN_SHUBETSU) come from docs/database/seeder.md §5.

export interface DokusyaDetail {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number;
  shiten_id: number;
  kumiaiin_code: string;
  dokusya_shubetsu: number;
  tetsuzuki_shurui: number;
  denshi_dokusya_shubetsu: number | null;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  dokusya_busu: number;
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  mail_magazine_flg: number;
  birth_year: number | null;
  gender: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no: string;
  haitatsu_todofuken_code: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_renrakusaki_1: string;
  haitatsu_renrakusaki_2: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_shimei_kana_sei: string;
  haitatsu_shimei_kana_mei: string;
  hanbaiten_id: number;
  hanbaiten_name: string;
  tanka_id: number;
  tanka_name: string;
  yubin_kubun: string;
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle: number | null;
  bank_shiten_id: number | null;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  shoki_dokusya_kaishi_date: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  joho_henko_tekiyo_date: string | null;
  seikyu_kaishi_month: string;
  biko: string;
  rireki_no: number;
  denshi_shonin_status: number | null;
  created_at: string;
  updated_at: string;
}

export interface DokusyaHistoryItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  tetsuzuki_shurui: number;
  tetsuzuki_shurui_label: string;
  henko_riyu: string;
  saishin_data_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  zougen_hokoku_flg: boolean;
  denshi_shonin_status: number | null;
  created_at: string;
  created_by: string;
}

/**
 * Canonical valid CREATE body — `shiharai_hoho = 1 (口座引落)` so every
 * conditional-required bank field is populated. Tests that need to
 * exercise the non-bank branch (現金集金 etc.) override
 * `shiharai_hoho` + clear the bank cluster via `overrides`.
 *
 * Tied to `dokusya_shubetsu = 1` (紙版) so the 配達先 cluster is
 * required by default — `haitatsu_same_flg = false` + non-empty
 * 配達先 names means the cluster validates.
 */
export interface CreateDokusyaForm {
  kanri_shiten_id: number | null;
  shiten_id: number | null;
  kumiaiin_code: string;
  dokusya_shubetsu: number;
  tetsuzuki_shurui: number;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  dokusya_busu: number;
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  mail_magazine_flg: number;
  birth_year: number | null;
  gender: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no: string;
  haitatsu_todofuken_code: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_renrakusaki_1: string;
  haitatsu_renrakusaki_2: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_shimei_kana_sei: string;
  haitatsu_shimei_kana_mei: string;
  hanbaiten_id: number | null;
  tanka_id: number | null;
  yubin_kubun: string;
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle: number | null;
  bank_shiten_id: number | null;
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  joho_henko_tekiyo_date: string | null;
  seikyu_kaishi_month: string;
  biko: string;
}

export type UpdateDokusyaForm = CreateDokusyaForm;

/** Default-valid DETAIL response (API-011-001) for edit-mode mounts. */
export function buildDokusyaDetail(
  overrides: Partial<DokusyaDetail> = {},
): DokusyaDetail {
  return {
    dokusya_id: 100,
    ja_id: 1,
    kanri_shiten_id: 10,
    shiten_id: 100,
    kumiaiin_code: 'K00001',
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    denshi_dokusya_shubetsu: null,
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'やまだ',
    shimei_kana_mei: 'たろう',
    dokusya_busu: 1,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '千代田1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 0,
    birth_year: 1980,
    gender: 1,
    haitatsu_same_flg: true,
    haitatsu_yubin_no: '',
    haitatsu_todofuken_code: '',
    haitatsu_shikuchoson: '',
    haitatsu_chome_banchi: '',
    haitatsu_tatemono_mei: '',
    haitatsu_renrakusaki_1: '',
    haitatsu_renrakusaki_2: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    hanbaiten_id: 5,
    hanbaiten_name: '山田販売店',
    tanka_id: 1,
    tanka_name: '基本購読料（月額）',
    yubin_kubun: '0',
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    bank_shiten_id: 50,
    jastem_toriatsukai_tenpo_code: '001',
    jastem_tenpo_name: '本店',
    bank_branch_code: '001',
    bank_branch_name: '本店',
    hikiotoshi_yokin_shubetsu: 1,
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    dokusyaso_bunrui: '農業者',
    nogyosya_bunrui: '水稲,野菜',
    shoki_dokusya_kaishi_date: '2026-01-01',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
    rireki_no: 1,
    denshi_shonin_status: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Canonical happy-path CREATE form. Override individual fields for
 * validation tests — every override returns a NEW object so the
 * baseline isn't mutated across cases.
 */
export function buildCreateDokusyaForm(
  overrides: Partial<CreateDokusyaForm> = {},
): CreateDokusyaForm {
  return {
    kanri_shiten_id: 10,
    shiten_id: 100,
    kumiaiin_code: 'K00001',
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'やまだ',
    shimei_kana_mei: 'たろう',
    dokusya_busu: 1,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '千代田1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 0,
    birth_year: 1980,
    gender: 1,
    haitatsu_same_flg: true,
    haitatsu_yubin_no: '',
    haitatsu_todofuken_code: '',
    haitatsu_shikuchoson: '',
    haitatsu_chome_banchi: '',
    haitatsu_tatemono_mei: '',
    haitatsu_renrakusaki_1: '',
    haitatsu_renrakusaki_2: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    hanbaiten_id: 5,
    tanka_id: 1,
    yubin_kubun: '0',
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    bank_shiten_id: 50,
    hikiotoshi_yokin_shubetsu: 1,
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    dokusyaso_bunrui: '農業者',
    nogyosya_bunrui: '水稲,野菜',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
    ...overrides,
  };
}

/** UPDATE body — identical shape, swaps a couple of values so the spec
 *  can distinguish create-from-update DTOs in mock assertions. */
export function buildUpdateDokusyaForm(
  overrides: Partial<UpdateDokusyaForm> = {},
): UpdateDokusyaForm {
  return {
    ...buildCreateDokusyaForm(),
    dokusya_busu: 2,
    chome_banchi: '千代田1-2',
    ...overrides,
  };
}

/** Default 2-row history response (API-011-006). */
export function buildDokusyaHistoryItem(
  overrides: Partial<DokusyaHistoryItem> = {},
): DokusyaHistoryItem {
  return {
    dokusya_rireki_id: 200,
    dokusya_id: 100,
    rireki_no: 2,
    tetsuzuki_shurui: 1,
    tetsuzuki_shurui_label: '新規',
    henko_riyu: '住所変更',
    saishin_data_flg: true,
    shinki_flg: false,
    kaiyaku_flg: false,
    zougen_hokoku_flg: true,
    denshi_shonin_status: null,
    created_at: '2026-05-07T14:30:00Z',
    created_by: 'user01',
    ...overrides,
  };
}

export function buildDokusyaHistoryResponse(): { data: DokusyaHistoryItem[] } {
  return {
    data: [
      buildDokusyaHistoryItem({
        dokusya_rireki_id: 200,
        rireki_no: 2,
        henko_riyu: '住所変更',
        saishin_data_flg: true,
        shinki_flg: false,
      }),
      buildDokusyaHistoryItem({
        dokusya_rireki_id: 100,
        rireki_no: 1,
        henko_riyu: '',
        saishin_data_flg: false,
        shinki_flg: true,
        created_at: '2026-04-01T10:00:00Z',
      }),
    ],
  };
}

// ─── Dropdown fixtures (called on mount by the form view) ────────────

export interface KanriShitenDropdownItem {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
}

export function buildKanriShitenDropdown(): KanriShitenDropdownItem[] {
  return [
    { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '千代田管理支店' },
    { kanri_shiten_id: 20, kanri_shiten_code: 'KS002', kanri_shiten_name: '渋谷管理支店' },
  ];
}

export interface ShitenDropdownItem {
  shiten_id: number;
  shiten_code: string;
  shiten_name: string;
  kanri_shiten_id: number;
  kinyu_shiten_flg: boolean;
}

export function buildShitenDropdown(): ShitenDropdownItem[] {
  return [
    {
      shiten_id: 50,
      shiten_code: 'SH001',
      shiten_name: '千代田支店',
      kanri_shiten_id: 10,
      kinyu_shiten_flg: true,
    },
    {
      shiten_id: 100,
      shiten_code: 'SH002',
      shiten_name: '渋谷支店',
      kanri_shiten_id: 20,
      kinyu_shiten_flg: false,
    },
  ];
}

export interface HanbaitenDropdownItem {
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
}

export function buildHanbaitenDropdown(): HanbaitenDropdownItem[] {
  return [
    { hanbaiten_id: 5, hanbaiten_code: 'HB001', hanbaiten_name: '山田販売店' },
    { hanbaiten_id: 6, hanbaiten_code: 'HB002', hanbaiten_name: '佐藤販売店' },
  ];
}

export interface TankaDropdownItem {
  tanka_id: number;
  tanka_code: string;
  tanka_name: string;
  tanka_type: number;
  kingaku_zeikomi: number;
}

export function buildTankaDropdown(): TankaDropdownItem[] {
  return [
    {
      tanka_id: 1,
      tanka_code: 'T001',
      tanka_name: '基本購読料（月額）',
      tanka_type: 1,
      kingaku_zeikomi: 4900,
    },
  ];
}

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
  ];
}

// ─── m_code seed for createTestingPinia({ initialState: { codes } }) ──
//
// SCR-011 references DOKUSYA_SHUBETSU / TETSUZUKI_SHURUI /
// SHIHARAI_HOHO / YUBIN_KUBUN / GENDER / MAIL_MAGAZINE_FLG /
// YOKIN_SHUBETSU. Values mirror docs/database/seeder.md §5.

export function buildCodesSeed(): Record<
  string,
  Array<{ value: number | string; label: string; label_short: string }>
> {
  return {
    DOKUSYA_SHUBETSU: [
      { value: 1, label: '紙版', label_short: '紙版' },
      { value: 2, label: '電子版', label_short: '電子版' },
      { value: 3, label: '併読', label_short: '併読' },
    ],
    TETSUZUKI_SHURUI: [
      { value: 0, label: '解約', label_short: '解約' },
      { value: 1, label: '新規', label_short: '新規' },
    ],
    SHIHARAI_HOHO: [
      { value: 1, label: '口座引落', label_short: '口座引落' },
      { value: 2, label: '現金集金', label_short: '現金集金' },
      { value: 3, label: '振込集金', label_short: '振込集金' },
      { value: 6, label: 'クレジットカード', label_short: 'クレカ' },
      { value: 9, label: 'その他', label_short: 'その他' },
    ],
    YUBIN_KUBUN: [
      { value: '0', label: '空文字', label_short: '空' },
      { value: '1', label: '郵送', label_short: '郵送' },
    ],
    GENDER: [
      { value: 1, label: '男性', label_short: '男' },
      { value: 2, label: '女性', label_short: '女' },
      { value: 9, label: '回答しない', label_short: '不明' },
    ],
    MAIL_MAGAZINE_FLG: [
      { value: 0, label: '配信しない', label_short: 'OFF' },
      { value: 1, label: '配信する', label_short: 'ON' },
    ],
    YOKIN_SHUBETSU: [
      { value: 1, label: '普通', label_short: '普通' },
      { value: 2, label: '当座', label_short: '当座' },
    ],
  };
}

// ─── Auth user fixture ─────────────────────────────────────────────
//
// SCR-011 access matrix (account_concept.md):
//   NICHINO_ADMIN / NICHINO_STAFF: full create/update/view
//   CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN: own JA scope
//
// Default seeds a CHUOKAI user holding the full perm triple. Override
// `permissions` to model 403 paths.

export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 11,
    login_id: 'chuokai001',
    account_name: 'CHUOKAI 担当者',
    role_id: 3,
    role_code: 'CHUOKAI',
    role_name: '中央会',
    ja_id: 1,
    kanri_shiten_id: null,
    todofuken_code: '13',
    paper_flg: true,
    denshi_flg: false,
    email: 'chuokai001@example.com',
    mfa_enable_flg: false,
    permissions: [
      'dokusya.view',
      'dokusya.create',
      'dokusya.update',
    ],
    ...overrides,
  };
}
