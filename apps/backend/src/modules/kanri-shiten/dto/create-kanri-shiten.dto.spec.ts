// Screen: ACSMS-SCR-009 — 管理支店マスタ登録画面

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateKanriShitenDto } from './create-kanri-shiten.dto';

const VALID = {
  ja_id: 1,
  kanri_shiten_code: '113-3300-002',
  kanri_shiten_name: '東京第二支店',
  kanri_shiten_name_kana: 'ﾄｳｷｮｳﾀﾞｲﾆｼﾃﾝ',
  todofuken_code: '13',
  yubin_no: '1000002',
  address: '千代田区千代田2-2-2',
  tel: '0312345680',
  fax: '0312345681',
  paper_flg: true,
  denshi_flg: true,
  biko: '備考',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(CreateKanriShitenDto, input));
}

describe('CreateKanriShitenDto', () => {
  it('should accept fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('ja_id (required, number)', () => {
    it('should reject when ja_id is missing', async () => {
      const errs = await check({ ...VALID, ja_id: undefined });
      expect(errs.some((e) => e.property === 'ja_id')).toBe(true);
    });

    it('should reject when ja_id is not a number', async () => {
      const errs = await check({ ...VALID, ja_id: 'abc' });
      expect(errs.some((e) => e.property === 'ja_id')).toBe(true);
    });
  });

  describe('kanri_shiten_code (required, format XXX-XXXX-XXX alphanumeric)', () => {
    it('should reject when kanri_shiten_code is missing', async () => {
      const errs = await check({ ...VALID, kanri_shiten_code: undefined });
      expect(errs.some((e) => e.property === 'kanri_shiten_code')).toBe(true);
    });

    it.each([
      ['canonical dashed shape (XXX-XXXX-XXX) unchanged', '113-3300-002'],
      ['bare 10 alphanumeric (digits) chars via @Transform', '1133300002'],
      ['surrounding whitespace trimmed before normalising', '  1133300002  '],
    ])(
      'should accept and normalise kanri_shiten_code to 113-3300-002 — %s',
      async (_label, input) => {
        const dto = plainToInstance(CreateKanriShitenDto, {
          ...VALID,
          kanri_shiten_code: input,
        });
        expect(await validate(dto)).toHaveLength(0);
        expect(dto.kanri_shiten_code).toBe('113-3300-002');
      },
    );

    // digits-only per customer spec (2026-05-19); only bare digits normalise.
    it.each([
      ['mixed letters + digits in the canonical shape', 'abc-1234-XYZ'],
      ['bare 10 mixed alphanumeric chars', 'abc1234XYZ'],
      ['length is 9 alphanumeric chars (too short, cannot normalise)', '113330000'],
      ['length is 11 alphanumeric chars (too long, cannot normalise)', '11333000123'],
      ['contains non-alphanumeric characters', '113_3300_002'],
      ['dashed groups have the wrong widths (e.g. 4-3-3)', '1133-300-002'],
    ])('should reject when kanri_shiten_code %s', async (_label, code) => {
      const errs = await check({ ...VALID, kanri_shiten_code: code });
      expect(errs.some((e) => e.property === 'kanri_shiten_code')).toBe(true);
    });
  });

  describe('kanri_shiten_name (required, max 100)', () => {
    it('should reject when kanri_shiten_name is missing', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name: undefined });
      expect(errs.some((e) => e.property === 'kanri_shiten_name')).toBe(true);
    });

    it('should reject when kanri_shiten_name exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name: 'あ'.repeat(101) });
      expect(errs.some((e) => e.property === 'kanri_shiten_name')).toBe(true);
    });

    it('should accept full-width characters in kanri_shiten_name (no half-width constraint per customer review)', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name: '東京 中央 支店' });
      expect(errs.some((e) => e.property === 'kanri_shiten_name')).toBe(false);
    });
  });

  describe('kanri_shiten_name_kana (optional, max 100)', () => {
    it('should accept when omitted', async () => {
      const { kanri_shiten_name_kana: _drop, ...without } = VALID;
      const errs = await check(without);
      expect(errs.some((e) => e.property === 'kanri_shiten_name_kana')).toBe(false);
    });

    it('should reject when exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name_kana: 'ｱ'.repeat(101) });
      expect(errs.some((e) => e.property === 'kanri_shiten_name_kana')).toBe(true);
    });

    it('should reject when contains full-width katakana', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name_kana: 'トウキョウ' });
      expect(errs.some((e) => e.property === 'kanri_shiten_name_kana')).toBe(true);
    });

    it('should reject when contains hiragana', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name_kana: 'とうきょう' });
      expect(errs.some((e) => e.property === 'kanri_shiten_name_kana')).toBe(true);
    });

    it('should accept half-width katakana with dakuten and chouonpu', async () => {
      const errs = await check({ ...VALID, kanri_shiten_name_kana: 'ﾄﾞｳｸﾞｰ' });
      expect(errs.some((e) => e.property === 'kanri_shiten_name_kana')).toBe(false);
    });
  });

  describe('todofuken_code (required, length 2)', () => {
    it('should reject when todofuken_code is missing', async () => {
      const errs = await check({ ...VALID, todofuken_code: undefined });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should reject when todofuken_code is not exactly 2 chars', async () => {
      const errs = await check({ ...VALID, todofuken_code: '1' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should reject when todofuken_code exceeds 2 chars', async () => {
      const errs = await check({ ...VALID, todofuken_code: '012' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
    });
  });

  describe('yubin_no (optional, 7 digits)', () => {
    it('should accept when omitted (or empty)', async () => {
      const { yubin_no: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'yubin_no')).toBe(false);
      // Empty string should be coerced to undefined via blankToUndef.
      expect((await check({ ...VALID, yubin_no: '' })).some((e) => e.property === 'yubin_no')).toBe(false);
    });

    it('should reject when yubin_no is not 7 digits', async () => {
      const errs = await check({ ...VALID, yubin_no: '12345' });
      expect(errs.some((e) => e.property === 'yubin_no')).toBe(true);
    });

    it('should reject when yubin_no contains non-digits', async () => {
      const errs = await check({ ...VALID, yubin_no: '100-0001' });
      expect(errs.some((e) => e.property === 'yubin_no')).toBe(true);
    });
  });

  describe('tel / fax (optional, half-width digits, max 15)', () => {
    it('should accept when tel is omitted or empty', async () => {
      expect((await check({ ...VALID, tel: '' })).some((e) => e.property === 'tel')).toBe(false);
    });

    it('should reject when tel contains non-digit characters', async () => {
      const errs = await check({ ...VALID, tel: '03-1234-5678' });
      expect(errs.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should reject when tel exceeds 15 chars', async () => {
      const errs = await check({ ...VALID, tel: '0'.repeat(16) });
      expect(errs.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should reject when fax contains non-digit characters', async () => {
      const errs = await check({ ...VALID, fax: '03-1234-5679' });
      expect(errs.some((e) => e.property === 'fax')).toBe(true);
    });
  });

  describe('biko (optional, max 500)', () => {
    it('should accept when biko is omitted', async () => {
      const { biko: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'biko')).toBe(false);
    });

    it('should reject when biko exceeds 500 chars', async () => {
      const errs = await check({ ...VALID, biko: 'あ'.repeat(501) });
      expect(errs.some((e) => e.property === 'biko')).toBe(true);
    });
  });

  describe('paper_flg / denshi_flg (optional booleans)', () => {
    it('should accept when omitted (defaults via @IsOptional)', async () => {
      const { paper_flg: _p, denshi_flg: _d, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'paper_flg' || e.property === 'denshi_flg')).toBe(false);
    });

    it('should reject when paper_flg is not a boolean', async () => {
      const errs = await check({ ...VALID, paper_flg: 'yes' });
      expect(errs.some((e) => e.property === 'paper_flg')).toBe(true);
    });
  });
});
