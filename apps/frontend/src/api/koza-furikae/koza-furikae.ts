// Hand-written wrapper around the /api/v1/koza-furikae endpoints
// (ACSMS-SCR-020). Mirrors docs/design/ACSMS-SCR-020/ACSMS-SCR-020-api.md.

import type { AxiosError } from 'axios';
import axiosInstance from '@/api/axios-instance';

/** 初期データ（API-020-001 §レスポンスデータ）。JASTEM 委託者 + 最終使用支店。 */
export interface KozaFurikaeInitialData {
  ja_id: number | null;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

/** Top-level envelope — `{ data }`. */
export interface KozaFurikaeInitialEnvelope {
  data: KozaFurikaeInitialData;
}

/** POST /api/v1/koza-furikae/export のリクエストボディ（API-020-002 §リクエストパラメータ）。 */
export interface ExportKozaFurikaeBody {
  target_month: string;
  hikiotoshi_date: string;
  kanri_shiten_ids?: number[];
  shiten_ids?: number[];
  koza_shiten_ids?: number[];
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

/** A normalized non-axios error carrying the screen-specific error_code. */
export interface KozaFurikaeError {
  error_code: string;
}

/** GET /api/v1/koza-furikae/initial — ACSMS-API-020-001. */
export async function getInitialKozaFurikae(): Promise<KozaFurikaeInitialEnvelope> {
  const res = await axiosInstance.get<KozaFurikaeInitialEnvelope>(
    '/api/v1/koza-furikae/initial',
  );
  return res.data;
}

/**
 * POST /api/v1/koza-furikae/export — ACSMS-API-020-002. Returns a Blob
 * (全銀フォーマット CSV, Shift_JIS).
 *
 * 対象0件のとき BE は 404 (NO_TARGET_DATA) を返す。responseType:'blob' のため
 * エラー body は Blob で届くが、axios インターセプタ（error-handler.ts）が
 * JSON へパースして `error.response.data` に戻すため、ここで error_code を読み、
 * 呼び出し側（view）が判定しやすいよう `{ error_code }` に正規化して再スローする。
 */
export async function exportKozaFurikae(
  body: ExportKozaFurikaeBody,
): Promise<Blob> {
  try {
    const res = await axiosInstance.post('/api/v1/koza-furikae/export', body, {
      responseType: 'blob',
    });
    return res.data as Blob;
  } catch (err) {
    const code = (err as AxiosError<{ error_code?: string }>).response?.data
      ?.error_code;
    if (code) {
      const normalized: KozaFurikaeError = { error_code: code };
      throw normalized;
    }
    throw err;
  }
}
