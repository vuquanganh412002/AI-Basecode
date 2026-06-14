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
