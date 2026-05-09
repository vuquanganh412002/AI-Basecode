// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//
// Drives src/modules/ja/dto/create-ja.dto.ts. One test per リクエストパラメータ row
// in API-005-002 §2.

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateJaDto } from '@/modules/ja/dto/create-ja.dto';

const base = {
  ja_code: '1301003001',
  ja_name: 'JA東京みどり',
  ja_name_kana: 'ジェイエイトウキョウミドリ',
  todofuken_code: '13',
  chuokai_flg: false,
  bank_code: '1234',
  bank_name: '農林中央金庫',
  yubin_no: '1600022',
  address: '東京都新宿区新宿3-1-1',
  tel: '0323456789',
  fax: '0323456780',
  email: 'info@ja-tokyo-midori.or.jp',
  tanto_busho: '企画課',
  tanto_name: '鈴木花子',
  zei_kubun: 1,
  biko: '',
};

async function run(payload: any) {
  const dto = plainToInstance(CreateJaDto, payload);
  return validate(dto);
}

describe('CreateJaDto', () => {
  it('should pass validation when all fields match the spec', async () => {
    const errors = await run(base);
    expect(errors).toHaveLength(0);
  });

  describe('ja_code (required, max 10)', () => {
    it('should fail validation when ja_code is missing', async () => {
      const { ja_code, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'ja_code')).toBe(true);
    });

    it('should fail validation when ja_code exceeds 10 chars', async () => {
      const errors = await run({ ...base, ja_code: '12345678901' });
      expect(errors.some((e) => e.property === 'ja_code')).toBe(true);
    });
  });

  describe('ja_name (required, max 200)', () => {
    it('should fail validation when ja_name is missing', async () => {
      const { ja_name, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'ja_name')).toBe(true);
    });

    it('should fail validation when ja_name exceeds 200 chars', async () => {
      const errors = await run({ ...base, ja_name: 'あ'.repeat(201) });
      expect(errors.some((e) => e.property === 'ja_name')).toBe(true);
    });
  });

  describe('ja_name_kana (optional, max 200, full-width katakana only)', () => {
    it('should pass when ja_name_kana is missing', async () => {
      const { ja_name_kana, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it('should pass when ja_name_kana is empty string (Transform → undefined)', async () => {
      const errors = await run({ ...base, ja_name_kana: '' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it('should pass when ja_name_kana is whitespace-only (Transform → undefined)', async () => {
      const errors = await run({ ...base, ja_name_kana: '   ' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it('should pass with full-width katakana + chouonpu', async () => {
      const errors = await run({ ...base, ja_name_kana: 'ジェイエイトウキョウミドリー' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it('should pass with full-width katakana plus full-width space (multi-word)', async () => {
      const errors = await run({ ...base, ja_name_kana: 'ジェイエイ　トウキョウ' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it('should fail when ja_name_kana contains hiragana', async () => {
      const errors = await run({ ...base, ja_name_kana: 'じぇいえい' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });

    it('should fail when ja_name_kana contains kanji', async () => {
      const errors = await run({ ...base, ja_name_kana: '東京' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });

    it('should fail when ja_name_kana contains ASCII letters', async () => {
      const errors = await run({ ...base, ja_name_kana: 'JA Tokyo' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });

    it('should fail when ja_name_kana contains half-width katakana', async () => {
      const errors = await run({ ...base, ja_name_kana: 'ｼﾞｪｲｴｲ' });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });

    it('should fail when ja_name_kana exceeds 200 chars', async () => {
      const errors = await run({ ...base, ja_name_kana: 'ア'.repeat(201) });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });
  });

  describe('todofuken_code (required, exactly 2 chars)', () => {
    it('should fail when todofuken_code is 1 char', async () => {
      const errors = await run({ ...base, todofuken_code: '1' });
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should fail when todofuken_code is 3 chars', async () => {
      const errors = await run({ ...base, todofuken_code: '123' });
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should fail when todofuken_code is missing', async () => {
      const { todofuken_code, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'todofuken_code')).toBe(true);
    });
  });

  describe('chuokai_flg (required boolean)', () => {
    it('should fail when chuokai_flg is missing', async () => {
      const { chuokai_flg, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'chuokai_flg')).toBe(true);
    });

    it('should fail when chuokai_flg is not a boolean', async () => {
      const errors = await run({ ...base, chuokai_flg: 'yes' });
      expect(errors.some((e) => e.property === 'chuokai_flg')).toBe(true);
    });
  });

  describe('bank_code (required, exactly 4 half-width digits)', () => {
    it('should fail when bank_code is not 4 chars', async () => {
      const errors = await run({ ...base, bank_code: '123' });
      expect(errors.some((e) => e.property === 'bank_code')).toBe(true);
    });

    it('should fail when bank_code contains non-digit characters', async () => {
      const errors = await run({ ...base, bank_code: 'abcd' });
      expect(errors.some((e) => e.property === 'bank_code')).toBe(true);
    });

    it('should fail when bank_code is missing', async () => {
      const { bank_code, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'bank_code')).toBe(true);
    });
  });

  describe('bank_name (required, max 100)', () => {
    it('should fail when bank_name is missing', async () => {
      const { bank_name, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'bank_name')).toBe(true);
    });

    it('should fail when bank_name exceeds 100 chars', async () => {
      const errors = await run({ ...base, bank_name: 'あ'.repeat(101) });
      expect(errors.some((e) => e.property === 'bank_name')).toBe(true);
    });
  });

  describe('yubin_no (optional, exactly 7 half-width digits)', () => {
    it('should pass when yubin_no is missing', async () => {
      const { yubin_no, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'yubin_no')).toBe(false);
    });

    it('should fail when yubin_no has hyphen (123-4567)', async () => {
      const errors = await run({ ...base, yubin_no: '123-4567' });
      expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
    });

    it('should fail when yubin_no is 6 digits', async () => {
      const errors = await run({ ...base, yubin_no: '123456' });
      expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
    });
  });

  describe('address (optional, max 200)', () => {
    it('should fail when address exceeds 200 chars', async () => {
      const errors = await run({ ...base, address: 'あ'.repeat(201) });
      expect(errors.some((e) => e.property === 'address')).toBe(true);
    });
  });

  describe('tel (optional, half-width digits only, max 15)', () => {
    it('should fail when tel contains non-digit', async () => {
      const errors = await run({ ...base, tel: '03-1234-5678' });
      expect(errors.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should fail when tel exceeds 15 chars', async () => {
      const errors = await run({ ...base, tel: '1234567890123456' });
      expect(errors.some((e) => e.property === 'tel')).toBe(true);
    });
  });

  describe('fax (optional, half-width digits only, max 15)', () => {
    it('should fail when fax contains non-digit', async () => {
      const errors = await run({ ...base, fax: '03-1234-5678' });
      expect(errors.some((e) => e.property === 'fax')).toBe(true);
    });
  });

  describe('email (optional, email format, max 100)', () => {
    it('should fail when email is malformed', async () => {
      const errors = await run({ ...base, email: 'not-an-email' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when email exceeds 100 chars', async () => {
      const errors = await run({ ...base, email: 'a'.repeat(95) + '@x.co' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('tanto_busho (optional, max 100)', () => {
    it('should fail when tanto_busho exceeds 100 chars', async () => {
      const errors = await run({ ...base, tanto_busho: 'あ'.repeat(101) });
      expect(errors.some((e) => e.property === 'tanto_busho')).toBe(true);
    });
  });

  describe('tanto_name (optional, max 50)', () => {
    it('should fail when tanto_name exceeds 50 chars', async () => {
      const errors = await run({ ...base, tanto_name: 'あ'.repeat(51) });
      expect(errors.some((e) => e.property === 'tanto_name')).toBe(true);
    });
  });

  describe('zei_kubun (required, m_code.code_category=ZEI_KUBUN)', () => {
    it('should fail when zei_kubun is missing', async () => {
      const { zei_kubun, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'zei_kubun')).toBe(true);
    });

    // Note: allowed-value check (1 | 2) lives in the service via
    // CodeService.has('ZEI_KUBUN', value). DTO only enforces shape.
    it('should pass shape validation when zei_kubun is any integer (service validates against m_code)', async () => {
      const errors = await run({ ...base, zei_kubun: 1 });
      expect(errors.some((e) => e.property === 'zei_kubun')).toBe(false);
    });
  });

  describe('biko (optional, max 500)', () => {
    it('should pass when biko is empty string', async () => {
      const errors = await run({ ...base, biko: '' });
      expect(errors.some((e) => e.property === 'biko')).toBe(false);
    });

    it('should fail when biko exceeds 500 chars', async () => {
      const errors = await run({ ...base, biko: 'あ'.repeat(501) });
      expect(errors.some((e) => e.property === 'biko')).toBe(true);
    });
  });
});
