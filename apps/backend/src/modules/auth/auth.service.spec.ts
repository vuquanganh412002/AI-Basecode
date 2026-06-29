// Screen: ACSMS-SCR-001 — ログイン画面 (login + MFA + refresh + logout)
//         ACSMS-SCR-012 — パスワードの再設定・パスワードの変更 (forgot / reset)
//
// Both SCRs share the same AuthService class. Tests are organised as two
// sibling top-level describe blocks so each has its own mock scope —
// SCR-001 wires bcrypt + repo mocks for login flow, SCR-012 adds
// dataSource / txManager for the transactional password-reset path.
// Pattern: plain `new AuthService(...)` with mocked deps — no Nest DI
// lifecycle needed here.

// bcryptjs exports `compare` and `hash` as non-configurable properties, so
// jest.spyOn() throws "Cannot redefine property". Mock the whole module up
// front; individual tests override the implementation as needed.
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';

import { UnauthorizedException } from '@/common/exceptions/common.exceptions';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { AuthService } from '@/modules/auth/auth.service';
import {
  AccountLockedException,
  ExpiredResetTokenException,
  InvalidCredentialsException,
  InvalidMfaTokenException,
  InvalidOtpException,
  InvalidResetTokenException,
  OtpExpiredException,
  OtpMaxAttemptsException,
  OtpResendCooldownException,
  OtpResendLimitException,
  PasswordResetRateLimitException,
} from '@/modules/auth/exceptions/auth.exceptions';
import {
  ADMIN_PERMISSIONS,
  buildAccount,
  buildChuokaiAccount,
  buildLockedAccount,
  buildOtp,
  buildRole,
} from '@test/fixtures/auth.factory';
import { buildResetTokenOtp } from '@test/fixtures/password-reset.factory';

/**
 * Stateful in-memory RedisService stub for the mfa_token → otp_id binding.
 * Backed by a Map so login()→issueOtp() (setEx) and verifyMfa()/resendMfa()
 * (get/del) round-trip the token exactly like the real Redis would.
 */
function makeRedisMock() {
  const store = new Map<string, string>();
  return {
    setEx: jest.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (...keys: string[]) => {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n += 1;
      return n;
    }),
  };
}

describe('AuthService — SCR-001 (login + MFA + refresh + logout)', () => {
  let service: AuthService;
  let redis: ReturnType<typeof makeRedisMock>;
  let mailService: any;
  let auditLog: any;
  let sessionService: any;
  let accountRepo: any;
  let otpRepo: any;
  let roleRepo: any;
  let rolePermRepo: any;
  let permRepo: any;
  let qbMock: any;
  let updateQbMock: any;
  let accountUpdateQbMock: any;

  beforeEach(() => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset();

    mailService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    };
    auditLog = {
      logLogin: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };
    sessionService = {
      create: jest.fn().mockResolvedValue('new-session-uuid'),
      get: jest.fn(),
      touch: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined),
      destroyAllForAccount: jest.fn(),
    };

    // accountUpdateQbMock is the chainable mock returned by
    // accountRepo.createQueryBuilder() — used by login() to atomically
    // increment login_failure_count and conditionally flip account_lock_flg.
    accountUpdateQbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    accountRepo = {
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(() => accountUpdateQbMock),
    };

    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(
        ADMIN_PERMISSIONS.map((p) => ({ permission_code: p })),
      ),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn(),
    };

    updateQbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    otpRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      increment: jest.fn().mockResolvedValue({}),
      save: jest.fn(),
      create: jest.fn((v) => v),
      createQueryBuilder: jest.fn(() => updateQbMock),
    };

    roleRepo = {
      findOne: jest.fn().mockResolvedValue(buildRole()),
    };
    rolePermRepo = {
      createQueryBuilder: jest.fn(() => qbMock),
    };
    permRepo = {};
    redis = makeRedisMock();

    service = new AuthService(
      mailService,
      auditLog,
      sessionService,
      accountRepo,
      otpRepo,
      roleRepo,
      rolePermRepo,
      permRepo,
      redis as any,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  // ───────────────────────────────────────────────────────────────────
  // API ACSMS-API-001-001 — POST /api/v1/auth/login
  // ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

    it('should throw INVALID_CREDENTIALS when login_id is not found', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ login_id: 'nope', password: 'P@ssw0rd' }, ctx),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);

      expect(accountRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ loginId: 'nope' }) }),
      );
      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({ loginId: 'nope', loginResult: 2 }),
      );
    });

    it('should throw ACCOUNT_LOCKED with the admin-contact message when account is already locked', async () => {
      accountRepo.findOne.mockResolvedValue(buildLockedAccount());

      const err = await service
        .login({ login_id: 'admin01', password: 'P@ssw0rd123' }, ctx)
        .catch((e) => e);

      expect(err).toBeInstanceOf(AccountLockedException);
      expect(err.message).toBe(
        'アカウントがロックされています。管理者へお問い合わせください。',
      );
      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          loginResult: 2,
          failureReason: 'account_locked',
        }),
      );
      // bcrypt.compare must NOT be called once we know the account is locked.
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CREDENTIALS and atomically increment failure count when password mismatches', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ loginFailureCount: 0 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(
        service.login({ login_id: 'admin01', password: 'wrong-pass' }, ctx),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);

      // Atomic UPDATE via QueryBuilder — replaces the old `increment(...)`
      // call so the failure-count bump and the conditional auto-lock both
      // happen in a single SQL statement.
      expect(accountRepo.createQueryBuilder).toHaveBeenCalled();
      expect(accountUpdateQbMock.update).toHaveBeenCalled();
      expect(accountUpdateQbMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          loginFailureCount: expect.any(Function),
          accountLockFlg: expect.any(Function),
          accountLockAt: expect.any(Function),
        }),
      );
      expect(accountUpdateQbMock.where).toHaveBeenCalledWith('account_id = :id', {
        id: 1,
      });
      expect(accountUpdateQbMock.execute).toHaveBeenCalled();
      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          loginResult: 2,
          failureReason: 'invalid_password',
        }),
      );
    });

    it('should embed the threshold (5) in the CASE expression so the 5th wrong password auto-locks the account', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ loginFailureCount: 4 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(
        service.login({ login_id: 'admin01', password: 'wrong-pass' }, ctx),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);

      // Capture the raw-expression patch passed to set(...) and verify the
      // threshold appears in the lock-flag CASE expression. This guards
      // against accidental threshold drift.
      const patch = accountUpdateQbMock.set.mock.calls[0][0];
      expect(patch.loginFailureCount()).toContain('"login_failure_count" + 1');
      expect(patch.accountLockFlg()).toMatch(
        /CASE WHEN "login_failure_count" \+ 1 >= 5 THEN true ELSE "account_lock_flg" END/,
      );
      expect(patch.accountLockAt()).toMatch(
        /CASE WHEN "login_failure_count" \+ 1 >= 5 THEN NOW\(\) ELSE "account_lock_at" END/,
      );
    });

    it('should reset failure count and stamp last_login_at when password matches', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ loginFailureCount: 3 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      await service.login({ login_id: 'admin01', password: 'P@ssw0rd123' }, ctx);

      expect(accountRepo.update).toHaveBeenCalledWith(
        { accountId: 1 },
        expect.objectContaining({ loginFailureCount: 0, lastLoginAt: expect.any(Date) }),
      );
    });

    it('should return mfa_required=true with mfa_token + expires_in=300 when mfa_enable_flg=true', async () => {
      accountRepo.findOne.mockResolvedValue(
        buildChuokaiAccount({ mfaEnableFlg: true }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-otp' as never);
      otpRepo.save.mockResolvedValue({ otpId: 999 });

      const result = await service.login(
        { login_id: 'chuokai01', password: 'P@ssw0rd123' },
        ctx,
      );

      expect(result).toEqual(
        expect.objectContaining({
          mfa_required: true,
          mfa_token: expect.any(String),
          expires_in: 300,
        }),
      );
      expect(mailService.sendOtp).toHaveBeenCalledWith(
        'chuokai@ja-example.or.jp',
        '中央会太郎',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(otpRepo.save).toHaveBeenCalled();
      // Login log entry — MFA path is still logged as success.
      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({ loginResult: 1, failureReason: 'mfa_required' }),
      );
    });

    it('should create session and return user when mfa_enable_flg=false', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      const result = await service.login(
        { login_id: 'admin01', password: 'P@ssw0rd123' },
        ctx,
      );

      expect(result).toEqual(
        expect.objectContaining({
          mfa_required: false,
          session_id: 'new-session-uuid',
          user: expect.objectContaining({
            account_id: 1,
            login_id: 'admin01',
            account_name: '管理者太郎',
            role_id: 1,
            role_code: 'NICHINO_ADMIN',
            role_name: '日農（管理者）',
            ja_id: null,
            kanri_shiten_id: null,
            todofuken_code: null,
            paper_flg: false,
            denshi_flg: false,
            email: 'admin@nichino.co.jp',
            mfa_enable_flg: false,
            permissions: ADMIN_PERMISSIONS,
          }),
        }),
      );
      expect(sessionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 1,
          login_id: 'admin01',
          role_code: 'NICHINO_ADMIN',
          permissions: ADMIN_PERMISSIONS,
        }),
      );
    });

    it('should record successful login to t_login_log when login completes with no MFA', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      await service.login({ login_id: 'admin01', password: 'P@ssw0rd123' }, ctx);

      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          loginId: 'admin01',
          loginResult: 1,
          ipAddress: '127.0.0.1',
        }),
      );
    });

    it('should fetch role permissions ORDER BY permission_id ASC when building user payload', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      await service.login({ login_id: 'admin01', password: 'P@ssw0rd123' }, ctx);

      expect(qbMock.orderBy).toHaveBeenCalledWith('p.permission_id', 'ASC');
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API ACSMS-API-001-002 — POST /api/v1/auth/mfa/verify
  // ───────────────────────────────────────────────────────────────────
  describe('verifyMfa', () => {
    const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

    async function issueMfaToken(): Promise<string> {
      accountRepo.findOne.mockResolvedValueOnce(
        buildChuokaiAccount({ mfaEnableFlg: true }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true as never);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-otp' as never);
      otpRepo.save.mockResolvedValueOnce({ otpId: 100 });
      const result = await service.login(
        { login_id: 'chuokai01', password: 'P@ssw0rd123' },
        ctx,
      );
      return (result as { mfa_token: string }).mfa_token;
    }

    it('should throw INVALID_MFA_TOKEN when mfa_token is unknown', async () => {
      await expect(
        service.verifyMfa('unknown-token', '123456', ctx),
      ).rejects.toBeInstanceOf(InvalidMfaTokenException);
    });

    it('should throw INVALID_MFA_TOKEN when otp record is missing or used', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyMfa(token, '123456', ctx)).rejects.toBeInstanceOf(
        InvalidMfaTokenException,
      );
    });

    it('should throw OTP_EXPIRED and invalidate when expired_at < NOW()', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(
        buildOtp({ expiredAt: new Date(Date.now() - 60_000) }),
      );

      await expect(service.verifyMfa(token, '123456', ctx)).rejects.toBeInstanceOf(
        OtpExpiredException,
      );
      expect(otpRepo.update).toHaveBeenCalledWith(
        { otpId: 100 },
        { usedFlg: true },
      );
    });

    it('should throw OTP_MAX_ATTEMPTS when verify_attempt_count >= 5', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(buildOtp({ verifyAttemptCount: 5 }));

      await expect(service.verifyMfa(token, '123456', ctx)).rejects.toBeInstanceOf(
        OtpMaxAttemptsException,
      );
      expect(otpRepo.update).toHaveBeenCalledWith(
        { otpId: 100 },
        { usedFlg: true },
      );
    });

    it('should throw INVALID_OTP and increment attempt when otp_code mismatches', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(buildOtp({ verifyAttemptCount: 1 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(service.verifyMfa(token, '999999', ctx)).rejects.toBeInstanceOf(
        InvalidOtpException,
      );
      expect(otpRepo.increment).toHaveBeenCalledWith(
        { otpId: 100 },
        'verifyAttemptCount',
        1,
      );
    });

    it('should throw OTP_MAX_ATTEMPTS and invalidate when increment crosses 5', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(buildOtp({ verifyAttemptCount: 4 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(service.verifyMfa(token, '999999', ctx)).rejects.toBeInstanceOf(
        OtpMaxAttemptsException,
      );
    });

    it('should mark OTP used and create session when otp_code matches', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(buildOtp({ accountId: 3 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      accountRepo.findOne.mockResolvedValue(buildChuokaiAccount());
      roleRepo.findOne.mockResolvedValue(
        buildRole({ roleId: 3, roleCode: 'CHUOKAI', roleName: '中央会' }),
      );

      const result = await service.verifyMfa(token, '123456', ctx);

      expect(otpRepo.update).toHaveBeenCalledWith(
        { otpId: 100 },
        { usedFlg: true },
      );
      expect(result).toEqual(
        expect.objectContaining({
          mfa_required: false,
          session_id: 'new-session-uuid',
          user: expect.objectContaining({
            account_id: 3,
            role_code: 'CHUOKAI',
            ja_id: 1,
          }),
        }),
      );
      expect(auditLog.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 3, loginResult: 1 }),
      );
    });

    it('should throw INVALID_MFA_TOKEN when account is gone after OTP verify (deleted)', async () => {
      const token = await issueMfaToken();
      otpRepo.findOne.mockResolvedValue(buildOtp({ accountId: 3 }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyMfa(token, '123456', ctx)).rejects.toBeInstanceOf(
        InvalidMfaTokenException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API ACSMS-API-001-003 — POST /api/v1/auth/mfa/resend
  // ───────────────────────────────────────────────────────────────────
  describe('resendMfa', () => {
    async function issueToken(): Promise<string> {
      accountRepo.findOne.mockResolvedValueOnce(
        buildChuokaiAccount({ mfaEnableFlg: true }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true as never);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-otp' as never);
      otpRepo.save.mockResolvedValueOnce({ otpId: 100 });
      const result = await service.login(
        { login_id: 'chuokai01', password: 'P@ssw0rd123' },
        { ipAddress: '127.0.0.1' },
      );
      return (result as { mfa_token: string }).mfa_token;
    }

    it('should throw INVALID_MFA_TOKEN when mfa_token is unknown', async () => {
      await expect(service.resendMfa('unknown-token')).rejects.toBeInstanceOf(
        InvalidMfaTokenException,
      );
    });

    it('should throw INVALID_MFA_TOKEN when OTP record missing/used', async () => {
      const token = await issueToken();
      otpRepo.findOne.mockResolvedValue(null);

      await expect(service.resendMfa(token)).rejects.toBeInstanceOf(
        InvalidMfaTokenException,
      );
    });

    it('should throw OTP_RESEND_LIMIT and invalidate when resend_count >= 3', async () => {
      const token = await issueToken();
      otpRepo.findOne.mockResolvedValue(
        buildOtp({
          resendCount: 3,
          createdAt: new Date(Date.now() - 120_000),
        }),
      );

      await expect(service.resendMfa(token)).rejects.toBeInstanceOf(
        OtpResendLimitException,
      );
      expect(otpRepo.update).toHaveBeenCalledWith(
        { otpId: 100 },
        { usedFlg: true },
      );
    });

    it('should throw OTP_RESEND_COOLDOWN when last send < 60 seconds ago', async () => {
      const token = await issueToken();
      otpRepo.findOne.mockResolvedValue(
        buildOtp({
          resendCount: 1,
          createdAt: new Date(Date.now() - 30_000),
        }),
      );

      await expect(service.resendMfa(token)).rejects.toBeInstanceOf(
        OtpResendCooldownException,
      );
    });

    it('should issue new OTP and return mfa_token + expires_in=300 + resend_count + max_resend=3 when within limits', async () => {
      const token = await issueToken();
      otpRepo.findOne.mockResolvedValue(
        buildOtp({
          resendCount: 1,
          createdAt: new Date(Date.now() - 120_000),
        }),
      );
      accountRepo.findOne.mockResolvedValue(buildChuokaiAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash' as never);
      otpRepo.save.mockResolvedValue({ otpId: 200 });

      const result = await service.resendMfa(token);

      expect(result).toEqual({
        mfa_token: expect.any(String),
        expires_in: 300,
        resend_count: 2,
        max_resend: 3,
      });
      // Old OTP invalidated.
      expect(otpRepo.update).toHaveBeenCalledWith(
        { otpId: 100 },
        { usedFlg: true },
      );
      expect(mailService.sendOtp).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API ACSMS-API-001-004 — POST /api/v1/auth/refresh
  // ───────────────────────────────────────────────────────────────────
  describe('refreshSession', () => {
    it('should throw UNAUTHORIZED when sessionId is undefined', async () => {
      await expect(service.refreshSession(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should throw UNAUTHORIZED when Redis has no payload (expired)', async () => {
      sessionService.touch.mockResolvedValue(null);

      await expect(service.refreshSession('sid-123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should destroy session and throw UNAUTHORIZED when account is missing or locked', async () => {
      sessionService.touch.mockResolvedValue({
        account_id: 1,
        login_id: 'admin01',
        role_id: 1,
        role_code: 'NICHINO_ADMIN',
        ja_id: null,
        kanri_shiten_id: null,
        permissions: [],
        created_at: '',
        last_activity_at: '',
      });
      accountRepo.findOne.mockResolvedValue(buildLockedAccount());

      await expect(service.refreshSession('sid-123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionService.destroy).toHaveBeenCalledWith('sid-123');
    });

    it('should return refreshed user payload with permissions when session is valid', async () => {
      sessionService.touch.mockResolvedValue({
        account_id: 1,
        login_id: 'admin01',
        role_id: 1,
        role_code: 'NICHINO_ADMIN',
        ja_id: null,
        kanri_shiten_id: null,
        permissions: [],
        created_at: '',
        last_activity_at: '',
      });
      accountRepo.findOne.mockResolvedValue(buildAccount());

      const user = await service.refreshSession('sid-123');

      expect(user).toEqual(
        expect.objectContaining({
          account_id: 1,
          login_id: 'admin01',
          role_code: 'NICHINO_ADMIN',
          permissions: ADMIN_PERMISSIONS,
        }),
      );
      // Refresh path reuses the existing session — sessionService.create
      // must NOT be called again.
      expect(sessionService.create).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API ACSMS-API-001-005 — POST /api/v1/auth/logout
  // ───────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should be a no-op when sessionId is undefined', async () => {
      await service.logout(undefined);
      expect(sessionService.destroy).not.toHaveBeenCalled();
    });

    it('should call sessionService.destroy when sessionId is provided', async () => {
      await service.logout('sid-abc');
      expect(sessionService.destroy).toHaveBeenCalledWith('sid-abc');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-012 — Password reset (forgotPassword / verifyResetToken /
// resetPassword). Separate top-level describe so its dataSource +
// txManager mocks (transactional path) don't leak into the SCR-001
// block above, which constructs AuthService without a dataSource arg.
// ═══════════════════════════════════════════════════════════════════════

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
      makeRedisMock() as any,
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

      const result = await service.forgotPassword('admin01', 'admin@nichino.co.jp',{
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

    it('should query m_account by login_id AND email AND deleted_at IS NULL when looking up the account', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await service.forgotPassword('someuser', 'whoever@example.com', {
        ipAddress: '',
        userAgent: '',
      });
      const where = accountRepo.findOne.mock.calls[0][0]?.where ?? {};
      expect(where.loginId).toBe('someuser');
      expect(where.email).toBe('whoever@example.com');
      expect(where).toHaveProperty('deletedAt');
    });

    it('should bcrypt-hash the reset token with 10 salt rounds when generating', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      await service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' });

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect((bcrypt.hash as jest.Mock).mock.calls[0][1]).toBe(10);
    });

    it('should persist the OTP row with otp_type=2 and 1-hour expiry when token is generated', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 7 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      const before = Date.now();

      await service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' });

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

    it('should still return 200 success message when the login_id/email pair is NOT found (account enumeration prevention)', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('ghost', 'nobody@example.com', {
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

      await service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback and NOT send email when transaction fails', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' }),
      ).rejects.toThrow();
      // Email is sent AFTER successful txn — rollback means it must NOT fire.
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount());
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' }),
      ).rejects.toThrow();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    // ── cooldown (security.md: 1 reset email per email address every 5 min) ─
    it('should query otpRepo.count with otp_type=2 + created_at > 5min ago when checking the cooldown', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 9 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      const before = Date.now();
      await service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' });

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
        .forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' })
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

      await service.forgotPassword('ghost', 'nobody@example.com', {
        ipAddress: '',
        userAgent: '',
      });

      expect(otpRepo.count).not.toHaveBeenCalled();
    });

    // ── prior-token invalidation ──────────────────────────────────────
    it('should invalidate every prior unused otp_type=2 row inside the transaction before saving the new token', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ accountId: 11 }));
      (bcrypt.hash as jest.Mock).mockResolvedValue(RESET_TOKEN_HASH);

      await service.forgotPassword('admin01', 'admin@nichino.co.jp',{ ipAddress: '', userAgent: '' });

      // The bulk-update happens via txManager.update(MfaOtp, { match }, { usedFlg: true }).
      // It must run BEFORE the new save so a concurrent verify-token query
      // can't accidentally hit a token that's about to be invalidated.
      const updateCall = txManager.update.mock.calls.find(
        (c: any[]) => c[0] === MfaOtp && c[2]?.usedFlg === true,
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
