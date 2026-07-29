/**
 * 自由テキストをプレーンテキストと URL セグメントに分割し、テンプレートが `v-html` なしで
 * URL を本物の `<a>` リンクとして描画できるようにする（XSS 面なし — URL テキストは
 * `:href` / 補間でバインドし、マークアップとして注入しない）。
 *
 * リンク化するのは `http://` / `https://` のみ。URL の一部になることがほぼない末尾の句読点
 * （`. , ; : ! ? ) ] } " '` と全角 。、））は後続テキストセグメントへ戻すため、
 * "見てね https://example.com/。" のような文で 。 をリンクに取り込まない。
 */
export interface LinkifyPart {
  type: 'text' | 'url';
  value: string;
}

const URL_RE = /https?:\/\/[^\s]+/g;
// URL の末尾に来るべきでない文字 — 末尾から切り取りテキスト側へ返す。
const TRAILING = /[.,;:!?)\]}'"。、）]+$/;

export function linkifyParts(text: string): LinkifyPart[] {
  if (!text) return [];

  const parts: LinkifyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let url = match[0];

    // URL 末尾の句読点を除去する。文章側に属する。
    let trailing = '';
    const trail = TRAILING.exec(url);
    if (trail) {
      trailing = trail[0];
      url = url.slice(0, url.length - trailing.length);
    }

    if (start > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    if (url) parts.push({ type: 'url', value: url });
    if (trailing) parts.push({ type: 'text', value: trailing });

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}
