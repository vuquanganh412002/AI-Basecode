import { describe, it, expect } from 'vitest';

import {
  PHYSICAL_COLUMNS,
  JP_HEADERS,
  HEADER_TO_PHYSICAL,
  DATE_PHYSICAL_COLUMNS,
  BOOLEAN_PHYSICAL_COLUMNS,
  NEW_EXCLUDED_SET,
  MAX_IMPORT_ROWS,
  normalizeImportBool,
} from '@/utils/dokusya-import';
// 日付正規化（excelSerialToIsoDate / normalizeImportDate）は datetime.ts に集約
// したため、そのテストは utils/__tests__/datetime.spec.ts 側にある。

describe('dokusya-import — column model', () => {
  it('has 48 physical columns (v1.4: 購読種別は画面ラジオの単一ソースで列から撤去)', () => {
    // v1.4（顧客要件 2026-07）: 購読種別を Excel 列から撤去し画面ラジオで一括指定
    // （紙版/電子版の2モード）。v1.3 で販売店適用日を廃止し joho に統一済み。
    expect(PHYSICAL_COLUMNS).toHaveLength(48);
    expect(PHYSICAL_COLUMNS).not.toContain('dokusya_shubetsu' as never);
    expect(PHYSICAL_COLUMNS).not.toContain('tetsuzuki_shurui' as never);
    expect(PHYSICAL_COLUMNS).toContain('haitatsu_same_flg');
    expect(PHYSICAL_COLUMNS).not.toContain('hanbaiten_tekiyo_date' as never);
    expect(PHYSICAL_COLUMNS).toContain('joho_henko_tekiyo_date');
  });

  it('maps every physical column to a JP header (no missing label)', () => {
    for (const col of PHYSICAL_COLUMNS) {
      expect(JP_HEADERS[col]).toBeTruthy();
    }
  });

  it('HEADER_TO_PHYSICAL is the inverse of JP_HEADERS for every column', () => {
    for (const col of PHYSICAL_COLUMNS) {
      expect(HEADER_TO_PHYSICAL[JP_HEADERS[col]]).toBe(col);
    }
  });

  it('classifies the date + boolean columns', () => {
    expect(DATE_PHYSICAL_COLUMNS.has('joho_henko_tekiyo_date')).toBe(true);
    expect(DATE_PHYSICAL_COLUMNS.has('hanbaiten_tekiyo_date')).toBe(false); // 廃止
    expect(BOOLEAN_PHYSICAL_COLUMNS.has('haitatsu_same_flg')).toBe(true);
    // NEW では変更イベント日(joho)を対象外にする。
    expect(NEW_EXCLUDED_SET.has('joho_henko_tekiyo_date')).toBe(true);
  });

  it('caps import at 30000 rows', () => {
    expect(MAX_IMPORT_ROWS).toBe(30000);
  });
});

describe('dokusya-import — normalizeImportBool', () => {
  it.each([true, 'TRUE', 'true', '1', '○', 'はい', 'Y'])(
    'truthy %s → true',
    (v) => {
      expect(normalizeImportBool(v)).toBe(true);
    },
  );
  it.each([false, 'FALSE', '0', '×', 'いいえ', 'N'])(
    'falsy %s → false',
    (v) => {
      expect(normalizeImportBool(v)).toBe(false);
    },
  );
  it('blank / unknown → undefined (BE で未指定扱い)', () => {
    expect(normalizeImportBool('')).toBeUndefined();
    expect(normalizeImportBool('   ')).toBeUndefined();
    expect(normalizeImportBool('maybe')).toBeUndefined();
    expect(normalizeImportBool(null)).toBeUndefined();
  });
});
