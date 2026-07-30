// Test fixtures for ACSMS-SCR-011 (購読者情報登録画面)
// and ACSMS-SCR-014 (購読者明細検索画面).
//
// Shapes mirror docs/design/ACSMS-SCR-011/ACSMS-SCR-011-api.md §レスポンス
// + docs/design/ACSMS-SCR-014/ACSMS-SCR-014-api.md §レスポンス
// + the BE response DTOs at apps/backend/src/modules/dokusya/dto/.
// The CREATE / UPDATE form bodies follow the CreateDokusyaDto /
// UpdateDokusyaDto shape from the same BE module (snake_case, every
// required field present so happy-path assertions don't have to
// repeat them).
//
// m_code numeric values (DOKUSYA_SHUBETSU / TETSUZUKI_SHURUI /
// SHIHARAI_HOHO / YUBIN_KUBUN / GENDER / MAIL_MAGAZINE_FLG /
// YOKIN_SHUBETSU) come from docs/database/seeder.md §5.

import { tomorrowIsoTokyo } from '@/utils/datetime';

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
  denshi_kaiin_id: number | null;
  created_at: string;
  updated_at: string;
  has_active_kaiyaku: boolean;
  max_joho_date: string | null;
}

export interface DokusyaHistoryItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  tetsuzuki_shurui: number;
  tetsuzuki_shurui_label: string;
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
    dokusyaso_bunrui: '0',
    nogyosya_bunrui: '0,1',
    shoki_dokusya_kaishi_date: '2026-01-01',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
    rireki_no: 1,
    denshi_shonin_status: null,
    denshi_kaiin_id: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    has_active_kaiyaku: false,
    max_joho_date: null,
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
    dokusyaso_bunrui: '0',
    nogyosya_bunrui: '0,1',
    // 購読開始日は未来日のみ（当日・過去日 不可・顧客要件 2026-07 改訂）。翌日を
    // 既定にして create happy-path が通るようにする（固定日だと時間経過で過去日に
    // なり検証に弾かれるため動的）。
    dokusya_kaishi_date: tomorrowIsoTokyo(),
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
    // 編集時の 読者情報変更適用日 はユーザー入力で必須（未来日のみ・当日/過去日
    // 不可・顧客要件 2026-07 改訂）。翌日を入れて update happy-path が通るようにする。
    joho_henko_tekiyo_date: tomorrowIsoTokyo(),
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
        saishin_data_flg: true,
        shinki_flg: false,
      }),
      buildDokusyaHistoryItem({
        dokusya_rireki_id: 100,
        rireki_no: 1,
        saishin_data_flg: false,
        shinki_flg: true,
        created_at: '2026-04-01T10:00:00Z',
      }),
    ],
  };
}

// ─── ACSMS-SCR-013 — 購読者履歴情報画面 ──────────────────────────────
//
// Full paginated history row returned by
// GET /api/v1/dokusya/:dokusya_id/rireki (ACSMS-API-013-001). Distinct
// from DokusyaHistoryItem (SCR-011 /history — lighter, label-bearing):
// this carries the full snapshot + name joins and CODE VALUES ONLY (no
// *_label — the FE resolves labels via useCodesStore). Local interface so
// the fixture stays self-contained until /gen-code-frontend adds the
// matching `DokusyaRirekiItem` to the api wrapper.

export interface DokusyaRirekiRow {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  dokusya_shubetsu: number;
  denshi_dokusya_shubetsu: number | null;
  denshi_shonin_status: number | null;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei_sei: string;
  shimei_mei: string;
  todofuken_code: string;
  todofuken_name: string | null;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  mail_magazine_flg: number;
  birth_year: number | null;
  gender: number | null;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  tanka_id: number;
  tanka_name: string | null;
  tanka_kingaku: number | null;
  dokusya_busu: number;
  zenkai_dokusya_busu: number | null;
  haitatsu_yubin_no: string;
  zenkai_yubin_no: string | null;
  haitatsu_todofuken_code: string;
  haitatsu_todofuken_name: string | null;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  zenkai_todofuken_code: string | null;
  zenkai_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  hanbaiten_id: number;
  hanbaiten_name: string | null;
  zenkai_hanbaiten_id: number | null;
  zenkai_hanbaiten_name: string | null;
  tetsuzuki_shurui: number;
  shoki_dokusya_kaishi_date: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  joho_henko_tekiyo_date: string | null;
  saishin_data_flg: boolean;
  zougen_hokoku_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  torikeshi_flg: boolean;
  biko: string;
  can_torikeshi: boolean;
  shiharai_hoho: number;
  yubin_kubun: string;
  dokusyaryo_shiharai_cycle: number | null;
  hikiotoshi_yokin_shubetsu: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  created_at: string;
  created_by: string;
}

export interface DokusyaRirekiListResponse {
  data: DokusyaRirekiRow[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

export function buildDokusyaRirekiRow(
  overrides: Partial<DokusyaRirekiRow> = {},
): DokusyaRirekiRow {
  return {
    dokusya_rireki_id: 42,
    dokusya_id: 100,
    rireki_no: 3,
    dokusya_shubetsu: 1,
    // 既定は紙版なので電子版連携の 2 列は null（SCR-013 一覧）。
    denshi_dokusya_shubetsu: null,
    denshi_shonin_status: null,
    ja_id: 1,
    kanri_shiten_id: 5,
    kanri_shiten_name: '東京中央管理支店',
    shiten_id: 12,
    shiten_name: '千代田支店',
    kumiaiin_code: 'K00012345',
    shimei_sei: '山田',
    shimei_mei: '太郎',
    todofuken_code: '13',
    todofuken_name: '東京都',
    shikuchoson: '千代田区',
    chome_banchi: '丸の内1-1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 1,
    birth_year: 1980,
    gender: 1,
    dokusyaso_bunrui: '0,3',
    nogyosya_bunrui: '',
    tanka_id: 1,
    tanka_name: '新聞購読料',
    tanka_kingaku: 3500,
    dokusya_busu: 2,
    zenkai_dokusya_busu: 1,
    haitatsu_yubin_no: '1000001',
    zenkai_yubin_no: '1000005',
    haitatsu_todofuken_code: '13',
    haitatsu_todofuken_name: '東京都',
    haitatsu_shikuchoson: '千代田区',
    haitatsu_chome_banchi: '丸の内1-1-1',
    haitatsu_tatemono_mei: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    zenkai_todofuken_code: '13',
    zenkai_todofuken_name: '東京都',
    zenkai_shikuchoson: '中央区',
    zenkai_chome_banchi: '銀座1-1-1',
    zenkai_tatemono_mei: '',
    hanbaiten_id: 100,
    hanbaiten_name: '丸の内販売店',
    zenkai_hanbaiten_id: 99,
    zenkai_hanbaiten_name: '銀座販売店',
    tetsuzuki_shurui: 1,
    shoki_dokusya_kaishi_date: '2024-04-01',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: '2026-04-01',
    saishin_data_flg: true,
    zougen_hokoku_flg: true,
    shinki_flg: false,
    kaiyaku_flg: false,
    torikeshi_flg: false,
    biko: '',
    can_torikeshi: true,
    shiharai_hoho: 1,
    yubin_kubun: '0',
    dokusyaryo_shiharai_cycle: 1,
    hikiotoshi_yokin_shubetsu: 1,
    bank_branch_code: '001',
    bank_branch_name: '本店',
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    created_at: '2026-04-01T10:00:00.000Z',
    created_by: 'ja_honten01',
    ...overrides,
  };
}

/** Two rows (rireki_no 3, 2 — BE returns DESC) + pagination meta. */
export function buildDokusyaRirekiListResponse(
  overrides: Partial<DokusyaRirekiListResponse> = {},
): DokusyaRirekiListResponse {
  return {
    data: [
      buildDokusyaRirekiRow({ dokusya_rireki_id: 42, rireki_no: 3 }),
      buildDokusyaRirekiRow({
        dokusya_rireki_id: 41,
        rireki_no: 2,
        kumiaiin_code: 'K00012344',
        shimei_sei: '佐藤',
        shimei_mei: '花子',
        mail_magazine_flg: 0,
        created_at: '2026-03-01T10:00:00.000Z',
      }),
    ],
    meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
    ...overrides,
  };
}

// ─── Dropdown fixtures (called on mount by the form view) ────────────

export interface KanriShitenDropdownItem {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  paper_flg: boolean;
  denshi_flg: boolean;
}

export function buildKanriShitenDropdown(): KanriShitenDropdownItem[] {
  // 既定は両フラグ true（購読種別フィルタの影響を受けず全件表示）。
  // 絞り込みを検証するテストは個別に paper_flg/denshi_flg を上書きする。
  return [
    { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '千代田管理支店', paper_flg: true, denshi_flg: true },
    { kanri_shiten_id: 20, kanri_shiten_code: 'KS002', kanri_shiten_name: '渋谷管理支店', paper_flg: true, denshi_flg: true },
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
  kingaku_zeinuki: number;
  // BE がログイン中 JA の税区分で解決した表示用金額（=1 税込 / =2 税抜）。
  kingaku: number;
}

export function buildTankaDropdown(): TankaDropdownItem[] {
  return [
    {
      tanka_id: 1,
      tanka_code: 'T001',
      tanka_name: '基本購読料（月額）',
      tanka_type: 1,
      kingaku_zeikomi: 4900,
      kingaku_zeinuki: 4500,
      kingaku: 4900,
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
    DENSHI_DOKUSYA_SHUBETSU: [
      { value: 0, label: '無料', label_short: '無料' },
      { value: 1, label: '有料', label_short: '有料' },
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
    OSHIRASE_TYPE: [
      { value: 1, label: 'システム', label_short: 'システム' },
      { value: 2, label: '重要', label_short: '重要' },
      { value: 3, label: '一般', label_short: '一般' },
      { value: 4, label: '締め切り時間', label_short: '締切' },
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
      'dokusya.delete',
    ],
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════
// ACSMS-SCR-014 — 購読者明細検索画面 fixtures
// ═════════════════════════════════════════════════════════════════════
//
// Drives the DokusyaListView spec + dokusya API wrapper spec. Shapes
// mirror ACSMS-API-014-001 §レスポンスデータ row schema.

/** One row of `GET /api/v1/dokusya` response — per api.md §レスポンスデータ. */
export interface DokusyaListRow {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  tetsuzuki_shurui: number;
  renrakusaki_1: string;
  renrakusaki_2: string;
  haitatsu_renrakusaki_1: string;
  haitatsu_full_name: string;
  haitatsu_yubin_no: string;
  haitatsu: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
  denshi_shonin_status: number | null;
  shoki_dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  is_read_only: boolean;
}

/** Pagination meta envelope — common across SCR list endpoints. */
export interface DokusyaListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DokusyaListEnvelope {
  data: DokusyaListRow[];
  meta: DokusyaListMeta;
}

/**
 * Default-happy list row. Override individual fields per test (e.g.
 * `is_read_only: true` to exercise the disabled-delete branch).
 */
export function buildDokusyaListRow(
  overrides: Partial<DokusyaListRow> = {},
): DokusyaListRow {
  return {
    dokusya_id: 1001,
    ja_id: 1,
    kanri_shiten_id: 10,
    kanri_shiten_name: '中央管理支店',
    shiten_id: 21,
    shiten_name: '渋谷支店',
    kumiaiin_code: 'K000001',
    full_name: '山田 太郎',
    full_name_kana: 'ヤマダ タロウ',
    tetsuzuki_shurui: 1,
    renrakusaki_1: '03-1234-5678',
    renrakusaki_2: '',
    haitatsu_renrakusaki_1: '090-1111-2222',
    haitatsu_full_name: '山田 花子',
    haitatsu_yubin_no: '1500001',
    haitatsu: '東京都渋谷区神宮前1-1-1 渋谷マンション101',
    hanbaiten_id: 501,
    hanbaiten_code: 'HB501',
    hanbaiten_name: '渋谷販売店',
    dokusya_shubetsu: 1,
    shiharai_hoho: 1,
    denshi_shonin_status: null,
    shoki_dokusya_kaishi_date: '2024/04/01',
    dokusya_chushi_date: null,
    is_read_only: false,
    ...overrides,
  };
}

/**
 * Default 2-row paginated response. The second row carries
 * `is_read_only: true` so spec assertions for the disabled-delete
 * branch don't need a custom override.
 */
export function buildDokusyaListResponse(
  overrides: Partial<DokusyaListEnvelope> = {},
): DokusyaListEnvelope {
  return {
    data: overrides.data ?? [
      buildDokusyaListRow({
        dokusya_id: 1001,
        kumiaiin_code: 'K000001',
        full_name: '山田 太郎',
        is_read_only: false,
      }),
      buildDokusyaListRow({
        dokusya_id: 1002,
        kumiaiin_code: 'K000002',
        full_name: '佐藤 花子',
        full_name_kana: 'サトウ ハナコ',
        renrakusaki_1: '03-9876-5432',
        haitatsu_yubin_no: '1500002',
        haitatsu: '東京都渋谷区神宮前2-2-2',
        hanbaiten_id: 502,
        hanbaiten_name: '原宿販売店',
        dokusya_shubetsu: 2,
        shiharai_hoho: 6,
        denshi_shonin_status: 1,
        shoki_dokusya_kaishi_date: '2025/01/15',
        is_read_only: true,
      }),
    ],
    meta: overrides.meta ?? {
      total: 2,
      page: 1,
      per_page: 20,
      total_pages: 1,
    },
  };
}

/**
 * All-empty search query — sub-fields default to undefined so a
 * spread-into-payload pattern doesn't bleed empty strings into the BE
 * call. Tests override individual filters to exercise specific paths.
 */
export interface DokusyaSearchQuery {
  kanri_shiten_id?: number;
  shiten_id?: number;
  kumiaiin_code?: string;
  jastem_toriatsukai_tenpo_code?: string;
  jastem_tenpo_name?: string;
  full_name?: string;
  full_name_kana?: string;
  renrakusaki_1?: string;
  haitatsu?: string;
  hanbaiten_id?: number;
  email?: string;
  seikyu_kaishi_month?: string;
  shoki_dokusya_kaishi_date_from?: string;
  shoki_dokusya_kaishi_date_to?: string;
  dokusya_chushi_date_from?: string;
  dokusya_chushi_date_to?: string;
  dokusya_shubetsu?: number;
  denshi_shonin_status?: number;
  tetsuzuki_shurui?: number;
  joho_henko_tekiyo_date_from?: string;
  joho_henko_tekiyo_date_to?: string;
  shiharai_hoho?: number;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export function buildDokusyaSearchQuery(
  overrides: Partial<DokusyaSearchQuery> = {},
): DokusyaSearchQuery {
  return {
    page: 1,
    per_page: 20,
    sort_by: 'updated_at',
    sort_order: 'desc',
    ...overrides,
  };
}
