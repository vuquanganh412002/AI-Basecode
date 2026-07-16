// Screen: ACSMS-SCR-018 — 販売店明細検索画面
//
// Drives src/modules/hanbaiten/dto/search-hanbaiten.dto.ts (SearchHanbaitenDto).
// Spec maps 1-to-1 to the GET /api/v1/hanbaiten query parameters in
// docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md §1 リクエストパラメータ + §4.1.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchHanbaitenDto } from '@/modules/hanbaiten/dto/search-hanbaiten.dto';

async function run(payload: unknown) {
  const dto = plainToInstance(SearchHanbaitenDto, payload, {
    enableImplicitConversion: true,
  });
  return { dto, errors: await validate(dto as any) };
}

describe('SearchHanbaitenDto', () => {
  // ─── Happy path & defaults ───────────────────────────────────────────
  describe('happy path', () => {
    it('should pass validation when payload is empty (all filters optional)', async () => {
      const { errors } = await run({});
      expect(errors).toHaveLength(0);
    });

    it('should pass validation when all filters are populated and valid', async () => {
      const { errors } = await run({
        hanbaiten_code: 'H001',
        hanbaiten_name: '山田',
        tel: '03',
        fax: '03',
        address: '東京',
        shocho_name: '山田',
        haiten_flg: false,
        page: 1,
        per_page: 20,
        sort_by: 'hanbaiten_code',
        sort_order: 'asc',
      });
      expect(errors).toHaveLength(0);
    });

    it('should leave page undefined when omitted (service layer applies ?? 1)', async () => {
      // page/per_page defaults moved to PaginationDto + service-layer
      // runtime defaulting (`query.page ?? 1`). DTO no longer carries
      // an inline default — kept the assertion to lock the new contract.
      const { dto } = await run({});
      expect((dto as any).page).toBeUndefined();
    });

    it('should leave per_page undefined when omitted (service layer applies ?? 20)', async () => {
      const { dto } = await run({});
      expect((dto as any).per_page).toBeUndefined();
    });

    it('should default sort_by=updated_at (most-recently-touched first) when sort_by is omitted', async () => {
      const { dto } = await run({});
      expect((dto as any).sort_by).toBe('updated_at');
    });

    it('should default sort_order=desc (most-recently-touched first) when sort_order is omitted', async () => {
      const { dto } = await run({});
      expect((dto as any).sort_order).toBe('desc');
    });
  });

  // ─── hanbaiten_code ─────────────────────────────────────────────────
  describe('hanbaiten_code', () => {
    it('should fail when hanbaiten_code exceeds 10 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 10
      const { errors } = await run({ hanbaiten_code: 'X'.repeat(11) });
      expect(errors.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });

    it('should pass when hanbaiten_code is exactly 10 chars', async () => {
      const { errors } = await run({ hanbaiten_code: '1234567890' });
      expect(errors.some((e) => e.property === 'hanbaiten_code')).toBe(false);
    });

    it('should pass when hanbaiten_code is empty string (treated as no filter)', async () => {
      const { errors } = await run({ hanbaiten_code: '' });
      expect(errors.some((e) => e.property === 'hanbaiten_code')).toBe(false);
    });
  });

  // ─── hanbaiten_name ─────────────────────────────────────────────────
  describe('hanbaiten_name', () => {
    it('should fail when hanbaiten_name exceeds 100 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 100
      const { errors } = await run({ hanbaiten_name: 'あ'.repeat(101) });
      expect(errors.some((e) => e.property === 'hanbaiten_name')).toBe(true);
    });

    it('should pass when hanbaiten_name is exactly 100 chars', async () => {
      const { errors } = await run({ hanbaiten_name: 'あ'.repeat(100) });
      expect(errors.some((e) => e.property === 'hanbaiten_name')).toBe(false);
    });
  });

  // ─── tel ────────────────────────────────────────────────────────────
  describe('tel', () => {
    it('should fail when tel exceeds 15 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 15
      const { errors } = await run({ tel: '0'.repeat(16) });
      expect(errors.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should pass when tel is exactly 15 chars', async () => {
      const { errors } = await run({ tel: '0'.repeat(15) });
      expect(errors.some((e) => e.property === 'tel')).toBe(false);
    });
  });

  // ─── fax ────────────────────────────────────────────────────────────
  describe('fax', () => {
    it('should fail when fax exceeds 15 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 15
      const { errors } = await run({ fax: '0'.repeat(16) });
      expect(errors.some((e) => e.property === 'fax')).toBe(true);
    });

    it('should pass when fax is exactly 15 chars', async () => {
      const { errors } = await run({ fax: '0'.repeat(15) });
      expect(errors.some((e) => e.property === 'fax')).toBe(false);
    });
  });

  // ─── address ────────────────────────────────────────────────────────
  describe('address', () => {
    it('should fail when address exceeds 200 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 200
      const { errors } = await run({ address: 'あ'.repeat(201) });
      expect(errors.some((e) => e.property === 'address')).toBe(true);
    });

    it('should pass when address is exactly 200 chars', async () => {
      const { errors } = await run({ address: 'あ'.repeat(200) });
      expect(errors.some((e) => e.property === 'address')).toBe(false);
    });
  });

  // ─── shocho_name ────────────────────────────────────────────────────
  describe('shocho_name', () => {
    it('should fail when shocho_name exceeds 50 chars', async () => {
      // COVERS: §1 リクエストパラメータ — max length 50
      const { errors } = await run({ shocho_name: 'あ'.repeat(51) });
      expect(errors.some((e) => e.property === 'shocho_name')).toBe(true);
    });

    it('should pass when shocho_name is exactly 50 chars', async () => {
      const { errors } = await run({ shocho_name: 'あ'.repeat(50) });
      expect(errors.some((e) => e.property === 'shocho_name')).toBe(false);
    });
  });

  // ─── haiten_flg ─────────────────────────────────────────────────────
  describe('haiten_flg', () => {
    it('should pass when haiten_flg is true', async () => {
      // COVERS: §1 リクエストパラメータ — Boolean type
      const { errors } = await run({ haiten_flg: true });
      expect(errors.some((e) => e.property === 'haiten_flg')).toBe(false);
    });

    it('should pass when haiten_flg is false', async () => {
      const { errors } = await run({ haiten_flg: false });
      expect(errors.some((e) => e.property === 'haiten_flg')).toBe(false);
    });

    it('should coerce string "true" to boolean true via @Transform', async () => {
      // COVERS: query strings are always strings; the DTO must coerce.
      const { dto, errors } = await run({ haiten_flg: 'true' });
      expect(errors.some((e) => e.property === 'haiten_flg')).toBe(false);
      expect((dto as any).haiten_flg).toBe(true);
    });

    it('should coerce string "false" to boolean false via @Transform', async () => {
      const { dto, errors } = await run({ haiten_flg: 'false' });
      expect(errors.some((e) => e.property === 'haiten_flg')).toBe(false);
      expect((dto as any).haiten_flg).toBe(false);
    });

    it('should fail when haiten_flg is a non-boolean string like "maybe"', async () => {
      const { errors } = await run({ haiten_flg: 'maybe' });
      expect(errors.some((e) => e.property === 'haiten_flg')).toBe(true);
    });
  });

  describe('inactive_tanka_flg (SCR-021 error gate 連携)', () => {
    it('should coerce string "true" to boolean true via @Transform', async () => {
      const { dto, errors } = await run({ inactive_tanka_flg: 'true' });
      expect(errors.some((e) => e.property === 'inactive_tanka_flg')).toBe(false);
      expect((dto as any).inactive_tanka_flg).toBe(true);
    });

    it('should coerce string "false" to boolean false via @Transform', async () => {
      const { dto, errors } = await run({ inactive_tanka_flg: 'false' });
      expect(errors.some((e) => e.property === 'inactive_tanka_flg')).toBe(false);
      expect((dto as any).inactive_tanka_flg).toBe(false);
    });

    it('should leave inactive_tanka_flg undefined when omitted', async () => {
      const { dto, errors } = await run({});
      expect(errors.some((e) => e.property === 'inactive_tanka_flg')).toBe(false);
      expect((dto as any).inactive_tanka_flg).toBeUndefined();
    });

    it('should fail when inactive_tanka_flg is a non-boolean string like "maybe"', async () => {
      const { errors } = await run({ inactive_tanka_flg: 'maybe' });
      expect(errors.some((e) => e.property === 'inactive_tanka_flg')).toBe(true);
    });
  });

  // ─── page ───────────────────────────────────────────────────────────
  describe('page', () => {
    it('should fail when page is below 1', async () => {
      // COVERS: §4.1 page 正の整数
      const { errors } = await run({ page: 0 });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should fail when page is non-integer', async () => {
      const { errors } = await run({ page: 1.5 });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should fail when page is a non-numeric string', async () => {
      const { errors } = await run({ page: 'abc' });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should accept numeric string for page (transform coerces "3" → 3)', async () => {
      const { dto, errors } = await run({ page: '3' });
      expect(errors.some((e) => e.property === 'page')).toBe(false);
      expect((dto as any).page).toBe(3);
    });
  });

  // ─── per_page ───────────────────────────────────────────────────────
  describe('per_page', () => {
    it('should fail when per_page is below 1', async () => {
      // COVERS: §4.1 per_page 1〜100の整数
      const { errors } = await run({ per_page: 0 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should fail when per_page exceeds 100', async () => {
      const { errors } = await run({ per_page: 101 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(true);
    });

    it('should pass when per_page is exactly 100', async () => {
      const { errors } = await run({ per_page: 100 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(false);
    });

    it('should fail when per_page is non-integer', async () => {
      const { errors } = await run({ per_page: 20.5 });
      expect(errors.some((e) => e.property === 'per_page')).toBe(true);
    });
  });

  // ─── sort_by ────────────────────────────────────────────────────────
  describe('sort_by', () => {
    it.each([['hanbaiten_code'], ['hanbaiten_name'], ['updated_at']])(
      'should pass when sort_by = %s (allow-list: UI columns + updated_at default)',
      async (val) => {
        const { errors } = await run({ sort_by: val });
        expect(errors.some((e) => e.property === 'sort_by')).toBe(false);
      },
    );

    it('should fail when sort_by is outside the allow-list', async () => {
      // COVERS: §4.1 sort_by allow-list — ONLY hanbaiten_code/hanbaiten_name
      const { errors } = await run({ sort_by: 'tel' });
      expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
    });

    it('should fail when sort_by is a SQL-injection attempt', async () => {
      // COVERS: §4.1 sort_by — whitelist guards against SQL injection
      const { errors } = await run({ sort_by: 'hanbaiten_code; DROP TABLE m_hanbaiten' });
      expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
    });
  });

  // ─── sort_order ─────────────────────────────────────────────────────
  describe('sort_order', () => {
    it.each([['asc'], ['desc']])('should pass when sort_order = %s', async (val) => {
      const { errors } = await run({ sort_order: val });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(false);
    });

    it('should fail when sort_order is neither asc nor desc', async () => {
      // COVERS: §4.1 sort_order enum [asc, desc]
      const { errors } = await run({ sort_order: 'random' });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
    });

    it('should fail when sort_order is upper-case ASC (lower-case only)', async () => {
      const { errors } = await run({ sort_order: 'ASC' });
      expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
    });
  });
});
