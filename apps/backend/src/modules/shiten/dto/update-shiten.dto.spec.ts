// Screen: ACSMS-SCR-007 — 支店マスタ登録画面 (update mode)
//
// UpdateShitenDto drops shiten_code per api.md §ACSMS-API-007-003 注記
// (shiten_code is immutable after create — disabled on FE).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateShitenDto } from './update-shiten.dto';

const VALID = {
  shiten_name: '本店営業部（名称変更）',
  shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
  kanri_shiten_id: 1,
  kinyu_shiten_flg: true,
  // kinyu_shiten_flg=true なので JASTEM 4項目は必須（半角）。
  jastem_toriatsukai_tenpo_code: '001',
  jastem_tenpo_name: 'ﾎﾝﾃﾝ',
  jastem_tyokin_shubetsu: '1',
  jastem_koza_no: '1234567',
  biko: '本店ビル1F 改装済み',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(UpdateShitenDto, input));
}

describe('UpdateShitenDto', () => {
  it('should accept fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should reject when shiten_name is missing (required per §4.1)', async () => {
    const errs = await check({ ...VALID, shiten_name: undefined });
    expect(errs.some((e) => e.property === 'shiten_name')).toBe(true);
  });

  it('should reject when shiten_name exceeds 100 chars', async () => {
    const errs = await check({ ...VALID, shiten_name: 'あ'.repeat(101) });
    expect(errs.some((e) => e.property === 'shiten_name')).toBe(true);
  });

  it('should reject when kanri_shiten_id is missing (required per §4.1)', async () => {
    const errs = await check({ ...VALID, kanri_shiten_id: undefined });
    expect(errs.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
  });

  it('should accept when optional fields are omitted', async () => {
    const minimal = {
      shiten_name: VALID.shiten_name,
      kanri_shiten_id: VALID.kanri_shiten_id,
    };
    expect(await check(minimal)).toHaveLength(0);
  });

  it('should accept when biko is empty string', async () => {
    const errs = await check({ ...VALID, biko: '' });
    expect(errs.some((e) => e.property === 'biko')).toBe(false);
  });

  it('should reject shiten_name_kana when value contains full-width katakana', async () => {
    // Downstream Zengin CSV / PDF exports require half-width katakana.
    const errs = await check({ ...VALID, shiten_name_kana: 'ホンテンエイギョウブ' });
    const kanaErr = errs.find((e) => e.property === 'shiten_name_kana');
    expect(kanaErr).toBeDefined();
    expect(Object.values(kanaErr!.constraints ?? {})).toContain(
      '支店名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });

  // ─── JASTEM conditional-required (金融機関支店フラグ=true) ───────────────
  it('should require the 4 JASTEM fields with 必須項目です。 when kinyu_shiten_flg=true and they are blank', async () => {
    const errs = await check({
      shiten_name: '本店',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: true,
      jastem_toriatsukai_tenpo_code: '',
      jastem_tenpo_name: '',
      jastem_tyokin_shubetsu: '',
      jastem_koza_no: '',
    });
    for (const field of [
      'jastem_toriatsukai_tenpo_code',
      'jastem_tenpo_name',
      'jastem_tyokin_shubetsu',
      'jastem_koza_no',
    ]) {
      const e = errs.find((x) => x.property === field);
      expect(e?.constraints?.isNotEmpty).toBe('必須項目です。');
    }
  });

  it('should NOT require the JASTEM fields when kinyu_shiten_flg=false', async () => {
    const errs = await check({
      shiten_name: '本店',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: false,
    });
    expect(errs).toHaveLength(0);
  });

  // Note: `shiten_code` is not declared on this DTO, so smuggled values
  // would be rejected at the ValidationPipe (forbidNonWhitelisted: true).
  // That's a pipe-level concern, not a class-level one — tests covering
  // it belong in controller.spec.ts via supertest.
});
