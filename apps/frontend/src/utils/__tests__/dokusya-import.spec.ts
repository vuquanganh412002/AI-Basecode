import { describe, it, expect } from 'vitest';

import {
  PHYSICAL_COLUMNS,
  JP_HEADERS,
  HEADER_TO_PHYSICAL,
  DATE_PHYSICAL_COLUMNS,
  BOOLEAN_PHYSICAL_COLUMNS,
  REPORT_IMPACT_SET,
  MAX_IMPORT_ROWS,
  normalizeImportBool,
} from '@/utils/dokusya-import';
// 日付正規化（excelSerialToIsoDate / normalizeImportDate）は datetime.ts に集約
// したため、そのテストは utils/__tests__/datetime.spec.ts 側にある。

describe('dokusya-import — column model', () => {
  it('has 46 physical columns (画面で指定する項目は Excel 列に持たない)', () => {
    // 顧客要件 2026-08: 読者情報変更適用日 / 購読中止日 を画面の入力欄へ移し
    // 列から撤去（48 → 46）。それ以前に 購読種別 を画面ラジオへ（49 → 48）、
    // 販売店適用日を廃止し joho に統一（v1.3）。
    expect(PHYSICAL_COLUMNS).toHaveLength(46);
    expect(PHYSICAL_COLUMNS).toContain('haitatsu_same_flg');
    for (const gone of [
      'dokusya_shubetsu',
      'tetsuzuki_shurui',
      'hanbaiten_tekiyo_date',
      'joho_henko_tekiyo_date',
      'dokusya_chushi_date',
    ]) {
      expect(PHYSICAL_COLUMNS).not.toContain(gone as never);
    }
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
    expect(DATE_PHYSICAL_COLUMNS.has('dokusya_kaishi_date')).toBe(true);
    expect(BOOLEAN_PHYSICAL_COLUMNS.has('haitatsu_same_flg')).toBe(true);
    // 適用日 / 中止日 / 販売店適用日 は Excel 列ではない（画面で指定）。
    for (const gone of [
      'joho_henko_tekiyo_date',
      'dokusya_chushi_date',
      'hanbaiten_tekiyo_date',
    ]) {
      expect(DATE_PHYSICAL_COLUMNS.has(gone)).toBe(false);
      expect(PHYSICAL_COLUMNS).not.toContain(gone);
    }
  });

  // 紙版の当日変更で選択させない列。BE の REPORT_FIELD_PAIRS と対で保つ。
  // 販売店だけキー名が違う — 単票 dto は hanbaiten_id、取込の列は hanbaiten_code。
  it('lists the 12 帳票影響項目 using import column names', () => {
    expect([...REPORT_IMPACT_SET].sort()).toEqual(
      [
        'chome_banchi',
        'dokusya_busu',
        'haitatsu_chome_banchi',
        'haitatsu_shikuchoson',
        'haitatsu_tatemono_mei',
        'haitatsu_todofuken_code',
        'haitatsu_yubin_no',
        'hanbaiten_code',
        'shikuchoson',
        'tatemono_mei',
        'todofuken_code',
        'yubin_no',
      ].sort(),
    );
    expect(REPORT_IMPACT_SET.has('hanbaiten_id')).toBe(false);
    // 全て実在する列であること（列定義の改名で静かに空振りしないように）。
    for (const col of REPORT_IMPACT_SET) {
      expect(PHYSICAL_COLUMNS).toContain(col);
    }
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
