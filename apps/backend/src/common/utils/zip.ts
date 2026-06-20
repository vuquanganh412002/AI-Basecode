import JSZip from 'jszip';

/** One entry (file) inside a ZIP archive. */
export interface ZipEntry {
  /** Filename inside the archive (basename, may be non-ASCII). */
  name: string;
  /** File content. */
  body: Buffer;
}

/**
 * Bundle `entries` into a single ZIP archive (`nodebuffer`).
 *
 * Shared helper for every screen that returns multiple files as one
 * download — 購読者ファイルダウンロード 一括DL (SCR-022), 増減通知 複数管理支店
 * (SCR-029), and any future bulk-export. Build the per-file buffers in the
 * caller (S3 fetch / PDF render / …), pass them here, then stream the result
 * with `Content-Type: application/zip`.
 *
 * Duplicate names are made unique by appending ` (n)` before the extension
 * (`a.pdf` → `a (1).pdf` → `a (2).pdf`); JSZip would otherwise silently
 * overwrite a same-named entry.
 */
export async function buildZipArchive(entries: ZipEntry[]): Promise<Buffer> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const entry of entries) {
    zip.file(uniqueName(entry.name, used), entry.body);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Reserve a collision-free archive name, appending ` (n)` before the ext. */
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
