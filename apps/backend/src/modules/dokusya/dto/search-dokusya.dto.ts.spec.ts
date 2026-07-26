//
// Screen: ACSMS-SCR-014 — 購読者明細検索画面
//
// Drives src/modules/dokusya/dto/search-dokusya.dto.ts (to be generated).
// One test (or test group) per row in api.md §API-014-001 リクエストパラメータ
// + §4.1 リクエストのバリデーション.
//
// The DTO is consumed by:
//   - GET /api/v1/dokusya          (list search — pagination + sort applied)
//   - GET /api/v1/dokusya/export   (Excel export — page/per_page/sort_by/sort_order ignored)
//
// Both endpoints reuse the same DTO; the export controller drops the pagination
// fields after binding. Tests therefore focus on FIELD-level validation only.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { SearchDokusyaDto } from '@/modules/dokusya/dto/search-dokusya.dto';
import { buildSearchDokusyaQuery } from '@test/fixtures/dokusya.factory';

describe('SearchDokusyaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when no filters are supplied (all optional)', async () => {
    const dto = plainToInstance(SearchDokusyaDto, buildSearchDokusyaQuery());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when every documented field has a valid value', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        kanri_shiten_id: 10,
        shiten_id: 21,
        kumiaiin_code: 'K0001',
        bank_branch: '001',
        full_name: '山田',
        full_name_kana: 'ヤマダ',
        renrakusaki: '0312345678',
        haitatsu: '東京都渋谷区',
        hanbaiten_id: 501,
        email: 'user@example.com',
        yubin_kubun: '1',
        tanka_id: 5,
        biko: '備考メモ',
        seikyu_kaishi_month_from: '202604',
        seikyu_kaishi_month_to: '202612',
        shoki_dokusya_kaishi_date_from: '2024/01/01',
        shoki_dokusya_kaishi_date_to: '2024/12/31',
        dokusya_chushi_date_from: '2025/01/01',
        dokusya_chushi_date_to: '2025/12/31',
        dokusya_shubetsu: 1,
        denshi_shonin_status: 1,
        tetsuzuki_shurui: 1,
        joho_henko_tekiyo_date_from: '2024/01/01',
        joho_henko_tekiyo_date_to: '2024/12/31',
        shiharai_hoho: 1,
        page: 1,
        per_page: 20,
        sort_by: 'updated_at',
        sort_order: 'desc',
      }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── kanri_shiten_id (Number, optional) ─────────────────────────────────
  it('should fail when kanri_shiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ kanri_shiten_id: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
  });

  // ─── shiten_id (Number, optional) ───────────────────────────────────────
  it('should fail when shiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ shiten_id: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiten_id')).toBe(true);
  });

  // ─── kumiaiin_code (String, max 20) ─────────────────────────────────────
  it('should fail when kumiaiin_code exceeds 20 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ kumiaiin_code: 'K'.repeat(21) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(true);
  });

  it('should pass when kumiaiin_code is exactly 20 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ kumiaiin_code: 'K'.repeat(20) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(false);
  });

  // ─── bank_branch (引落元口座支店・String, max 100) ───────────────────────
  it('should fail when bank_branch exceeds 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ bank_branch: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'bank_branch')).toBe(true);
  });

  it('should pass when bank_branch is within 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ bank_branch: '本店' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'bank_branch')).toBe(false);
  });

  // ─── full_name (String, max 100) ────────────────────────────────────────
  it('should fail when full_name exceeds 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ full_name: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'full_name')).toBe(true);
  });

  // ─── full_name_kana (String, max 100) ───────────────────────────────────
  it('should fail when full_name_kana exceeds 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ full_name_kana: 'ア'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'full_name_kana')).toBe(true);
  });

  // ─── renrakusaki (連絡先・String, max 15) ────────────────────────────────
  it('should fail when renrakusaki exceeds 15 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ renrakusaki: '1'.repeat(16) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'renrakusaki')).toBe(true);
  });

  // ─── yubin_kubun / tanka_id / biko（顧客要件 2026-07 追加）────────────────
  it('should fail when tanka_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ tanka_id: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_id')).toBe(true);
  });

  it('should fail when biko exceeds 500 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ biko: 'あ'.repeat(501) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'biko')).toBe(true);
  });

  it('should pass when yubin_kubun / tanka_id / biko are valid', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ yubin_kubun: '1', tanka_id: 5, biko: '備考' }),
    );
    const errors = await validate(dto);
    expect(
      errors.some((e) =>
        ['yubin_kubun', 'tanka_id', 'biko'].includes(e.property),
      ),
    ).toBe(false);
  });

  // ─── haitatsu (String, max 200) ─────────────────────────────────────────
  it('should fail when haitatsu exceeds 200 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ haitatsu: 'あ'.repeat(201) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu')).toBe(true);
  });

  // ─── hanbaiten_id (Number, optional) ────────────────────────────────────
  it('should fail when hanbaiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ hanbaiten_id: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(true);
  });

  // ─── email (String, max 100, format) ────────────────────────────────────
  it('should fail when email is not a valid email format', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ email: 'not-an-email' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when email exceeds 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        email: `${'a'.repeat(95)}@b.co`, // 95 + 5 = 100? actually 100 — push to 101
      }),
    );
    // Use longer literal to break the 100-limit deterministically
    const dto2 = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        email: `${'a'.repeat(100)}@example.com`,
      }),
    );
    const errors2 = await validate(dto2);
    expect(errors2.some((e) => e.property === 'email')).toBe(true);
  });

  it('should pass when email is a valid format under 100 chars', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ email: 'user@example.com' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(false);
  });

  // ─── seikyu_kaishi_month_from/to (String, YYYYMM 範囲) ───────────────────
  it('should fail when seikyu_kaishi_month_from is not YYYYMM (6桁)', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ seikyu_kaishi_month_from: '2026041' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'seikyu_kaishi_month_from')).toBe(
      true,
    );
  });

  it('should pass when seikyu_kaishi_month_from/to are valid YYYYMM', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        seikyu_kaishi_month_from: '202601',
        seikyu_kaishi_month_to: '202612',
      }),
    );
    const errors = await validate(dto);
    expect(
      errors.some((e) => e.property.startsWith('seikyu_kaishi_month')),
    ).toBe(false);
  });

  // ─── dokusya_shubetsu (Number, 1-3) ─────────────────────────────────────
  it.each([
    ['1', 1, false],
    ['3', 3, false],
    ['99 (out of range)', 99, true],
    ['0 (out of range)', 0, true],
  ])(
    'should validate when dokusya_shubetsu is %s',
    async (_label, value, expectError) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ dokusya_shubetsu: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(
        expectError,
      );
    },
  );

  // ─── shiharai_hoho (Number, 1-6, 9) ─────────────────────────────────────
  it('should pass when shiharai_hoho is in {1,2,3,4,5,6,9}', async () => {
    for (const v of [1, 2, 3, 4, 5, 6, 9]) {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ shiharai_hoho: v }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'shiharai_hoho')).toBe(false);
    }
  });

  it('should fail when shiharai_hoho is 7 (gap in allowed set)', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ shiharai_hoho: 7 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_hoho')).toBe(true);
  });

  it('should fail when shiharai_hoho is 99', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ shiharai_hoho: 99 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_hoho')).toBe(true);
  });

  // ─── tetsuzuki_shurui (Number, 0-1) ─────────────────────────────────────
  it('should pass when tetsuzuki_shurui is 0 or 1', async () => {
    for (const v of [0, 1]) {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ tetsuzuki_shurui: v }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'tetsuzuki_shurui')).toBe(false);
    }
  });

  it('should fail when tetsuzuki_shurui is 2 (out of range)', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ tetsuzuki_shurui: 2 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tetsuzuki_shurui')).toBe(true);
  });

  // ─── denshi_shonin_status (Number, 0-2) ─────────────────────────────────
  it('should pass when denshi_shonin_status is 0, 1, or 2', async () => {
    for (const v of [0, 1, 2]) {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ denshi_shonin_status: v }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'denshi_shonin_status')).toBe(
        false,
      );
    }
  });

  it('should fail when denshi_shonin_status is 3 (out of range)', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ denshi_shonin_status: 3 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'denshi_shonin_status')).toBe(
      true,
    );
  });

  // ─── shoki_dokusya_kaishi_date range correlation ────────────────────────
  it('should pass when shoki_dokusya_kaishi_date_from <= shoki_dokusya_kaishi_date_to', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        shoki_dokusya_kaishi_date_from: '2024/01/01',
        shoki_dokusya_kaishi_date_to: '2024/12/31',
      }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when shoki_dokusya_kaishi_date_from > shoki_dokusya_kaishi_date_to', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        shoki_dokusya_kaishi_date_from: '2024/12/31',
        shoki_dokusya_kaishi_date_to: '2024/01/01',
      }),
    );
    const errors = await validate(dto);
    // Correlation check may be implemented as a class-level @Validate or
    // surfaced via either of the two date fields — accept either case
    // by asserting at least one error is present.
    expect(errors.length).toBeGreaterThan(0);
  });

  // ─── dokusya_chushi_date range correlation ──────────────────────────────
  it('should fail when dokusya_chushi_date_from > dokusya_chushi_date_to', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        dokusya_chushi_date_from: '2025/12/31',
        dokusya_chushi_date_to: '2025/01/01',
      }),
    );
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  // ─── joho_henko_tekiyo_date range correlation ───────────────────────────
  it('should fail when joho_henko_tekiyo_date_from > joho_henko_tekiyo_date_to', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({
        joho_henko_tekiyo_date_from: '2024/12/31',
        joho_henko_tekiyo_date_to: '2024/01/01',
      }),
    );
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  // ─── page (Number, >= 1) ────────────────────────────────────────────────
  it('should fail when page is 0', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ page: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is negative', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ page: -1 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should fail when page is non-numeric', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ page: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  // ─── per_page (Number, 1-100) ───────────────────────────────────────────
  it.each([
    ['0', 0, true],
    ['101 (exceeds 100)', 101, true],
    ['100 (boundary)', 100, false],
  ])(
    'should validate when per_page is %s',
    async (_label, value, expectError) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ per_page: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'per_page')).toBe(expectError);
    },
  );

  // ─── sort_by (String, whitelist) ────────────────────────────────────────
  it('should pass when sort_by is a documented allow-listed column', async () => {
    for (const v of [
      'kanri_shiten_id',
      'shiten_id',
      'kumiaiin_code',
      'hanbaiten_id',
      'shoki_dokusya_kaishi_date',
      'dokusya_chushi_date',
      'updated_at',
    ]) {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ sort_by: v }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'sort_by')).toBe(false);
    }
  });

  it('should fail when sort_by is not in the documented allow-list', async () => {
    const dto = plainToInstance(
      SearchDokusyaDto,
      buildSearchDokusyaQuery({ sort_by: 'password_hash' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sort_by')).toBe(true);
  });

  // ─── sort_order (String, 'asc' | 'desc') ────────────────────────────────
  it.each([
    ['"asc"', 'asc', false],
    ['"desc"', 'desc', false],
    ['neither asc nor desc', 'random', true],
  ])(
    'should validate when sort_order is %s',
    async (_label, value, expectError) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ sort_order: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'sort_order')).toBe(expectError);
    },
  );

  // ─── active_tanka_flg (Boolean トライステート — 有効単価フラグ) ──────────────
  it.each(['1', 'true', true])(
    'should transform active_tanka_flg=%p to boolean true (有効単価のみ)',
    async (value) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ active_tanka_flg: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'active_tanka_flg')).toBe(false);
      expect(dto.active_tanka_flg).toBe(true);
    },
  );

  it.each(['0', 'false', false])(
    'should transform active_tanka_flg=%p to boolean false (失効単価のみ)',
    async (value) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ active_tanka_flg: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'active_tanka_flg')).toBe(false);
      expect(dto.active_tanka_flg).toBe(false);
    },
  );

  it.each(['', undefined])(
    'should treat active_tanka_flg=%p as unset (undefined → 両方)',
    async (value) => {
      const dto = plainToInstance(
        SearchDokusyaDto,
        buildSearchDokusyaQuery({ active_tanka_flg: value }),
      );
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'active_tanka_flg')).toBe(false);
      expect(dto.active_tanka_flg).toBeUndefined();
    },
  );
});
