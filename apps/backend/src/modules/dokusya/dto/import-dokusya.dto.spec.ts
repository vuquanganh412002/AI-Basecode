// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// DTO validation contract for ImportDokusyaDto / ImportDokusyaRowDto
// (POST /api/v1/dokusya/import — ACSMS-API-016-002 §リクエストパラメータ).
//
// Covers the TOP-LEVEL DTO shape (import_mode enum, selected_columns +
// rows array bounds) and a sample of per-row field max-length checks.
// Row-level BUSINESS validation (3:併読 reject, 電子版×クレカ, FK lookups,
// mode-conditional required) lives in the SERVICE — exercised in
// dokusya.service.spec.ts §SCR-016, not here.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  ImportDokusyaDto,
  ImportDokusyaRowDto,
} from '@/modules/dokusya/dto/import-dokusya.dto';
import {
  buildImportBody,
  buildImportRow,
} from '@test/fixtures/dokusya.factory';

/** Resolve the top-level DTO instance + run class-validator. */
async function validateBody(raw: Record<string, unknown>) {
  const dto = plainToInstance(ImportDokusyaDto, raw);
  return validate(dto as object, { whitelist: true });
}

/** Resolve a single row DTO instance + run class-validator. */
async function validateRow(raw: Record<string, unknown>) {
  const dto = plainToInstance(ImportDokusyaRowDto, raw);
  return validate(dto as object, { whitelist: true });
}

describe('ImportDokusyaDto (ACSMS-API-016-002 §リクエストパラメータ)', () => {
  describe('import_mode (#1, required, enum)', () => {
    it('should pass when import_mode is NEW and the body is otherwise valid', async () => {
      const errors = await validateBody(buildImportBody({ import_mode: 'NEW' }));
      const modeErr = errors.find((e) => e.property === 'import_mode');
      expect(modeErr).toBeUndefined();
    });

    it('should pass when import_mode is UPDATE_ALL', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'UPDATE_ALL' }),
      );
      expect(errors.find((e) => e.property === 'import_mode')).toBeUndefined();
    });

    it('should pass when import_mode is UPDATE_PARTIAL', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'UPDATE_PARTIAL' }),
      );
      expect(errors.find((e) => e.property === 'import_mode')).toBeUndefined();
    });

    it('should fail when import_mode is missing', async () => {
      const body = buildImportBody();
      delete body.import_mode;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should fail when import_mode is an unknown value', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'DELETE_ALL' }),
      );
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });
  });

  describe('selected_columns (#2, required, array 1..49)', () => {
    it('should pass when selected_columns has the 13 required NEW columns', async () => {
      const errors = await validateBody(buildImportBody());
      expect(
        errors.find((e) => e.property === 'selected_columns'),
      ).toBeUndefined();
    });

    it('should fail when selected_columns is missing', async () => {
      const body = buildImportBody();
      delete body.selected_columns;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns is an empty array (ArrayMinSize 1)', async () => {
      const errors = await validateBody(buildImportBody({ selected_columns: [] }));
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns exceeds 49 entries (ArrayMaxSize 49)', async () => {
      const tooMany = Array.from({ length: 50 }, (_, i) => `col_${i}`);
      const errors = await validateBody(
        buildImportBody({ selected_columns: tooMany }),
      );
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns is not an array', async () => {
      const errors = await validateBody(
        buildImportBody({ selected_columns: 'dokusya_shubetsu' }),
      );
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should accept exactly 49 selected_columns when the upper bound is hit', async () => {
      const max = Array.from({ length: 49 }, (_, i) => `col_${i}`);
      const errors = await validateBody(
        buildImportBody({ selected_columns: max }),
      );
      expect(
        errors.find((e) => e.property === 'selected_columns'),
      ).toBeUndefined();
    });
  });

  describe('rows (#3, required, array 1..30000)', () => {
    it('should pass when rows has exactly one valid row', async () => {
      const errors = await validateBody(buildImportBody());
      expect(errors.find((e) => e.property === 'rows')).toBeUndefined();
    });

    it('should fail when rows is missing', async () => {
      const body = buildImportBody();
      delete body.rows;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows is an empty array (ArrayMinSize 1)', async () => {
      const errors = await validateBody(buildImportBody({ rows: [] }));
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows exceeds 30000 entries (ArrayMaxSize 30000)', async () => {
      const tooMany = Array.from({ length: 30001 }, () => buildImportRow());
      const errors = await validateBody(buildImportBody({ rows: tooMany }));
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows is not an array', async () => {
      const errors = await validateBody(
        buildImportBody({ rows: buildImportRow() }),
      );
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });
  });
});

describe('ImportDokusyaRowDto (ACSMS-API-016-002 §リクエストパラメータ rows 4-52)', () => {
  it('should pass when a fully-valid NEW row is supplied', async () => {
    const errors = await validateRow(buildImportRow());
    expect(errors).toHaveLength(0);
  });

  it('should pass when all optional fields are blank (row-level required is service-side)', async () => {
    // Per the task: every per-row field is optional at the DTO shape
    // level; mode-conditional required is enforced in the service layer.
    const errors = await validateRow({});
    expect(errors).toHaveLength(0);
  });

  describe('string max-length (#9 kumiaiin_code max 20)', () => {
    it('should fail when kumiaiin_code exceeds 20 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ kumiaiin_code: 'X'.repeat(21) }),
      );
      expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(true);
    });

    it('should pass when kumiaiin_code is exactly 20 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ kumiaiin_code: 'X'.repeat(20) }),
      );
      expect(errors.find((e) => e.property === 'kumiaiin_code')).toBeUndefined();
    });
  });

  describe('string max-length (#15 tanka_code max 10)', () => {
    it('should fail when tanka_code exceeds 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ tanka_code: 'T'.repeat(11) }),
      );
      expect(errors.some((e) => e.property === 'tanka_code')).toBe(true);
    });
  });

  describe('string max-length (#16 email max 100)', () => {
    it('should fail when email exceeds 100 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ email: `${'a'.repeat(95)}@e.jp` }),
      );
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('string max-length (#38 hanbaiten_code max 10)', () => {
    it('should fail when hanbaiten_code exceeds 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ hanbaiten_code: 'H'.repeat(11) }),
      );
      expect(errors.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });
  });
});
