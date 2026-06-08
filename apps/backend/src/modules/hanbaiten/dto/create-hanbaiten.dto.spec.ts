// Screen: ACSMS-SCR-017 — 販売店情報登録画面
//
// Drives src/modules/hanbaiten/dto/create-hanbaiten.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション
// + 画面設計書 v1.2 §3.1 (conditional-required No.17~23 when
// itaku_kubun = 1).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateHanbaitenDto } from '@/modules/hanbaiten/dto/create-hanbaiten.dto';
import { buildCreateHanbaitenBody } from '@test/fixtures/hanbaiten-form.factory';

async function check(input: unknown) {
  return validate(plainToInstance(CreateHanbaitenDto, input));
}

const VALID = buildCreateHanbaitenBody();

describe('CreateHanbaitenDto', () => {
  it('should accept a fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('hanbaiten_code (required, max 10)', () => {
    it('should reject when hanbaiten_code is missing', async () => {
      const errs = await check({ ...VALID, hanbaiten_code: undefined });
      expect(errs.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });

    it('should reject when hanbaiten_code is empty string', async () => {
      const errs = await check({ ...VALID, hanbaiten_code: '' });
      expect(errs.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });

    it('should reject when hanbaiten_code exceeds 10 chars', async () => {
      const errs = await check({ ...VALID, hanbaiten_code: 'A'.repeat(11) });
      expect(errs.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });

    it('should accept when hanbaiten_code is exactly 10 chars', async () => {
      const errs = await check({ ...VALID, hanbaiten_code: 'A'.repeat(10) });
      expect(errs.some((e) => e.property === 'hanbaiten_code')).toBe(false);
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
    it('should accept when hanbaiten_name_kana is omitted', async () => {
      const { hanbaiten_name_kana: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'hanbaiten_name_kana')).toBe(false);
    });

    it('should accept when hanbaiten_name_kana is empty string', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: '' });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(false);
    });

    it('should reject when hanbaiten_name_kana exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: 'ｱ'.repeat(101) });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(true);
    });

    it('should reject when hanbaiten_name_kana contains full-width katakana', async () => {
      // Project convention — half-width only (Zengin / bank CSV compat).
      const errs = await check({ ...VALID, hanbaiten_name_kana: 'ハンバイテン' });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(true);
    });

    it('should reject when hanbaiten_name_kana contains hiragana', async () => {
      const errs = await check({ ...VALID, hanbaiten_name_kana: 'はんばいてん' });
      expect(errs.some((e) => e.property === 'hanbaiten_name_kana')).toBe(true);
    });
  });

  describe('todofuken_code (optional, length 2)', () => {
    it('should accept when todofuken_code is exactly 2 chars', async () => {
      const errs = await check({ ...VALID, todofuken_code: '13' });
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(false);
    });

    it('should accept when todofuken_code is omitted', async () => {
      const { todofuken_code: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'todofuken_code')).toBe(false);
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

  describe('torihikisaki_no (optional, max 20)', () => {
    it('should accept when torihikisaki_no is omitted', async () => {
      const { torihikisaki_no: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'torihikisaki_no')).toBe(false);
    });

    it('should reject when torihikisaki_no exceeds 20 chars', async () => {
      const errs = await check({ ...VALID, torihikisaki_no: '1'.repeat(21) });
      expect(errs.some((e) => e.property === 'torihikisaki_no')).toBe(true);
    });
  });

  describe('yubin_no / address / tel / fax / shocho_name (optional, max-length only)', () => {
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

    it('should reject tel / fax that contain a hyphen (half-width digits only, no hyphen)', async () => {
      const telErrs = await check({ ...VALID, tel: '03-1234-5678' });
      expect(telErrs.some((e) => e.property === 'tel')).toBe(true);
      const faxErrs = await check({ ...VALID, fax: '03-1234-5679' });
      expect(faxErrs.some((e) => e.property === 'fax')).toBe(true);
    });

    it('should accept digit-only tel / fax', async () => {
      const errs = await check({ ...VALID, tel: '0312345678', fax: '0312345679' });
      expect(
        errs.some((e) => e.property === 'tel' || e.property === 'fax'),
      ).toBe(false);
    });

    it('should reject when shocho_name exceeds 50 chars', async () => {
      const errs = await check({ ...VALID, shocho_name: 'あ'.repeat(51) });
      expect(errs.some((e) => e.property === 'shocho_name')).toBe(true);
    });
  });

  describe('itaku_kubun / furikomi_tesuryo_futan_kubun / yokin_shubetsu (numeric m_code values)', () => {
    it('should accept when itaku_kubun is 1', async () => {
      const errs = await check({ ...VALID, itaku_kubun: 1 });
      expect(errs.some((e) => e.property === 'itaku_kubun')).toBe(false);
    });

    it('should accept when itaku_kubun is omitted', async () => {
      // The m_code allow-list check lives in the service layer
      // (CodeService.has) — DTO layer is shape-only.
      const { itaku_kubun: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'itaku_kubun')).toBe(false);
    });

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
      const errs = await check({ ...VALID, furikomi_tesuryo: -1 });
      expect(errs.some((e) => e.property === 'furikomi_tesuryo')).toBe(true);
    });

    it('should accept when furikomi_tesuryo is omitted', async () => {
      const { furikomi_tesuryo: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'furikomi_tesuryo')).toBe(false);
    });
  });

  describe('haiten_flg (boolean)', () => {
    it('should reject when haiten_flg is a string', async () => {
      const errs = await check({ ...VALID, haiten_flg: 'true' });
      expect(errs.some((e) => e.property === 'haiten_flg')).toBe(true);
    });

    it('should accept when haiten_flg is omitted (defaults to false in service)', async () => {
      const { haiten_flg: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'haiten_flg')).toBe(false);
    });
  });

  describe('bank fields max-length (optional except when itaku_kubun=1 — conditional rule lives in service)', () => {
    it('should reject when bank_code exceeds 4 chars', async () => {
      const errs = await check({ ...VALID, bank_code: '12345' });
      expect(errs.some((e) => e.property === 'bank_code')).toBe(true);
    });

    it('should reject when bank_name exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, bank_name: 'あ'.repeat(101) });
      expect(errs.some((e) => e.property === 'bank_name')).toBe(true);
    });

    it('should reject when bank_branch_code exceeds 3 chars', async () => {
      const errs = await check({ ...VALID, bank_branch_code: '1234' });
      expect(errs.some((e) => e.property === 'bank_branch_code')).toBe(true);
    });

    it('should reject when bank_branch_name exceeds 100 chars', async () => {
      const errs = await check({ ...VALID, bank_branch_name: 'あ'.repeat(101) });
      expect(errs.some((e) => e.property === 'bank_branch_name')).toBe(true);
    });

    it('should reject when koza_no exceeds 10 chars', async () => {
      const errs = await check({ ...VALID, koza_no: '1'.repeat(11) });
      expect(errs.some((e) => e.property === 'koza_no')).toBe(true);
    });

    it('should reject when koza_meigi exceeds 50 chars', async () => {
      const errs = await check({ ...VALID, koza_meigi: 'あ'.repeat(51) });
      expect(errs.some((e) => e.property === 'koza_meigi')).toBe(true);
    });

    it('should accept when all bank/koza fields are omitted (DTO shape-only — service enforces conditional-required)', async () => {
      const without = { ...VALID };
      delete without.bank_code;
      delete without.bank_name;
      delete without.bank_branch_code;
      delete without.bank_branch_name;
      delete without.yokin_shubetsu;
      delete without.koza_no;
      delete without.koza_meigi;
      const errs = await check(without);
      // No DTO error — the service layer enforces the conditional rule.
      expect(errs.some((e) =>
        ['bank_code', 'bank_name', 'bank_branch_code', 'bank_branch_name',
         'yokin_shubetsu', 'koza_no', 'koza_meigi'].includes(e.property))).toBe(false);
    });
  });

  describe('biko (optional)', () => {
    it('should accept when biko is omitted', async () => {
      const { biko: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'biko')).toBe(false);
    });

    it('should accept when biko is an empty string', async () => {
      const errs = await check({ ...VALID, biko: '' });
      expect(errs.some((e) => e.property === 'biko')).toBe(false);
    });
  });
});
