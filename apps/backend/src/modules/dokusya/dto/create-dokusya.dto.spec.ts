// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Drives src/modules/dokusya/dto/create-dokusya.dto.ts (to be generated).
// One test per row in api.md §API-011-002 リクエストパラメータ +
// §4.1 リクエストのバリデーション.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateDokusyaDto } from '@/modules/dokusya/dto/create-dokusya.dto';
import { buildCreateDokusyaBody } from '@test/fixtures/dokusya.factory';

describe('CreateDokusyaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when all required + optional fields are provided', async () => {
    const dto = plainToInstance(CreateDokusyaDto, buildCreateDokusyaBody());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── shimei_sei (String, required, max 50) ──────────────────────────────
  it('should fail when shimei_sei is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_sei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  it('should fail when shimei_sei is empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_sei: '' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  it('should fail when shimei_sei exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_sei: 'あ'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  // ─── shimei_mei (String, required, max 50) ──────────────────────────────
  it('should fail when shimei_mei is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_mei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_mei')).toBe(true);
  });

  it('should fail when shimei_mei exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_mei: 'あ'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_mei')).toBe(true);
  });

  // ─── shimei_kana_sei (String, required, max 100) ────────────────────────
  it('should fail when shimei_kana_sei is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_kana_sei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana_sei')).toBe(true);
  });

  it('should fail when shimei_kana_sei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_kana_sei: 'ア'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana_sei')).toBe(true);
  });

  // ─── shimei_kana_mei (String, required, max 100) ────────────────────────
  it('should fail when shimei_kana_mei is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shimei_kana_mei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana_mei')).toBe(true);
  });

  // ─── dokusya_shubetsu (Number, required) ────────────────────────────────
  it('should fail when dokusya_shubetsu is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_shubetsu: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
  });

  it('should fail when dokusya_shubetsu is non-numeric', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_shubetsu: 'abc' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
  });

  // ─── tetsuzuki_shurui (Number, required) ────────────────────────────────
  it('should fail when tetsuzuki_shurui is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ tetsuzuki_shurui: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tetsuzuki_shurui')).toBe(true);
  });

  // ─── dokusya_busu (Number, required, 0 is valid for 解約) ───────────────
  it('should fail when dokusya_busu is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_busu: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_busu')).toBe(true);
  });

  it('should accept dokusya_busu=0 (解約時)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_busu: 0, tetsuzuki_shurui: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'dokusya_busu')).toHaveLength(0);
  });

  // ─── yubin_no (String, required, 7 digits exactly) ──────────────────────
  it('should fail when yubin_no is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_no: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when yubin_no length is less than 7', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_no: '123456' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when yubin_no length is more than 7', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_no: '12345678' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when yubin_no contains non-digit characters', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_no: 'ABCDEFG' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  // ─── todofuken_code (String, required, length 2) ────────────────────────
  it('should fail when todofuken_code is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ todofuken_code: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
  });

  it('should fail when todofuken_code is more than 2 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ todofuken_code: '999' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
  });

  // ─── shikuchoson (String, required, max 100) ────────────────────────────
  it('should fail when shikuchoson is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shikuchoson: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shikuchoson')).toBe(true);
  });

  it('should fail when shikuchoson exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shikuchoson: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shikuchoson')).toBe(true);
  });

  // ─── chome_banchi (String, required, max 100) ───────────────────────────
  it('should fail when chome_banchi is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ chome_banchi: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'chome_banchi')).toBe(true);
  });

  // ─── tatemono_mei (String, optional, max 100) ───────────────────────────
  it('should accept tatemono_mei as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ tatemono_mei: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'tatemono_mei')).toHaveLength(0);
  });

  it('should fail when tatemono_mei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ tatemono_mei: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tatemono_mei')).toBe(true);
  });

  // ─── renrakusaki_1 (String, required, max 15, digits) ───────────────────
  it('should fail when renrakusaki_1 is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ renrakusaki_1: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'renrakusaki_1')).toBe(true);
  });

  it('should fail when renrakusaki_1 exceeds 15 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ renrakusaki_1: '0'.repeat(16) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'renrakusaki_1')).toBe(true);
  });

  // ─── renrakusaki_2 (String, optional, max 15) ───────────────────────────
  it('should accept renrakusaki_2 as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ renrakusaki_2: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'renrakusaki_2')).toHaveLength(0);
  });

  // ─── email (String, optional, max 100, email format) ────────────────────
  it('should accept email as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ email: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'email')).toHaveLength(0);
  });

  it('should fail when email format is invalid', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ email: 'not-an-email' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when email exceeds 100 chars', async () => {
    const longLocal = 'a'.repeat(90);
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ email: `${longLocal}@example.com` }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  // ─── haitatsu_same_flg (Boolean, required) ──────────────────────────────
  it('should fail when haitatsu_same_flg is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ haitatsu_same_flg: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_same_flg')).toBe(true);
  });

  it('should accept haitatsu_same_flg=false', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({
        haitatsu_same_flg: false,
        haitatsu_yubin_no: '1000002',
        haitatsu_todofuken_code: '13',
        haitatsu_shikuchoson: '中央区',
        haitatsu_chome_banchi: '銀座1-1',
        haitatsu_shimei_sei: '山田',
        haitatsu_shimei_mei: '太郎',
        haitatsu_shimei_kana_sei: 'ヤマダ',
        haitatsu_shimei_kana_mei: 'タロウ',
      }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'haitatsu_same_flg')).toHaveLength(0);
  });

  // ─── 配達先 conditional-required (機能定義 §9.2) ─────────────────────────
  it('should require all 配達先 address + name fields when haitatsu_same_flg=false and 紙版', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({
        dokusya_shubetsu: 1,
        haitatsu_same_flg: false,
        haitatsu_yubin_no: '',
        haitatsu_todofuken_code: '',
        haitatsu_shikuchoson: '',
        haitatsu_chome_banchi: '',
        haitatsu_shimei_sei: '',
        haitatsu_shimei_mei: '',
        haitatsu_shimei_kana_sei: '',
        haitatsu_shimei_kana_mei: '',
      }),
    );
    const props = (await validate(dto)).map((e) => e.property);
    for (const field of [
      'haitatsu_yubin_no',
      'haitatsu_todofuken_code',
      'haitatsu_shikuchoson',
      'haitatsu_chome_banchi',
      'haitatsu_shimei_sei',
      'haitatsu_shimei_mei',
      'haitatsu_shimei_kana_sei',
      'haitatsu_shimei_kana_mei',
    ]) {
      expect(props).toContain(field);
    }
  });

  it('should NOT require 配達先 fields when haitatsu_same_flg=true (購読者情報と同じ)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({
        haitatsu_same_flg: true,
        haitatsu_yubin_no: '',
        haitatsu_todofuken_code: '',
        haitatsu_shikuchoson: '',
        haitatsu_chome_banchi: '',
        haitatsu_shimei_sei: '',
        haitatsu_shimei_mei: '',
        haitatsu_shimei_kana_sei: '',
        haitatsu_shimei_kana_mei: '',
      }),
    );
    const haitatsuErrs = (await validate(dto)).filter(
      (e) => e.property.startsWith('haitatsu_') && e.property !== 'haitatsu_same_flg',
    );
    expect(haitatsuErrs).toHaveLength(0);
  });

  it('should NOT require 配達先 fields when 電子版 (dokusya_shubetsu=2) even if haitatsu_same_flg=false', async () => {
    // 電子版/併読 → 配達先セクション非表示 (機能定義 §7) のため検証しない。
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({
        dokusya_shubetsu: 2,
        haitatsu_same_flg: false,
        haitatsu_yubin_no: '',
        haitatsu_todofuken_code: '',
        haitatsu_shikuchoson: '',
        haitatsu_chome_banchi: '',
        haitatsu_shimei_sei: '',
        haitatsu_shimei_mei: '',
        haitatsu_shimei_kana_sei: '',
        haitatsu_shimei_kana_mei: '',
      }),
    );
    const haitatsuErrs = (await validate(dto)).filter(
      (e) => e.property.startsWith('haitatsu_') && e.property !== 'haitatsu_same_flg',
    );
    expect(haitatsuErrs).toHaveLength(0);
  });

  // ─── shiten_id (Number, required) ───────────────────────────────────────
  it('should fail when shiten_id is missing (支店は必須)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shiten_id: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiten_id')).toBe(true);
  });

  // ─── hanbaiten_id (Number, required) ────────────────────────────────────
  it('should fail when hanbaiten_id is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ hanbaiten_id: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(true);
  });

  // ─── tanka_id (Number, required) ────────────────────────────────────────
  it('should fail when tanka_id is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ tanka_id: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_id')).toBe(true);
  });

  // ─── yubin_kubun (String, optional, length 1) ───────────────────────────
  it('should accept yubin_kubun="0" (空)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_kubun: '0' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'yubin_kubun')).toHaveLength(0);
  });

  it('should accept yubin_kubun="1" (郵送)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_kubun: '1' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'yubin_kubun')).toHaveLength(0);
  });

  it('should fail when yubin_kubun length is more than 1', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ yubin_kubun: '01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_kubun')).toBe(true);
  });

  // ─── shiharai_hoho (Number, required) ───────────────────────────────────
  it('should fail when shiharai_hoho is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ shiharai_hoho: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_hoho')).toBe(true);
  });

  // ─── dokusya_kaishi_date (String YYYY/MM/DD or YYYY-MM-DD, required) ─────
  it('should fail when dokusya_kaishi_date is missing', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_kaishi_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(true);
  });

  it('should accept dokusya_kaishi_date in YYYY/MM/DD (slash) — picker display format', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_kaishi_date: '2026/04/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(false);
  });

  it('should accept dokusya_kaishi_date in YYYY-MM-DD (hyphen / ISO)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_kaishi_date: '2026-04-01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(false);
  });

  it('should fail when dokusya_kaishi_date is non-date garbage', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_kaishi_date: 'not-a-date' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(true);
  });

  // ─── dokusya_chushi_date (optional, YYYY-MM-DD) ─────────────────────────
  it('should accept dokusya_chushi_date as null', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusya_chushi_date: null }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'dokusya_chushi_date')).toHaveLength(0);
  });

  // ─── joho_henko_tekiyo_date (optional, future date) ─────────────────────
  it('should accept joho_henko_tekiyo_date as null', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ joho_henko_tekiyo_date: null }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'joho_henko_tekiyo_date')).toHaveLength(0);
  });

  it('should accept joho_henko_tekiyo_date in YYYY/MM/DD (slash) at the DTO layer', async () => {
    // Format-only check here; the future-date rule lives in the service.
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ joho_henko_tekiyo_date: '2026/04/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'joho_henko_tekiyo_date')).toBe(false);
  });

  it('should fail when joho_henko_tekiyo_date is non-date garbage', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ joho_henko_tekiyo_date: '2026.04.01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'joho_henko_tekiyo_date')).toBe(true);
  });

  // ─── seikyu_kaishi_month (String, optional, YYYYMM, max 6) ──────────────
  it('should accept seikyu_kaishi_month as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ seikyu_kaishi_month: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'seikyu_kaishi_month')).toHaveLength(0);
  });

  it('should fail when seikyu_kaishi_month exceeds 6 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ seikyu_kaishi_month: '2026045' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'seikyu_kaishi_month')).toBe(true);
  });

  // ─── kumiaiin_code (String, optional, max 20) ───────────────────────────
  it('should accept kumiaiin_code as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ kumiaiin_code: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'kumiaiin_code')).toHaveLength(0);
  });

  it('should fail when kumiaiin_code exceeds 20 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ kumiaiin_code: 'K'.repeat(21) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(true);
  });

  // ─── biko (String, optional, max 500) ───────────────────────────────────
  it('should accept biko as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ biko: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  it('should fail when biko exceeds 500 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ biko: 'あ'.repeat(501) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'biko')).toBe(true);
  });

  // ─── hikiotoshi_koza_no (String, optional, max 10) ──────────────────────
  it('should fail when hikiotoshi_koza_no exceeds 10 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ hikiotoshi_koza_no: '12345678901' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hikiotoshi_koza_no')).toBe(true);
  });

  // ─── hikiotoshi_koza_meigi (String, optional, max 50) ───────────────────
  it('should fail when hikiotoshi_koza_meigi exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ hikiotoshi_koza_meigi: 'ア'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hikiotoshi_koza_meigi')).toBe(true);
  });

  // ─── dokusyaso_bunrui (String, optional, max 50) ────────────────────────
  it('should accept dokusyaso_bunrui as empty string', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusyaso_bunrui: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'dokusyaso_bunrui')).toHaveLength(0);
  });

  it('should fail when dokusyaso_bunrui exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusyaso_bunrui: 'X'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusyaso_bunrui')).toBe(true);
  });

  // ─── nogyosya_bunrui (String, optional, max 50) ─────────────────────────
  it('should fail when nogyosya_bunrui exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ nogyosya_bunrui: 'X'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nogyosya_bunrui')).toBe(true);
  });

  // ─── haitatsu_* delivery-address cluster (max lengths) ──────────────────
  it('should fail when haitatsu_yubin_no exceeds 7 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ haitatsu_yubin_no: '12345678' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_yubin_no')).toBe(true);
  });

  it('should fail when haitatsu_shimei_sei exceeds 50 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ haitatsu_shimei_sei: 'X'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_shimei_sei')).toBe(true);
  });

  it('should fail when haitatsu_shimei_kana_sei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ haitatsu_shimei_kana_sei: 'ア'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_shimei_kana_sei')).toBe(true);
  });

  it('should fail when haitatsu_shikuchoson exceeds 100 chars', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ haitatsu_shikuchoson: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_shikuchoson')).toBe(true);
  });

  // ─── dokusyaryo_shiharai_cycle (Number, optional, max 2 digits) ─────────
  it('should accept dokusyaryo_shiharai_cycle omitted (optional)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ dokusyaryo_shiharai_cycle: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'dokusyaryo_shiharai_cycle')).toHaveLength(0);
  });

  // ─── ja_id MUST NOT appear in DTO (security) ────────────────────────────
  it('should reject ja_id in body via forbidNonWhitelisted (set server-side from session)', async () => {
    const dto = plainToInstance(
      CreateDokusyaDto,
      buildCreateDokusyaBody({ ja_id: 99 } as any),
    );
    // Field is not declared on the DTO → with whitelist:true + forbidNonWhitelisted,
    // ValidationPipe rejects. At the DTO unit-validate level we just assert
    // the field was stripped (or yields validation error) — the controller
    // spec verifies the 400 response shape.
    const stripped = !('ja_id' in (dto as any));
    expect(stripped || (await validate(dto)).some((e) => e.property === 'ja_id')).toBe(true);
  });
});
