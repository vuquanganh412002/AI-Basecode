/**
 * Browser file-download helper — the single place that turns an API
 * `Blob` response into a "Save as…" download. Every export/template
 * screen (帳票 / CSV / Excel / テンプレート) MUST go through this instead
 * of hand-rolling the `createObjectURL → <a> → click → revoke` dance.
 *
 * Skips silently in jsdom (test env) where `URL.createObjectURL` is
 * undefined, so component specs can assert the wrapper API was called
 * without stubbing the DOM download plumbing.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (
    globalThis.window === undefined ||
    typeof globalThis.URL?.createObjectURL !== 'function'
  ) {
    return;
  }
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}
