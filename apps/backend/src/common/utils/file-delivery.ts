import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/**
 * ファイル配信（プレビュー / ダウンロード / ZIP）共通ユーティリティ。
 * ACSMS-SCR-022(t_file_download) と ACSMS-SCR-023(t_file_upload) で「拡張子→Content-Type」
 * 「バイナリ添付送出」「DownloadResult 形」が同一のため集約。
 * DataScope / 監査ログ / 対象エンティティは画面ごとに異なるため各サービスに残す。
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
 * バイナリ添付を送出。日本語名は RFC 5987 filename* に載せ、ASCII フォールバックは
 * 多バイト文字を除去（Node の HTTP 層が非 ASCII ヘッダ値を拒否するため）。
 */
export function sendBinaryAttachment(res: Response, result: DownloadResult): void {
  const encodedName = encodeURIComponent(result.fileName);
  const asciiFallback = buildAsciiFallbackFileName(result.fileName);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
  );
  res.setHeader('Content-Length', String(result.contentLength));
  res.setHeader('Cache-Control', 'no-store');
  res.status(HttpStatus.OK).send(result.body);
}

/**
 * `filename="..."` に埋め込む quoted-string 用のASCIIフォールバック名を組み立てる。
 * 非ASCII文字の除去に加え、`\` と `"` を RFC 6266 §4.1 の quoted-string 規則どおり
 * バックスラッシュエスケープする（`\` を先に。順序を逆にすると `"` のエスケープで
 * 追加した `\` 自身を二重エスケープしてしまう）。
 *
 * 未エスケープのままだと originalname に `"` を含むアップロードファイル
 * （拡張子しか検証していないため通ってしまう — バックエンドコードレビュー
 * finding #7 参照）で `filename="evil".pdf"` のように quoted-string が途中で
 * 閉じてしまい、ヘッダ構造が壊れる／一部クライアントに 2 個目の filename
 * パラメータとして誤解釈される（ファイル名偽装）恐れがあった。
 */
export function buildAsciiFallbackFileName(fileName: string): string {
  return fileName
    .replaceAll(/[^\x20-\x7e]/g, '_')
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('"', String.raw`\"`);
}
