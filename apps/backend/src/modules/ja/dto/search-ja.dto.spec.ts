// Screen: ACSMS-SCR-004 — JAマスタ明細検索画面
//
// Drives src/modules/ja/dto/search-ja.dto.ts (SearchJaDto / JaListQueryDto).
// Spec maps 1-to-1 to the GET /api/v1/ja query parameters in
// docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md §1 リクエストパラメータ + §4.1.

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchJaDto } from '@/modules/ja/dto/search-ja.dto';

async function run(payload: any) {
  const dto = plainToInstance(SearchJaDto, payload, {
    enableImplicitConversion: true,
  });
  return { dto, errors: await validate(dto as any) };
}

describe('SearchJaDto', () => {
  // ─── Happy path & default values ───────────────────────────────────
  it('should pass validation when payload is empty (all fields optional)', async () => {
    const { errors } = await run({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when all fields are valid', async () => {
    const { errors } = await run({
      ja_code: '1301',
      ja_name: '東京',
      page: 1,
      per_page: 20,
      sort_by: 'ja_code',
      sort_order: 'asc',
    });
    expect(errors).toHaveLength(0);
  });

  it('should leave page undefined when omitted (service layer applies ?? 1)', async () => {
    // page/per_page defaults moved to PaginationDto + service-layer
    // runtime defaulting (`query.page ?? 1`). DTO no longer carries an
    // inline default — kept the assertion to lock the new contract.
    const { dto } = await run({});
    expect((dto as any).page).toBeUndefined();
  });

  it('should leave per_page undefined when omitted (service layer applies ?? 20)', async () => {
    const { dto } = await run({});
    expect((dto as any).per_page).toBeUndefined();
  });

  it('should default sort_by=ja_code when sort_by is omitted', async () => {
    const { dto } = await run({});
    expect((dto as any).sort_by).toBe('ja_code');
  });

  it('should default sort_order=asc when sort_order is omitted', async () => {
    const { dto } = await run({});
    expect((dto as any).sort_order).toBe('asc');
  });

  // ─── ja_code ────────────────────────────────────────────────────────
  it('should fail when ja_code exceeds 10 chars', async () => {
    // COVERS: 4.1 ja_code 最大10文字
    const { errors } = await run({ ja_code: 'X'.repeat(11) });
    expect(errors.some((e) => e.property === 'ja_code')).toBe(true);
  });

  it('should pass when ja_code is exactly 10 chars', async () => {
    const { errors } = await run({ ja_code: '1234567890' });
    expect(errors.some((e) => e.property === 'ja_code')).toBe(false);
  });

  it('should pass when ja_code is empty string (treated as no filter)', async () => {
    const { errors } = await run({ ja_code: '' });
    expect(errors.some((e) => e.property === 'ja_code')).toBe(false);
  });

  // ─── ja_name ────────────────────────────────────────────────────────
  it('should fail when ja_name exceeds 100 chars', async () => {
    // COVERS: 4.1 ja_name 最大100文字
    const { errors } = await run({ ja_name: 'あ'.repeat(101) });
    expect(errors.some((e) => e.property === 'ja_name')).toBe(true);
  });

  it('should pass when ja_name is exactly 100 chars', async () => {
    const { errors } = await run({ ja_name: 'あ'.repeat(100) });
    expect(errors.some((e) => e.property === 'ja_name')).toBe(false);
  });

  // ─── todofuken_code ─────────────────────────────────────────────────
  it('should pass when todofuken_code is a valid 2-char code', async () => {
    const { errors } = await run({ todofuken_code: '13' });
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(false);
  });

  it('should fail when todofuken_code exceeds 2 chars', async () => {
    // COVERS: 4.1 todofuken_code 最大2文字（m_todofuken.code）
    const { errors } = await run({ todofuken_code: '130' });
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
  });

  it('should pass when todofuken_code is empty (treated as no filter)', async () => {
    const { errors } = await run({ todofuken_code: '' });
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(false);
  });

  // ─── page ───────────────────────────────────────────────────────────
  it('should fail when page is below 1', async () => {
    // COVERS: 4.1 page 1以上の整数
    const { errors } = await run({ page: 0 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is negative', async () => {
    const { errors } = await run({ page: -1 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is non-integer', async () => {
    const { errors } = await run({ page: 1.5 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is non-numeric string that cannot coerce', async () => {
    const { errors } = await run({ page: 'abc' });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should accept numeric string for page (transform coerces "2" → 2)', async () => {
    const { dto, errors } = await run({ page: '2' });
    expect(errors.some((e) => e.property === 'page')).toBe(false);
    expect((dto as any).page).toBe(2);
  });

  // ─── per_page ───────────────────────────────────────────────────────
  it('should fail when per_page is below 1', async () => {
    // COVERS: 4.1 per_page 1以上100以下の整数
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

  // ─── sort_by ────────────────────────────────────────────────────────
  it('should fail when sort_by is not in the whitelist', async () => {
    // COVERS: 4.1 sort_by 列挙型 — allow-list (ja_code, ja_name, yubin_no,
    //                                        todofuken_name, tel, address, fax)
    const { errors } = await run({ sort_by: 'password' });
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  it.each([
    ['ja_code'],
    ['ja_name'],
    ['yubin_no'],
    ['todofuken_name'],
    ['tel'],
    ['address'],
    ['fax'],
  ])('should pass when sort_by = %s', async (val) => {
    const { errors } = await run({ sort_by: val });
    expect(errors.some((e) => e.property === 'sort_by')).toBe(false);
  });

  it('should fail when sort_by is a SQL-injection attempt', async () => {
    // COVERS: 4.1 sort_by — must be safe column reference (whitelist enforced)
    const { errors } = await run({ sort_by: 'ja_code; DROP TABLE m_ja' });
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  // ─── sort_order ─────────────────────────────────────────────────────
  it('should fail when sort_order is neither asc nor desc', async () => {
    // COVERS: 4.1 sort_order 列挙型 [asc, desc]
    const { errors } = await run({ sort_order: 'random' });
    expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
  });

  it.each([['asc'], ['desc']])('should pass when sort_order = %s', async (val) => {
    const { errors } = await run({ sort_order: val });
    expect(errors.some((e) => e.property === 'sort_order')).toBe(false);
  });

  it('should fail when sort_order is upper-case (only lowercase allowed)', async () => {
    const { errors } = await run({ sort_order: 'ASC' });
    expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
  });
});
