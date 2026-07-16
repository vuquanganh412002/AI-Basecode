// Hand-written wrapper around the /api/v1/haitatsuryo endpoints
// (ACSMS-SCR-021). Mirrors docs/design/ACSMS-SCR-021/ACSMS-SCR-021-api.md.

import type { AxiosError } from 'axios';
import axiosInstance from '@/api/axios-instance';

/** Query DTO shared by preview (GET) + Excel export (POST body). */
export interface HaitatsuryoQuery {
  /** 対象年月日（YYYY-MM-DD）。年月単位で集計。 */
  target_month: string;
  /** 配達手数料支払サイクル（月数 1〜12）。未指定時は全サイクル対象。 */
  haitatsuryo_shiharai_cycle?: number;
  /** ページ番号（1始まり、preview のみ）。未指定時は 1。 */
  page?: number;
  /** 1ページ件数（1〜100、preview のみ）。未指定時は 20。 */
  per_page?: number;
}

/** 販売店ごとの集計行（api.md §レスポンスデータ data[]）。 */
export interface HaitatsuryoRow {
  target_month: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  total_busu: number;
  total_kingaku: number;
  haitatsuryo_shiharai_cycle: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  /** 預金種別（m_code YOKIN_SHUBETSU: 1 普通 / 2 当座）。 */
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  /** 手数料（配達手数料単価、1部あたり）。当月金額の算出に使用。 */
  tesuryo: number;
  /** 振込手数料負担区分（m_code TESURYO_KUBUN: 1:JA, 2:販売店）。「手数料」列に表示。 */
  furikomi_tesuryo_futan_kubun: number | null;
  biko: string;
}

/** 集計サマリ＋ページ情報。 */
export interface HaitatsuryoMeta {
  /** 集計対象の販売店総数（全ページ通算）。 */
  total: number;
  /** 現在ページ（1始まり）。 */
  page: number;
  /** 1ページ件数。 */
  per_page: number;
  /** 総ページ数。 */
  total_pages: number;
  /** 全販売店合計部数（ページ非依存）。 */
  grand_total_busu: number;
  /** 全販売店合計金額（ページ非依存）。 */
  grand_total_kingaku: number;
  /** 適用税区分（m_ja.zei_kubun: 1 内税 / 2 外税）。 */
  zei_kubun: number;
}

/** Preview response body — `{ data, meta }` at top level (no extra wrapper). */
export interface HaitatsuryoPreviewData {
  data: HaitatsuryoRow[];
  meta: HaitatsuryoMeta;
}

/** 失効単価参照エラー（409 INACTIVE_TANKA_REFERENCED）の1件（該当販売店）。 */
export interface HaitatsuryoErrorDetail {
  /** hanbaiten_id（文字列）。 */
  field: string;
  /** 販売店コード/名 + 単価コード/名。 */
  message: string;
}

/**
 * A normalized non-axios error carrying the screen-specific error_code.
 * INACTIVE_TANKA_REFERENCED のときは `errors[]`（該当販売店一覧・先頭15件）と
 * `total`（総件数）+ `message` を伴い、view が SCR-020 と同様のインライン
 * エラー一覧で提示する（トーストではない）。
 */
export interface HaitatsuryoError {
  error_code: string;
  message?: string;
  errors?: HaitatsuryoErrorDetail[];
  total?: number;
}

/** 409 応答 body から error_code を取り出し、あれば正規化エラーを throw する。 */
function normalizeHaitatsuryoError(err: unknown): never {
  const body = (
    err as AxiosError<{
      error_code?: string;
      message?: string;
      errors?: HaitatsuryoErrorDetail[];
      total?: number;
    }>
  ).response?.data;
  const code = body?.error_code;
  if (code) {
    const normalized: HaitatsuryoError = {
      error_code: code,
      message: body?.message,
      errors: body?.errors,
      total: body?.total,
    };
    throw normalized;
  }
  throw err;
}

/** GET /api/v1/haitatsuryo/preview — ACSMS-API-021-001. */
export async function previewHaitatsuryo(
  query: HaitatsuryoQuery,
): Promise<HaitatsuryoPreviewData> {
  try {
    const res = await axiosInstance.get<HaitatsuryoPreviewData>(
      '/api/v1/haitatsuryo/preview',
      { params: query },
    );
    return res.data;
  } catch (err) {
    normalizeHaitatsuryoError(err);
  }
}

/**
 * POST /api/v1/haitatsuryo/export — ACSMS-API-021-002. Returns a Blob.
 * 対象0件のときは BE が 200 + application/json `{ data: [] }` を返す（xlsx では
 * ない）。呼び出し側は blob.type で判定し、no-data 表示に切替える。
 * 失効単価参照(409)は error-handler が Blob body を JSON へ復元済みなので、
 * ここで `{ error_code, message, errors, total }` に正規化して view へ渡す。
 */
export async function exportHaitatsuryo(
  query: HaitatsuryoQuery,
): Promise<Blob> {
  try {
    const res = await axiosInstance.post<Blob>(
      '/api/v1/haitatsuryo/export',
      query,
      { responseType: 'blob' },
    );
    return res.data;
  } catch (err) {
    normalizeHaitatsuryoError(err);
  }
}
