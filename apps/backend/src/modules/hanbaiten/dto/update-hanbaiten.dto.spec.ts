// Screen: ACSMS-SCR-017 — 販売店情報登録画面
//
// Drives src/modules/hanbaiten/dto/update-hanbaiten.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション (PUT).
// Notable difference vs. CREATE: hanbaiten_code is NOT in the body
// (画面側でdisabled, 更新不可) — DTO MUST NOT declare it, the
// `forbidNonWhitelisted: true` ValidationPipe rejects any payload
// that smuggles it in.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateHanbaitenDto } from '@/modules/hanbaiten/dto/update-hanbaiten.dto';
import { buildUpdateHanbaitenBody } from '@test/fixtures/hanbaiten-form.factory';

async function check(input: unknown) {
  return validate(plainToInstance(UpdateHanbaitenDto, input));
}

const VALID = buildUpdateHanbaitenBody();

describe('UpdateHanbaitenDto', () => {
  it('should accept a fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('hanbaiten_code (not declared — 更新不可)', () => {
    it('should NOT declare hanbaiten_code on the DTO class when validated', () => {
      // api.md §3 注記: hanbaiten_code は更新不可（画面側でdisabled）。
      // The DTO MUST NOT declare hanbaiten_code so `forbidNonWhitelisted: true`
      // rejects any request that smuggles it in.
      const instance = plainToInstance(UpdateHanbaitenDto, VALID);
      expect(Object.prototype.hasOwnProperty.call(instance, 'hanbaiten_code')).toBe(false);
    });
  });

  describe('hanbaiten_name (required, max 100)', () => {
    it('should reject when hanbaiten_name is missing', async () => {
      const errs = await check({ ...VALID, hanbaiten_name: undefined });
      expect(errs.some((e) => e.property === 'hanbaiten_name')).toBe(true);
    });

    it('should reject when hanbaiten_name is empty string', async () => {
      const errs = await check({ ...VALID, hanbaiten_name: '' });
      expect(errs.some((e) => e.property === 'hanbaiten_name')).toBe(true);
    });

    it('should reject when hanbaiten_name exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, hanbaiten_name: 'あ'.repeat(101) });
      expect(errs.some((e) => e.property === 'hanbaiten_name')).toBe(true);
    });
  });

  describe('hanbaiten_name_kana (optional, max 100, half-width katakana)', () => {
    it('should accept when hanbaiten_name_kana is empty string', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: '' });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(false);
    });

    it('should accept when hanbaiten_name_kana is omitted', async () => {
      const { hanbaiten_name_kana: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'hanbaiten_name_kana')).toBe(false);
    });

    it('should reject when hanbaiten_name_kana exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: 'ｱ'.repeat(101) });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(true);
    });

    it('should reject when hanbaiten_name_kana contains full-width katakana', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: 'ハンバイテン' });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(true);
    });
  });

  describe('todofuken_code (optional, length 2)', () => {
    it('should accept when todofuken_code is exactly 2 chars', async () => {
      const errs = await check({ ...VALID, todofuken_code: '13' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(false);
    });

    it('should reject when todofuken_code is 1 char', async () => {
      const errs = await check({ ...VALID, todofuken_code: '1' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
    });

    it('should reject when todofuken_code is 3 chars', async () => {
      const errs = await check({ ...VALID, todofuken_code: '130' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
    });
  });

  describe('torihikisaki_no / yubin_no / address / tel / fax / shocho_name max-length', () => {
    it('should reject when torihikisaki_no exceeds 20 chars', async () => {
      const errs = await check({ ...VALID, torihikisaki_no: '1'.repeat(21) });
      expect(errs.some((e) => e.property === 'torihikisaki_no')).toBe(true);
    });

    it('should reject when yubin_no exceeds 7 chars', async () => {
      const errs = await check({ ...VALID, yubin_no: '12345678' });
      expect(errs.some((e) => e.property === 'yubin_no')).toBe(true);
    });

    it('should reject when address exceeds 200 chars', async () => {
      const errs = await check({ ...VALID, address: 'あ'.repeat(201) });
      expect(errs.some((e) => e.property === 'address')).toBe(true);
    });

    it('should reject when tel exceeds 15 chars', async () => {
      const errs = await check({ ...VALID, tel: '1'.repeat(16) });
      expect(errs.some((e) => e.property === 'tel')).toBe(true);
    });

    it('should reject when fax exceeds 15 chars', async () => {
      const errs = await check({ ...VALID, fax: '1'.repeat(16) });
      expect(errs.some((e) => e.property === 'fax')).toBe(true);
    });

    it('should reject when shocho_name exceeds 50 chars', async () => {
      const errs = await check({ ...VALID, shocho_name: 'あ'.repeat(51) });
      expect(errs.some((e) => e.property === 'shocho_name')).toBe(true);
    });
  });

  describe('itaku_kubun / furikomi_tesuryo_futan_kubun / yokin_shubetsu (numeric m_code shapes)', () => {
    it('should reject when itaku_kubun is a non-numeric string', async () => {
      const errs = await check({ ...VALID, itaku_kubun: 'abc' });
      expect(errs.some((e) => e.property === 'itaku_kubun')).toBe(true);
    });

    it('should reject when furikomi_tesuryo_futan_kubun is a non-numeric string', async () => {
      const errs = await check({ ...VALID, furikomi_tesuryo_futan_kubun: 'xyz' });
      expect(errs.some((e) => e.property === 'furikomi_tesuryo_futan_kubun')).toBe(true);
    });

    it('should reject when yokin_shubetsu is a non-numeric string', async () => {
      const errs = await check({ ...VALID, yokin_shubetsu: 'foo' });
      expect(errs.some((e) => e.property === 'yokin_shubetsu')).toBe(true);
    });
  });

  describe('furikomi_tesuryo (optional, >= 0)', () => {
    it('should accept when furikomi_tesuryo is 0', async () => {
      const errs = await check({ ...VALID, furikomi_tesuryo: 0 });
      expect(errs.some((e) => e.property === 'furikomi_tesuryo')).toBe(false);
    });

    it('should reject when furikomi_tesuryo is negative', async () => {
      const errs = await check({ ...VALID, furikomi_tesuryo: -100 });
      expect(errs.some((e) => e.property === 'furikomi_tesuryo')).toBe(true);
    });
  });

  describe('haiten_flg (boolean)', () => {
    it('should reject when haiten_flg is a string', async () => {
      const errs = await check({ ...VALID, haiten_flg: 'false' });
      expect(errs.some((e) => e.property === 'haiten_flg')).toBe(true);
    });

    it('should accept when haiten_flg is omitted', async () => {
      const { haiten_flg: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'haiten_flg')).toBe(false);
    });
  });

  describe('bank fields max-length (conditional-required lives in service)', () => {
    it('should reject when bank_code exceeds 4 chars', async () => {
      const errs = await check({ ...VALID, bank_code: '12345' });
      expect(errs.some((e) => e.property === 'bank_code')).toBe(true);
    });

    it('should reject when bank_branch_code exceeds 3 chars', async () => {
      const errs = await check({ ...VALID, bank_branch_code: '1234' });
      expect(errs.some((e) => e.property === 'bank_branch_code')).toBe(true);
    });

    it('should reject when koza_no exceeds 10 chars', async () => {
      const errs = await check({ ...VALID, koza_no: '1'.repeat(11) });
      expect(errs.some((e) => e.property === 'koza_no')).toBe(true);
    });

    it('should reject when koza_meigi exceeds 50 chars', async () => {
      const errs = await check({ ...VALID, koza_meigi: 'あ'.repeat(51) });
      expect(errs.some((e) => e.property === 'koza_meigi')).toBe(true);
    });
  });
});
