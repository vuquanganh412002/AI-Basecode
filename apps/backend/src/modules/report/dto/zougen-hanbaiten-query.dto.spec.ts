// Screen: ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// Validates ZougenHanbaitenQueryDto — shared by both endpoints:
//   GET  /api/v1/report/zougen-hanbaiten/preview  (ACSMS-API-028-001, query)
//   POST /api/v1/report/zougen-hanbaiten/export    (ACSMS-API-028-002, body)
//
// Derived 1-to-1 from api.md §リクエストパラメータ.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ZougenHanbaitenQueryDto } from '@/modules/report/dto/zougen-hanbaiten-query.dto';

const VALID = {
  tekiyo_date: '2026-05-01',
  hanbaiten_id: [200, 201],
  kanri_shiten_id: [20],
};

describe('ZougenHanbaitenQueryDto', () => {
  it('should pass validation when all fields are present and valid', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when only tekiyo_date is provided (ids optional)', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { tekiyo_date: '2026-05-01' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── tekiyo_date (required, YYYY-MM-DD) ────────────────────────────────
  it('should fail when tekiyo_date is missing', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, tekiyo_date: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is an empty string', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, tekiyo_date: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  it('should fail when tekiyo_date is not in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, tekiyo_date: '2026/05/01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tekiyo_date')).toBe(true);
  });

  // ─── hanbaiten_id / kanri_shiten_id (optional number[]) ────────────────
  it('should pass when hanbaiten_id is omitted', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, {
      tekiyo_date: '2026-05-01',
      kanri_shiten_id: [20],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(false);
  });

  it('should fail when hanbaiten_id contains a non-numeric element', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, hanbaiten_id: ['abc'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(true);
  });

  it('should fail when kanri_shiten_id contains a non-numeric element', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, kanri_shiten_id: ['x'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
  });

  // ─── whitelist ─────────────────────────────────────────────────────────
  it('should fail when an unknown property is supplied', async () => {
    const dto = plainToInstance(ZougenHanbaitenQueryDto, { ...VALID, bogus: 'x' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'bogus')).toBe(true);
  });
});
