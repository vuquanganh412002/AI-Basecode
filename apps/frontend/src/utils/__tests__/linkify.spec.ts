import { describe, it, expect } from 'vitest';
import { linkifyParts } from '@/utils/linkify';

describe('linkifyParts', () => {
  it('should return an empty array for empty input', () => {
    expect(linkifyParts('')).toEqual([]);
  });

  it('should return a single text part when there is no URL', () => {
    expect(linkifyParts('ただのテキスト')).toEqual([
      { type: 'text', value: 'ただのテキスト' },
    ]);
  });

  it('should split text and a trailing URL', () => {
    expect(linkifyParts('詳細は https://www.agrinews.co.jp/')).toEqual([
      { type: 'text', value: '詳細は ' },
      { type: 'url', value: 'https://www.agrinews.co.jp/' },
    ]);
  });

  it('should linkify a URL in the middle and keep surrounding text', () => {
    expect(linkifyParts('前 http://example.com 後')).toEqual([
      { type: 'text', value: '前 ' },
      { type: 'url', value: 'http://example.com' },
      { type: 'text', value: ' 後' },
    ]);
  });

  it('should handle multiple URLs', () => {
    const parts = linkifyParts('a https://x.com b https://y.com');
    expect(parts.filter((p) => p.type === 'url').map((p) => p.value)).toEqual([
      'https://x.com',
      'https://y.com',
    ]);
  });

  it('should push trailing punctuation back into the text stream', () => {
    expect(linkifyParts('見てね https://example.com/。')).toEqual([
      { type: 'text', value: '見てね ' },
      { type: 'url', value: 'https://example.com/' },
      { type: 'text', value: '。' },
    ]);
  });

  it('should preserve newlines in text segments', () => {
    expect(linkifyParts('一行目\n二行目')).toEqual([
      { type: 'text', value: '一行目\n二行目' },
    ]);
  });

  it('should NOT linkify a bare domain without scheme (avoids false positives)', () => {
    expect(linkifyParts('www.agrinews.co.jp')).toEqual([
      { type: 'text', value: 'www.agrinews.co.jp' },
    ]);
  });
});
