// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面
//
// DTO validation for ACSMS-API-008-001 (GET /api/v1/kanri-shiten).
// All fields optional except via @IsIn enum membership.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchKanriShitenDto } from './search-kanri-shiten.dto';

async function check(input: unknown) {
  const dto = plainToInstance(SearchKanriShitenDto, input);
  return validate(dto);
}

describe('SearchKanriShitenDto', () => {
  describe('happy path', () => {
    it('should accept an empty query when no filter is provided', async () => {
      expect(await check({})).toHaveLength(0);
    });

    it('should accept all valid filters when fully populated', async () => {
      const errors = await check({
        kanri_shiten_code: '013-3300',
        kanri_shiten_name: '北海道',
        todofuken_code: '01',
        tel: '0112223333',
        fax: '0112223334',
        page: 1,
        per_page: 20,
        sort_by: 'kanri_shiten_code',
        sort_order: 'asc',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('kanri_shiten_code', () => {
    it('should reject when kanri_shiten_code exceeds 15 chars', async () => {
      const errors = await check({ kanri_shiten_code: 'a'.repeat(16) });
      expect(errors.some((e) => e.property === 'kanri_shiten_code')).toBe(true);
    });

    it('should accept when kanri_shiten_code is exactly 15 chars', async () => {
      const errors = await check({ kanri_shiten_code: 'a'.repeat(15) });
      expect(errors.some((e) => e.property === 'kanri_shiten_code')).toBe(false);
    });
  });

  describe('kanri_shiten_name', () => {
    it('should reject when kanri_shiten_name exceeds 100 chars', async () => {
      const errors = await check({ kanri_shiten_name: 'あ'.repeat(101) });
      expect(errors.some((e) => e.property === 'kanri_shiten_name')).toBe(true);
    });
  });

  describe('todofuken_code', () => {
    it('should reject when todofuken_code exceeds 2 chars', async () => {
      const errors = await check({ todofuken_code: '012' });
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should accept when todofuken_code is 1 char (partial-match per §2.1)', async () => {
      const errors = await check({ todofuken_code: '1' });
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(false);
    });

    it('should accept when todofuken_code is exactly 2 chars', async () => {
      const errors = await check({ todofuken_code: '13' });
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(false);
    });
  });

  describe('tel / fax', () => {
    it('should reject when tel exceeds 15 chars', async () => {
      const errors = await check({ tel: '0'.repeat(16) });
      expect(errors.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should reject when fax exceeds 15 chars', async () => {
      const errors = await check({ fax: '0'.repeat(16) });
      expect(errors.some((e) => e.property === 'fax')).toBe(true);
    });
  });

  describe('page / per_page', () => {
    it('should reject when page is less than 1', async () => {
      const errors = await check({ page: 0 });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should reject when page is not an integer', async () => {
      const errors = await check({ page: 1.5 });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should reject when per_page is more than 100', async () => {
      const errors = await check({ per_page: 101 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should reject when per_page is less than 1', async () => {
      const errors = await check({ per_page: 0 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should coerce numeric strings via @Type(() => Number) when query is a string', async () => {
      const errors = await check({ page: '2', per_page: '50' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sort_by / sort_order', () => {
    it.each([
      'kanri_shiten_code',
      'kanri_shiten_name',
      'todofuken_code',
      'updated_at',
    ])(
      'should accept sort_by=%s (画面定義§8.1 + updated_at default)',
      async (sort_by) => {
        const errors = await check({ sort_by });
        expect(errors.some((e) => e.property === 'sort_by')).toBe(false);
      },
    );

    it('should reject sort_by outside the §8.1 + updated_at allow-list', async () => {
      const errors = await check({ sort_by: 'tel' });
      expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
    });

    it('should reject sort_order other than asc / desc', async () => {
      const errors = await check({ sort_order: 'random' });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
