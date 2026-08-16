// 全銀フォーマット固定長ユーティリティの単体テスト（ACSMS-SCR-020）。
// docs/demo/ZENOUTFD_口座振替データサンプル と同じ桁詰め規則を検証する。
import {
  buildRecord,
  padCharSpace,
  padNumSpaceRight,
  padNumZero,
  sjisBytes,
  spaces,
  toHankaku,
} from './zengin-format';

describe('zengin-format', () => {
  describe('padNumZero (N: 右詰め・前ゼロ埋め)', () => {
    it('should zero-pad and keep the lowest digits', () => {
      expect(padNumZero(3100, 10)).toBe('0000003100'); // 引落金額
      expect(padNumZero('1234567', 7)).toBe('1234567'); // 口座番号（丁度）
      expect(padNumZero(12, 4)).toBe('0012');
      expect(padNumZero('', 4)).toBe('0000');
      expect(padNumZero('12345678', 6)).toBe('345678'); // 超過は下位桁
    });
  });

  describe('padNumSpaceRight (顧客番号: 右詰め・スペース埋め)', () => {
    it('should right-align with spaces', () => {
      expect(padNumSpaceRight(1, 5)).toBe('    1');
      expect(padNumSpaceRight(12345, 5)).toBe('12345');
    });
  });

  describe('toHankaku', () => {
    it('should convert 全角カナ to 半角カナ (with dakuten)', () => {
      expect(toHankaku('フクオカ')).toBe('ﾌｸｵｶ');
      expect(toHankaku('ガギグ')).toBe('ｶﾞｷﾞｸﾞ');
      expect(toHankaku('パピプ')).toBe('ﾊﾟﾋﾟﾌﾟ');
    });
    it('should upper-case latin and pass through half-width kana', () => {
      expect(toHankaku('abc')).toBe('ABC');
      expect(toHankaku('ﾃｽﾄ')).toBe('ﾃｽﾄ');
    });
  });

  describe('padCharSpace (C: 左詰め・後スペース埋め、SJISバイト長)', () => {
    it('should pad to the requested Shift_JIS byte length', () => {
      expect(sjisBytes(padCharSpace('ﾃｽﾄ', 15))).toBe(15);
      expect(padCharSpace('ﾃｽﾄ', 5)).toBe('ﾃｽﾄ  ');
      expect(padCharSpace('', 4)).toBe('    ');
    });
    it('should byte-truncate over-long values', () => {
      expect(sjisBytes(padCharSpace('ｱｲｳｴｵｶｷ', 3))).toBe(3);
      expect(padCharSpace('ｱｲｳｴｵｶｷ', 3)).toBe('ｱｲｳ');
    });
  });

  describe('buildRecord', () => {
    it('should throw when the record is not exactly 120 bytes', () => {
      expect(() => buildRecord(['1', spaces(100)], 'ヘッダ')).toThrow(/120/);
    });
    it('should return a 120-byte record when fields sum to 120', () => {
      const rec = buildRecord(['9', spaces(119)], 'エンド');
      expect(sjisBytes(rec)).toBe(120);
      expect(rec[0]).toBe('9');
    });
  });
});
