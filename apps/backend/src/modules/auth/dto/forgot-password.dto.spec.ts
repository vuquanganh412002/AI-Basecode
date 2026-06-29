// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// DTO validation for ACSMS-API-012-001 (Forgot Password — request reset email).
// 2 fields: `login_id` (required, 半角, max 20) + `email` (required, valid
// email, max 100). The pair targets exactly one account because email is not
// unique in m_account.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

const VALID = { login_id: 'admin01', email: 'user@example.com' };

async function check(input: unknown) {
  const dto = plainToInstance(ForgotPasswordDto, input);
  const errors = await validate(dto);
  return errors;
}

describe('ForgotPasswordDto', () => {
  it('should accept a valid login_id + email when input is well-formed', async () => {
    const errors = await check({ ...VALID });
    expect(errors).toHaveLength(0);
  });

  // ── email ──────────────────────────────────────────────────────────
  it('should reject when email is missing', async () => {
    const errors = await check({ login_id: 'admin01' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should reject when email is empty string', async () => {
    const errors = await check({ ...VALID, email: '' });
    const msg = JSON.stringify(errors);
    expect(msg).toMatch(/email/);
  });

  it('should reject when email format is invalid', async () => {
    const errors = await check({ ...VALID, email: 'not-an-email' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should reject when email is not a string', async () => {
    const errors = await check({ ...VALID, email: 12345 });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── login_id ───────────────────────────────────────────────────────
  it('should reject when login_id is missing', async () => {
    const errors = await check({ email: 'user@example.com' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('login_id');
  });

  it('should reject when login_id is empty string', async () => {
    const errors = await check({ ...VALID, login_id: '' });
    const msg = JSON.stringify(errors);
    expect(msg).toMatch(/login_id/);
  });

  it('should reject when login_id contains full-width characters', async () => {
    const errors = await check({ ...VALID, login_id: 'ａｄｍｉｎ' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('login_id');
  });

  it('should reject when login_id exceeds 20 characters', async () => {
    const errors = await check({ ...VALID, login_id: 'a'.repeat(21) });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('login_id');
  });
});
