import { describe, expect, it } from 'vitest';

import { DokusyasoBunrui, NogyosyaBunrui } from '@/constants/enums';
import {
  DOKUSYASO_BUNRUI_NOGYOSYA,
  bunruiCsvToLabel,
  splitBunruiCsv,
} from '@/constants/dokusya-bunrui';

/**
 * コード値の出所は enum、ラベルの出所は m_code（`useCodesStore`）。
 * このファイルは「両者をつなぐ CSV 処理」だけを見る。選択肢の中身や
 * ラベル文字列そのものは m_code 側の責務なのでここでは検証しない。
 */
describe('dokusya-bunrui CSV helpers', () => {
  it('should derive 農業者 sentinel from the enum, as a string (column is CSV VARCHAR)', () => {
    expect(DOKUSYASO_BUNRUI_NOGYOSYA).toBe(String(DokusyasoBunrui.NOGYOSYA));
    expect(typeof DOKUSYASO_BUNRUI_NOGYOSYA).toBe('string');
  });

  describe('splitBunruiCsv', () => {
    it.each([
      ['0,3', ['0', '3']],
      [' 0 , 3 ', ['0', '3']],
      ['', []],
      [null, []],
      [undefined, []],
    ])('should split %s into tokens', (csv, expected) => {
      expect(splitBunruiCsv(csv as string | null | undefined)).toEqual(expected);
    });
  });

  describe('bunruiCsvToLabel', () => {
    // m_code の代役。実行時は useCodesStore().label(category, code)。
    const resolve = (table: Record<string, string>) => (c: string) =>
      table[c] ?? '';

    it('should join resolved labels with 、', () => {
      const r = resolve({
        [String(DokusyasoBunrui.NOGYOSYA)]: '農業者',
        [String(DokusyasoBunrui.GAKUSEI)]: '学生',
      });
      expect(bunruiCsvToLabel('0', r)).toBe('農業者');
      expect(bunruiCsvToLabel('0,3', r)).toBe('農業者、学生');
      expect(bunruiCsvToLabel('', r)).toBe('');
    });

    it('should keep unknown codes verbatim so 電子版側の新コードを落とさない', () => {
      const r = resolve({ [String(NogyosyaBunrui.KOME)]: '米' });
      expect(bunruiCsvToLabel('0,7', r)).toBe('米、7');
      expect(bunruiCsvToLabel('9', r)).toBe('9');
    });
  });
});
