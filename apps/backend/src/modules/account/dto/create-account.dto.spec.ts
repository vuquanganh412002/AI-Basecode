// Screen: ACSMS-SCR-025 — アカウントマスタ登録画面
//
// Drives src/modules/account/dto/create-account.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { buildCreateAccountBody } from '@test/fixtures/account-form.factory';

async function check(input: unknown) {
  return validate(plainToInstance(CreateAccountDto, input));
}

const VALID = buildCreateAccountBody();

describe('CreateAccountDto', () => {
  it('should accept a fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('login_id (required, max 20, half-width alphanumeric+underscore)', () => {
    it('should reject when login_id is missing', async () => {
      const errs = await check({ ...VALID, login_id: undefined });
      expect(errs.some((e) => e.property === 'login_id')).toBe(true);
    });

    it('should reject when login_id is empty string', async () => {
      const errs = await check({ ...VALID, login_id: '' });
      expect(errs.some((e) => e.property === 'login_id')).toBe(true);
    });

    it('should reject when login_id exceeds 20 chars', async () => {
      const errs = await check({ ...VALID, login_id: 'a'.repeat(21) });
      expect(errs.some((e) => e.property === 'login_id')).toBe(true);
    });

    it('should reject when login_id contains non-alphanumeric characters', async () => {
      // api.md §4.1 — 半角英数字のみ (^[a-zA-Z0-9_]+$)
      const errs = await check({ ...VALID, login_id: 'ja_本店' });
      expect(errs.some((e) => e.property === 'login_id')).toBe(true);
    });

    it('should accept login_id when it contains underscore', async () => {
      const errs = await check({ ...VALID, login_id: 'admin_001' });
      expect(errs.some((e) => e.property === 'login_id')).toBe(false);
    });
  });

  describe('password (required, length 8..32, 2+ of letter/digit/symbol)', () => {
    it('should reject when password is missing', async () => {
      const errs = await check({ ...VALID, password: undefined });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject when password is shorter than 8 chars', async () => {
      const errs = await check({ ...VALID, password: 'Aa1!' });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject when password exceeds 32 chars', async () => {
      const errs = await check({ ...VALID, password: 'A1!' + 'a'.repeat(30) });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject when password contains only letters (1 character class)', async () => {
      // 3種 (letter / digit / symbol) のうち 2 種以上を含む必要あり.
      const errs = await check({ ...VALID, password: 'PasswordOnly' });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should accept when password mixes letters and digits (2 character classes)', async () => {
      const errs = await check({ ...VALID, password: 'Password123' });
      expect(errs.some((e) => e.property === 'password')).toBe(false);
    });
  });

  describe('role_id (required, integer 1..5)', () => {
    it('should reject when role_id is missing', async () => {
      const errs = await check({ ...VALID, role_id: undefined });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });

    it('should reject when role_id is 0', async () => {
      const errs = await check({ ...VALID, role_id: 0 });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });

    it('should reject when role_id is 6', async () => {
      const errs = await check({ ...VALID, role_id: 6 });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });
  });

  describe('todofuken_code (length 2 when present)', () => {
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

    it('should accept when todofuken_code is omitted (role-conditional check lives in service)', async () => {
      // The conditional-required rule (role_id=3,4,5 → required) is
      // enforced in the service layer, not the DTO — DTO-level rule is
      // length-only when present. See api.md §4.1.
      const { todofuken_code: _drop, ...without } = VALID;
      const errs = await check(without);
      expect(errs.some((e) => e.property === 'todofuken_code')).toBe(false);
    });
  });

  describe('account_name (required, max 50)', () => {
    it('should reject when account_name is missing', async () => {
      const errs = await check({ ...VALID, account_name: undefined });
      expect(errs.some((e) => e.property === 'account_name')).toBe(true);
    });

    it('should reject when account_name is empty string', async () => {
      const errs = await check({ ...VALID, account_name: '' });
      expect(errs.some((e) => e.property === 'account_name')).toBe(true);
    });

    it('should reject when account_name exceeds 50 chars', async () => {
      const errs = await check({ ...VALID, account_name: 'あ'.repeat(51) });
      expect(errs.some((e) => e.property === 'account_name')).toBe(true);
    });
  });

  describe('email (required, max 100, email format)', () => {
    it('should reject when email is an empty string', async () => {
      // QA review 2026-05 — 通知先メールアドレス must be required
      const errs = await check({ ...VALID, email: '' });
      expect(errs.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject when email is missing entirely', async () => {
      const body = { ...VALID } as Record<string, unknown>;
      delete body.email;
      const errs = await check(body);
      expect(errs.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject when email is not in valid email format', async () => {
      const errs = await check({ ...VALID, email: 'not-an-email' });
      expect(errs.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject when email exceeds 100 chars', async () => {
      const long = 'a'.repeat(95) + '@b.co';
      const errs = await check({ ...VALID, email: long });
      expect(errs.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('sub_email_1 / sub_email_2 / sub_email_3 (optional, max 100, email format)', () => {
    it('should accept when all sub_email fields are empty strings', async () => {
      const errs = await check({
        ...VALID,
        sub_email_1: '',
        sub_email_2: '',
        sub_email_3: '',
      });
      expect(errs.some((e) => e.property.startsWith('sub_email_'))).toBe(false);
    });

    it('should reject when sub_email_1 is not in valid email format', async () => {
      const errs = await check({ ...VALID, sub_email_1: 'bad-email' });
      expect(errs.some((e) => e.property === 'sub_email_1')).toBe(true);
    });

    it('should reject when sub_email_2 exceeds 100 chars', async () => {
      const long = 'a'.repeat(95) + '@b.co';
      const errs = await check({ ...VALID, sub_email_2: long });
      expect(errs.some((e) => e.property === 'sub_email_2')).toBe(true);
    });

    it('should reject when sub_email_3 is not in valid email format', async () => {
      const errs = await check({ ...VALID, sub_email_3: 'not-an-email' });
      expect(errs.some((e) => e.property === 'sub_email_3')).toBe(true);
    });
  });

  describe('paper_flg / denshi_flg (boolean)', () => {
    it('should reject when paper_flg is a string', async () => {
      const errs = await check({ ...VALID, paper_flg: 'true' });
      expect(errs.some((e) => e.property === 'paper_flg')).toBe(true);
    });

    it('should reject when denshi_flg is a string', async () => {
      const errs = await check({ ...VALID, denshi_flg: 'false' });
      expect(errs.some((e) => e.property === 'denshi_flg')).toBe(true);
    });

    it('should accept when paper_flg / denshi_flg are omitted (DTO defaults to false)', async () => {
      const { paper_flg: _p, denshi_flg: _d, ...without } = VALID;
      const errs = await check(without);
      expect(errs.some((e) => e.property === 'paper_flg' || e.property === 'denshi_flg')).toBe(false);
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
