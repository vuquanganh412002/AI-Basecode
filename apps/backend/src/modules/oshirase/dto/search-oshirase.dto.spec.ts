// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Drives src/modules/oshirase/dto/search-oshirase.dto.ts.
// Validation rules sourced from api.md §4.1 of API-031-001.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchOshiraseDto } from '@/modules/oshirase/dto/search-oshirase.dto';

const VALID = {
  page: 1,
  per_page: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(SearchOshiraseDto, input));
}

describe('SearchOshiraseDto', () => {
  it('should accept a fully-populated valid query when all fields meet constraints', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should accept an empty query when all fields are omitted (defaults apply)', async () => {
    expect(await check({})).toHaveLength(0);
  });

  describe('page (optional positive integer, default 1)', () => {
    it('should accept page when value is 1', async () => {
      expect((await check({ ...VALID, page: 1 })).some((e) => e.property === 'page')).toBe(false);
    });

    it('should reject page when value is 0', async () => {
      expect((await check({ ...VALID, page: 0 })).some((e) => e.property === 'page')).toBe(true);
    });

    it('should reject page when value is negative', async () => {
      expect((await check({ ...VALID, page: -1 })).some((e) => e.property === 'page')).toBe(true);
    });
  });

  describe('per_page (optional, 1..100, default 20)', () => {
    it('should accept per_page when value is exactly 1', async () => {
      expect((await check({ ...VALID, per_page: 1 })).some((e) => e.property === 'per_page')).toBe(false);
    });

    it('should accept per_page when value is exactly 100', async () => {
      expect((await check({ ...VALID, per_page: 100 })).some((e) => e.property === 'per_page')).toBe(false);
    });

    it('should reject per_page when value is 0', async () => {
      expect((await check({ ...VALID, per_page: 0 })).some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should reject per_page when value exceeds 100', async () => {
      expect((await check({ ...VALID, per_page: 101 })).some((e) => e.property === 'per_page')).toBe(true);
    });
  });

  describe('sort_by (optional, whitelist)', () => {
    it('should accept sort_by when value is created_at', async () => {
      expect((await check({ ...VALID, sort_by: 'created_at' })).some((e) => e.property === 'sort_by')).toBe(false);
    });

    it('should accept sort_by when value is title', async () => {
      expect((await check({ ...VALID, sort_by: 'title' })).some((e) => e.property === 'sort_by')).toBe(false);
    });

    it('should accept sort_by when value is publish_start_date', async () => {
      expect((await check({ ...VALID, sort_by: 'publish_start_date' })).some((e) => e.property === 'sort_by')).toBe(false);
    });

    it('should reject sort_by when value is not in the whitelist', async () => {
      expect((await check({ ...VALID, sort_by: 'deleted_at' })).some((e) => e.property === 'sort_by')).toBe(true);
    });
  });

  describe('sort_order (optional, asc | desc)', () => {
    it('should accept sort_order when value is asc', async () => {
      expect((await check({ ...VALID, sort_order: 'asc' })).some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should accept sort_order when value is desc', async () => {
      expect((await check({ ...VALID, sort_order: 'desc' })).some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should reject sort_order when value is not asc or desc', async () => {
      expect((await check({ ...VALID, sort_order: 'ASCENDING' })).some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
