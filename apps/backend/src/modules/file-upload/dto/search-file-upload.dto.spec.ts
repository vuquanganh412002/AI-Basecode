// Screen: ACSMS-SCR-022 — ファイルダウンロード画面
//
// DTO validation for the list endpoint's query string. Per api.md
// §リクエストパラメータ table — all fields are optional but constrained.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchFileUploadDto } from '@/modules/file-upload/dto/search-file-upload.dto';

async function check(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SearchFileUploadDto, input);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('SearchFileUploadDto — SCR-022 query validation', () => {
  it('should accept an empty query object when all fields are omitted', async () => {
    expect(await check({})).toEqual([]);
  });

  it('should accept a fully-populated query with all optional fields', async () => {
    expect(
      await check({
        file_name: 'zougen',
        todofuken_code: '13',
        page: 1,
        per_page: 20,
        sort_by: 'upload_datetime',
        sort_order: 'desc',
      }),
    ).toEqual([]);
  });

  // ─── file_name ─────────────────────────────────────────────────
  describe('file_name', () => {
    it('should accept a 255-character file_name (max boundary)', async () => {
      expect(await check({ file_name: 'a'.repeat(255) })).toEqual([]);
    });

    it('should reject when file_name exceeds 255 characters', async () => {
      expect(await check({ file_name: 'a'.repeat(256) })).toContain('file_name');
    });
  });

  // ─── todofuken_code ───────────────────────────────────────────
  describe('todofuken_code', () => {
    it('should accept a 2-digit numeric todofuken_code (e.g. "13" for Tokyo)', async () => {
      expect(await check({ todofuken_code: '13' })).toEqual([]);
    });

    it('should reject when todofuken_code is 1 digit', async () => {
      expect(await check({ todofuken_code: '1' })).toContain('todofuken_code');
    });

    it('should reject when todofuken_code is 3 digits', async () => {
      expect(await check({ todofuken_code: '130' })).toContain('todofuken_code');
    });

    it('should reject when todofuken_code contains non-digit characters', async () => {
      expect(await check({ todofuken_code: '1A' })).toContain('todofuken_code');
    });
  });

  // ─── page ─────────────────────────────────────────────────────
  describe('page', () => {
    it('should accept page=1 (minimum valid)', async () => {
      expect(await check({ page: 1 })).toEqual([]);
    });

    it('should reject when page is less than 1', async () => {
      expect(await check({ page: 0 })).toContain('page');
    });

    it('should reject when page is negative', async () => {
      expect(await check({ page: -1 })).toContain('page');
    });

    it('should reject when page is not an integer', async () => {
      expect(await check({ page: 1.5 })).toContain('page');
    });
  });

  // ─── per_page ─────────────────────────────────────────────────
  describe('per_page', () => {
    it('should accept per_page=1 (min boundary)', async () => {
      expect(await check({ per_page: 1 })).toEqual([]);
    });

    it('should accept per_page=100 (max boundary)', async () => {
      expect(await check({ per_page: 100 })).toEqual([]);
    });

    it('should reject when per_page is less than 1', async () => {
      expect(await check({ per_page: 0 })).toContain('per_page');
    });

    it('should reject when per_page exceeds 100', async () => {
      expect(await check({ per_page: 101 })).toContain('per_page');
    });
  });

  // ─── sort_by ──────────────────────────────────────────────────
  describe('sort_by', () => {
    it('should accept sort_by=upload_datetime', async () => {
      expect(await check({ sort_by: 'upload_datetime' })).toEqual([]);
    });

    it('should accept sort_by=file_name', async () => {
      expect(await check({ sort_by: 'file_name' })).toEqual([]);
    });

    it('should accept sort_by=created_by', async () => {
      expect(await check({ sort_by: 'created_by' })).toEqual([]);
    });

    it('should reject sort_by values not in the whitelist (file_path, deleted_at, …)', async () => {
      expect(await check({ sort_by: 'file_path' })).toContain('sort_by');
    });

    it('should reject sort_by injection attempts (SQL keywords)', async () => {
      expect(await check({ sort_by: 'created_at; DROP TABLE t_file_upload' })).toContain(
        'sort_by',
      );
    });
  });

  // ─── sort_order ───────────────────────────────────────────────
  describe('sort_order', () => {
    it('should accept sort_order=asc', async () => {
      expect(await check({ sort_order: 'asc' })).toEqual([]);
    });

    it('should accept sort_order=desc', async () => {
      expect(await check({ sort_order: 'desc' })).toEqual([]);
    });

    it('should reject sort_order=ASC (case-sensitive whitelist)', async () => {
      expect(await check({ sort_order: 'ASC' })).toContain('sort_order');
    });

    it('should reject sort_order values not in the whitelist', async () => {
      expect(await check({ sort_order: 'ascending' })).toContain('sort_order');
    });
  });
});
