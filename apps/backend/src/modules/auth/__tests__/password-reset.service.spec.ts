// @ts-nocheck — spec uses bcrypt.hash.mock.calls without cast; matches SCR-001 pattern
// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// AuthService unit specs covering APIs 012-001 (forgotPassword), 012-002
// (verifyResetToken), 012-003 (resetPassword). Source methods will be added
// to the existing AuthService class by /gen-code-backend.
//
// Pattern: plain `new AuthService(...)` with mocked deps — no Nest DI lifecycle.

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';

import { AuthService } from '../auth.service';
import {
  InvalidResetTokenException,
  ExpiredResetTokenException,
  PasswordResetRateLimitException,
} from '../exceptions/auth.exceptions';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { buildAccount } from '../../../../test/fixtures/auth.factory';
import { buildResetTokenOtp } from '../../../../test/fixtures/password-reset.factory';

const RESET_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const RESET_TOKEN_HASH = '$2a$10$resetTokenHashStubXxxxxxxxxxxxxxxxxxxxxxxxxxxx';

describe('AuthService — password reset (SCR-012)', () => {
  let service: AuthService;
  let mailService: any;
  let auditLog: any;
  let sessionService: any;
  let accountRepo: any;
  let otpRepo: any;
  let roleRepo: any;
  let rolePermRepo: any;
  let permRepo: any;
  let dataSource: any;
  let txManager: any;

  beforeEach(() => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset();

    mailService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };
    auditLog = {
      logLogin: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    sessionService = {
      create: jest.fn(),
      get: jest.fn(),
      touch: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined),
      destroyAllForAccount: jest.fn().mockResolvedValue(2),
    };

    accountRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };
    otpRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      // count() is used by forgotPassword for the per-hour rate limit.
      // Default 0 so unrelated tests skip the rate-limit branch.
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((o) => Promise.resolve({ ...o, otpId: 100 })),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    roleRepo = { findOne: jest.fn() };
    rolePermRepo = { find: jest.fn().mockResolvedValue([]) };
    permRepo = { find: jest.fn().mockResolvedValue([]) };

    txManager = {
      save: jest.fn((entityOrValue: any, maybeValue?: any) => maybeValue ?? entityOrValue),
      create: jest.fn((_Entity: any, payload: any) => payload),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((Entity: any) => {
        // pg-mem-style fallback so tx code that does
        // `manager.getRepository(MfaOtp).save(...)` works.
        const map = new Map<any, any>([
          [require('@/database/entities/mfa-otp.entity').MfaOtp, otpRepo],
          [require('@/database/entities/account.entity').Account, accountRepo],
        ]);
        return map.get(Entity) ?? otpRepo;
      }),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    service = new AuthService(
      mailService,
      auditLog,
      sessionService,
      accountRepo,
      otpRepo,
      roleRepo,
      rolePermRepo,
      permRepo,
      dataSource,
    );
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-001 — POST /api/v1/auth/forgot-password
  // ═════════════════════════════════════════════════════════════════════
  describe('forgotPassword', () => {
    it('should send reset email and return success message when account exists', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 1, email: 'admin@nichino.co.jp' }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      const result = await service.forgotPassword('admin@nichino.co.jp', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result).toEqual({
        message: 'パスワード再設定用のメールを送信しました。メールを確認してください。',
      });
      expect(mailService.sendPasswordReset).toHaveBeenCalledTimes(1);
      const sendCall = mailService.sendPasswordReset.mock.calls[0];
      expect(sendCall[0]).toBe('admin@nichino.co.jp');
      // Positional args: (email, accountName, resetUrl, expiryMinutes).
      // The fixture's default account_name is `管理者太郎`.
      expect(sendCall[1]).toBe('管理者太郎');
      expect(sendCall[2]).toMatch(/\/reset-password\?token=/);
      expect(typeof sendCall[3]).toBe('number');
    });

    it('should query m_account by email AND deleted_at IS NULL when looking up the account', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await service.forgotPassword('whoever@example.com', { ipAddress: '', userAgent: '' });
      const where = accountRepo.findOne.mock.calls[0][0]?.where ?? {};
      expect(where.email).toBe('whoever@example.com');
      expect(where).toHaveProperty('deletedAt');
    });

    it('should bcrypt-hash the reset token with 10 salt rounds when generating', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      await service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' });

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash.mock.calls[0][1]).toBe(10);
    });

    it('should persist the OTP row with otp_type=2 and 1-hour expiry when token is generated', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 7 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      const before = Date.now();

      await service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' });

      // Service may save via dataSource.transaction → txManager OR direct otpRepo.save.
      // Find whichever was called.
      const saveCalls = [
        ...otpRepo.save.mock.calls,
        ...txManager.save.mock.calls,
      ].map((c) => (c.length === 2 ? c[1] : c[0]));
      const saved = saveCalls.find((s) => s && s.otpType === 2);
      expect(saved).toBeDefined();
      expect(saved.accountId).toBe(7);
      expect(saved.otpType).toBe(2);
      expect(saved.usedFlg).toBe(false);
      expect(saved.otpCodeHash).toBe(RESET_TOKEN_HASH);
      const expiresInMs = new Date(saved.expiredAt).getTime() - before;
      // 60 minutes ≈ 3.6M ms — allow ±5s drift.
      expect(expiresInMs).toBeGreaterThan(60 * 60 * 1000 - 5_000);
      expect(expiresInMs).toBeLessThan(60 * 60 * 1000 + 5_000);
    });

    it('should still return 200 success message when email is NOT found (account enumeration prevention)', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com', {
        ipAddress: '',
        userAgent: '',
      });

      expect(result.message).toContain('パスワード再設定用のメールを送信しました');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(otpRepo.save).not.toHaveBeenCalled();
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('should wrap OTP save + audit log in dataSource.transaction when account exists', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      await service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback and NOT send email when transaction fails', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' }),
      ).rejects.toThrow();
      // Email is sent AFTER successful txn — rollback means it must NOT fire.
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' }),
      ).rejects.toThrow();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    // ── cooldown (security.md: 1 reset email per email address every 5 min) ─
    it('should query otpRepo.count with otp_type=2 + created_at > 5min ago when checking the cooldown', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 9 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      const before = Date.now();
      await service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' });

      expect(otpRepo.count).toHaveBeenCalledTimes(1);
      const where = otpRepo.count.mock.calls[0][0]?.where ?? {};
      expect(where.accountId).toBe(9);
      expect(where.otpType).toBe(2);
      // `MoreThan(date)` produces a FindOperator; the date arg should be
      // ~5 minutes before now (allow ±5s drift for test execution).
      const operator = where.createdAt;
      expect(operator).toBeDefined();
      const operatorDate = (operator?._value ?? operator) as Date;
      const ms = before - new Date(operatorDate).getTime();
      expect(ms).toBeGreaterThan(5 * 60 * 1000 - 5_000);
      expect(ms).toBeLessThan(5 * 60 * 1000 + 5_000);
    });

    it('should throw PASSWORD_RESET_RATE_LIMIT (429) on the 2nd request within the 5-minute cooldown', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      otpRepo.count.mockResolvedValue(1); // one row already issued in cooldown — next is rejected

      const err = await service
        .forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(PasswordResetRateLimitException);
      expect(err.message).toBe(
        '再送信は5分後に可能です。時間をおいてから再度お試しください。',
      );
      // Critical: cooldown must reject BEFORE issuing a token / sending mail.
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should NOT consult otpRepo.count when account does not exist (anti-enum bypass keeps preceding behavior)', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await service.forgotPassword('nobody@example.com', { ipAddress: '', userAgent: '' });

      expect(otpRepo.count).not.toHaveBeenCalled();
    });

    // ── prior-token invalidation ──────────────────────────────────────
    it('should invalidate every prior unused otp_type=2 row inside the transaction before saving the new token', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 11 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      await service.forgotPassword('admin@nichino.co.jp', { ipAddress: '', userAgent: '' });

      // The bulk-update happens via txManager.update(MfaOtp, { match }, { usedFlg: true }).
      // It must run BEFORE the new save so a concurrent verify-token query
      // can't accidentally hit a token that's about to be invalidated.
      const updateCall = txManager.update.mock.calls.find(
        (c) => c[0] === MfaOtp && c[2]?.usedFlg === true,
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toMatchObject({
        accountId: 11,
        otpType: 2,
        usedFlg: false,
      });

      // Order check: invalidate-update must precede the insert-save.
      const updateOrder = txManager.update.mock.invocationCallOrder[0];
      const saveOrder = txManager.save.mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(saveOrder);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-002 — POST /api/v1/auth/reset-password/verify
  // ═════════════════════════════════════════════════════════════════════
  describe('verifyResetToken', () => {
    it('should return { valid: true } when token matches an active OTP', async () => {
      const otp = buildResetTokenOtp({
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
        usedFlg: false,
      });
      otpRepo.find.mockResolvedValue([otp]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyResetToken(RESET_TOKEN);

      expect(result).toEqual({ valid: true });
      expect(otpRepo.find.mock.calls[0][0]?.where ?? {}).toMatchObject({ otpType: 2 });
    });

    it('should throw INVALID_RESET_TOKEN when no OTP row matches the supplied token', async () => {
      otpRepo.find.mockResolvedValue([buildResetTokenOtp()]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyResetToken('00000000-0000-0000-0000-000000000000'))
        .rejects.toThrow(InvalidResetTokenException);
    });

    it('should throw EXPIRED_RESET_TOKEN when matched OTP has expired_at in the past', async () => {
      const expired = buildResetTokenOtp({
        expiredAt: new Date(Date.now() - 60_000),
        usedFlg: false,
      });
      otpRepo.find.mockResolvedValue([expired]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.verifyResetToken(RESET_TOKEN))
        .rejects.toThrow(ExpiredResetTokenException);
    });

    it('should throw INVALID_RESET_TOKEN when matched OTP has used_flg=true', async () => {
      const used = buildResetTokenOtp({
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
        usedFlg: true,
      });
      otpRepo.find.mockResolvedValue([used]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.verifyResetToken(RESET_TOKEN))
        .rejects.toThrow(InvalidResetTokenException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-003 — POST /api/v1/auth/reset-password
  // ═════════════════════════════════════════════════════════════════════
  describe('resetPassword', () => {
    const NEW_PASS = 'NewPass123!@';
    const NEW_HASH = '$2a$10$newPasswordHashStubXxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    function arrangeHappyPath() {
      const otp = buildResetTokenOtp({
        otpId: 100,
        accountId: 1,
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
        usedFlg: false,
      });
      otpRepo.find.mockResolvedValue([otp]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      accountRepo.findOne.mockResolvedValue(
        buildAccount({ accountId: 1, loginId: 'admin01' }),
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue(NEW_HASH);
      return otp;
    }

    it('should update m_account.password_hash and return success message when token + passwords are valid', async () => {
      arrangeHappyPath();

      const result = await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(result).toEqual({
        message: 'パスワードを更新しました。ログイン画面に移動します。',
      });
      // m_account.update OR txManager.update was called with password_hash.
      const allUpdates = [
        ...accountRepo.update.mock.calls,
        ...txManager.update.mock.calls,
      ];
      const accountUpdate = allUpdates.find((c) =>
        JSON.stringify(c).includes('passwordHash'),
      );
      expect(accountUpdate).toBeDefined();
    });

    it('should hash the new password with bcrypt 10 rounds when updating', async () => {
      arrangeHappyPath();

      await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '', userAgent: '' },
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(NEW_PASS, 10);
    });

    it('should mark the OTP row as used_flg=true when password update succeeds', async () => {
      arrangeHappyPath();

      await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '', userAgent: '' },
      );

      const allUpdates = [
        ...otpRepo.update.mock.calls,
        ...txManager.update.mock.calls,
      ];
      const otpUpdate = allUpdates.find((c) =>
        JSON.stringify(c).includes('usedFlg'),
      );
      expect(otpUpdate).toBeDefined();
    });

    it('should destroy all Redis sessions for the account when password update succeeds', async () => {
      arrangeHappyPath();

      await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '', userAgent: '' },
      );

      expect(sessionService.destroyAllForAccount).toHaveBeenCalledWith(1);
    });

    it('should throw VALIDATION_ERROR when confirm_password does NOT match new_password', async () => {
      arrangeHappyPath();

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: 'OtherPass99' },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'confirm_password' }),
          ]),
        }),
      });
    });

    it('should throw VALIDATION_ERROR when new_password contains only one character category (alpha-only)', async () => {
      arrangeHappyPath();
      // 'OnlyLetters' passes DTO (length 8-32, half-width) but only has
      // alpha — service-layer category check should reject.
      const ALPHA_ONLY = 'OnlyLetters';
      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: ALPHA_ONLY, confirm_password: ALPHA_ONLY },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'new_password',
              message: expect.stringContaining('半角英字・数字・記号'),
            }),
          ]),
        }),
      });
    });

    it('should throw VALIDATION_ERROR when new_password is identical to login_id', async () => {
      const otp = buildResetTokenOtp({ accountId: 1 });
      otpRepo.find.mockResolvedValue([otp]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      accountRepo.findOne.mockResolvedValue(
        buildAccount({ accountId: 1, loginId: 'NewPass123' }),
      );

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: 'NewPass123', confirm_password: 'NewPass123' },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'VALIDATION_ERROR' }),
      });
    });

    it('should throw INVALID_RESET_TOKEN when no OTP matches the token', async () => {
      otpRepo.find.mockResolvedValue([]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('should throw EXPIRED_RESET_TOKEN when matched OTP has expired', async () => {
      const expired = buildResetTokenOtp({
        expiredAt: new Date(Date.now() - 60_000),
        usedFlg: false,
      });
      otpRepo.find.mockResolvedValue([expired]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toThrow(ExpiredResetTokenException);
    });

    it('should throw INVALID_RESET_TOKEN when target account does not exist', async () => {
      const otp = buildResetTokenOtp({ accountId: 999 });
      otpRepo.find.mockResolvedValue([otp]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('should wrap account update + OTP invalidate + audit log in dataSource.transaction', async () => {
      arrangeHappyPath();

      await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '', userAgent: '' },
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback and NOT destroy sessions when audit log fails inside the transaction', async () => {
      arrangeHappyPath();
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit failed'));
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        try { return await cb(txManager); } catch (e) { throw e; }
      });

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toThrow();
      expect(sessionService.destroyAllForAccount).not.toHaveBeenCalled();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      arrangeHappyPath();
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.resetPassword(
          { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
          { ipAddress: '', userAgent: '' },
        ),
      ).rejects.toThrow();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should write a t_log row with operation=PASSWORD_RESET when update succeeds', async () => {
      arrangeHappyPath();

      await service.resetPassword(
        { token: RESET_TOKEN, new_password: NEW_PASS, confirm_password: NEW_PASS },
        { ipAddress: '', userAgent: '' },
      );

      expect(auditLog.logOperation).toHaveBeenCalled();
      const callArgs = auditLog.logOperation.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        operation: 'PASSWORD_RESET',
        targetTable: 'm_account',
        accountId: 1,
      });
    });
  });
});
