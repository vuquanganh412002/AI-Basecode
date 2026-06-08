//
// Screen: ACSMS-SCR-013 — 購読者履歴情報画面
//
// Drives src/modules/dokusya/dto/dokusya-rireki-query.dto.ts (to be
// generated). One test (or group) per row in
// docs/design/ACSMS-SCR-013/ACSMS-SCR-013-api.md §API-013-001
// リクエストパラメータ + §4.1 リクエストのバリデーション.
//
// The DTO binds the query string of `GET /api/v1/dokusya/:dokusya_id/rireki`
// (page / per_page / sort_by / sort_order). `dokusya_id` is a PATH param —
// parsed by ParseIntPipe in the controller — so it is NOT part of this DTO.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { DokusyaRirekiQueryDto } from '@/modules/dokusya/dto/dokusya-rireki-query.dto';
import { buildDokusyaRirekiQuery } from '@test/fixtures/dokusya.factory';

describe('DokusyaRirekiQueryDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when no query params are supplied (all optional w/ defaults)', async () => {
    const dto = plainToInstance(DokusyaRirekiQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when every documented field has a valid value', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery(),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── page (Number, optional, >= 1) ──────────────────────────────────────
  it('should default page to 1 when omitted', async () => {
    const dto = plainToInstance(DokusyaRirekiQueryDto, {});
    expect(dto.page).toBe(1);
  });

  it('should fail when page is below 1', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ page: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is non-numeric', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ page: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should coerce a numeric-string page to Number (query strings arrive as strings)', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ page: '3' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
  });

  // ─── per_page (Number, optional, 1..100) ────────────────────────────────
  it('should default per_page to 20 when omitted', async () => {
    const dto = plainToInstance(DokusyaRirekiQueryDto, {});
    expect(dto.per_page).toBe(20);
  });

  it('should fail when per_page is below 1', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ per_page: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  it('should fail when per_page exceeds the 100 maximum (機能定義 3.1 最大100)', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ per_page: 101 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  it('should pass when per_page is exactly 100', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ per_page: 100 }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── sort_by (String, optional, allow-list) ─────────────────────────────
  it('should default sort_by to rireki_no when omitted', async () => {
    const dto = plainToInstance(DokusyaRirekiQueryDto, {});
    expect(dto.sort_by).toBe('rireki_no');
  });

  it.each(['rireki_no', 'dokusya_kaishi_date', 'joho_henko_tekiyo_date', 'created_at'])(
    'should pass when sort_by is the allow-listed value %s',
    async (value) => {
      const dto = plainToInstance(
        DokusyaRirekiQueryDto,
        buildDokusyaRirekiQuery({ sort_by: value }),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('should fail when sort_by is outside the allow-list', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ sort_by: 'ja_id; DROP TABLE t_dokusya_rireki' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  // ─── sort_order (String, optional, asc|desc) ────────────────────────────
  it('should default sort_order to desc when omitted (機能定義 1.2 最新レコード先頭)', async () => {
    const dto = plainToInstance(DokusyaRirekiQueryDto, {});
    expect(dto.sort_order).toBe('desc');
  });

  it.each(['asc', 'desc'])(
    'should pass when sort_order is %s',
    async (value) => {
      const dto = plainToInstance(
        DokusyaRirekiQueryDto,
        buildDokusyaRirekiQuery({ sort_order: value }),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('should fail when sort_order is not asc/desc', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ sort_order: 'ascending' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
  });

  // ─── whitelist — forbid unknown params ──────────────────────────────────
  it('should reject an unknown query field under forbidNonWhitelisted', async () => {
    const dto = plainToInstance(
      DokusyaRirekiQueryDto,
      buildDokusyaRirekiQuery({ hacker_field: 1 }),
    );
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'hacker_field')).toBe(true);
  });
});
