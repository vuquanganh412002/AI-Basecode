import JSZip from 'jszip';

/** ZIP アーカイブ内の1エントリ（ファイル）。 */
export interface ZipEntry {
  /** アーカイブ内のファイル名（basename、非 ASCII 可）。 */
  name: string;
  /** ファイル内容。 */
  body: Buffer;
}

/**
 * `entries` を単一 ZIP（`nodebuffer`）にまとめる。
 *
 * 複数ファイルダウンロード全般で共有 — 一括DL (ACSMS-SCR-022), 増減通知 複数管理支店
 * (ACSMS-SCR-029), 将来の一括エクスポート。呼び出し側がファイル別バッファ（S3 / PDF /
 * …）を用意してここに渡し、`Content-Type: application/zip` でストリームする。
 *
 * 重複名は拡張子前に ` (n)` を付ける（`a.pdf` → `a (1).pdf`）。そうしないと JSZip
 * が同名エントリを黙って上書きするため。
 */
export async function buildZipArchive(entries: ZipEntry[]): Promise<Buffer> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const entry of entries) {
    zip.file(uniqueName(entry.name, used), entry.body);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** 衝突しないアーカイブ名を確保する（拡張子前に ` (n)` を付与）。 */
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}
