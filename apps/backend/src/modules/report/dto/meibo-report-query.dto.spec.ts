// Screen: ACSMS-SCR-026 — 購読者名簿出力画面
//
// Validates MeiboReportQueryDto — the shared query DTO for both
//   GET /api/v1/report/meibo/preview  (ACSMS-API-026-001)
//   GET /api/v1/report/meibo/export   (ACSMS-API-026-002)
//
// Derived 1-to-1 from api.md §リクエストパラメータ.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MeiboReportQueryDto } from '@/modules/report/dto/meibo-report-query.dto';

const VALID = {
  tekiyo_date: '2026-04-01',
  report_type: 'hanbaiten',
  hanbaiten_ids: [1, 2],
};

describe('MeiboReportQueryDto', () => {
  it('should pass validation when all required fields are present and valid', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tekiyo_date (required, YYYY-MM-DD) ────────────────────────────────
  it('should fail when tekiyo_date is missing', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, tekiyo_date: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is an empty string', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, tekiyo_date: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is not in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, tekiyo_date: '2026/04/01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  // ─── report_type (required, enum hanbaiten | kanri_shiten) ─────────────
  it('should fail when report_type is missing', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, report_type: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'report_type')).toBe(true);
  });

  it('should fail when report_type is not one of hanbaiten | kanri_shiten', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, report_type: 'something' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'report_type')).toBe(true);
  });

  it('should pass when report_type is kanri_shiten with kanri_shiten_ids', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, {
      tekiyo_date: '2026-04-01',
      report_type: 'kanri_shiten',
      kanri_shiten_ids: [10],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── hanbaiten_ids / kanri_shiten_ids (optional number[]) ──────────────
  it('should pass when hanbaiten_ids is omitted (conditional-required enforced in service)', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, {
      tekiyo_date: '2026-04-01',
      report_type: 'hanbaiten',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_ids')).toBe(false);
  });

  it('should fail when hanbaiten_ids contains a non-numeric element', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, hanbaiten_ids: ['abc'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_ids')).toBe(true);
  });

  it('should fail when kanri_shiten_ids contains a non-numeric element', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, {
      tekiyo_date: '2026-04-01',
      report_type: 'kanri_shiten',
      kanri_shiten_ids: ['abc'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_ids')).toBe(true);
  });

  // ─── dokusya_shubetsu (optional, 1 or 2 — 併読(3) rejected) ────────────
  it('should pass when dokusya_shubetsu is 1 (紙版)', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, dokusya_shubetsu: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(false);
  });

  it('should pass when dokusya_shubetsu is 2 (電子版)', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, dokusya_shubetsu: 2 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(false);
  });

  it('should fail when dokusya_shubetsu is 3 (併読は本帳票では選択不可)', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, dokusya_shubetsu: 3 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
  });

  // ─── shiharai_cycle (optional number) ──────────────────────────────────
  it('should pass when shiharai_cycle is a valid month number', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, {
      tekiyo_date: '2026-04-01',
      report_type: 'kanri_shiten',
      kanri_shiten_ids: [10],
      shiharai_cycle: 12,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_cycle')).toBe(false);
  });

  it('should fail when shiharai_cycle is not an integer', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, shiharai_cycle: 'monthly' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_cycle')).toBe(true);
  });

  // ─── whitelist (forbidNonWhitelisted at the pipe) ──────────────────────
  it('should fail when an unknown property is supplied', async () => {
    const dto = plainToInstance(MeiboReportQueryDto, { ...VALID, bogus_field: 'x' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'bogus_field')).toBe(true);
  });
});
