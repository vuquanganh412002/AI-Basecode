// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面
//
// AuthService unit specs covering APIs 001-001 (login), 001-002 (verifyMfa),
// 001-003 (resendMfa), 001-004 (refreshSession), 001-005 (logout). Tests
// derive 1-to-1 from api.md clauses (リクエストパラメータ + レスポンスデータ
// + エラー一覧 + §4.x 処理手順).
//
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
import { AuthService } from './auth.service';
import {
  AccountLockedException,
  InvalidCredentialsException,
  InvalidMfaTokenException,
  InvalidOtpException,
  OtpExpiredException,
  OtpMaxAttemptsException,
  OtpResendCooldownException,
  OtpResendLimitException,
} from './exceptions/auth.exceptions';
import { UnauthorizedException } from '../../common/exceptions/common.exceptions';
import {
  buildAccount,
  buildChuokaiAccount,
  buildLockedAccount,
  buildOtp,
  buildRole,
  ADMIN_PERMISSIONS,
} from '../../../test/fixtures/auth.factory';

describe('AuthService', () => {
  let service: AuthService;
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

    service = new AuthService(
      mailService,
      auditLog,
      sessionService,
      accountRepo,
      otpRepo,
      roleRepo,
      rolePermRepo,
      permRepo,
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
