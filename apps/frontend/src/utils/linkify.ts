/**
 * Split free text into plain-text and URL segments so a template can render
 * URLs as real `<a>` links WITHOUT `v-html` (no XSS surface — the URL text
 * is bound via `:href` / interpolation, never injected as markup).
 *
 * Only `http://` / `https://` URLs are linkified. Trailing punctuation that
 * is almost never part of a URL (`. , ; : ! ? ) ] } " '` and full-width 。、）
 * is pushed back into the following text segment so a sentence like
 * "見てね https://example.com/。" doesn't swallow the 。 into the link.
 */
export interface LinkifyPart {
  type: 'text' | 'url';
  value: string;
}

const URL_RE = /https?:\/\/[^\s]+/g;
// Characters that should not end a URL — trimmed off the tail and returned
// to the text stream.
const TRAILING = /[.,;:!?)\]}'"。、）]+$/;

export function linkifyParts(text: string): LinkifyPart[] {
  if (!text) return [];

  const parts: LinkifyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let url = match[0];

    // Strip trailing punctuation off the URL; it belongs to the prose.
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
