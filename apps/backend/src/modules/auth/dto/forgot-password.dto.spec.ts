// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// DTO validation for ACSMS-API-012-001 (Forgot Password — request reset email).
// 1 field: `email` — required, valid email format, max 100 chars.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

async function check(input: unknown) {
  const dto = plainToInstance(ForgotPasswordDto, input);
  const errors = await validate(dto);
  return errors;
}

describe('ForgotPasswordDto', () => {
  it('should accept a valid email when input is well-formed', async () => {
    const errors = await check({ email: 'user@example.com' });
    expect(errors).toHaveLength(0);
  });

  it('should reject when email is missing', async () => {
    const errors = await check({});
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should reject when email is empty string', async () => {
    const errors = await check({ email: '' });
    const msg = JSON.stringify(errors);
    expect(msg).toMatch(/email/);
  });

  it('should reject when email format is invalid', async () => {
    const errors = await check({ email: 'not-an-email' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should reject when email is not a string', async () => {
    const errors = await check({ email: 12345 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
