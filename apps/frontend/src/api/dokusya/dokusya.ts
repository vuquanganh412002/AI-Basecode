// Hand-written API wrapper for the /api/v1/dokusya endpoints.
//
// SCR-011 ships 6 endpoints (api.md §1):
//   GET  /:id           → getDokusya         (API-011-001)
//   POST /              → createDokusya      (API-011-002)
//   PUT  /:id           → updateDokusya      (API-011-003)
//   PUT  /:id/approve   → approveDokusya     (API-011-004)
//   PUT  /:id/reject    → rejectDokusya      (API-011-005)
//   GET  /:id/history   → getDokusyaHistory  (API-011-006)
//
// Shapes mirror apps/backend/src/modules/dokusya/dto/* — when the BE
// response changes, update this file by hand. The integration spec
// at apps/backend/test/integration/dokusya.integration.spec.ts is the
// living reference for the exact JSON shape.

import axiosInstance from '@/api/axios-instance';

/**
 * Full detail returned by `GET /api/v1/dokusya/:id` and the `data`
 * field of POST/PUT/approve/reject responses.
 */
export interface DokusyaDetail {
  dokusya_id: number;
  ja_id: number;
  // 管理支店/支店は未設定のことがある (BE は NULL を返す。0 ではない)。
  kanri_shiten_id: number | null;
  shiten_id: number | null;
  kumiaiin_code: string;
  /** m_code.code_category='DOKUSYA_SHUBETSU' — 1=紙版, 2=電子版, 3=併読. */
  dokusya_shubetsu: number;
  /** m_code.code_category='TETSUZUKI_SHURUI' — 0=解約, 1=新規. */
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
  /** m_code.code_category='MAIL_MAGAZINE_FLG' — 0=配信しない, 1=配信する. */
  mail_magazine_flg: number;
  birth_year: number | null;
  /** m_code.code_category='GENDER'. */
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
  /** m_code.code_category='YUBIN_KUBUN' — '0'=空, '1'=郵送. */
  yubin_kubun: string;
  /** m_code.code_category='SHIHARAI_HOHO' — 1=口座引落, 2=現金集金, etc. */
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle: number | null;
  /** Resolved via m_shiten reverse-lookup when shiharai_hoho=1. */
  bank_shiten_id: number | null;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  /** m_code.code_category='YOKIN_SHUBETSU' — 1=普通, 2=当座. */
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  /** YYYY-MM-DD. */
  shoki_dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD — null when not 解約. */
  dokusya_chushi_date: string | null;
  /** YYYY-MM-DD — null when not set. Must be future-date when present. */
  joho_henko_tekiyo_date: string | null;
  /** YYYYMM — '' when not set. */
  seikyu_kaishi_month: string;
  biko: string;
  rireki_no: number;
  /** denshi_shonin_status — null=non-digital, 0=承認待ち, 1=承認, 2=否認. */
  denshi_shonin_status: number | null;
  /**
   * 電子版会員ID — 外部システムの会員ID。外部連携機能（後続開発）が設定する
   * 読取専用値。未連携は null。
   */
  denshi_kaiin_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * POST /api/v1/dokusya request body (ACSMS-API-011-002).
 *
 * `ja_id` and `dokusya_id` are intentionally absent — `ja_id` is
 * derived server-side from the session, `dokusya_id` is auto-assigned.
 * The BE strips/rejects them via `forbidNonWhitelisted`.
 */
export interface CreateDokusyaRequest {
  kanri_shiten_id?: number | null;
  shiten_id?: number | null;
  kumiaiin_code?: string;
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
  tatemono_mei?: string;
  renrakusaki_1: string;
  renrakusaki_2?: string;
  email?: string;
  mail_magazine_flg?: number;
  birth_year?: number | null;
  gender?: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no?: string;
  haitatsu_todofuken_code?: string;
  haitatsu_shikuchoson?: string;
  haitatsu_chome_banchi?: string;
  haitatsu_tatemono_mei?: string;
  haitatsu_renrakusaki_1?: string;
  haitatsu_renrakusaki_2?: string;
  haitatsu_shimei_sei?: string;
  haitatsu_shimei_mei?: string;
  haitatsu_shimei_kana_sei?: string;
  haitatsu_shimei_kana_mei?: string;
  hanbaiten_id: number;
  tanka_id: number;
  yubin_kubun?: string;
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle?: number | null;
  /** Required when shiharai_hoho=1 (口座引落). */
  bank_shiten_id?: number | null;
  hikiotoshi_yokin_shubetsu?: number | null;
  hikiotoshi_koza_no?: string;
  hikiotoshi_koza_meigi?: string;
  dokusyaso_bunrui?: string;
  nogyosya_bunrui?: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_chushi_date?: string | null;
  /** YYYY-MM-DD — 情報変更適用日（別フィールド変更用・後日定義）。当面 null。 */
  joho_henko_tekiyo_date?: string | null;
  /**
   * YYYY-MM-DD — 販売店適用日。編集で販売店を変更したときのみ送る（当日以降）。
   * BE は t_dokusya_rireki.hanbaiten_tekiyo_date に記録する。
   */
  hanbaiten_tekiyo_date?: string | null;
  /** YYYYMM. */
  seikyu_kaishi_month?: string;
  biko?: string;
}

/** PUT /api/v1/dokusya/:id — identical to Create per api.md §API-011-003. */
export type UpdateDokusyaRequest = CreateDokusyaRequest;

/** Envelope for GET-detail responses — `{ data: DokusyaDetail }`. */
export interface DokusyaEnvelope {
  data: DokusyaDetail;
}

/** Envelope for POST/PUT/approve/reject responses — adds `message`. */
export interface DokusyaMutationEnvelope {
  data: DokusyaDetail;
  message: string;
}

/** One row of `GET /api/v1/dokusya/:id/history` (ACSMS-API-011-006). */
export interface DokusyaHistoryItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  tetsuzuki_shurui: number;
  /** Resolved by CodeService.getLabel('TETSUZUKI_SHURUI', value). */
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

export interface DokusyaHistoryEnvelope {
  data: DokusyaHistoryItem[];
}

// ─── Endpoint functions ──────────────────────────────────────────────

/** GET /api/v1/dokusya/:id — ACSMS-API-011-001. */
export async function getDokusya(dokusyaId: number): Promise<DokusyaEnvelope> {
  const res = await axiosInstance.get<DokusyaEnvelope>(
    `/api/v1/dokusya/${dokusyaId}`,
  );
  return res.data;
}

/** POST /api/v1/dokusya — ACSMS-API-011-002. */
export async function createDokusya(
  body: CreateDokusyaRequest,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.post<DokusyaMutationEnvelope>(
    '/api/v1/dokusya',
    body,
  );
  return res.data;
}

/** PUT /api/v1/dokusya/:id — ACSMS-API-011-003. */
export async function updateDokusya(
  dokusyaId: number,
  body: UpdateDokusyaRequest,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}`,
    body,
  );
  return res.data;
}

/** PUT /api/v1/dokusya/:id/approve — ACSMS-API-011-004 (電子版承認). */
export async function approveDokusya(
  dokusyaId: number,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/approve`,
  );
  return res.data;
}

/** PUT /api/v1/dokusya/:id/reject — ACSMS-API-011-005 (電子版否認). */
export async function rejectDokusya(
  dokusyaId: number,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/reject`,
  );
  return res.data;
}

/** GET /api/v1/dokusya/:id/history — ACSMS-API-011-006. */
export async function getDokusyaHistory(
  dokusyaId: number,
): Promise<DokusyaHistoryEnvelope> {
  const res = await axiosInstance.get<DokusyaHistoryEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/history`,
  );
  return res.data;
}

// ─── ACSMS-SCR-014 — 購読者明細検索画面 ──────────────────────────────
//
// 3 endpoints (api.md ACSMS-SCR-014):
//   GET    /api/v1/dokusya            → listDokusya         (API-014-001)
//   DELETE /api/v1/dokusya/:id        → removeDokusya       (API-014-002)
//   GET    /api/v1/dokusya/export     → exportDokusyaExcel  (API-014-003)

/** One row of `GET /api/v1/dokusya` response — per api.md §レスポンスデータ. */
export interface DokusyaListItem {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  /** 手続種類 — m_code TETSUZUKI_SHURUI (0:解約, 1:新規). */
  tetsuzuki_shurui: number;
  renrakusaki_1: string;
  renrakusaki_2: string;
  /** 配達先氏名 — haitatsu_shimei_sei + haitatsu_shimei_mei (concat, trimmed). */
  haitatsu_full_name: string;
  haitatsu_yubin_no: string;
  haitatsu: string;
  hanbaiten_id: number;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
  denshi_shonin_status: number | null;
  shoki_dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  /** True when the row may not be edited/deleted (CC/併読/海外配送 etc.). */
  is_read_only: boolean;
}

/** Search + pagination + sort params for `GET /api/v1/dokusya`. */
export interface DokusyaSearchParams {
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

/** Filter-only params for `GET /api/v1/dokusya/export` (no page/sort). */
export type DokusyaExportParams = Omit<
  DokusyaSearchParams,
  'page' | 'per_page' | 'sort_by' | 'sort_order'
>;

export interface DokusyaListResponse {
  data: DokusyaListItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/** GET /api/v1/dokusya — ACSMS-API-014-001. */
export async function listDokusya(
  params: DokusyaSearchParams = {},
): Promise<DokusyaListResponse> {
  const res = await axiosInstance.get<DokusyaListResponse>(
    '/api/v1/dokusya',
    { params },
  );
  return res.data;
}

/** DELETE /api/v1/dokusya/:id — ACSMS-API-014-002 (論理削除). */
export async function removeDokusya(
  dokusyaId: number,
): Promise<{ message: string }> {
  const res = await axiosInstance.delete<{ message: string }>(
    `/api/v1/dokusya/${dokusyaId}`,
  );
  return res.data;
}

/**
 * GET /api/v1/dokusya/export — ACSMS-API-014-003.
 *
 * Returns the raw Blob so the caller can hand it to `URL.createObjectURL`
 * and trigger a browser download. The wrapper does NOT forward
 * page / per_page / sort_by / sort_order — those are intentionally
 * stripped at the call site per api.md §014-003 (BE ignores them anyway).
 */
export async function exportDokusyaExcel(
  params: DokusyaExportParams = {},
): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/dokusya/export', {
    params,
    responseType: 'blob',
  });
  return res.data;
}

// ─── ACSMS-SCR-013 — 購読者履歴情報画面 ──────────────────────────────
//
// 1 endpoint (api.md ACSMS-API-013-001):
//   GET /api/v1/dokusya/:id/rireki → getDokusyaRirekiList
//
// Full paginated history list — distinct from getDokusyaHistory
// (SCR-011 /history, lighter + label-bearing). Returns CODE VALUES ONLY
// (no *_label); the view resolves labels via useCodesStore.

/**
 * One row of `GET /api/v1/dokusya/:id/rireki` — per api.md §レスポンスデータ
 * #2-#61. Nullability mirrors the api.md "Nullable" column (`〇` → `| null`).
 */
export interface DokusyaRirekiItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
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
  /** m_code.code_category='MAIL_MAGAZINE_FLG'. */
  mail_magazine_flg: number;
  birth_year: number | null;
  /** m_code.code_category='GENDER'. */
  gender: number | null;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
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
  /** m_code.code_category='TETSUZUKI_SHURUI'. */
  tetsuzuki_shurui: number;
  /** YYYY-MM-DD. */
  shoki_dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD — null when not 解約. */
  dokusya_chushi_date: string | null;
  /** YYYY-MM-DD — null when not set. */
  joho_henko_tekiyo_date: string | null;
  saishin_data_flg: boolean;
  zougen_hokoku_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  /** m_code.code_category='YOKIN_SHUBETSU'. */
  hikiotoshi_yokin_shubetsu: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  created_at: string;
  created_by: string;
}

/** Pagination + sort params for `GET /api/v1/dokusya/:id/rireki`. */
export interface DokusyaRirekiParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DokusyaRirekiListResponse {
  data: DokusyaRirekiItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/** GET /api/v1/dokusya/:id/rireki — ACSMS-API-013-001. */
export async function getDokusyaRirekiList(
  dokusyaId: number,
  params: DokusyaRirekiParams = {},
): Promise<DokusyaRirekiListResponse> {
  const res = await axiosInstance.get<DokusyaRirekiListResponse>(
    `/api/v1/dokusya/${dokusyaId}/rireki`,
    { params },
  );
  return res.data;
}

// ─── ACSMS-SCR-015 — 購読者販売店一括置換画面 ────────────────────────
//
// 2 endpoints (api.md ACSMS-SCR-015):
//   GET  /api/v1/dokusya/replace-hanbaiten/search → searchDokusyaForReplace (API-015-001)
//   POST /api/v1/dokusya/replace-hanbaiten        → replaceDokusyaHanbaiten  (API-015-002)
//
// Shapes mirror docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md. The
// search response returns CODE VALUES ONLY (dokusya_shubetsu /
// shiharai_hoho) — used by the FE to filter 併読 / 電子版クレカ rows
// (機能定義 4.1), not for display.

/** One row of `GET /api/v1/dokusya/replace-hanbaiten/search` — API-015-001. */
export interface ReplaceSearchItem {
  dokusya_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei: string;
  haitatsu_yubin_no: string;
  haitatsu_address: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  /** m_code.code_category='DOKUSYA_SHUBETSU' — 1:紙版, 2:電子版, 3:併読. */
  dokusya_shubetsu: number;
  /** m_code.code_category='SHIHARAI_HOHO' — 1〜9 (6=クレジットカード). */
  shiharai_hoho: number;
}

/** Search + pagination + sort params for the replace search endpoint. */
export interface ReplaceSearchParams {
  kanri_shiten_id?: number;
  shiten_id?: number;
  kumiaiin_code?: string;
  shimei?: string;
  shimei_kana?: string;
  haitatsu_address?: string;
  hanbaiten_id?: number;
  dokusya_kaishi_date_from?: string;
  dokusya_kaishi_date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'kanri_shiten_name' | 'shiten_name' | 'kumiaiin_code' | 'hanbaiten_code';
  sort_order?: 'asc' | 'desc';
}

export interface ReplaceSearchResponse {
  data: ReplaceSearchItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/**
 * POST /api/v1/dokusya/replace-hanbaiten request body — API-015-002.
 *
 * The index signature keeps the body assignable to
 * `Record<string, unknown>` so the SCR-015 spec can introspect the
 * captured mock-call argument (`mock.calls[0][0] as Record<…>`) — every
 * required property has a fixed type, which TS otherwise treats as
 * non-overlapping with `Record<string, unknown>`.
 */
export interface ReplaceHanbaitenRequest {
  dokusya_ids: number[];
  new_hanbaiten_id: number;
  /** YYYY-MM-DD — 当日以降の日付のみ可. */
  hanbaiten_tekiyo_date: string;
  [key: string]: unknown;
}

export interface ReplaceHanbaitenResult {
  data: {
    total_count: number;
    replaced_count: number;
    rireki_count: number;
    new_hanbaiten_id: number;
    /** ISO8601. */
    applied_at: string;
  };
  message: string;
}

/** GET /api/v1/dokusya/replace-hanbaiten/search — ACSMS-API-015-001. */
export async function searchDokusyaForReplace(
  params: ReplaceSearchParams = {},
): Promise<ReplaceSearchResponse> {
  const res = await axiosInstance.get<ReplaceSearchResponse>(
    '/api/v1/dokusya/replace-hanbaiten/search',
    { params },
  );
  return res.data;
}

/** POST /api/v1/dokusya/replace-hanbaiten — ACSMS-API-015-002. */
export async function replaceDokusyaHanbaiten(
  body: ReplaceHanbaitenRequest,
): Promise<ReplaceHanbaitenResult> {
  const res = await axiosInstance.post<ReplaceHanbaitenResult>(
    '/api/v1/dokusya/replace-hanbaiten',
    body,
  );
  return res.data;
}

// ─── ACSMS-SCR-016 — 購読者Excelデータ取込画面 ───────────────────────
//
// 2 endpoints (api.md ACSMS-SCR-016):
//   GET  /api/v1/dokusya/import/template → downloadDokusyaImportTemplate (API-016-001)
//   POST /api/v1/dokusya/import          → importDokusyaExcel            (API-016-002)
//
// Shapes mirror docs/design/ACSMS-SCR-016/ACSMS-SCR-016-api.md. The FE
// parses the .xlsx client-side, lets the user pick a column subset, and
// posts the parsed rows + the chosen import mode.

/** Import mode wire values — FE radios (new/update/cancel) map to these. */
export type DokusyaImportMode = 'NEW' | 'UPDATE_ALL' | 'UPDATE_PARTIAL';

/**
 * One parsed Excel row sent to the BE. Keys are the 49 physical column
 * names (snake_case) from api.md §テンプレートファイル仕様; every column
 * is optional because the FE only forwards the cells present in the
 * uploaded file (and only for the columns the user kept checked).
 */
export type ImportDokusyaRow = Record<string, unknown>;

export interface ImportDokusyaBody {
  import_mode: DokusyaImportMode;
  selected_columns: string[];
  rows: ImportDokusyaRow[];
  /**
   * Index signature so the spec can introspect a captured mock-call
   * argument via `mock.calls[0][0] as Record<string, unknown>` without
   * a non-overlap cast error (mirrors SCR-015 ReplaceHanbaitenRequest).
   */
  [key: string]: unknown;
}

export interface ImportDokusyaResult {
  data: {
    import_mode: DokusyaImportMode;
    total_rows: number;
    created_count: number;
    updated_count: number;
    cancelled_count: number;
    skipped_count: number;
    rireki_count: number;
    /** ISO8601. */
    imported_at: string;
  };
  message: string;
}

/** GET /api/v1/dokusya/import/template — ACSMS-API-016-001 (binary XLSX). */
export async function downloadDokusyaImportTemplate(): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/dokusya/import/template', {
    responseType: 'blob',
  });
  return res.data;
}

/** POST /api/v1/dokusya/import — ACSMS-API-016-002. */
export async function importDokusyaExcel(
  body: ImportDokusyaBody,
): Promise<ImportDokusyaResult> {
  const res = await axiosInstance.post<ImportDokusyaResult>(
    '/api/v1/dokusya/import',
    body,
  );
  return res.data;
}

// ─── ACSMS-SCR-010 — メニュー画面: 電子版読者承認待ち件数 ────────────────

export interface PendingApprovalCountResponse {
  data: { count: number; ja_id: number | null };
}

/**
 * GET /api/v1/dokusya/pending-approval/count — ACSMS-API-010-002.
 * 電子版読者の承認待ち件数（denshi_shonin_status=0）を DataScope 込みで取得。
 */
export async function getPendingApprovalCount(): Promise<PendingApprovalCountResponse> {
  const res = await axiosInstance.get<PendingApprovalCountResponse>(
    '/api/v1/dokusya/pending-approval/count',
  );
  return res.data;
}
