// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// Validates ZougenNichinoQueryDto — shared by both endpoints:
//   GET  /api/v1/report/zougen-nichino/preview  (ACSMS-API-029-001, query)
//   POST /api/v1/report/zougen-nichino/export    (ACSMS-API-029-002, body)
//
// Derived 1-to-1 from api.md §リクエストパラメータ. The export body adds an
// optional `remarks` array (`{ kanri_shiten_id, biko }`, biko ≤ 1000 chars).

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ZougenNichinoQueryDto } from '@/modules/report/dto/zougen-nichino-query.dto';

const VALID = {
  tekiyo_date: '2026-03-01',
  kanri_shiten_id: [20, 21],
  remarks: [{ kanri_shiten_id: 20, biko: '3月度分の増減通知です。' }],
};

describe('ZougenNichinoQueryDto', () => {
  it('should pass validation when all fields are present and valid', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when only tekiyo_date is provided (ids/remarks optional)', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { tekiyo_date: '2026-03-01' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tekiyo_date (required, YYYY-MM-DD) ────────────────────────────────
  it('should fail when tekiyo_date is missing', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { ...VALID, tekiyo_date: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is an empty string', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { ...VALID, tekiyo_date: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is not in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { ...VALID, tekiyo_date: '2026/03/01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  // ─── kanri_shiten_id (optional number[]) ───────────────────────────────
  it('should pass when kanri_shiten_id is omitted', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { tekiyo_date: '2026-03-01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_id')).toBe(false);
  });

  it('should fail when kanri_shiten_id contains a non-numeric element', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { ...VALID, kanri_shiten_id: ['x'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
  });

  // ─── remarks (optional array of { kanri_shiten_id, biko ≤ 1000 }) ──────
  it('should pass when remarks is omitted', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, {
      tekiyo_date: '2026-03-01',
      kanri_shiten_id: [20],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'remarks')).toBe(false);
  });

  it('should pass when remarks biko is exactly 1000 chars', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, {
      ...VALID,
      remarks: [{ kanri_shiten_id: 20, biko: 'あ'.repeat(1000) }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'remarks')).toBe(false);
  });

  it('should fail when remarks biko exceeds 1000 chars', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, {
      ...VALID,
      remarks: [{ kanri_shiten_id: 20, biko: 'あ'.repeat(1001) }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'remarks')).toBe(true);
  });

  it('should fail when a remark kanri_shiten_id is non-numeric', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, {
      ...VALID,
      remarks: [{ kanri_shiten_id: 'x', biko: 'メモ' }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'remarks')).toBe(true);
  });

  // ─── whitelist ─────────────────────────────────────────────────────────
  it('should fail when an unknown property is supplied', async () => {
    const dto = plainToInstance(ZougenNichinoQueryDto, { ...VALID, bogus: 'x' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'bogus')).toBe(true);
  });
});
