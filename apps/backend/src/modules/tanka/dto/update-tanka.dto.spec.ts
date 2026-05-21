// Screen: ACSMS-SCR-003 — 単価マスタ登録画面
//
// Drives src/modules/tanka/dto/update-tanka.dto.ts (to be generated).
// One test per row in api.md §API-003-003 リクエストパラメータ +
// §4.1 リクエストのバリデーション.
//
// UpdateTankaDto mirrors CreateTankaDto MINUS `tanka_code` — per api.md
// §API-003-003 footnote: 「tanka_code は更新不可（画面側でdisabled）」.

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UpdateTankaDto } from '@/modules/tanka/dto/update-tanka.dto';
import { buildUpdateTankaPayload } from '@test/fixtures/tanka.factory';

describe('UpdateTankaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when all updatable fields are valid', async () => {
    const dto = plainToInstance(UpdateTankaDto, buildUpdateTankaPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tanka_code is NOT a field on UpdateTankaDto ────────────────────────
  it('should NOT expose tanka_code as an updatable field (immutable per api.md)', async () => {
    // tanka_code is omitted from UpdateTankaDto entirely (PartialType ⊂
    // OmitType on CreateTankaDto). With ValidationPipe configured per
    // main.ts (`whitelist + forbidNonWhitelisted`), a smuggled tanka_code
    // in the body produces BadRequest at the HTTP boundary. The pipe is
    // the enforcement layer; plainToInstance() doesn't filter unknowns.
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { ...buildUpdateTankaPayload(), tanka_code: 'SHOULD_BE_DROPPED' },
        { type: 'body', metatype: UpdateTankaDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ─── tanka_type (Number, required, must be 1 or 2) ──────────────────────
  it('should fail when tanka_type is missing', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_type: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_type')).toBe(true);
  });

  it('should fail when tanka_type is non-numeric', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_type: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_type')).toBe(true);
  });

  // ─── tanka_name (String, required, max 100) ─────────────────────────────
  it('should fail when tanka_name is empty string', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_name: '' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should fail when tanka_name is missing', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_name: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should fail when tanka_name exceeds 100 chars', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_name: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should accept tanka_name at exactly 100 chars', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tanka_name: 'あ'.repeat(100) }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tanka_name')).toHaveLength(0);
  });

  // ─── tax_rate (Number, optional, 0–100) ─────────────────────────────────
  it('should fail when tax_rate is negative', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tax_rate: -0.5 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tax_rate')).toBe(true);
  });

  it('should fail when tax_rate exceeds 100', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tax_rate: 150 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tax_rate')).toBe(true);
  });

  // ─── kingaku_zeikomi / kingaku_zeinuki (Number, optional, ≥0) ───────────
  it('should fail when kingaku_zeikomi is negative', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ kingaku_zeikomi: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kingaku_zeikomi')).toBe(true);
  });

  it('should fail when kingaku_zeinuki is negative', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ kingaku_zeinuki: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kingaku_zeinuki')).toBe(true);
  });

  // ─── tekiyo_start_date (String YYYY-MM-DD, required) ────────────────────
  it('should fail when tekiyo_start_date is missing', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tekiyo_start_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_start_date')).toBe(true);
  });

  it('should fail when tekiyo_start_date format is invalid (slashes)', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tekiyo_start_date: '2026/06/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_start_date')).toBe(true);
  });

  // ─── tekiyo_end_date (String YYYY-MM-DD, required) ──────────────────────
  it('should fail when tekiyo_end_date is missing', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tekiyo_end_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_end_date')).toBe(true);
  });

  it('should fail when tekiyo_end_date format is invalid', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ tekiyo_end_date: 'bad-date' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_end_date')).toBe(true);
  });

  // ─── biko (String, optional) ────────────────────────────────────────────
  it('should accept biko omitted', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ biko: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  it('should accept biko as empty string ""', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ biko: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  // ─── active_flg (Boolean, optional) ─────────────────────────────────────
  it('should accept active_flg omitted', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ active_flg: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
  });

  it('should accept active_flg=false', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ active_flg: false }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
  });

  it('should fail when active_flg is non-boolean string', async () => {
    const dto = plainToInstance(
      UpdateTankaDto,
      buildUpdateTankaPayload({ active_flg: 'maybe' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'active_flg')).toBe(true);
  });
});
