// Screen: ACSMS-SCR-001 — ログイン画面
//
// MFA DTO class-validator specs covering:
//   - API-001-002 §4.1: mfa_token (required) + otp_code (6 digits 0-9)
//   - API-001-003 §4.1: mfa_token (required)

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MfaResendDto, MfaVerifyDto } from './mfa.dto';

async function fields(cls: any, payload: unknown): Promise<string[]> {
  const dto = plainToInstance(cls, payload);
  const errors = await validate(dto as object);
  return errors.map((e) => e.property);
}

describe('MfaVerifyDto', () => {
  const validToken = '550e8400-e29b-41d4-a716-446655440000';

  it('should pass validation when mfa_token and otp_code are valid', async () => {
    const errors = await fields(MfaVerifyDto, {
      mfa_token: validToken,
      otp_code: '123456',
    });
    expect(errors).toEqual([]);
  });

  it('should reject when mfa_token is missing', async () => {
    const errors = await fields(MfaVerifyDto, { otp_code: '123456' });
    expect(errors).toContain('mfa_token');
  });

  it('should reject when otp_code is missing', async () => {
    const errors = await fields(MfaVerifyDto, { mfa_token: validToken });
    expect(errors).toContain('otp_code');
  });

  it.each([
    ['not 6 digits long', '12345'],
    ['exactly 7 digits', '1234567'],
    ['containing non-digit characters', '12345a'],
  ])('should reject when otp_code is %s', async (_label, otpCode) => {
    const errors = await fields(MfaVerifyDto, {
      mfa_token: validToken,
      otp_code: otpCode,
    });
    expect(errors).toContain('otp_code');
  });
});

describe('MfaResendDto', () => {
  it('should pass validation when mfa_token is provided', async () => {
    const errors = await fields(MfaResendDto, {
      mfa_token: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(errors).toEqual([]);
  });

  it('should reject when mfa_token is missing', async () => {
    const errors = await fields(MfaResendDto, {});
    expect(errors).toContain('mfa_token');
  });

  it('should reject when mfa_token is empty string', async () => {
    const errors = await fields(MfaResendDto, { mfa_token: '' });
    expect(errors).toContain('mfa_token');
  });
});
