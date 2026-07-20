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
  ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘ',
  todofuken_code: '13',
  chuokai_flg: false,
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

  describe('ja_name_kana (optional, max 200, half-width katakana only)', () => {
    it('should pass when ja_name_kana is missing', async () => {
      const { ja_name_kana, ...rest } = base;
      const errors = await run(rest);
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it.each([
      ['empty string (Transform → undefined)', ''],
      ['whitespace-only (Transform → undefined)', '   '],
      ['half-width katakana + chouonpu', 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘｰ'],
      ['half-width katakana plus space (multi-word)', 'ｼﾞｪｲｴｲ ﾄｳｷｮｳ'],
    ])('should pass when ja_name_kana is %s', async (_label, value) => {
      const errors = await run({ ...base, ja_name_kana: value });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(false);
    });

    it.each([
      ['hiragana', 'じぇいえい'],
      ['kanji', '東京'],
      ['ASCII letters', 'JA Tokyo'],
      ['full-width katakana', 'ジェイエイ'],
    ])('should fail when ja_name_kana contains %s', async (_label, value) => {
      const errors = await run({ ...base, ja_name_kana: value });
      expect(errors.some((e) => e.property === 'ja_name_kana')).toBe(true);
    });

    it('should fail when ja_name_kana exceeds 200 chars', async () => {
      const errors = await run({ ...base, ja_name_kana: 'ｱ'.repeat(201) });
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

  // 顧客要件 2026-06: カタカナ・英数字は半角だが、漢字・ひらがなは入力可。
  // 顧客要件 2026-06-25: 銀行charset限定 [ｱ-ﾟ A-Z0-9.()\-]。漢字/ひらがな/全角/
  // 半角小文字/小書き半角カナ/ｦ/長音符ｰ/許可外記号は不可。
  describe('jastem_itakusha_name (委託者名 — 銀行charset: 半角カナ ｱ-ﾟ・A-Z・0-9・. ( ) -)', () => {
    const ok = ['ﾎﾝﾃﾝ', 'JA123', 'ﾐﾄﾞﾘ', 'A.B-C (1)', 'ﾃｽﾄ ｾﾝﾀ'];
    const ng = [
      '東京農業協同組合', // 漢字
      'とうきょう', // ひらがな
      'トウキョウ', // 全角カタカナ
      'ＪＡ１２３', // 全角英数
      'ja123', // 半角英小文字
      'ｷｬｸ', // 小書き半角カナ ｬ
      'ﾄｳｷｮｳ', // 小書き ｮ を含む
      'ｾﾝﾀｰ', // 長音符 ｰ（範囲外）
      'A@B', // 許可外記号
    ];

    it.each(ok)('should pass with %s', async (v) => {
      const errors = await run({ ...base, jastem_itakusha_name: v });
      expect(errors.some((e) => e.property === 'jastem_itakusha_name')).toBe(false);
    });

    it.each(ng)('should fail with %s', async (v) => {
      const errors = await run({ ...base, jastem_itakusha_name: v });
      expect(errors.some((e) => e.property === 'jastem_itakusha_name')).toBe(true);
    });
  });

  describe('jastem_ja_name (農協名 — 銀行charset: 半角カナ ｱ-ﾟ・A-Z・0-9・. ( ) -)', () => {
    const ok = ['ﾐﾄﾞﾘ123', 'ﾐﾄﾞﾘ', 'AB.C-1', 'ﾎﾝﾃﾝ ()']; // max 15
    const ng = ['東京みどり', 'みどり', 'ミドリ', 'ＡＢ', 'ab', 'ﾐﾄﾞﾘｰ'];

    it.each(ok)('should pass with %s', async (v) => {
      const errors = await run({ ...base, jastem_ja_name: v });
      expect(errors.some((e) => e.property === 'jastem_ja_name')).toBe(false);
    });

    it.each(ng)('should fail with %s', async (v) => {
      const errors = await run({ ...base, jastem_ja_name: v });
      expect(errors.some((e) => e.property === 'jastem_ja_name')).toBe(true);
    });
  });
});
