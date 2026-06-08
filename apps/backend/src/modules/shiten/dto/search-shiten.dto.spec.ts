// Screen: ACSMS-SCR-006 — 支店マスタ明細検索画面
//
// DTO validation for ACSMS-API-006-001 (GET /api/v1/shiten). All fields
// optional; sort_by / sort_order constrained to the api.md allow-list.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchShitenDto } from './search-shiten.dto';

async function check(input: unknown) {
  const dto = plainToInstance(SearchShitenDto, input);
  return validate(dto);
}

describe('SearchShitenDto', () => {
  describe('happy path', () => {
    it('should accept an empty query when no filter is provided', async () => {
      expect(await check({})).toHaveLength(0);
    });

    it('should accept all valid filters when fully populated', async () => {
      const errors = await check({
        shiten_name: '本店',
        page: 1,
        per_page: 20,
        sort_by: 'shiten_code',
        sort_order: 'asc',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('shiten_name', () => {
    it('should reject when shiten_name exceeds 100 chars', async () => {
      const errors = await check({ shiten_name: 'あ'.repeat(101) });
      expect(errors.some((e) => e.property === 'shiten_name')).toBe(true);
    });

    it('should accept when shiten_name is exactly 100 chars', async () => {
      const errors = await check({ shiten_name: 'あ'.repeat(100) });
      expect(errors.some((e) => e.property === 'shiten_name')).toBe(false);
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
    it.each(['shiten_code', 'shiten_name', 'kanri_shiten_name', 'updated_at'])(
      'should accept sort_by=%s (画面定義§8.1 + leading-column add + updated_at default)',
      async (sort_by) => {
        const errors = await check({ sort_by });
        expect(errors.some((e) => e.property === 'sort_by')).toBe(false);
      },
    );

    it('should reject sort_by outside the allow-list', async () => {
      const errors = await check({ sort_by: 'kanri_shiten_id' });
      expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
    });

    it.each(['asc', 'desc'])('should accept sort_order=%s', async (sort_order) => {
      const errors = await check({ sort_order });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should reject sort_order other than asc / desc', async () => {
      const errors = await check({ sort_order: 'random' });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
