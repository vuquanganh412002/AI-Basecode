// Hand-written wrapper around the /api/v1/report/meibo endpoints
// (ACSMS-SCR-026). Mirrors docs/design/ACSMS-SCR-026/ACSMS-SCR-026-api.md.

import axiosInstance from '@/api/axios-instance';

/** Query DTO shared by preview + export (ACSMS-API-026-001 / 002). */
export interface MeiboReportQuery {
  tekiyo_date: string;
  report_type: 'hanbaiten' | 'kanri_shiten';
  hanbaiten_ids?: number[];
  kanri_shiten_ids?: number[];
  /** 1: 紙版, 2: 電子版（併読(3)は本帳票では選択不可）。 */
  dokusya_shubetsu?: number;
  /** 購読料支払サイクル（月数）。report_type=kanri_shiten のみ。 */
  shiharai_cycle?: number;
}

// ─── 販売店別購読者名簿 (report_type=hanbaiten) ─────────────────────────
export interface HanbaitenReportRow {
  dokusya_id: number;
  shimei: string;
  shimei_kana: string;
  haitatsu_address: string;
  kanri_shiten_name: string;
  haitatsu_tel: string;
  dokusya_kaishi_date: string;
  dokusya_busu: number;
}

export interface KanriShitenSubGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  rows: HanbaitenReportRow[];
}

export interface HanbaitenGroup {
  hanbaiten_id: number;
  hanbaiten_name: string;
  hanbaiten_code: string;
  hanbaiten_tel: string;
  hanbaiten_fax: string;
  total_busu: number;
  kanri_shiten_groups: KanriShitenSubGroup[];
}

// ─── 管理支店別購読者名簿 (report_type=kanri_shiten) ────────────────────
export interface KanriShitenReportRow {
  dokusya_id: number;
  dokusya_shubetsu: number;
  shimei: string;
  shimei_kana: string;
  kumiaiin_code: string;
  haitatsu_tel: string;
  shiten_name: string;
  haitatsu_address: string;
  dokusya_busu: number;
  shiharai_hoho: number;
  dokusya_kaishi_date: string;
  hanbaiten_name: string;
}

export interface KanriShitenGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  total_busu: number;
  rows: KanriShitenReportRow[];
}

export interface MeiboPreviewData {
  report_type: 'hanbaiten' | 'kanri_shiten';
  tekiyo_date: string;
  ja_name: string;
  ja_tel: string;
  grand_total_busu: number;
  hanbaiten_groups: HanbaitenGroup[];
  kanri_shiten_groups: KanriShitenGroup[];
}

/** Single-object envelope `{ data: … }` from the BE controller. */
export interface MeiboPreviewEnvelope {
  data: MeiboPreviewData;
}

/** GET /api/v1/report/meibo/preview — ACSMS-API-026-001. */
export async function previewMeibo(
  query: MeiboReportQuery,
): Promise<MeiboPreviewEnvelope> {
  const res = await axiosInstance.get<MeiboPreviewEnvelope>(
    '/api/v1/report/meibo/preview',
    { params: query },
  );
  return res.data;
}

/** GET /api/v1/report/meibo/export — ACSMS-API-026-002. Returns a Blob. */
export async function exportMeibo(query: MeiboReportQuery): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/report/meibo/export', {
    params: query,
    responseType: 'blob',
  });
  return res.data;
}

// ─── 増減連絡票（販売店） (ACSMS-SCR-028) ───────────────────────────────
// Mirrors docs/design/ACSMS-SCR-028/ACSMS-SCR-028-api.md (API-028-001 / 002).

/** Query DTO shared by preview + PDF export (singular ids per BE DTO). */
export interface ZougenHanbaitenQuery {
  tekiyo_date: string;
  /** 未指定時は全販売店。 */
  hanbaiten_id?: number[];
  /** 未指定時は全管理支店。 */
  kanri_shiten_id?: number[];
}

/** 増部 / 減部 の1レコード。 */
export interface ZougenEntry {
  /** "{前} → {後}" 形式の部数遷移。 */
  busu: string;
  address: string;
  name: string;
  delivery_name: string;
  phone: string;
  biko: string;
}

/** 住所変更の1行（変更前 / 変更後）。 */
export interface ZougenAddressChangeRow {
  label: string;
  address: string;
  name: string;
  delivery_name: string;
  phone: string;
  biko: string;
}

/** 販売店＋管理支店ごとの1帳票。 */
export interface ZougenReport {
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  kanri_shiten_tel: string | null;
  kanri_shiten_fax: string | null;
  zoubu: ZougenEntry[];
  genbu: ZougenEntry[];
  address_change: ZougenAddressChangeRow[];
}

export interface ZougenPreviewData {
  tekiyo_date: string;
  reports: ZougenReport[];
}

/** Single-object envelope `{ data: … }` from the BE controller. */
export interface ZougenPreviewEnvelope {
  data: ZougenPreviewData;
}

/** GET /api/v1/report/zougen-hanbaiten/preview — ACSMS-API-028-001. */
export async function previewZougenHanbaiten(
  query: ZougenHanbaitenQuery,
): Promise<ZougenPreviewEnvelope> {
  const res = await axiosInstance.get<ZougenPreviewEnvelope>(
    '/api/v1/report/zougen-hanbaiten/preview',
    { params: query },
  );
  return res.data;
}

/** POST /api/v1/report/zougen-hanbaiten/export — ACSMS-API-028-002. Returns a Blob (PDF). */
export async function exportZougenHanbaiten(
  query: ZougenHanbaitenQuery,
): Promise<Blob> {
  const res = await axiosInstance.post<Blob>(
    '/api/v1/report/zougen-hanbaiten/export',
    query,
    { responseType: 'blob' },
  );
  return res.data;
}

// ─── ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面 ──────────────────

/** 管理支店ごとの備考（出力時のみ。プレビューで直接入力）。 */
export interface ZougenNichinoRemark {
  kanri_shiten_id: number;
  biko?: string;
}

/** Query DTO shared by preview (GET) + PDF/ZIP export (POST body). */
export interface ZougenNichinoQuery {
  tekiyo_date: string;
  /** 未指定時はスコープ内の全管理支店。 */
  kanri_shiten_id?: number[];
  /** 出力時のみ。管理支店ごとの「＜備考＞」欄テキスト。 */
  remarks?: ZougenNichinoRemark[];
}

/** 帳票明細の1行（販売店単位）。 */
export interface ZougenNichinoReportRow {
  hanbaiten_id: number;
  /** 日農委託のとき「委託」、それ以外は ""。 */
  itaku_label: string;
  hanbaiten_code: string;
  /** 免税販売店は先頭に「（免）」が付く。 */
  hanbaiten_name: string;
  genzai_busu: number;
  zou_busu: number;
  gen_busu: number;
  shin_busu: number;
  /** 前回出力との差異がある行は true（帳票で「◆」を付与）。 */
  diff_mark: boolean;
}

/** 管理支店内の全販売店合計。 */
export interface ZougenNichinoTotal {
  genzai_busu: number;
  zou_busu: number;
  gen_busu: number;
  shin_busu: number;
}

/** 管理支店ごとの1帳票。 */
export interface ZougenNichinoReport {
  kanri_shiten_id: number;
  /** 10桁。帳票では 3-4-3 ハイフン区切り表示。 */
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  ja_name: string;
  todofuken_name: string;
  tanto_busho: string;
  tanto_name: string;
  tel: string;
  fax: string;
  rows: ZougenNichinoReportRow[];
  total: ZougenNichinoTotal;
}

export interface ZougenNichinoPreviewData {
  tekiyo_date: string;
  reports: ZougenNichinoReport[];
}

/** Single-object envelope `{ data: … }` from the BE controller. */
export interface ZougenNichinoPreviewEnvelope {
  data: ZougenNichinoPreviewData;
}

/** GET /api/v1/report/zougen-nichino/preview — ACSMS-API-029-001. */
export async function previewZougenNichino(
  query: ZougenNichinoQuery,
): Promise<ZougenNichinoPreviewEnvelope> {
  const res = await axiosInstance.get<ZougenNichinoPreviewEnvelope>(
    '/api/v1/report/zougen-nichino/preview',
    { params: { tekiyo_date: query.tekiyo_date, kanri_shiten_id: query.kanri_shiten_id } },
  );
  return res.data;
}

/**
 * POST /api/v1/report/zougen-nichino/export — ACSMS-API-029-002.
 * Returns a Blob: application/pdf（1管理支店）/ application/zip（複数）/
 * application/json（対象0件 → ダウンロードせず画面内メッセージ）。
 */
export async function exportZougenNichino(
  query: ZougenNichinoQuery,
): Promise<Blob> {
  const res = await axiosInstance.post<Blob>(
    '/api/v1/report/zougen-nichino/export',
    query,
    { responseType: 'blob' },
  );
  return res.data;
}
