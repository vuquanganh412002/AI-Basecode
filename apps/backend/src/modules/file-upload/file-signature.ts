/**
 * アップロードファイルの実バイト列（マジックナンバー）と、申告された拡張子が
 * 示すファイル種別が一致するかを検証する。
 *
 * `isAllowedExtension()`（file-upload.service.ts）は拡張子の文字列しか見ないため、
 * 悪意あるファイル（HTML/JS等）を許可拡張子（例 `.pdf`）へリネームするだけで
 * 通過できていた（バックエンドコードレビュー finding #7）。ここでバイナリ形式
 * のみ実バイト列の先頭シグネチャを照合する。プレーンテキスト系（.csv/.txt）は
 * 信頼できるマジックナンバーが存在しないため検証対象外とする。
 *
 * 注意: これは「拡張子どおりの既知フォーマットか」を検証するものであり、
 * 悪意あるコード（例: マクロ入り .docx、PDF内 JavaScript）の有無までは検知
 * しない。あくまで「HTML/実行ファイルを画像・PDF等に偽装する」典型的な
 * content-type confusion を防ぐための一次防御。
 */

type SignatureCheck = (buf: Buffer) => boolean;

function startsWithBytes(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

// xlsx / docx / pptx / zip はいずれも ZIP コンテナ（PK\x03\x04 で始まる）。
// 空アーカイブ(PK\x05\x06)・spanned(PK\x07\x08)は業務データとして通常発生
// しないため対象外。
const isZipContainer: SignatureCheck = (buf) =>
  startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04]);

// 旧形式 Office（doc / xls / ppt）共通の OLE2 Compound File シグネチャ。
const isOleCompoundFile: SignatureCheck = (buf) =>
  startsWithBytes(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/**
 * 拡張子 → シグネチャ検証関数。`null` はプレーンテキスト等、検証対象外
 * （常に true 扱い）を明示する。
 */
const SIGNATURE_BY_EXTENSION: Record<string, SignatureCheck | null> = {
  '.pdf': (buf) => startsWithBytes(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  '.png': (buf) =>
    startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': (buf) => startsWithBytes(buf, [0xff, 0xd8, 0xff]),
  '.jpeg': (buf) => startsWithBytes(buf, [0xff, 0xd8, 0xff]),
  '.zip': isZipContainer,
  '.xlsx': isZipContainer,
  '.docx': isZipContainer,
  '.pptx': isZipContainer,
  '.doc': isOleCompoundFile,
  '.xls': isOleCompoundFile,
  '.ppt': isOleCompoundFile,
  '.csv': null,
  '.txt': null,
};

/**
 * `fileName` の拡張子が示すファイル種別と `buffer` の実バイト列が一致するか。
 * 未知の拡張子（このモジュールのシグネチャ表に無い）は true を返す —
 * 拡張子自体の許可判定は呼び出し側の `isAllowedExtension()` が別途担う。
 */
export function matchesDeclaredFileType(
  fileName: string,
  buffer: Buffer,
): boolean {
  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx < 0) return true;
  const ext = lower.slice(dotIdx);
  const check = SIGNATURE_BY_EXTENSION[ext];
  if (check === undefined || check === null) return true;
  return check(buffer);
}
