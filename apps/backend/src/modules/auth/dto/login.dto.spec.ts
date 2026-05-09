// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面
//
// LoginDto class-validator specs covering API-001-001 §4.1
// (リクエストパラメータ): login_id (required, max 20, half-width-only)
// and password (required, 8-32 chars, half-width-only).

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function expectErrors(payload: unknown): Promise<string[]> {
  const dto = plainToInstance(LoginDto, payload);
  const errors = await validate(dto as object);
  return errors.map((e) => e.property);
}

describe('LoginDto', () => {
  it('should pass validation when login_id and password meet all rules', async () => {
    const errors = await expectErrors({ login_id: 'admin01', password: 'P@ssw0rd123' });
    expect(errors).toEqual([]);
  });

  describe('login_id', () => {
    it('should reject when login_id is missing', async () => {
      const errors = await expectErrors({ password: 'P@ssw0rd123' });
      expect(errors).toContain('login_id');
    });

    it('should reject when login_id is empty string', async () => {
      const errors = await expectErrors({ login_id: '', password: 'P@ssw0rd123' });
      expect(errors).toContain('login_id');
    });

    it('should reject when login_id exceeds 20 characters', async () => {
      const errors = await expectErrors({
        login_id: 'a'.repeat(21),
        password: 'P@ssw0rd123',
      });
      expect(errors).toContain('login_id');
    });

    it('should reject when login_id contains full-width characters', async () => {
      const errors = await expectErrors({
        login_id: '管理者０１',
        password: 'P@ssw0rd123',
      });
      expect(errors).toContain('login_id');
    });

    it('should accept when login_id contains half-width letters digits and symbols', async () => {
      const errors = await expectErrors({
        login_id: 'admin_01-#',
        password: 'P@ssw0rd123',
      });
      expect(errors).not.toContain('login_id');
    });
  });

  describe('password', () => {
    it('should reject when password is missing', async () => {
      const errors = await expectErrors({ login_id: 'admin01' });
      expect(errors).toContain('password');
    });

    it('should reject when password is shorter than 8 characters', async () => {
      const errors = await expectErrors({ login_id: 'admin01', password: '1234567' });
      expect(errors).toContain('password');
    });

    it('should reject when password is longer than 32 characters', async () => {
      const errors = await expectErrors({
        login_id: 'admin01',
        password: 'a'.repeat(33),
      });
      expect(errors).toContain('password');
    });

    it('should reject when password contains full-width characters', async () => {
      const errors = await expectErrors({
        login_id: 'admin01',
        password: 'パスワード123',
      });
      expect(errors).toContain('password');
    });

    it('should accept when password is half-width 8-32 chars', async () => {
      const errors = await expectErrors({
        login_id: 'admin01',
        password: 'Aa1@aaaa',
      });
      expect(errors).not.toContain('password');
    });
  });
});
