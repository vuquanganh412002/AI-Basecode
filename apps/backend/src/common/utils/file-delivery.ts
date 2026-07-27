import type { Response } from 'express';

/**
 * ファイル配信（プレビュー / ダウンロード / ZIP）の共通ユーティリティ。
 *
 * ファイルダウンロード画面(SCR-022, t_file_download) と ファイルアップロード画面
 * (SCR-023, t_file_upload) は「拡張子→Content-Type 導出」「バイナリ添付レスポンス
 * 送出」「DownloadResult の形」が同一のため、ここに集約して両モジュールで再利用する。
 * DataScope / 監査ログ / 対象エンティティは各サービス側に残す（画面ごとに異なるため）。
 */

/** ダウンロード結果（バイナリ + メタ）。 */
export interface DownloadResult {
  body: Buffer;
  contentType: string;
  contentLength: number;
  fileName: string;
}

/** 拡張子から Content-Type を導出（不明は octet-stream）。 */
export function contentTypeFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

/**
 * バイナリ添付レスポンスを送出する。日本語ファイル名は RFC 5987 の filename* に
 * 載せ、ASCII フォールバックは多バイト文字を除去する（Node の HTTP 層が非 ASCII
 * ヘッダ値を拒否するため）。
 */
export function sendBinaryAttachment(res: Response, result: DownloadResult): void {
  const encodedName = encodeURIComponent(result.fileName);
  const asciiFallback = result.fileName.replaceAll(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', result.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
  );
  res.setHeader('Content-Length', String(result.contentLength));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(result.body);
}
