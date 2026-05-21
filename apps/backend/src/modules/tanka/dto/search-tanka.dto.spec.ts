// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面
//
// Drives src/modules/tanka/dto/search-tanka.dto.ts.
// One test per row in api.md §リクエストパラメータ.

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { SearchTankaDto } from '@/modules/tanka/dto/search-tanka.dto';

describe('SearchTankaDto', () => {
  // ─── Happy path ──────────────────────────────────────────────────────────
  it('should pass validation when no filters are provided (all optional)', async () => {
    const dto = plainToInstance(SearchTankaDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when all filters are valid', async () => {
    const dto = plainToInstance(SearchTankaDto, {
      tanka_type: 1,
      tanka_name: '基本',
      active_flg: true,
      page: 1,
      per_page: 20,
      sort_by: 'tanka_code',
      sort_order: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tanka_type (Number, optional, completes match) ──────────────────────
  it('should coerce tanka_type from query string to number', async () => {
    // COVERS: GET querystring arrives as string — Type(() => Number) must coerce
    const dto = plainToInstance(SearchTankaDto, { tanka_type: '1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(typeof dto.tanka_type).toBe('number');
    expect(dto.tanka_type).toBe(1);
  });

  it('should fail when tanka_type is non-numeric string', async () => {
    const dto = plainToInstance(SearchTankaDto, { tanka_type: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_type')).toBe(true);
  });

  // ─── tanka_name (String, optional, max 100, partial match) ───────────────
  it('should fail when tanka_name exceeds 100 chars', async () => {
    const dto = plainToInstance(SearchTankaDto, { tanka_name: 'a'.repeat(101) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should accept tanka_name at exactly 100 chars', async () => {
    const dto = plainToInstance(SearchTankaDto, { tanka_name: 'a'.repeat(100) });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tanka_name')).toHaveLength(0);
  });

  // ─── active_flg (Boolean, optional) ──────────────────────────────────────
  it('should coerce active_flg from "true" string to boolean true', async () => {
    // COVERS: FE sends `'1'` / `'0'` (HTML select) — DTO accepts and normalizes
    const dto = plainToInstance(SearchTankaDto, { active_flg: 'true' });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
    expect(dto.active_flg).toBe(true);
  });

  it('should coerce active_flg from "false" string to boolean false', async () => {
    const dto = plainToInstance(SearchTankaDto, { active_flg: 'false' });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
    expect(dto.active_flg).toBe(false);
  });

  it('should accept active_flg omitted (filter ignored = both states returned)', async () => {
    // COVERS: api.md §4.3 — 「省略時は両方（有効中・停止中）を返却」
    const dto = plainToInstance(SearchTankaDto, {});
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
    expect(dto.active_flg).toBeUndefined();
  });

  // ─── tekiyo_start_date / tekiyo_end_date (String YYYY-MM-DD, optional) ───
  it('should accept tekiyo_start_date in YYYY-MM-DD format', async () => {
    // COVERS: api.md §リクエストパラメータ #3
    const dto = plainToInstance(SearchTankaDto, {
      tekiyo_start_date: '2026-04-01',
    });
    const errors = await validate(dto);
    expect(
      errors.filter((e) => e.property === 'tekiyo_start_date'),
    ).toHaveLength(0);
    expect(dto.tekiyo_start_date).toBe('2026-04-01');
  });

  it('should accept tekiyo_end_date in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(SearchTankaDto, {
      tekiyo_end_date: '2027-03-31',
    });
    const errors = await validate(dto);
    expect(
      errors.filter((e) => e.property === 'tekiyo_end_date'),
    ).toHaveLength(0);
    expect(dto.tekiyo_end_date).toBe('2027-03-31');
  });

  it('should reject tekiyo_start_date when format is invalid (YYYY/MM/DD slashes)', async () => {
    const dto = plainToInstance(SearchTankaDto, {
      tekiyo_start_date: '2026/04/01',
    });
    const errors = await validate(dto);
    expect(
      errors.filter((e) => e.property === 'tekiyo_start_date').length,
    ).toBeGreaterThan(0);
  });

  it('should reject tekiyo_end_date when format is non-date garbage', async () => {
    const dto = plainToInstance(SearchTankaDto, {
      tekiyo_end_date: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(
      errors.filter((e) => e.property === 'tekiyo_end_date').length,
    ).toBeGreaterThan(0);
  });

  it('should treat blank tekiyo_start_date / tekiyo_end_date as undefined (no filter)', async () => {
    // COVERS: FE sends `""` for cleared date inputs — DTO Transform converts
    // to undefined so @IsOptional passes and the service skips the WHERE clause.
    const dto = plainToInstance(SearchTankaDto, {
      tekiyo_start_date: '',
      tekiyo_end_date: '',
    });
    const errors = await validate(dto);
    expect(
      errors.filter(
        (e) =>
          e.property === 'tekiyo_start_date' ||
          e.property === 'tekiyo_end_date',
      ),
    ).toHaveLength(0);
    expect(dto.tekiyo_start_date).toBeUndefined();
    expect(dto.tekiyo_end_date).toBeUndefined();
  });

  // ─── page (Number, optional, default 1) ──────────────────────────────────
  it('should coerce page from string and default to 1 when undefined', async () => {
    const dto = plainToInstance(SearchTankaDto, { page: '3' });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'page')).toHaveLength(0);
    expect(dto.page).toBe(3);
  });

  it('should fail when page is less than 1', async () => {
    const dto = plainToInstance(SearchTankaDto, { page: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  // ─── per_page (Number, optional, default 20, max 100) ────────────────────
  it('should fail when per_page exceeds 100', async () => {
    const dto = plainToInstance(SearchTankaDto, { per_page: 101 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  it('should fail when per_page is less than 1', async () => {
    const dto = plainToInstance(SearchTankaDto, { per_page: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  // ─── sort_by (String, optional, whitelist) ───────────────────────────────
  it('should accept whitelisted sort_by values', async () => {
    // COVERS: api.md §リクエストパラメータ row 6 — sort_by must be a known column
    for (const col of [
      'tanka_code',
      'tanka_name',
      'kingaku_zeikomi',
      'tekiyo_start_date',
    ]) {
      const dto = plainToInstance(SearchTankaDto, { sort_by: col });
      const errors = await validate(dto);
      expect(
        errors.filter((e) => e.property === 'sort_by'),
      ).toHaveLength(0);
    }
  });

  it('should reject sort_by values outside the whitelist (SQL injection guard)', async () => {
    // COVERS: §4.5 sort applied — must NOT inject arbitrary column names
    const dto = plainToInstance(SearchTankaDto, {
      sort_by: 'tanka_code; DROP TABLE m_tanka;--',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  // ─── sort_order (String, optional, asc|desc) ─────────────────────────────
  it('should accept sort_order=asc and sort_order=desc', async () => {
    for (const order of ['asc', 'desc']) {
      const dto = plainToInstance(SearchTankaDto, { sort_order: order });
      const errors = await validate(dto);
      expect(
        errors.filter((e) => e.property === 'sort_order'),
      ).toHaveLength(0);
    }
  });

  it('should reject sort_order outside {asc, desc}', async () => {
    const dto = plainToInstance(SearchTankaDto, { sort_order: 'random' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
  });

  // ─── forbidNonWhitelisted ────────────────────────────────────────────────
  it('should be rejected by ValidationPipe (forbidNonWhitelisted) when extra field is sent', async () => {
    // COVERS: protection against arbitrary client params. The DTO class
    // doesn't declare `malicious_field`; with the ValidationPipe configured
    // as in main.ts (`whitelist: true, forbidNonWhitelisted: true`) the
    // unknown property triggers a BadRequest. plainToInstance() alone does
    // NOT filter unknowns — it's the pipe that enforces the boundary.
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { malicious_field: 'evil' },
        { type: 'query', metatype: SearchTankaDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
