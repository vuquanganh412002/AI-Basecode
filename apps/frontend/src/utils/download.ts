/**
 * ブラウザのファイルダウンロードヘルパ — API の `Blob` レスポンスを「名前を付けて保存」
 * ダウンロードに変える唯一の場所。全エクスポート/テンプレート画面（帳票 / CSV / Excel /
 * テンプレート）は `createObjectURL → <a> → click → revoke` を自前で書かず必ずこれを使う。
 *
 * `URL.createObjectURL` が undefined の jsdom（テスト環境）では黙ってスキップするので、
 * コンポーネント spec は DOM ダウンロード配線をスタブせずラッパ API 呼び出しを検証できる。
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

/**
 * Content-Disposition ヘッダから保存ファイル名を解決する。RFC 5987 の
 * `filename*=UTF-8''…`（多バイト対応）を優先し、無ければ通常の `filename="…"`。
 * ZIP 一括ダウンロード（file-download / file-upload 両画面）で共有する。
 */
export function parseContentDispositionFilename(
  disposition: string,
  fallback = 'download',
): string {
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // 不正なパーセントエンコード — ASCII 形式にフォールスルー。
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() || fallback;
}
