// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// DTO validation for ACSMS-API-012-002 (Verify Reset Token).
// 1 field: `token` — required, UUID v4 format (36 chars).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyResetTokenDto } from './verify-reset-token.dto';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

async function check(input: unknown) {
  const dto = plainToInstance(VerifyResetTokenDto, input);
  return validate(dto);
}

describe('VerifyResetTokenDto', () => {
  it('should accept a valid UUID when token is well-formed', async () => {
    const errors = await check({ token: VALID_TOKEN });
    expect(errors).toHaveLength(0);
  });

  it('should reject when token is missing', async () => {
    const errors = await check({});
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('token');
  });

  it.each([
    ['empty', ''],
    ['length is not 36', 'short-token'],
    ['not a valid UUID format', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
  ])('should reject when token is %s', async (_label, token) => {
    const errors = await check({ token });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject when token is not a string', async () => {
    const errors = await check({ token: 12345 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
