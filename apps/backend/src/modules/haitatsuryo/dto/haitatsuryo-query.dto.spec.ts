// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// Validates HaitatsuryoQueryDto — shared by both endpoints:
//   GET  /api/v1/haitatsuryo/preview (ACSMS-API-021-001, query)
//   POST /api/v1/haitatsuryo/export  (ACSMS-API-021-002, body)
//
// Derived 1-to-1 from api.md §リクエストパラメータ.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HaitatsuryoQueryDto } from '@/modules/haitatsuryo/dto/haitatsuryo-query.dto';

const VALID = {
  target_month: '2026-04-01',
  haitatsuryo_shiharai_cycle: 3,
};

describe('HaitatsuryoQueryDto', () => {
  it('should pass validation when all fields are present and valid', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when only target_month is provided (cycle optional)', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { target_month: '2026-04-01' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── target_month (required, YYYY-MM-DD) ───────────────────────────────
  it('should fail when target_month is missing', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, target_month: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'target_month')).toBe(true);
  });

  it('should fail when target_month is an empty string', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, target_month: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'target_month')).toBe(true);
  });

  it('should fail when target_month is not in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, target_month: '2026/04/01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'target_month')).toBe(true);
  });

  it('should fail when target_month is a year-month only (not 10 chars)', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, target_month: '2026-04' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'target_month')).toBe(true);
  });

  // ─── haitatsuryo_shiharai_cycle (optional int 1..12) ───────────────────
  it('should pass when haitatsuryo_shiharai_cycle is omitted', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { target_month: '2026-04-01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsuryo_shiharai_cycle')).toBe(false);
  });

  it('should fail when haitatsuryo_shiharai_cycle is below 1', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, haitatsuryo_shiharai_cycle: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsuryo_shiharai_cycle')).toBe(true);
  });

  it('should fail when haitatsuryo_shiharai_cycle is above 12', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, haitatsuryo_shiharai_cycle: 13 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsuryo_shiharai_cycle')).toBe(true);
  });

  it('should fail when haitatsuryo_shiharai_cycle is not an integer', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, haitatsuryo_shiharai_cycle: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsuryo_shiharai_cycle')).toBe(true);
  });

  // ─── whitelist ─────────────────────────────────────────────────────────
  it('should fail when an unknown property is supplied', async () => {
    const dto = plainToInstance(HaitatsuryoQueryDto, { ...VALID, bogus: 'x' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'bogus')).toBe(true);
  });
});
