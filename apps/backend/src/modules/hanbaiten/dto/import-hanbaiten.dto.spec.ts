// Screen: ACSMS-SCR-019 — 販売店Excelデータ取込画面
//
// Drives src/modules/hanbaiten/dto/import-hanbaiten.dto.ts. Validation
// rules sourced from api.md §4.1 リクエストのバリデーション (top-level
// fields + nested rows[i]). 23-column nested row validation lives in
// ImportHanbaitenRowDto (referenced via @ValidateNested / @Type).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ImportHanbaitenDto } from '@/modules/hanbaiten/dto/import-hanbaiten.dto';
import {
  buildImportRequestNEW,
  buildImportRow,
  HANBAITEN_IMPORT_COLUMNS,
} from '@test/fixtures/hanbaiten-import.factory';

async function check(input: unknown) {
  return validate(plainToInstance(ImportHanbaitenDto, input));
}

const VALID = buildImportRequestNEW();

/**
 * Walk a class-validator ValidationError tree and return all property
 * paths flattened to dot-notation (e.g. `'rows.0.hanbaiten_code'`).
 * Used so nested-row failures are still findable from a top-level
 * `.property` check.
 */
function flattenProperties(errors: any[]): string[] {
  const out: string[] = [];
  function walk(errs: any[], prefix: string) {
    for (const e of errs) {
      const path = prefix ? `${prefix}.${e.property}` : String(e.property);
      out.push(path);
      if (Array.isArray(e.children) && e.children.length > 0) {
        walk(e.children, path);
      }
    }
  }
  walk(errors, '');
  return out;
}

describe('ImportHanbaitenDto', () => {
  it('should accept a fully-populated valid NEW request when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  // ─── import_mode ─────────────────────────────────────────────────────
  describe('import_mode (required, enum NEW / UPDATE_ALL / UPDATE_PARTIAL)', () => {
    it('should reject when import_mode is missing', async () => {
      const errs = await check({ ...VALID, import_mode: undefined });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should reject when import_mode is empty string', async () => {
      const errs = await check({ ...VALID, import_mode: '' });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should reject when import_mode is not one of NEW / UPDATE_ALL / UPDATE_PARTIAL', async () => {
      const errs = await check({ ...VALID, import_mode: 'DELETE' });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should accept when import_mode is NEW', async () => {
      const errs = await check({ ...VALID, import_mode: 'NEW' });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(false);
    });

    it('should accept when import_mode is UPDATE_ALL', async () => {
      const errs = await check({ ...VALID, import_mode: 'UPDATE_ALL' });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(false);
    });

    it('should accept when import_mode is UPDATE_PARTIAL', async () => {
      const errs = await check({ ...VALID, import_mode: 'UPDATE_PARTIAL' });
      expect(errs.some((e) => e.property === 'import_mode')).toBe(false);
    });
  });

  // ─── selected_columns ────────────────────────────────────────────────
  describe('selected_columns (required, 1-23 items, must include hanbaiten_code)', () => {
    it('should reject when selected_columns is missing', async () => {
      const errs = await check({ ...VALID, selected_columns: undefined });
      expect(errs.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should reject when selected_columns is not an array', async () => {
      const errs = await check({ ...VALID, selected_columns: 'hanbaiten_code' });
      expect(errs.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should reject when selected_columns is an empty array', async () => {
      const errs = await check({ ...VALID, selected_columns: [] });
      expect(errs.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should reject when selected_columns has more than 23 entries', async () => {
      const tooMany = [...HANBAITEN_IMPORT_COLUMNS, 'extra_unknown_column'];
      const errs = await check({ ...VALID, selected_columns: tooMany });
      expect(errs.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should accept when selected_columns has exactly 1 entry (hanbaiten_code only)', async () => {
      const errs = await check({
        ...VALID,
        selected_columns: ['hanbaiten_code'],
        rows: [{ hanbaiten_code: 'H001' }],
      });
      expect(errs.some((e) => e.property === 'selected_columns')).toBe(false);
    });
  });

  // ─── rows ────────────────────────────────────────────────────────────
  describe('rows (required, 1-500 items)', () => {
    it('should reject when rows is missing', async () => {
      const errs = await check({ ...VALID, rows: undefined });
      expect(errs.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should reject when rows is not an array', async () => {
      const errs = await check({ ...VALID, rows: 'oops' });
      expect(errs.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should reject when rows is an empty array', async () => {
      const errs = await check({ ...VALID, rows: [] });
      expect(errs.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should reject when rows has 501 items (ROW_LIMIT_EXCEEDED guarded by DTO max)', async () => {
      const rows = Array.from({ length: 501 }, (_, i) =>
        buildImportRow({ hanbaiten_code: `H${String(i).padStart(4, '0')}` }),
      );
      const errs = await check({ ...VALID, rows });
      expect(errs.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should accept when rows has exactly 500 items', async () => {
      const rows = Array.from({ length: 500 }, (_, i) =>
        buildImportRow({ hanbaiten_code: `H${String(i).padStart(4, '0')}` }),
      );
      const errs = await check({ ...VALID, rows });
      expect(errs.some((e) => e.property === 'rows')).toBe(false);
    });
  });

  // ─── nested row: hanbaiten_code (always required in row) ────────────
  describe('rows[i].hanbaiten_code (required, max 10)', () => {
    it('should reject when hanbaiten_code is missing from a row', async () => {
      const row = buildImportRow();
      delete row.hanbaiten_code;
      const errs = await check({ ...VALID, rows: [row] });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_code/.test(p))).toBe(true);
    });

    it('should reject when hanbaiten_code is empty string in a row', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_code: '' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_code/.test(p))).toBe(true);
    });

    it('should reject when hanbaiten_code exceeds 10 chars in a row', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_code: 'A'.repeat(11) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_code/.test(p))).toBe(true);
    });
  });

  // ─── nested row: hanbaiten_name (optional but max 100) ───────────────
  describe('rows[i].hanbaiten_name (optional, max 100)', () => {
    it('should accept when hanbaiten_name is omitted from a row', async () => {
      const row = buildImportRow();
      delete row.hanbaiten_name;
      const errs = await check({ ...VALID, rows: [row] });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name(?!_kana)/.test(p))).toBe(false);
    });

    it('should reject when hanbaiten_name exceeds 100 chars in a row', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_name: 'あ'.repeat(101) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name(?!_kana)/.test(p))).toBe(true);
    });
  });

  // ─── remaining nested-row field max-length / type checks ─────────────
  describe('rows[i] — per-field length/type checks', () => {
    it('should reject when hanbaiten_name_kana exceeds 100 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_name_kana: 'ｱ'.repeat(101) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name_kana/.test(p))).toBe(true);
    });

    it('should reject when hanbaiten_name_kana is full-width katakana (half-width only)', async () => {
      // #2 — parity with create/update: import must not let non-half-width
      // kana through (it flows into Zengin / bank-CSV downstream).
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_name_kana: 'ハンバイテン' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name_kana/.test(p))).toBe(true);
    });

    it('should reject when hanbaiten_name_kana contains latin letters', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝA' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name_kana/.test(p))).toBe(true);
    });

    it('should accept half-width katakana (with half-width digits) for hanbaiten_name_kana', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ1' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*hanbaiten_name_kana/.test(p))).toBe(false);
    });

    it('should coerce Excel-style haiten_flg values (1 / "true" / "○") to boolean and accept them', async () => {
      // #4 — xlsx cells arrive as number / string; the transform maps the
      // common forms so a valid `1` does not 400 the whole import.
      for (const raw of [1, 0, 'true', 'FALSE', '○', '×']) {
        const errs = await check({
          ...VALID,
          rows: [buildImportRow({ haiten_flg: raw })],
        });
        const flat = flattenProperties(errs);
        expect(flat.some((p) => /rows.*haiten_flg/.test(p))).toBe(false);
      }
    });

    it('should reject haiten_flg when the value is an unrecognised string', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ haiten_flg: 'maybe' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*haiten_flg/.test(p))).toBe(true);
    });

    it('should reject when torihikisaki_no exceeds 20 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ torihikisaki_no: 'X'.repeat(21) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*torihikisaki_no/.test(p))).toBe(true);
    });

    it('should reject when yubin_no length is not 7', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ yubin_no: '12345' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*yubin_no/.test(p))).toBe(true);
    });

    it('should reject tel / fax that contain a hyphen (half-width digits only)', async () => {
      const telErrs = await check({
        ...VALID,
        rows: [buildImportRow({ tel: '03-1234-5678' })],
      });
      expect(flattenProperties(telErrs).some((p) => /rows.*tel/.test(p))).toBe(true);
      const faxErrs = await check({
        ...VALID,
        rows: [buildImportRow({ fax: '03-1234-5679' })],
      });
      expect(flattenProperties(faxErrs).some((p) => /rows.*fax/.test(p))).toBe(true);
    });

    it('should reject when address exceeds 200 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ address: 'あ'.repeat(201) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*address/.test(p))).toBe(true);
    });

    it('should reject when tel exceeds 15 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ tel: '1'.repeat(16) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*tel/.test(p))).toBe(true);
    });

    it('should reject when fax exceeds 15 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ fax: '1'.repeat(16) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*fax/.test(p))).toBe(true);
    });

    it('should reject when shocho_name exceeds 50 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ shocho_name: 'あ'.repeat(51) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*shocho_name/.test(p))).toBe(true);
    });

    it('should reject when itaku_kubun is a non-numeric string', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ itaku_kubun: 'abc' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*itaku_kubun/.test(p))).toBe(true);
    });

    it('should reject when haitatsuryo_tanka_code exceeds 10 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ haitatsuryo_tanka_code: 'X'.repeat(11) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*haitatsuryo_tanka_code/.test(p))).toBe(true);
    });

    it('should reject when bank_code exceeds 4 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ bank_code: '12345' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*bank_code/.test(p))).toBe(true);
    });

    it('should reject when bank_name exceeds 100 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ bank_name: 'あ'.repeat(101) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*bank_name/.test(p))).toBe(true);
    });

    it('should reject when bank_branch_code exceeds 3 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ bank_branch_code: '1234' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*bank_branch_code/.test(p))).toBe(true);
    });

    it('should reject when bank_branch_name exceeds 100 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ bank_branch_name: 'あ'.repeat(101) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*bank_branch_name/.test(p))).toBe(true);
    });

    it('should reject when koza_no exceeds 10 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ koza_no: '1'.repeat(11) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*koza_no/.test(p))).toBe(true);
    });

    it('should reject when koza_meigi exceeds 50 chars', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ koza_meigi: 'あ'.repeat(51) })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*koza_meigi/.test(p))).toBe(true);
    });

    it('should reject when furikomi_tesuryo is negative', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ furikomi_tesuryo: -1 })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*furikomi_tesuryo/.test(p))).toBe(true);
    });

    it('should reject when haitatsuryo_shiharai_cycle is negative', async () => {
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ haitatsuryo_shiharai_cycle: -1 })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*haitatsuryo_shiharai_cycle/.test(p))).toBe(true);
    });

    it('should accept the string "true" for haiten_flg (Excel coercion — #4)', async () => {
      // Was previously rejected; the excelToBool transform now maps common
      // string/number forms so a valid Excel cell does not 400 the import.
      // Unrecognised strings are still rejected (covered above).
      const errs = await check({
        ...VALID,
        rows: [buildImportRow({ haiten_flg: 'true' })],
      });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*haiten_flg/.test(p))).toBe(false);
    });

    it('should accept when biko is omitted (optional with no max)', async () => {
      const row = buildImportRow();
      delete row.biko;
      const errs = await check({ ...VALID, rows: [row] });
      const flat = flattenProperties(errs);
      expect(flat.some((p) => /rows.*biko/.test(p))).toBe(false);
    });
  });
});
