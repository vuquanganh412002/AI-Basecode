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

/** プレビュー要求ボディ（API-020-003, v1.1）。集計フィルタのみ。 */
export interface PreviewKozaFurikaeBody {
  target_month: string;
  hikiotoshi_date: string;
  kanri_shiten_ids?: number[];
  shiten_ids?: number[];
  koza_shiten_ids?: number[];
}

/** プレビュー一覧の1行（API-020-003 §レスポンス）。金額は編集可。 */
export interface KozaPreviewRow {
  dokusya_id: number;
  koza_meigi: string;
  kanri_shiten_id: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  furikae_kingaku: number;
}

/** プレビュー一覧レスポンス（{ data, meta }）。 */
export interface KozaPreviewEnvelope {
  data: KozaPreviewRow[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

/** ファイル作成へ送る編集済みの1行（dokusya_id 突合 + 編集金額）。 */
export interface ExportKozaFurikaeRow {
  dokusya_id: number;
  furikae_kingaku: number;
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
  /** プレビューで確認・編集した振替対象行（v1.1）。 */
  rows: ExportKozaFurikaeRow[];
}

/** 失効単価参照エラー（409 INACTIVE_TANKA_REFERENCED）の1件（該当購読者）。 */
export interface KozaFurikaeErrorDetail {
  /** dokusya_id（文字列）。 */
  field: string;
  /** 購読者名 + 単価コード/名。 */
  message: string;
}

/**
 * A normalized non-axios error carrying the screen-specific error_code.
 * INACTIVE_TANKA_REFERENCED のときは `errors[]`（該当購読者一覧）と `message`
 * を伴い、view が Excel取込画面と同様のインラインエラー一覧で提示する。
 */
export interface KozaFurikaeError {
  error_code: string;
  message?: string;
  errors?: KozaFurikaeErrorDetail[];
  /** 失効単価参照(409)の総該当件数。errors[] は先頭15件で打ち切られる。 */
  total?: number;
}

/** CSV出力レスポンス：Blob 本体 + サーバが付与したダウンロードファイル名。 */
export interface ExportKozaFurikaeResult {
  blob: Blob;
  /** Content-Disposition から復元した日本語ファイル名（取得不可なら null）。 */
  filename: string | null;
}

/**
 * Content-Disposition ヘッダからファイル名を取り出す。
 * RFC 5987 の `filename*=UTF-8''…`（日本語名）を優先し、無ければ素の
 * `filename="…"` を返す。どちらも無ければ null。
 */
function filenameFromDisposition(cd: string | undefined): string | null {
  if (!cd) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return null;
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : null;
}

/** GET /api/v1/koza-furikae/initial — ACSMS-API-020-001. */
export async function getInitialKozaFurikae(): Promise<KozaFurikaeInitialEnvelope> {
  const res = await axiosInstance.get<KozaFurikaeInitialEnvelope>(
    '/api/v1/koza-furikae/initial',
  );
  return res.data;
}

/**
 * POST /api/v1/koza-furikae/preview — ACSMS-API-020-003 (v1.1). 集計して
 * プレビュー一覧（金額編集用）を返す。DB/S3 書込なし。対象0件は BE 404
 * (NO_TARGET_DATA) → `{ error_code }` に正規化して再スロー（呼び出し側で
 * MSG-020-002 を画面内表示）。
 */
export async function previewKozaFurikae(
  body: PreviewKozaFurikaeBody,
): Promise<KozaPreviewEnvelope> {
  try {
    const res = await axiosInstance.post<KozaPreviewEnvelope>(
      '/api/v1/koza-furikae/preview',
      body,
    );
    return res.data;
  } catch (err) {
    const body = (
      err as AxiosError<{
        error_code?: string;
        message?: string;
        errors?: KozaFurikaeErrorDetail[];
        total?: number;
      }>
    ).response?.data;
    const code = body?.error_code;
    if (code) {
      // 失効単価参照(409)は errors[]（先頭15件）+ total（総件数）+ message を view に渡す。
      const normalized: KozaFurikaeError = {
        error_code: code,
        message: body?.message,
        errors: body?.errors,
        total: body?.total,
      };
      throw normalized;
    }
    throw err;
  }
}

/**
 * POST /api/v1/koza-furikae/export — ACSMS-API-020-002. Returns the Blob
 * (全銀フォーマット CSV, Shift_JIS) + サーバ駆動のダウンロードファイル名。
 *
 * ファイル名は ja_code + 引落日 を含むため BE 側で決まる。FE は ja_code を
 * 保持しないので Content-Disposition（RFC5987 filename* 優先）から読み取る。
 *
 * 対象0件のとき BE は 404 (NO_TARGET_DATA) を返す。responseType:'blob' のため
 * エラー body は Blob で届くが、axios インターセプタ（error-handler.ts）が
 * JSON へパースして `error.response.data` に戻すため、ここで error_code を読み、
 * 呼び出し側（view）が判定しやすいよう `{ error_code }` に正規化して再スローする。
 */
export async function exportKozaFurikae(
  body: ExportKozaFurikaeBody,
): Promise<ExportKozaFurikaeResult> {
  try {
    const res = await axiosInstance.post('/api/v1/koza-furikae/export', body, {
      responseType: 'blob',
    });
    return {
      blob: res.data as Blob,
      filename: filenameFromDisposition(res.headers['content-disposition']),
    };
  } catch (err) {
    const body = (
      err as AxiosError<{
        error_code?: string;
        message?: string;
        errors?: KozaFurikaeErrorDetail[];
        total?: number;
      }>
    ).response?.data;
    const code = body?.error_code;
    if (code) {
      // 失効単価参照(409)は errors[]（先頭15件）+ total（総件数）+ message を view に渡す。
      const normalized: KozaFurikaeError = {
        error_code: code,
        message: body?.message,
        errors: body?.errors,
        total: body?.total,
      };
      throw normalized;
    }
    throw err;
  }
}
