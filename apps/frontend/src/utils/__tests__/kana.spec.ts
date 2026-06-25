// Drives src/utils/kana.ts. Locks the half-width-katakana regex + the
// canonical Japanese error message wording so the 3 form views (JA,
// 管理支店, 支店) and any future `*_name_kana` field stay in lock-step.

import { describe, it, expect } from 'vitest';
import {
  HALF_WIDTH_KATAKANA_RE,
  JASTEM_NAME_RE,
  jastemNameFormatMessage,
  kanaFormatMessage,
} from '@/utils/kana';

describe('HALF_WIDTH_KATAKANA_RE', () => {
  it.each([
    ['ﾄｳｷｮｳｼﾃﾝ', 'plain half-width katakana'],
    ['ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ', 'half-width with dakuten ﾞ'],
    ['ﾊﾟﾝﾀﾞ', 'half-width with handakuten ﾟ'],
    ['ｲﾝﾀｰﾈｯﾄ', 'half-width with prolonged-sound-mark ｰ'],
    ['ﾄｳｷｮｳ ｶｲｼｮｳ', 'half-width with ASCII space'],
    ['ﾄｳｷｮｳ　ｶｲｼｮｳ', 'half-width with full-width space U+3000'],
    // Customer ask 2026-05-21: ASCII digits are now accepted so
    // branch-numbering suffixes (e.g. ﾃｽﾄ123, ｾﾝﾀｰ2) validate.
    ['ﾄｳｷｮｳ123', 'mixed half-width katakana + ASCII digits'],
    ['ﾃｽﾄ123', 'mixed half-width katakana + ASCII digits (customer case)'],
    ['123', 'ASCII digits only'],
  ])('should accept %s (%s)', (value) => {
    expect(HALF_WIDTH_KATAKANA_RE.test(value)).toBe(true);
  });

  it.each([
    ['ホンテンエイギョウブ', 'full-width katakana'],
    ['ほんてん', 'hiragana'],
    ['本店', 'kanji'],
    ['Honten', 'Latin alphabet'],
    ['ﾄｳｷｮｳ(ｶｲｼｮｳ)', 'half-width katakana with parens — punctuation excluded'],
    ['', 'empty string'],
  ])('should reject %s (%s)', (value) => {
    expect(HALF_WIDTH_KATAKANA_RE.test(value)).toBe(false);
  });
});

// 顧客要件 2026-06-25: 委託者名・農協名・店舗名 は銀行charset限定。
describe('JASTEM_NAME_RE (委託者名・農協名・店舗名 — 銀行charset)', () => {
  it.each([
    ['ﾎﾝﾃﾝ', 'half-width katakana (no small kana)'],
    ['ﾐﾄﾞﾘ', 'with dakuten ﾞ'],
    ['ﾊﾟﾝ', 'with handakuten ﾟ'],
    ['JA123', 'uppercase A-Z + digits'],
    ['A.B-C (1)', 'symbols . ( ) - and space'],
    ['ﾆﾎﾝﾉｳｷﾞﾖｳ JA-1', 'mixed half-width katakana + A-Z + digit + space + hyphen'],
  ])('should accept %s (%s)', (value) => {
    expect(JASTEM_NAME_RE.test(value)).toBe(true);
  });

  it.each([
    ['本店', 'kanji'],
    ['ほんてん', 'hiragana'],
    ['ホンテン', 'full-width katakana'],
    ['ＪＡ１２３', 'full-width alnum'],
    ['ja123', 'half-width lowercase'],
    ['ｷｬｸ', 'small half-width kana ｬ'],
    ['ﾄｳｷｮｳ', 'small half-width kana ｮ'],
    ['ｾﾝﾀｰ', 'prolonged-sound-mark ｰ (out of range)'],
    ['ｦ', 'ｦ U+FF66 (out of range)'],
    ['A@B', 'disallowed symbol @'],
    ['', 'empty string'],
  ])('should reject %s (%s)', (value) => {
    expect(JASTEM_NAME_RE.test(value)).toBe(false);
  });
});

describe('jastemNameFormatMessage', () => {
  it.each(['委託者名', '農協名', '店舗名'])(
    'should produce the canonical bank-charset message for %s',
    (label) => {
      expect(jastemNameFormatMessage(label)).toBe(
        `${label}は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。`,
      );
    },
  );
});

describe('kanaFormatMessage', () => {
  it('should produce the canonical message format for a JA-name field', () => {
    expect(kanaFormatMessage('JA名')).toBe(
      'JA名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });

  it('should produce the canonical message format for a 管理支店 field', () => {
    expect(kanaFormatMessage('管理支店名')).toBe(
      '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });

  it('should produce the canonical message format for a 支店 field', () => {
    expect(kanaFormatMessage('支店名')).toBe(
      '支店名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });
});
