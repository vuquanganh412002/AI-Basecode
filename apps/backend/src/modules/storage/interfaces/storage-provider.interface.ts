/**
 * `getSignedUrl()` の `expiresIn` 省略時の既定値（秒）。両 provider
 * （S3/MinIO）で共有 — 呼び出し側（file-download.service.ts 等）が
 * `expiresIn` を渡さずデフォルト挙動に依存するケースがあるため、
 * provider 間でこの値が食い違うとバックエンドによって署名URLの有効期限が
 * 変わってしまう。
 */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

export interface StorageProvider {
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
