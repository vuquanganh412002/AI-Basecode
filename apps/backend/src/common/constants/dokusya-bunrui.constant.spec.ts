import {
  DOKUSYASO_BUNRUI_CSV_RE,
  DOKUSYASO_BUNRUI_NOGYOSYA,
  NOGYOSYA_BUNRUI_CSV_RE,
  isValidDokusyaSoBunruiCsv,
  isValidNogyosyaBunruiCsv,
  splitBunruiCsv,
} from './dokusya-bunrui.constant';

describe('dokusya-bunrui.constant', () => {
  it('should treat 農業者 as code 0 (電子版 profession と 1:1)', () => {
    expect(DOKUSYASO_BUNRUI_NOGYOSYA).toBe('0');
  });

  describe('splitBunruiCsv', () => {
    it.each<[string | null | undefined, string[]]>([
      ['0,3', ['0', '3']],
      [' 0 , 3 ', ['0', '3']],
      ['', []],
      [null, []],
      [undefined, []],
    ])('should split %s', (csv, expected) => {
      expect(splitBunruiCsv(csv)).toEqual(expected);
    });
  });

  describe('isValidDokusyaSoBunruiCsv', () => {
    it.each(['', '0', '999', '0,3', '1,2,999'])('should accept %s', (v) => {
      expect(isValidDokusyaSoBunruiCsv(v)).toBe(true);
    });

    // ラベル保存の旧データ・未定義コードは push 側で profession に変換できない。
    it.each(['農業者', '4', '0,農業者'])('should reject %s', (v) => {
      expect(isValidDokusyaSoBunruiCsv(v)).toBe(false);
    });
  });

  describe('isValidNogyosyaBunruiCsv', () => {
    it.each(['', '0', '5', '999', '0,1,4'])('should accept %s', (v) => {
      expect(isValidNogyosyaBunruiCsv(v)).toBe(true);
    });

    it.each(['米', '6', '0,米'])('should reject %s', (v) => {
      expect(isValidNogyosyaBunruiCsv(v)).toBe(false);
    });
  });

  describe('DTO 用 CSV 正規表現', () => {
    it.each(['0', '999', '0,3'])('should match %s', (v) => {
      expect(DOKUSYASO_BUNRUI_CSV_RE.test(v)).toBe(true);
    });

    // 空文字は DTO 側の blankToUndef で除外されるため、正規表現は通さない。
    it.each(['', '0,', ',0', '農業者', '00'])('should not match %s', (v) => {
      expect(DOKUSYASO_BUNRUI_CSV_RE.test(v)).toBe(false);
    });

    it('should allow 酪農(5) only for 農業者分類', () => {
      expect(NOGYOSYA_BUNRUI_CSV_RE.test('5')).toBe(true);
      expect(DOKUSYASO_BUNRUI_CSV_RE.test('5')).toBe(false);
    });
  });
});
