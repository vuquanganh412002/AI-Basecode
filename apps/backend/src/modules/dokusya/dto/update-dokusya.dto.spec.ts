// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Drives src/modules/dokusya/dto/update-dokusya.dto.ts (to be generated).
// Per api.md §API-011-003: "リクエストボディはACSMS-API-011-002と同一構造。
// dokusya_id は変更不可（URLから取得）". So UpdateDokusyaDto mirrors
// CreateDokusyaDto exactly — same field set, same validators — minus the
// `dokusya_id` (which lives on the URL path).

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UpdateDokusyaDto } from '@/modules/dokusya/dto/update-dokusya.dto';
import { buildUpdateDokusyaBody } from '@test/fixtures/dokusya.factory';

describe('UpdateDokusyaDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when all required + optional fields are provided', async () => {
    const dto = plainToInstance(UpdateDokusyaDto, buildUpdateDokusyaBody());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── shimei_sei (String, required, max 50) ──────────────────────────────
  it('should fail when shimei_sei is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_sei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  it('should fail when shimei_sei is empty string', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_sei: '' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  it('should fail when shimei_sei exceeds 50 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_sei: 'あ'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_sei')).toBe(true);
  });

  // ─── shimei_mei (String, required) ──────────────────────────────────────
  it('should fail when shimei_mei is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_mei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_mei')).toBe(true);
  });

  // ─── shimei_kana_sei / shimei_kana_mei ──────────────────────────────────
  it('should fail when shimei_kana_sei is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_kana_sei: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana_sei')).toBe(true);
  });

  it('should fail when shimei_kana_mei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shimei_kana_mei: 'ア'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shimei_kana_mei')).toBe(true);
  });

  // ─── dokusya_shubetsu (Number, required) ────────────────────────────────
  it('should fail when dokusya_shubetsu is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_shubetsu: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
  });

  // ─── tetsuzuki_shurui (Number, required) ────────────────────────────────
  it('should fail when tetsuzuki_shurui is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ tetsuzuki_shurui: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tetsuzuki_shurui')).toBe(true);
  });

  // ─── dokusya_busu (Number, required) ────────────────────────────────────
  it('should fail when dokusya_busu is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_busu: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_busu')).toBe(true);
  });

  it('should accept dokusya_busu=0 (解約時)', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_busu: 0, tetsuzuki_shurui: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'dokusya_busu')).toHaveLength(0);
  });

  // ─── yubin_no (String, required, 7 digits) ──────────────────────────────
  it('should fail when yubin_no is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ yubin_no: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when yubin_no length is not 7', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ yubin_no: '123' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when yubin_no contains non-digit characters', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ yubin_no: 'ABCDEFG' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  // ─── todofuken_code (String, required, length 2) ────────────────────────
  it('should fail when todofuken_code is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ todofuken_code: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
  });

  // ─── shikuchoson / chome_banchi ─────────────────────────────────────────
  it('should fail when shikuchoson is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shikuchoson: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shikuchoson')).toBe(true);
  });

  it('should fail when chome_banchi exceeds 100 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ chome_banchi: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'chome_banchi')).toBe(true);
  });

  // ─── renrakusaki_1 (String, required, max 15) ───────────────────────────
  it('should fail when renrakusaki_1 is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ renrakusaki_1: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'renrakusaki_1')).toBe(true);
  });

  // ─── email (optional, format check) ─────────────────────────────────────
  it('should accept email as empty string', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ email: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'email')).toHaveLength(0);
  });

  it('should fail when email format is invalid', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ email: 'not-an-email' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  // ─── haitatsu_same_flg (required) ───────────────────────────────────────
  it('should fail when haitatsu_same_flg is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ haitatsu_same_flg: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'haitatsu_same_flg')).toBe(true);
  });

  // ─── hanbaiten_id / tanka_id (Number, required) ─────────────────────────
  it('should fail when hanbaiten_id is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ hanbaiten_id: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_id')).toBe(true);
  });

  it('should fail when tanka_id is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ tanka_id: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tanka_id')).toBe(true);
  });

  // ─── yubin_kubun (optional, length 1) ───────────────────────────────────
  it('should accept yubin_kubun="0"', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ yubin_kubun: '0' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'yubin_kubun')).toHaveLength(0);
  });

  it('should fail when yubin_kubun length exceeds 1', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ yubin_kubun: '01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'yubin_kubun')).toBe(true);
  });

  // ─── shiharai_hoho (required) ───────────────────────────────────────────
  it('should fail when shiharai_hoho is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ shiharai_hoho: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shiharai_hoho')).toBe(true);
  });

  // ─── dokusya_kaishi_date (YYYY-MM-DD, required) ─────────────────────────
  it('should fail when dokusya_kaishi_date is missing', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_kaishi_date: undefined }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(true);
  });

  it('should fail when dokusya_kaishi_date format is YYYY/MM/DD', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_kaishi_date: '2026/04/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_kaishi_date')).toBe(true);
  });

  // ─── joho_henko_tekiyo_date (optional) ──────────────────────────────────
  it('should accept joho_henko_tekiyo_date as null', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ joho_henko_tekiyo_date: null }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'joho_henko_tekiyo_date')).toHaveLength(0);
  });

  it('should fail when joho_henko_tekiyo_date format is invalid', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ joho_henko_tekiyo_date: '2026/04/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'joho_henko_tekiyo_date')).toBe(true);
  });

  // ─── seikyu_kaishi_month (optional, max 6) ──────────────────────────────
  it('should accept seikyu_kaishi_month as empty string', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ seikyu_kaishi_month: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'seikyu_kaishi_month')).toHaveLength(0);
  });

  it('should fail when seikyu_kaishi_month exceeds 6 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ seikyu_kaishi_month: '2026045' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'seikyu_kaishi_month')).toBe(true);
  });

  // ─── biko (optional, max 500) ───────────────────────────────────────────
  it('should accept biko as empty string', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ biko: '' }),
    );
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'biko')).toHaveLength(0);
  });

  it('should fail when biko exceeds 500 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ biko: 'あ'.repeat(501) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'biko')).toBe(true);
  });

  // ─── hikiotoshi_koza_no / hikiotoshi_koza_meigi ─────────────────────────
  it('should fail when hikiotoshi_koza_no exceeds 10 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ hikiotoshi_koza_no: '12345678901' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hikiotoshi_koza_no')).toBe(true);
  });

  it('should fail when hikiotoshi_koza_meigi exceeds 50 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ hikiotoshi_koza_meigi: 'ア'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hikiotoshi_koza_meigi')).toBe(true);
  });

  // ─── dokusyaso_bunrui / nogyosya_bunrui ─────────────────────────────────
  it('should fail when dokusyaso_bunrui exceeds 50 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusyaso_bunrui: 'X'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusyaso_bunrui')).toBe(true);
  });

  it('should fail when nogyosya_bunrui exceeds 50 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ nogyosya_bunrui: 'X'.repeat(51) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nogyosya_bunrui')).toBe(true);
  });

  // ─── tatemono_mei (optional, max 100) ───────────────────────────────────
  it('should fail when tatemono_mei exceeds 100 chars', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ tatemono_mei: 'あ'.repeat(101) }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tatemono_mei')).toBe(true);
  });

  // ─── ja_id / dokusya_id MUST NOT be on UpdateDokusyaDto ─────────────────
  it('should reject ja_id in body (set server-side from session, immutable)', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ ja_id: 99 } as any),
    );
    const stripped = !('ja_id' in (dto as any));
    expect(stripped || (await validate(dto)).some((e) => e.property === 'ja_id')).toBe(true);
  });

  it('should reject dokusya_id in body (URL path param is the source of truth)', async () => {
    const dto = plainToInstance(
      UpdateDokusyaDto,
      buildUpdateDokusyaBody({ dokusya_id: 9999 } as any),
    );
    const stripped = !('dokusya_id' in (dto as any));
    expect(
      stripped || (await validate(dto)).some((e) => e.property === 'dokusya_id'),
    ).toBe(true);
  });
});
