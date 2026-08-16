// Screen: ACSMS-SCR-003 — 単価マスタ登録画面
//
// Drives src/modules/tanka/dto/create-tanka.dto.ts (to be generated).
// One test per row in api.md §ACSMS-API-003-002 リクエストパラメータ +
// §4.1 リクエストのバリデーション.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateTankaDto } from '@/modules/tanka/dto/create-tanka.dto';
import { buildCreateTankaPayload } from '@test/fixtures/tanka.factory';

describe('CreateTankaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when all required + optional fields are provided', async () => {
    const dto = plainToInstance(CreateTankaDto, buildCreateTankaPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when only required fields are provided', async () => {
    // tax_rate / kingaku_zeikomi / kingaku_zeinuki / biko / active_flg all optional
    const dto = plainToInstance(CreateTankaDto, {
      tanka_type: 1,
      tanka_code: 'T100',
      tanka_name: '新規単価',
      tekiyo_start_date: '2026-06-01',
      tekiyo_end_date: '2027-05-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tanka_type (Number, required, must be 1 or 2) ──────────────────────
  it('should fail when tanka_type is missing', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_type: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_type')).toBe(true);
  });

  it('should fail when tanka_type is non-numeric', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_type: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_type')).toBe(true);
  });

  it('should coerce tanka_type from query-string number to int', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_type: '2' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tanka_type')).toHaveLength(0);
    expect(dto.tanka_type).toBe(2);
  });

  // ─── tanka_code (String, required, max 10) ──────────────────────────────
  it('should fail when tanka_code is empty string', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_code: '' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_code')).toBe(true);
  });

  it('should fail when tanka_code is missing', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_code: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_code')).toBe(true);
  });

  it('should fail when tanka_code exceeds 10 chars', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_code: 'T1234567890X' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_code')).toBe(true);
  });

  it('should accept tanka_code at exactly 10 chars', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_code: 'T123456789' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tanka_code')).toHaveLength(0);
  });

  // ─── tanka_name (String, required, max 100) ─────────────────────────────
  it('should fail when tanka_name is empty string', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_name: '' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should fail when tanka_name exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_name: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_name')).toBe(true);
  });

  it('should accept tanka_name at exactly 100 chars', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tanka_name: 'あ'.repeat(100) }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tanka_name')).toHaveLength(0);
  });

  // ─── tax_rate (Number, optional, 0–100, 2-decimal) ──────────────────────
  it('should accept tax_rate omitted (optional)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tax_rate: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tax_rate')).toHaveLength(0);
  });

  it('should fail when tax_rate is negative', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tax_rate: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tax_rate')).toBe(true);
  });

  it('should fail when tax_rate exceeds 100', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tax_rate: 101 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tax_rate')).toBe(true);
  });

  it('should accept tax_rate=0 (boundary)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tax_rate: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tax_rate')).toHaveLength(0);
  });

  it('should accept tax_rate=100 (boundary)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tax_rate: 100 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tax_rate')).toHaveLength(0);
  });

  // ─── kingaku_zeikomi (Number, optional, ≥0) ─────────────────────────────
  it('should fail when kingaku_zeikomi is negative', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ kingaku_zeikomi: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kingaku_zeikomi')).toBe(true);
  });

  it('should accept kingaku_zeikomi=0 (boundary)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ kingaku_zeikomi: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'kingaku_zeikomi')).toHaveLength(0);
  });

  // ─── kingaku_zeinuki (Number, optional, ≥0) ─────────────────────────────
  it('should fail when kingaku_zeinuki is negative', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ kingaku_zeinuki: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kingaku_zeinuki')).toBe(true);
  });

  it('should accept kingaku_zeinuki=0 (boundary)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ kingaku_zeinuki: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'kingaku_zeinuki')).toHaveLength(0);
  });

  // ─── tekiyo_start_date (String YYYY-MM-DD, required) ────────────────────
  it('should fail when tekiyo_start_date is missing', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tekiyo_start_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_start_date')).toBe(true);
  });

  it('should fail when tekiyo_start_date format is invalid (YYYY/MM/DD)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tekiyo_start_date: '2026/06/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_start_date')).toBe(true);
  });

  it('should fail when tekiyo_start_date is non-date garbage', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tekiyo_start_date: 'not-a-date' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_start_date')).toBe(true);
  });

  // ─── tekiyo_end_date (String YYYY-MM-DD, required, >= start) ────────────
  it('should fail when tekiyo_end_date is missing', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tekiyo_end_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_end_date')).toBe(true);
  });

  it('should fail when tekiyo_end_date format is invalid', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ tekiyo_end_date: '2027/05/31' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_end_date')).toBe(true);
  });

  // ─── biko (String, optional, default '') ────────────────────────────────
  it('should accept biko omitted', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ biko: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  it('should accept biko as empty string ""', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ biko: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  // ─── active_flg (Boolean, optional, default true) ───────────────────────
  it('should accept active_flg omitted (default applies in service)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ active_flg: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
  });

  it('should accept active_flg=false', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ active_flg: false }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'active_flg')).toHaveLength(0);
  });

  it('should fail when active_flg is non-boolean string "yes"', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ active_flg: 'yes' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'active_flg')).toBe(true);
  });

  // ─── campaign_flg (Boolean, optional, default false) ────────────────────
  it('should accept campaign_flg omitted (default applies in service)', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ campaign_flg: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'campaign_flg')).toHaveLength(0);
  });

  it('should accept campaign_flg=true', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ campaign_flg: true }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'campaign_flg')).toHaveLength(0);
  });

  it('should fail when campaign_flg is non-boolean string "yes"', async () => {
    const dto = plainToInstance(
      CreateTankaDto,
      buildCreateTankaPayload({ campaign_flg: 'yes' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'campaign_flg')).toBe(true);
  });
});
