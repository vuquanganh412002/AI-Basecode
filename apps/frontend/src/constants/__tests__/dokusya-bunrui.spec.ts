import { describe, expect, it } from 'vitest';

import {
  DOKUSYASO_BUNRUI_OPTIONS,
  DokusyaSoBunrui,
  NOGYOSYA_BUNRUI_OPTIONS,
  NogyosyaBunrui,
  dokusyaSoBunruiLabel,
  nogyosyaBunruiLabel,
  splitBunruiCsv,
} from '@/constants/dokusya-bunrui';

describe('dokusya-bunrui constants', () => {
  it('should expose 電子版 profession codes as the option values (not labels)', () => {
    expect(DOKUSYASO_BUNRUI_OPTIONS.map((o) => o.value)).toEqual([
      '0',
      '2',
      '999',
      '1',
      '3',
    ]);
    expect(DOKUSYASO_BUNRUI_OPTIONS[0]).toEqual({ value: '0', label: '農業者' });
    expect(DokusyaSoBunrui.NOGYOSYA).toBe('0');
  });

  it('should expose 電子版 products codes as the option values (酪農 は画面選択不可)', () => {
    expect(NOGYOSYA_BUNRUI_OPTIONS.map((o) => o.value)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '999',
    ]);
    expect(NOGYOSYA_BUNRUI_OPTIONS.map((o) => o.value)).not.toContain(
      NogyosyaBunrui.RAKUNO,
    );
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

  describe('label helpers', () => {
    it('should render 読者属性 codes as Japanese labels', () => {
      expect(dokusyaSoBunruiLabel('0')).toBe('農業者');
      expect(dokusyaSoBunruiLabel('0,3')).toBe('農業者、学生');
      expect(dokusyaSoBunruiLabel('')).toBe('');
    });

    it('should render 主な生産物 codes as Japanese labels (酪農 を含む)', () => {
      expect(nogyosyaBunruiLabel('0,5')).toBe('米、酪農');
    });

    it('should keep unknown codes verbatim so 電子版側の新コードを落とさない', () => {
      expect(dokusyaSoBunruiLabel('0,7')).toBe('農業者、7');
      expect(nogyosyaBunruiLabel('9')).toBe('9');
    });
  });
});
