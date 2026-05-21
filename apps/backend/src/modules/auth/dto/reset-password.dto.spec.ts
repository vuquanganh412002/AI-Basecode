// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// DTO validation for ACSMS-API-012-003 (Reset Password).
// Fields:
//   - token             required, 36-char UUID
//   - new_password      required, 8-32 chars, contains ≥2 of {alpha, digit, symbol}
//   - confirm_password  required (match check lives in service §4.1)
//
// confirm_password === new_password match is enforced in the service layer
// per api.md §4.1 — DTO-level only ensures the field is present + length-bound.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

async function check(input: unknown) {
  const dto = plainToInstance(ResetPasswordDto, input);
  return validate(dto);
}

const VALID = {
  token: VALID_TOKEN,
  new_password: 'NewPass123',
  confirm_password: 'NewPass123',
} as const;

describe('ResetPasswordDto', () => {
  describe('happy path', () => {
    it('should accept when token + new_password + confirm_password are all valid', async () => {
      const errors = await check(VALID);
      expect(errors).toHaveLength(0);
    });
  });

  describe('token field', () => {
    it('should reject when token is missing', async () => {
      const errors = await check({ ...VALID, token: undefined });
      expect(errors.some((e) => e.property === 'token')).toBe(true);
    });

    it('should reject when token is not 36 chars', async () => {
      const errors = await check({ ...VALID, token: 'short' });
      expect(errors.some((e) => e.property === 'token')).toBe(true);
    });

    it('should reject when token is not a valid UUID', async () => {
      const errors = await check({ ...VALID, token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' });
      expect(errors.some((e) => e.property === 'token')).toBe(true);
    });
  });

  describe('new_password field', () => {
    it('should reject when new_password is missing', async () => {
      const errors = await check({ ...VALID, new_password: undefined });
      expect(errors.some((e) => e.property === 'new_password')).toBe(true);
    });

    it('should reject when new_password is shorter than 8', async () => {
      const errors = await check({ ...VALID, new_password: 'Ab1', confirm_password: 'Ab1' });
      expect(errors.some((e) => e.property === 'new_password')).toBe(true);
    });

    it('should reject when new_password is longer than 32', async () => {
      const long = 'A'.repeat(20) + '1'.repeat(13); // 33 chars
      const errors = await check({ ...VALID, new_password: long, confirm_password: long });
      expect(errors.some((e) => e.property === 'new_password')).toBe(true);
    });

    // Category check ("≥2 of 3 categories") was moved from DTO to
    // AuthService.hasAtLeastTwoCategories so the DTO can emit a precise
    // half-width / length message (matching LoginDto). DTO now ACCEPTS
    // single-category passwords; service-layer tests in
    // password-reset.service.spec.ts cover the rejection.
    it('should ACCEPT at the DTO layer when new_password is alpha-only (category enforced in service)', async () => {
      const errors = await check({
        ...VALID,
        new_password: 'OnlyLetters',
        confirm_password: 'OnlyLetters',
      });
      expect(errors.some((e) => e.property === 'new_password')).toBe(false);
    });

    it('should ACCEPT at the DTO layer when new_password is digit-only (category enforced in service)', async () => {
      const errors = await check({
        ...VALID,
        new_password: '12345678',
        confirm_password: '12345678',
      });
      expect(errors.some((e) => e.property === 'new_password')).toBe(false);
    });

    it('should reject when new_password contains full-width characters (half-width regex)', async () => {
      const errors = await check({
        ...VALID,
        new_password: 'パスワード123',
        confirm_password: 'パスワード123',
      });
      expect(errors.some((e) => e.property === 'new_password')).toBe(true);
    });

    it('should accept when new_password contains 2 of 3 categories (alpha + digit)', async () => {
      const errors = await check({
        ...VALID,
        new_password: 'NewPass1',
        confirm_password: 'NewPass1',
      });
      expect(errors.some((e) => e.property === 'new_password')).toBe(false);
    });

    it('should accept when new_password contains 2 of 3 categories (alpha + symbol)', async () => {
      const errors = await check({
        ...VALID,
        new_password: 'NewPass!@',
        confirm_password: 'NewPass!@',
      });
      expect(errors.some((e) => e.property === 'new_password')).toBe(false);
    });
  });

  describe('confirm_password field', () => {
    it('should reject when confirm_password is missing', async () => {
      const errors = await check({ ...VALID, confirm_password: undefined });
      expect(errors.some((e) => e.property === 'confirm_password')).toBe(true);
    });
    // Note: matching new_password === confirm_password is enforced in service
    // §4.1 (returns VALIDATION_ERROR with errors[].field='confirm_password').
    // DTO only ensures presence + length.
  });
});
