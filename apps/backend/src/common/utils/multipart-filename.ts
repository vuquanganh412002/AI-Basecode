/**
 * Recover a UTF-8 multipart upload filename mangled by Busboy's default
 * `latin1` header decoding.
 *
 * When `@nestjs/platform-express`'s `FilesInterceptor` parses
 * `multipart/form-data`, Busboy decodes each part's `filename` from the
 * `Content-Disposition` header using its default `defParamCharset =
 * 'latin1'`. Browsers send the bare `filename="…"` as raw UTF-8 bytes,
 * so a Japanese / Vietnamese name (`最新…`, `Một số`) arrives in
 * `file.originalname` as those UTF-8 bytes reinterpreted one-byte-per-
 * codepoint — e.g. `Một số` → `Má»™t sá»‘`. That mangled string then
 * flows into the S3 object key and the `t_file_upload.file_name`
 * column, so the corruption is persisted.
 *
 * `Buffer.from(name, 'latin1')` reverses the latin1 decode back to the
 * exact original bytes, then `.toString('utf8')` decodes them correctly.
 * The round-trip is a no-op for pure-ASCII names (identical in latin1
 * and utf8), so it is safe to apply unconditionally to every uploaded
 * file.
 */
export function decodeMultipartFilename(originalName: string): string {
  return Buffer.from(originalName, 'latin1').toString('utf8');
}
