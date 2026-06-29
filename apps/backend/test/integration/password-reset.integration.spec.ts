// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// End-to-end integration tests for forgot-password / verify-reset-token /
// reset-password using the shared createIntegrationTestApp() helper:
//   - pg-mem (m_account, t_mfa_otp)
//   - ioredis-mock (real session lifecycle through SessionService)
//   - full Nest pipeline: ValidationPipe → AuthController → AuthService →
//     bcrypt → DB transaction → SessionService → MailService (mocked)
//
// AuthModule is wired by the helper. We don't add extra modules here.

import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Server } from 'http';

import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { MailService } from '@/modules/mail/mail.service';

describe('Password reset (SCR-012) — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('OldPass123', 10);
  });

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [],
      seedSql: [
        `INSERT INTO m_roles (role_id, role_code, role_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'NICHINO_ADMIN', '日農（管理者）', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
      ],
    });

    await ctx.dataSource.query(
      `INSERT INTO m_account
        (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
         todofuken_code, paper_flg, denshi_flg, email, biko, mfa_enable_flg,
         login_failure_count, account_lock_flg,
         created_by, updated_by, created_at, updated_at)
       VALUES
        ('admin01', $1, '管理者太郎', 1, NULL, NULL,
         NULL, false, false, 'admin@nichino.co.jp', '', false,
         0, false,
         'SYSTEM', 'SYSTEM', NOW(), NOW())`,
      [passwordHash],
    );

    // MailService.sendPasswordReset is the integration boundary — replace
    // the real provider with a no-op spy so we can assert it fires.
    const mail = ctx.app.get(MailService);
    jest.spyOn(mail, 'sendPasswordReset').mockResolvedValue(undefined as any);
  });

  afterEach(async () => {
    await ctx.close();
  });

  function http() {
    return request(ctx.app.getHttpServer() as Server);
  }

  // ─── ACSMS-API-012-001 — Forgot Password ─────────────────────────────
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should insert t_mfa_otp row with otp_type=2 and call MailService when email exists', async () => {
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT account_id, otp_type, used_flg, expired_at
         FROM t_mfa_otp WHERE otp_type = 2`,
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].account_id)).toBe(1);
      expect(rows[0].used_flg).toBe(false);

      const mail = ctx.app.get(MailService);
      expect(mail.sendPasswordReset).toHaveBeenCalledWith(
        'admin@nichino.co.jp',
        expect.any(String),
        expect.stringContaining('reset-password?token='),
        expect.any(Number),
      );
    });

    it('should return 200 success without inserting any OTP when email does NOT exist', async () => {
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'nobody@example.com' })
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT count(*) AS c FROM t_mfa_otp WHERE otp_type = 2`,
      );
      expect(Number(rows[0].c)).toBe(0);

      const mail = ctx.app.get(MailService);
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should return 200 success without inserting any OTP when login_id and email do not match the same account', async () => {
      // login_id exists (admin01) but the email belongs to no account →
      // the (login_id AND email) pair matches nothing → silent success,
      // identical to an unknown email (anti-enumeration).
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'someone-else@example.com' })
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT count(*) AS c FROM t_mfa_otp WHERE otp_type = 2`,
      );
      expect(Number(rows[0].c)).toBe(0);
      const mail = ctx.app.get(MailService);
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when email format is invalid', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'not-an-email' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when login_id is missing', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@nichino.co.jp' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── ACSMS-API-012-002 — Verify Reset Token ──────────────────────────
  describe('POST /api/v1/auth/reset-password/verify', () => {
    it('should return 200 valid:true when a fresh token is verified', async () => {
      // Trigger the forgot-password flow to create a real bcrypt hash + row.
      // Capture the raw token from the mock URL passed to MailService.
      const mail = ctx.app.get(MailService);
      let capturedUrl = '';
      (mail.sendPasswordReset as jest.Mock).mockImplementation(
        async (_email: string, _accountName: string, url: string) => {
          capturedUrl = url;
        },
      );

      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(200);

      const token = new URL(capturedUrl).searchParams.get('token')!;
      expect(token).toMatch(/^[0-9a-f-]{36}$/i);

      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token })
        .expect(200);
      expect(res.body).toEqual({ data: { valid: true } });
    });

    it('should return 400 INVALID_RESET_TOKEN when token does not exist', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
    });
  });

  // ─── ACSMS-API-012-003 — Reset Password ──────────────────────────────
  describe('POST /api/v1/auth/reset-password', () => {
    async function requestResetToken(): Promise<string> {
      const mail = ctx.app.get(MailService);
      let capturedUrl = '';
      (mail.sendPasswordReset as jest.Mock).mockImplementation(
        async (_email: string, _accountName: string, url: string) => {
          capturedUrl = url;
        },
      );
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(200);
      return new URL(capturedUrl).searchParams.get('token')!;
    }

    it('should update password_hash, mark OTP used, and return success when token + passwords valid', async () => {
      const token = await requestResetToken();

      await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          new_password: 'BrandNewPass1',
          confirm_password: 'BrandNewPass1',
        })
        .expect(200);

      // Account password_hash changed
      const accountRows = await ctx.dataSource.query(
        `SELECT password_hash FROM m_account WHERE login_id = 'admin01'`,
      );
      expect(accountRows[0].password_hash).not.toBe(passwordHash);
      expect(
        await bcrypt.compare('BrandNewPass1', accountRows[0].password_hash),
      ).toBe(true);

      // OTP marked used
      const otpRows = await ctx.dataSource.query(
        `SELECT used_flg FROM t_mfa_otp WHERE otp_type = 2`,
      );
      expect(otpRows[0].used_flg).toBe(true);
    });

    it('should return 400 INVALID_RESET_TOKEN when token does not exist', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token: '00000000-0000-0000-0000-000000000000',
          new_password: 'BrandNewPass1',
          confirm_password: 'BrandNewPass1',
        })
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
    });

    it('should return 400 VALIDATION_ERROR when confirm_password does NOT match new_password', async () => {
      const token = await requestResetToken();

      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          new_password: 'BrandNewPass1',
          confirm_password: 'OtherPass99',
        })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'confirm_password' }),
        ]),
      );
    });

    it('should NOT allow reuse of a token after successful reset (used_flg=true → INVALID_RESET_TOKEN)', async () => {
      const token = await requestResetToken();

      await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          new_password: 'BrandNewPass1',
          confirm_password: 'BrandNewPass1',
        })
        .expect(200);

      // Second use must fail.
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          new_password: 'AnotherPass2',
          confirm_password: 'AnotherPass2',
        })
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
