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
  kanri_shiten_id: number;
  shiten_id: number;
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
  /** YYYY-MM-DD — must be future date when present. */
  joho_henko_tekiyo_date?: string | null;
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
