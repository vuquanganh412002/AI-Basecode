// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Drives src/modules/dokusya/dto/search-replace-dokusya.dto.ts (to be
// generated). One test (or group) per row in
// docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md §API-015-001
// リクエストパラメータ + §4.1 リクエストのバリデーション.
//
// The DTO binds the query string of
// `GET /api/v1/dokusya/replace-hanbaiten/search`.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { SearchReplaceDokusyaDto } from '@/modules/dokusya/dto/search-replace-dokusya.dto';
import { buildReplaceSearchQuery } from '@test/fixtures/dokusya.factory';

describe('SearchReplaceDokusyaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when only the required 適用日 is supplied (other filters optional)', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {
      hanbaiten_tekiyo_date: '2099-12-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── hanbaiten_tekiyo_date (required, YYYY-MM-DD) — 顧客要件 2026-07 ────────
  it('should FAIL when hanbaiten_tekiyo_date is missing (now required)', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_tekiyo_date')).toBe(true);
  });

  it('should FAIL when hanbaiten_tekiyo_date is not YYYY-MM-DD', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {
      hanbaiten_tekiyo_date: '2099/12/31',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_tekiyo_date')).toBe(true);
  });

  it('should pass validation when every documented field has a valid value', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({
        kanri_shiten_id: 10,
        shiten_id: 100,
        kumiaiin_code: '10001',
        shimei: '山田',
        shimei_kana: 'ヤマダ',
        haitatsu_address: '東京都千代田区',
        hanbaiten_id: 200,
        dokusya_kaishi_date_from: '2026-01-01',
        dokusya_kaishi_date_to: '2026-12-31',
      }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── kanri_shiten_id (Number, optional) ─────────────────────────────────
  it('should coerce a numeric-string kanri_shiten_id to Number when supplied', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ kanri_shiten_id: '10' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.kanri_shiten_id).toBe(10);
  });

  it('should fail when kanri_shiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ kanri_shiten_id: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
  });

  // ─── shiten_id (Number, optional) ───────────────────────────────────────
  it('should fail when shiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ shiten_id: 'xyz' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiten_id')).toBe(true);
  });

  // ─── kumiaiin_code (String, optional, max 20) ───────────────────────────
  it('should pass when kumiaiin_code is exactly 20 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ kumiaiin_code: '1'.repeat(20) }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when kumiaiin_code exceeds 20 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ kumiaiin_code: '1'.repeat(21) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(true);
  });

  // ─── shimei (String, optional, max 100) ─────────────────────────────────
  it('should pass when shimei is exactly 100 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ shimei: 'あ'.repeat(100) }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when shimei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ shimei: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei')).toBe(true);
  });

  // ─── shimei_kana (String, optional, max 200) ────────────────────────────
  it('should pass when shimei_kana is exactly 200 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ shimei_kana: 'ア'.repeat(200) }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when shimei_kana exceeds 200 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ shimei_kana: 'ア'.repeat(201) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana')).toBe(true);
  });

  // ─── haitatsu_address (String, optional, max 300) ───────────────────────
  it('should pass when haitatsu_address is exactly 300 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ haitatsu_address: 'x'.repeat(300) }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when haitatsu_address exceeds 300 chars', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ haitatsu_address: 'x'.repeat(301) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_address')).toBe(true);
  });

  // ─── hanbaiten_id (Number, optional) ────────────────────────────────────
  it('should fail when hanbaiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ hanbaiten_id: 'nope' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(true);
  });

  // ─── dokusya_kaishi_date_from / _to (String, YYYY-MM-DD, optional) ──────
  it('should pass when dokusya_kaishi_date_from is a valid YYYY-MM-DD', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ dokusya_kaishi_date_from: '2026-01-01' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when dokusya_kaishi_date_from is not YYYY-MM-DD format', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ dokusya_kaishi_date_from: '2026/01/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date_from')).toBe(
      true,
    );
  });

  it('should fail when dokusya_kaishi_date_to is not YYYY-MM-DD format', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ dokusya_kaishi_date_to: '20261231' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date_to')).toBe(
      true,
    );
  });

  // ─── page (Number, optional, >= 1, default 1) ───────────────────────────
  it('should default page to 1 when omitted', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {});
    expect(dto.page).toBe(1);
  });

  it('should fail when page is below 1', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ page: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should coerce page to Number when supplied as a numeric string (query strings arrive as strings)', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ page: '3' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
  });

  // ─── per_page (Number, optional, 1..100, default 20) ────────────────────
  it('should default per_page to 20 when omitted', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {});
    expect(dto.per_page).toBe(20);
  });

  it('should fail when per_page is below 1', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ per_page: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  it('should fail when per_page exceeds the 100 maximum', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ per_page: 101 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'per_page')).toBe(true);
  });

  it('should pass when per_page is exactly 100', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ per_page: 100 }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── sort_by (String, optional, allow-list, default kumiaiin_code) ──────
  it('should default sort_by to kumiaiin_code when omitted', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {});
    expect(dto.sort_by).toBe('kumiaiin_code');
  });

  it.each(['kanri_shiten_name', 'shiten_name', 'kumiaiin_code', 'hanbaiten_code'])(
    'should pass when sort_by is the allow-listed value %s',
    async (value) => {
      const dto = plainToInstance(
        SearchReplaceDokusyaDto,
        buildReplaceSearchQuery({ sort_by: value }),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('should fail when sort_by is outside the allow-list', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ sort_by: 'ja_id; DROP TABLE t_dokusya' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  // ─── sort_order (String, optional, asc|desc, default asc) ───────────────
  it('should default sort_order to asc when omitted', async () => {
    const dto = plainToInstance(SearchReplaceDokusyaDto, {});
    expect(dto.sort_order).toBe('asc');
  });

  it.each(['asc', 'desc'])(
    'should pass when sort_order is %s',
    async (value) => {
      const dto = plainToInstance(
        SearchReplaceDokusyaDto,
        buildReplaceSearchQuery({ sort_order: value }),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('should fail when sort_order is not asc/desc', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ sort_order: 'ascending' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_order')).toBe(true);
  });

  // ─── whitelist — forbid unknown params ──────────────────────────────────
  it('should reject an unknown query field when forbidNonWhitelisted is on', async () => {
    const dto = plainToInstance(
      SearchReplaceDokusyaDto,
      buildReplaceSearchQuery({ hacker_field: 1 }),
    );
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === 'hacker_field')).toBe(true);
  });
});
