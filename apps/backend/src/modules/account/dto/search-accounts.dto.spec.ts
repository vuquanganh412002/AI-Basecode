// Screen: ACSMS-SCR-024 — アカウントマスタ明細検索画面
//
// Drives src/modules/account/dto/search-accounts.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchAccountsDto } from '@/modules/account/dto/search-accounts.dto';

const VALID = {
  login_id: 'admin',
  role_id: 1,
  ja_id: 10,
  kanri_shiten_id: 20,
  page: 1,
  per_page: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(SearchAccountsDto, input));
}

describe('SearchAccountsDto', () => {
  it('should accept a fully-populated valid query when all fields meet constraints', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should accept an empty query when all fields are omitted (defaults apply)', async () => {
    // All fields are optional per api.md §2 - no 必須 column has 〇.
    expect(await check({})).toHaveLength(0);
  });

  describe('login_id (optional, max 20)', () => {
    it('should accept login_id when length is exactly 20 chars', async () => {
      const errs = await check({ ...VALID, login_id: 'a'.repeat(20) });
      expect(errs.some((e) => e.property === 'login_id')).toBe(false);
    });

    it('should reject login_id when length exceeds 20 chars', async () => {
      const errs = await check({ ...VALID, login_id: 'a'.repeat(21) });
      expect(errs.some((e) => e.property === 'login_id')).toBe(true);
    });
  });

  describe('role_id (optional, integer 1..5)', () => {
    it('should accept role_id when value is in range 1..5', async () => {
      for (const v of [1, 2, 3, 4, 5]) {
        const errs = await check({ ...VALID, role_id: v });
        expect(errs.some((e) => e.property === 'role_id')).toBe(false);
      }
    });

    it('should reject role_id when value is 0', async () => {
      const errs = await check({ ...VALID, role_id: 0 });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });

    it('should reject role_id when value is 6', async () => {
      const errs = await check({ ...VALID, role_id: 6 });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });

    it('should reject role_id when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, role_id: 'not-a-number' });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });
  });

  describe('ja_id (optional, integer)', () => {
    it('should accept ja_id when value is a positive integer', async () => {
      const errs = await check({ ...VALID, ja_id: 42 });
      expect(errs.some((e) => e.property === 'ja_id')).toBe(false);
    });

    it('should reject ja_id when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, ja_id: 'abc' });
      expect(errs.some((e) => e.property === 'ja_id')).toBe(true);
    });
  });

  describe('kanri_shiten_id (optional, integer)', () => {
    it('should accept kanri_shiten_id when value is a positive integer', async () => {
      const errs = await check({ ...VALID, kanri_shiten_id: 7 });
      expect(errs.some((e) => e.property === 'kanri_shiten_id')).toBe(false);
    });

    it('should reject kanri_shiten_id when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, kanri_shiten_id: 'abc' });
      expect(errs.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
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
    it.each(['login_id', 'role_id', 'created_at', 'updated_at'])(
      'should accept sort_by when value is %s',
      async (sortBy) => {
        const errs = await check({ ...VALID, sort_by: sortBy });
        expect(errs.some((e) => e.property === 'sort_by')).toBe(false);
      },
    );

    it('should reject sort_by when value is not in the whitelist', async () => {
      // api.md §4.1: 許可されたカラム名（login_id, role_id, created_at）
      const errs = await check({ ...VALID, sort_by: 'password_hash' });
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
      const errs = await check({ ...VALID, sort_order: 'ASCENDING' });
      expect(errs.some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
