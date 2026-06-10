// Screen: ACSMS-SCR-025 — アカウントマスタ登録画面
//
// Drives src/modules/account/dto/update-account.dto.ts.
// Validation rules sourced from api.md §4.1 リクエストのバリデーション (PUT).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAccountDto } from '@/modules/account/dto/update-account.dto';
import { buildUpdateAccountBody } from '@test/fixtures/account-form.factory';

async function check(input: unknown) {
  return validate(plainToInstance(UpdateAccountDto, input));
}

const VALID = buildUpdateAccountBody();

describe('UpdateAccountDto', () => {
  it('should accept a fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('password (optional, length 8..32 + 2+ classes when non-empty)', () => {
    it('should accept when password is an empty string (no change)', async () => {
      // api.md §4.1 — 変更時のみ入力。空欄の場合は変更しない。
      const errs = await check({ ...VALID, password: '' });
      expect(errs.some((e) => e.property === 'password')).toBe(false);
    });

    it('should accept when password is omitted', async () => {
      const { password: _drop, ...without } = VALID;
      const errs = await check(without);
      expect(errs.some((e) => e.property === 'password')).toBe(false);
    });

    it('should reject when password is shorter than 8 chars (non-empty)', async () => {
      const errs = await check({ ...VALID, password: 'Aa1!' });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject when password exceeds 32 chars', async () => {
      const errs = await check({ ...VALID, password: 'A1!' + 'a'.repeat(30) });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject when password contains only letters (1 character class)', async () => {
      const errs = await check({ ...VALID, password: 'PasswordOnly' });
      expect(errs.some((e) => e.property === 'password')).toBe(true);
    });

    it('should accept when password mixes letters and digits', async () => {
      const errs = await check({ ...VALID, password: 'NewPass123' });
      expect(errs.some((e) => e.property === 'password')).toBe(false);
    });
  });

  describe('role_id (required, integer 1..5)', () => {
    it('should reject when role_id is missing', async () => {
      const errs = await check({ ...VALID, role_id: undefined });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });

    it('should reject when role_id is outside 1..5 range', async () => {
      const errs = await check({ ...VALID, role_id: 6 });
      expect(errs.some((e) => e.property === 'role_id')).toBe(true);
    });
  });

  describe('account_name (required, max 50)', () => {
    it('should reject when account_name is missing', async () => {
      const errs = await check({ ...VALID, account_name: undefined });
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
  });

  describe('login_id (not declared — caught by ValidationPipe whitelist)', () => {
    it('should not declare login_id on the DTO class when validated', () => {
      // api.md §3 注記: login_id は更新不可（画面側でdisabled）。
      // The DTO MUST NOT declare login_id so `forbidNonWhitelisted: true`
      // rejects any request that smuggles it in.
      const instance = plainToInstance(UpdateAccountDto, VALID);
      expect(Object.prototype.hasOwnProperty.call(instance, 'login_id')).toBe(false);
    });
  });
});
