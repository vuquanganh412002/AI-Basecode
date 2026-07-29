/**
 * Busboy の既定 `latin1` ヘッダデコードで壊れた UTF-8 マルチパートファイル名を復元する。
 *
 * `FilesInterceptor`（Busboy `defParamCharset='latin1'`）は
 * `Content-Disposition` のファイル名を latin1 でデコードするが、ブラウザは生の
 * UTF-8 バイトを送るため `Một số` → `Má»™t sá»‘` となり、その破損が S3 キー +
 * `t_file_upload.file_name` まで残る。
 *
 * `Buffer.from(name, 'latin1').toString('utf8')` で latin1 デコードを逆変換する。
 * 純 ASCII 名では no-op なので無条件適用で安全。
 */
export function decodeMultipartFilename(originalName: string): string {
  return Buffer.from(originalName, 'latin1').toString('utf8');
}
