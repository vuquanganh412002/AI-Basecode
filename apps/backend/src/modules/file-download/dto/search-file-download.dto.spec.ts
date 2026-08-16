// Screen: ACSMS-SCR-022 — ファイルダウンロード画面
//
// DTO validation for the list endpoint's query string.
//
// download_type regression (backend review finding #15): previously
// validated via a hardcoded @IsIn([1, 2, 3, 4, 5]) literal array instead of
// the project's canonical DownloadType enum (@/common/enums), which
// file-upload.service.ts itself already uses for the same category. A
// future DOWNLOAD_TYPE value added to the enum would silently keep being
// rejected here until someone remembered to update this separate list.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchFileDownloadDto } from '@/modules/file-download/dto/search-file-download.dto';

async function check(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SearchFileDownloadDto, input);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('SearchFileDownloadDto — SCR-022 query validation', () => {
  it('should accept an empty query object when all fields are omitted', async () => {
    expect(await check({})).toEqual([]);
  });

  // ─── download_type ──────────────────────────────────────────────
  describe('download_type', () => {
    it.each([1, 2, 3, 4, 5])(
      'should accept download_type=%i (matches DownloadType enum member)',
      async (value) => {
        expect(await check({ download_type: value })).toEqual([]);
      },
    );

    it('should reject download_type=0 (below the enum range)', async () => {
      expect(await check({ download_type: 0 })).toContain('download_type');
    });

    it('should reject download_type=6 (a value not in the DownloadType enum)', async () => {
      expect(await check({ download_type: 6 })).toContain('download_type');
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
  });

  // ─── ja_id ────────────────────────────────────────────────────
  describe('ja_id', () => {
    it('should accept a positive integer ja_id', async () => {
      expect(await check({ ja_id: 1 })).toEqual([]);
    });

    it('should reject ja_id=0', async () => {
      expect(await check({ ja_id: 0 })).toContain('ja_id');
    });
  });

  // ─── sort_by / sort_order ─────────────────────────────────────
  describe('sort_by / sort_order', () => {
    it('should accept a valid sort_by + sort_order pair', async () => {
      expect(
        await check({ sort_by: 'download_datetime', sort_order: 'asc' }),
      ).toEqual([]);
    });

    it('should reject an unknown sort_by key', async () => {
      expect(await check({ sort_by: 'unknown_column' })).toContain('sort_by');
    });

    it('should reject an unknown sort_order value', async () => {
      expect(await check({ sort_order: 'sideways' })).toContain('sort_order');
    });
  });
});
