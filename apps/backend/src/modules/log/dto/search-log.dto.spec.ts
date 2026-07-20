// Screen: ACSMS-SCR-030 — ログ参照画面
//
// Drives src/modules/log/dto/search-log.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchLogDto } from '@/modules/log/dto/search-log.dto';

const VALID = {
  date_from: '2026/04/01 00:00:00',
  date_to: '2026/04/17 23:59:59',
  log_type: 1,
  account_id: 10,
  page: 1,
  per_page: 20,
  sort_by: 'log_datetime',
  sort_order: 'desc',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(SearchLogDto, input));
}

describe('SearchLogDto', () => {
  it('should accept a fully-populated valid query when all fields meet constraints', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should accept an empty query when all fields are omitted (defaults apply)', async () => {
    expect(await check({})).toHaveLength(0);
  });

  describe('date_from (optional, YYYY/MM/DD HH:mm:ss)', () => {
    it('should accept date_from when value matches YYYY/MM/DD HH:mm:ss', async () => {
      const errs = await check({ ...VALID, date_from: '2026/04/01 00:00:00' });
      expect(errs.some((e) => e.property === 'date_from')).toBe(false);
    });

    it('should reject date_from when value is not in YYYY/MM/DD HH:mm:ss format', async () => {
      const errs = await check({ ...VALID, date_from: '2026-04-01' });
      expect(errs.some((e) => e.property === 'date_from')).toBe(true);
    });

    it('should reject date_from when value is a random string', async () => {
      const errs = await check({ ...VALID, date_from: 'not-a-date' });
      expect(errs.some((e) => e.property === 'date_from')).toBe(true);
    });
  });

  describe('date_to (optional, YYYY/MM/DD HH:mm:ss)', () => {
    it('should accept date_to when value matches YYYY/MM/DD HH:mm:ss', async () => {
      const errs = await check({ ...VALID, date_to: '2026/04/17 23:59:59' });
      expect(errs.some((e) => e.property === 'date_to')).toBe(false);
    });

    it('should reject date_to when value is not in YYYY/MM/DD HH:mm:ss format', async () => {
      const errs = await check({ ...VALID, date_to: '17/04/2026' });
      expect(errs.some((e) => e.property === 'date_to')).toBe(true);
    });
  });

  describe('log_type (optional, integer 1..4)', () => {
    it('should accept log_type when value is 1', async () => {
      const errs = await check({ ...VALID, log_type: 1 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(false);
    });

    it('should accept log_type when value is 4', async () => {
      const errs = await check({ ...VALID, log_type: 4 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(false);
    });

    it('should reject log_type when value is 0', async () => {
      const errs = await check({ ...VALID, log_type: 0 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(true);
    });

    it('should reject log_type when value is 5', async () => {
      const errs = await check({ ...VALID, log_type: 5 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(true);
    });

    it('should reject log_type when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, log_type: 'abc' });
      expect(errs.some((e) => e.property === 'log_type')).toBe(true);
    });
  });

  describe('account_id (optional, integer)', () => {
    it('should accept account_id when value is a positive integer', async () => {
      const errs = await check({ ...VALID, account_id: 42 });
      expect(errs.some((e) => e.property === 'account_id')).toBe(false);
    });

    it('should reject account_id when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, account_id: 'abc' });
      expect(errs.some((e) => e.property === 'account_id')).toBe(true);
    });
  });

  describe('page (optional positive integer, default 1)', () => {
    it('should accept page when value is 1', async () => {
      const errs = await check({ ...VALID, page: 1 });
      expect(errs.some((e) => e.property === 'page')).toBe(false);
    });

    it('should reject page when value is 0', async () => {
      const errs = await check({ ...VALID, page: 0 });
      expect(errs.some((e) => e.property === 'page')).toBe(true);
    });

    it('should reject page when value is negative', async () => {
      const errs = await check({ ...VALID, page: -1 });
      expect(errs.some((e) => e.property === 'page')).toBe(true);
    });
  });

  describe('per_page (optional, 1..100, default 20)', () => {
    it('should accept per_page when value is exactly 1', async () => {
      const errs = await check({ ...VALID, per_page: 1 });
      expect(errs.some((e) => e.property === 'per_page')).toBe(false);
    });

    it('should accept per_page when value is exactly 100', async () => {
      const errs = await check({ ...VALID, per_page: 100 });
      expect(errs.some((e) => e.property === 'per_page')).toBe(false);
    });

    it('should reject per_page when value is 0', async () => {
      const errs = await check({ ...VALID, per_page: 0 });
      expect(errs.some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should reject per_page when value exceeds 100', async () => {
      const errs = await check({ ...VALID, per_page: 101 });
      expect(errs.some((e) => e.property === 'per_page')).toBe(true);
    });
  });

  describe('sort_by (optional, whitelist)', () => {
    it.each(['log_datetime', 'log_type', 'result_status'])(
      'should accept sort_by when value is %s',
      async (sortBy) => {
        const errs = await check({ ...VALID, sort_by: sortBy });
        expect(errs.some((e) => e.property === 'sort_by')).toBe(false);
      },
    );

    it('should reject sort_by when value is not in the whitelist', async () => {
      // api.md §4.1: 許可されたカラム名（log_datetime, log_type, result_status）
      const errs = await check({ ...VALID, sort_by: 'stack_trace' });
      expect(errs.some((e) => e.property === 'sort_by')).toBe(true);
    });
  });

  describe('sort_order (optional, asc | desc)', () => {
    it('should accept sort_order when value is asc', async () => {
      const errs = await check({ ...VALID, sort_order: 'asc' });
      expect(errs.some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should accept sort_order when value is desc', async () => {
      const errs = await check({ ...VALID, sort_order: 'desc' });
      expect(errs.some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should reject sort_order when value is not asc or desc', async () => {
      const errs = await check({ ...VALID, sort_order: 'DESCENDING' });
      expect(errs.some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
