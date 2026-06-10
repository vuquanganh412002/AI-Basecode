// Screen: ACSMS-SCR-007 — 支店マスタ登録画面
//
// CreateShitenDto validation tests per api.md §API-007-002 §リクエストパラメータ.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShitenDto } from './create-shiten.dto';

const VALID = {
  shiten_code: '123',
  shiten_name: '本店営業部',
  shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
  kanri_shiten_id: 1,
  kinyu_shiten_flg: false,
  biko: '本店ビル1F',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(CreateShitenDto, input));
}

describe('CreateShitenDto', () => {
  it('should accept fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('shiten_code (required, 半角数字3桁固定)', () => {
    it('should reject when shiten_code is missing', async () => {
      const errs = await check({ ...VALID, shiten_code: undefined });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(true);
    });

    it('should reject when shiten_code is empty string', async () => {
      const errs = await check({ ...VALID, shiten_code: '' });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(true);
    });

    it('should reject when shiten_code is shorter than 3 chars', async () => {
      const errs = await check({ ...VALID, shiten_code: '12' });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(true);
    });

    it('should reject when shiten_code is longer than 3 chars', async () => {
      const errs = await check({ ...VALID, shiten_code: '1234' });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(true);
    });

    it('should reject when shiten_code contains non-digit characters', async () => {
      const errs = await check({ ...VALID, shiten_code: 'S01' });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(true);
    });

    it('should accept when shiten_code is exactly 3 half-width digits', async () => {
      const errs = await check({ ...VALID, shiten_code: '001' });
      expect(errs.some((e) => e.property === 'shiten_code')).toBe(false);
    });
  });

  describe('shiten_name (required, max 100)', () => {
    it('should reject when shiten_name is missing', async () => {
      const errs = await check({ ...VALID, shiten_name: undefined });
      expect(errs.some((e) => e.property === 'shiten_name')).toBe(true);
    });

    it('should reject when shiten_name exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, shiten_name: 'あ'.repeat(101) });
      expect(errs.some((e) => e.property === 'shiten_name')).toBe(true);
    });

    it('should accept full-width characters in shiten_name', async () => {
      const errs = await check({ ...VALID, shiten_name: '本店 中央 支店' });
      expect(errs.some((e) => e.property === 'shiten_name')).toBe(false);
    });
  });

  describe('shiten_name_kana (optional, max 100, 半角カタカナ)', () => {
    it('should accept when omitted', async () => {
      const { shiten_name_kana: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'shiten_name_kana')).toBe(false);
    });

    it('should reject when exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, shiten_name_kana: 'ｱ'.repeat(101) });
      expect(errs.some((e) => e.property === 'shiten_name_kana')).toBe(true);
    });

    it('should reject when value contains full-width katakana', async () => {
      // Downstream Zengin CSV / PDF exports require half-width katakana.
      const errs = await check({ ...VALID, shiten_name_kana: 'ホンテンエイギョウブ' });
      const kanaErr = errs.find((e) => e.property === 'shiten_name_kana');
      expect(kanaErr).toBeDefined();
      expect(Object.values(kanaErr!.constraints ?? {})).toContain(
        '支店名(カナ)は半角カタカナ・半角数字で入力してください。',
      );
    });

    it('should reject when value contains hiragana', async () => {
      const errs = await check({ ...VALID, shiten_name_kana: 'ほんてん' });
      expect(errs.some((e) => e.property === 'shiten_name_kana')).toBe(true);
    });

    it('should reject when value contains Latin characters', async () => {
      const errs = await check({ ...VALID, shiten_name_kana: 'Honten' });
      expect(errs.some((e) => e.property === 'shiten_name_kana')).toBe(true);
    });

    it('should accept when value is half-width katakana with prolonged-mark and dakuten', async () => {
      const errs = await check({ ...VALID, shiten_name_kana: 'ﾄｳｷｮｳｼﾃﾝ ｶｲｼｮｳ' });
      expect(errs.some((e) => e.property === 'shiten_name_kana')).toBe(false);
    });
  });

  describe('kanri_shiten_id (required, number)', () => {
    it('should reject when kanri_shiten_id is missing', async () => {
      const errs = await check({ ...VALID, kanri_shiten_id: undefined });
      expect(errs.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
    });

    it('should reject when kanri_shiten_id is not a number', async () => {
      const errs = await check({ ...VALID, kanri_shiten_id: 'abc' });
      expect(errs.some((e) => e.property === 'kanri_shiten_id')).toBe(true);
    });
  });

  describe('kinyu_shiten_flg (optional boolean)', () => {
    it('should accept when omitted (defaults via @IsOptional)', async () => {
      const { kinyu_shiten_flg: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'kinyu_shiten_flg')).toBe(false);
    });

    it('should reject when kinyu_shiten_flg is not a boolean', async () => {
      const errs = await check({ ...VALID, kinyu_shiten_flg: 'yes' });
      expect(errs.some((e) => e.property === 'kinyu_shiten_flg')).toBe(true);
    });
  });

  describe('biko (optional, string)', () => {
    it('should accept when biko is omitted', async () => {
      const { biko: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'biko')).toBe(false);
    });

    it('should accept when biko is empty string', async () => {
      const errs = await check({ ...VALID, biko: '' });
      expect(errs.some((e) => e.property === 'biko')).toBe(false);
    });
  });
});
