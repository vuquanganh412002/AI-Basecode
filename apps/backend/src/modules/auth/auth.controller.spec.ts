// Screen: ACSMS-SCR-001 — ログイン画面 (login + MFA + refresh + logout)
//         ACSMS-SCR-012 — パスワードの再設定・パスワードの変更 (forgot / reset)
//
// All three SCRs share the same AuthController class. Tests are organised
// as three sibling top-level describe blocks so each has its own mock
// scope:
//   1. AuthController (HTTP) — SCR-001 happy-path HTTP specs via supertest
//   2. AuthController — branch coverage — direct controller-method calls
//      to exercise clientContext / cookieOptions / readSessionId branches
//      that supertest can't reach
//   3. AuthController — password reset (HTTP) — SCR-012 supertest specs

import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';

import { API_PREFIX } from '@/common/constants/api.constants';
import { UnauthorizedException as DomainUnauthorizedException } from '@/common/exceptions/common.exceptions';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { AuthController } from '@/modules/auth/auth.controller';
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
import { ADMIN_PERMISSIONS } from '@test/fixtures/auth.factory';

const SESSION_SECRET = 'test-secret-32-bytes-xxxxxxxxxxxx';

describe('AuthController (HTTP) — SCR-001 (login + MFA + refresh + logout)', () => {
  let app: INestApplication;
  let service: any;

  const userPayload = {
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
  };

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      verifyMfa: jest.fn(),
      resendMfa: jest.fn(),
      refreshSession: jest.fn(),
      logout: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 24 * 60 * 60,
          'session.secret': SESSION_SECRET,
          nodeEnv: 'test',
        };
        return values[key];
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser(SESSION_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const details = errors.map((e) => ({
            field: e.property,
            message: Object.values(e.constraints || {})[0] ?? '入力値が不正です',
          }));
          return new HttpException(
            {
              code: 'VALIDATION_ERROR',
              error_code: 'VALIDATION_ERROR',
              message:
                '入力値が不正です。詳細はerrorsフィールドを確認してください。',
              errors: details,
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login (API-001-001)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with mfa_required=false + user + Set-Cookie when login succeeds without MFA', async () => {
      service.login.mockResolvedValue({
        mfa_required: false,
        session_id: 'sid-uuid',
        user: userPayload,
      });

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'P@ssw0rd123' })
        .expect(200);

      expect(res.body.data.mfa_required).toBe(false);
      expect(res.body.data.user).toEqual(userPayload);
      // Set-Cookie should carry session_id (signed) with HttpOnly + SameSite=Strict.
      const setCookie = res.headers['set-cookie'];
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /session_id=s%3A/i,
      );
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /HttpOnly/i,
      );
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /SameSite=Strict/i,
      );
    });

    it('should return 200 with mfa_required=true + mfa_token + expires_in when MFA is required', async () => {
      service.login.mockResolvedValue({
        mfa_required: true,
        mfa_token: '550e8400-e29b-41d4-a716-446655440000',
        expires_in: 300,
      });

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'chuokai01', password: 'P@ssw0rd123' })
        .expect(200);

      expect(res.body.data).toEqual({
        mfa_required: true,
        mfa_token: '550e8400-e29b-41d4-a716-446655440000',
        expires_in: 300,
      });
      // No session cookie when MFA still pending.
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('should return 400 VALIDATION_ERROR when login_id is missing', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ password: 'P@ssw0rd123' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'login_id' }),
            ]),
          );
        });
    });

    it('should return 400 VALIDATION_ERROR when password is shorter than 8 chars', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'short' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'password' }),
            ]),
          );
        });
    });

    it('should return 401 INVALID_CREDENTIALS when service throws InvalidCredentialsException', async () => {
      service.login.mockRejectedValue(new InvalidCredentialsException());

      await http()
        .post('/api/v1/auth/login')
        // 8+ chars + half-width — passes DTO validation so the request
        // reaches the service layer (which is what we're asserting).
        .send({ login_id: 'admin01', password: 'WrongPass1' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should return 401 ACCOUNT_LOCKED with the admin-contact message when service throws AccountLockedException', async () => {
      service.login.mockRejectedValue(new AccountLockedException());

      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'WrongPass1' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('ACCOUNT_LOCKED');
          expect(res.body.message).toBe(
            'アカウントがロックされています。管理者へお問い合わせください。',
          );
        });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/mfa/verify (API-001-002)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/mfa/verify', () => {
    it('should return 200 with user + Set-Cookie when OTP verifies', async () => {
      service.verifyMfa.mockResolvedValue({
        mfa_required: false,
        session_id: 'sid-uuid-2',
        user: userPayload,
      });

      const res = await http()
        .post('/api/v1/auth/mfa/verify')
        .send({
          mfa_token: '550e8400-e29b-41d4-a716-446655440000',
          otp_code: '123456',
        })
        .expect(200);

      expect(res.body.data.user).toEqual(userPayload);
      const setCookie = res.headers['set-cookie'];
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /session_id=s%3A/i,
      );
    });

    it('should return 400 VALIDATION_ERROR when otp_code is not 6 digits', async () => {
      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({ mfa_token: 't', otp_code: '12' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when mfa_token is missing', async () => {
      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({ otp_code: '123456' })
        .expect(400);
    });

    it('should return 401 INVALID_OTP when service throws InvalidOtpException', async () => {
      service.verifyMfa.mockRejectedValue(new InvalidOtpException());

      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({
          mfa_token: '550e8400-e29b-41d4-a716-446655440000',
          otp_code: '999999',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_OTP');
        });
    });

    it('should return 401 OTP_EXPIRED when service throws OtpExpiredException', async () => {
      service.verifyMfa.mockRejectedValue(new OtpExpiredException());

      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({
          mfa_token: '550e8400-e29b-41d4-a716-446655440000',
          otp_code: '123456',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('OTP_EXPIRED');
        });
    });

    it('should return 401 OTP_MAX_ATTEMPTS when service throws OtpMaxAttemptsException', async () => {
      service.verifyMfa.mockRejectedValue(new OtpMaxAttemptsException());

      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({
          mfa_token: '550e8400-e29b-41d4-a716-446655440000',
          otp_code: '123456',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('OTP_MAX_ATTEMPTS');
        });
    });

    it('should return 401 INVALID_MFA_TOKEN when service throws InvalidMfaTokenException', async () => {
      service.verifyMfa.mockRejectedValue(new InvalidMfaTokenException());

      await http()
        .post('/api/v1/auth/mfa/verify')
        .send({ mfa_token: 'unknown', otp_code: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_MFA_TOKEN');
        });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/mfa/resend (API-001-003)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/mfa/resend', () => {
    it('should return 200 with new mfa_token + expires_in + resend_count + max_resend when resend succeeds', async () => {
      service.resendMfa.mockResolvedValue({
        mfa_token: '660e8400-e29b-41d4-a716-446655440001',
        expires_in: 300,
        resend_count: 2,
        max_resend: 3,
      });

      const res = await http()
        .post('/api/v1/auth/mfa/resend')
        .send({ mfa_token: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(200);

      expect(res.body.data).toEqual({
        mfa_token: '660e8400-e29b-41d4-a716-446655440001',
        expires_in: 300,
        resend_count: 2,
        max_resend: 3,
      });
    });

    it('should return 400 VALIDATION_ERROR when mfa_token is empty', async () => {
      await http()
        .post('/api/v1/auth/mfa/resend')
        .send({ mfa_token: '' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 401 INVALID_MFA_TOKEN when service throws InvalidMfaTokenException', async () => {
      service.resendMfa.mockRejectedValue(new InvalidMfaTokenException());

      await http()
        .post('/api/v1/auth/mfa/resend')
        .send({ mfa_token: 'unknown' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_MFA_TOKEN');
        });
    });

    it('should return 429 OTP_RESEND_LIMIT when resend cap reached', async () => {
      service.resendMfa.mockRejectedValue(new OtpResendLimitException());

      await http()
        .post('/api/v1/auth/mfa/resend')
        .send({ mfa_token: 'x' })
        .expect(429)
        .expect((res) => {
          expect(res.body.error_code).toBe('OTP_RESEND_LIMIT');
        });
    });

    it('should return 429 OTP_RESEND_COOLDOWN when called within 60s cooldown', async () => {
      service.resendMfa.mockRejectedValue(new OtpResendCooldownException());

      await http()
        .post('/api/v1/auth/mfa/resend')
        .send({ mfa_token: 'x' })
        .expect(429)
        .expect((res) => {
          expect(res.body.error_code).toBe('OTP_RESEND_COOLDOWN');
        });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh (API-001-004)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with refreshed user payload when session is valid', async () => {
      service.refreshSession.mockResolvedValue(userPayload);

      const res = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['session_id=anything'])
        .expect(200);

      expect(res.body.data.user).toEqual(userPayload);
      // Cookie re-issued so the browser extends Max-Age too.
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 UNAUTHORIZED when service throws UnauthorizedException', async () => {
      service.refreshSession.mockRejectedValue(new DomainUnauthorizedException());

      await http()
        .post('/api/v1/auth/refresh')
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/logout (API-001-005)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 with success message and clear cookie when called with session', async () => {
      service.logout.mockResolvedValue(undefined);

      const res = await http()
        .post('/api/v1/auth/logout')
        .set('Cookie', ['session_id=anything'])
        .expect(200);

      expect(res.body.message).toBe('ログアウトしました。');
      const setCookie = res.headers['set-cookie'];
      // Clearing sets Max-Age=0 (or expires in the past).
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /session_id=/i,
      );
    });

    it('should return 200 even when no session cookie is present', async () => {
      service.logout.mockResolvedValue(undefined);

      const res = await http().post('/api/v1/auth/logout').expect(200);

      expect(res.body.message).toBe('ログアウトしました。');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// AuthController — branch-coverage top-up. The HTTP suites above (and the
// password-reset block below) exercise the happy paths via supertest, but
// several internal branches stay untouched because supertest always sets
// `req.ip` + `user-agent` and uses signed cookies in test mode. This
// describe calls the controller methods DIRECTLY with hand-crafted
// Request / Response stubs.
// ═══════════════════════════════════════════════════════════════════════

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function buildRes() {
  const res: any = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

describe('AuthController — branch coverage', () => {
  describe('clientContext fallbacks', () => {
    it('should fall back to req.socket.remoteAddress when req.ip is undefined', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid',
          user: { account_id: 1 },
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'test',
        }),
      );

      const req: any = {
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' },
        headers: { 'user-agent': 'jest-agent' },
      };
      await controller.login({ login_id: 'a', password: 'b' } as any, req, buildRes());

      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        { ipAddress: '10.0.0.1', userAgent: 'jest-agent' },
      );
    });

    it('should fall back to "" when BOTH req.ip and req.socket.remoteAddress are missing', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid',
          user: {},
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'test',
        }),
      );

      const req: any = { ip: undefined, socket: undefined, headers: {} };
      await controller.login({ login_id: 'a', password: 'b' } as any, req, buildRes());

      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        { ipAddress: '', userAgent: '' },
      );
    });

    it('should truncate excessively long IP / UA values to 50 / 500 chars', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid',
          user: {},
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'test',
        }),
      );

      const longIp = 'a'.repeat(120);
      const longUa = 'b'.repeat(800);
      const req: any = { ip: longIp, headers: { 'user-agent': longUa } };

      await controller.login({ login_id: 'a', password: 'b' } as any, req, buildRes());

      const ctx = authService.login.mock.calls[0][1];
      expect(ctx.ipAddress.length).toBe(50);
      expect(ctx.userAgent.length).toBe(500);
    });
  });

  describe('cookieOptions — secure flag by nodeEnv', () => {
    it('should set secure=false when nodeEnv="local"', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid-local',
          user: {},
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'local',
        }),
      );

      const res = buildRes();
      await controller.login(
        { login_id: 'a', password: 'b' } as any,
        { ip: '1.2.3.4', headers: {} } as any,
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'sid-local',
        expect.objectContaining({ secure: false }),
      );
    });

    it('should set secure=true when nodeEnv="staging" (non-local HTTPS env)', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid-stg',
          user: {},
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'staging',
        }),
      );

      const res = buildRes();
      await controller.login(
        { login_id: 'a', password: 'b' } as any,
        { ip: '1.2.3.4', headers: {} } as any,
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'sid-stg',
        expect.objectContaining({ secure: true }),
      );
    });

    it('should set secure=true when nodeEnv="production"', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid-xyz',
          user: {},
        }),
      };
      const controller = new AuthController(
        authService,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'production',
        }),
      );

      const res = buildRes();
      await controller.login(
        { login_id: 'a', password: 'b' } as any,
        { ip: '1.2.3.4', headers: {} } as any,
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'sid-xyz',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          signed: true,
          path: '/',
          maxAge: 60_000,
        }),
      );
    });

    it('should fall back to defaults when session.* configs are absent (cookieName=session_id, ttl=24h)', async () => {
      const authService: any = {
        login: jest.fn().mockResolvedValue({
          mfa_required: false,
          session_id: 'sid',
          user: {},
        }),
      };
      const controller = new AuthController(authService, buildConfig({}));

      const res = buildRes();
      await controller.login(
        { login_id: 'a', password: 'b' } as any,
        { ip: '1.2.3.4', headers: {} } as any,
        res,
      );

      // nodeEnv absent → defaults to 'development', which runs over HTTPS,
      // so secure stays on. Only 'local' opts out of the Secure flag.
      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'sid',
        expect.objectContaining({ maxAge: 24 * 60 * 60 * 1000, secure: true }),
      );
    });
  });

  describe('readSessionId branches', () => {
    function ctrl() {
      return new AuthController(
        {
          refreshSession: jest.fn().mockResolvedValue({}),
          logout: jest.fn().mockResolvedValue(undefined),
        } as any,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'test',
        }),
      );
    }

    it('should use the signed cookie when present', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.refresh(
        { signedCookies: { session_id: 'signed-sid' }, cookies: {} } as any,
        res,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'signed-sid',
        expect.anything(),
      );
    });

    it('should fall back to the plain cookie when signed is missing', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.refresh(
        { signedCookies: undefined, cookies: { session_id: 'plain-sid' } } as any,
        res,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'plain-sid',
        expect.anything(),
      );
    });

    it('should return undefined sessionId and SKIP cookie re-issue when neither cookie is present', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.refresh({ signedCookies: undefined, cookies: undefined } as any, res);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('should ignore non-string signed cookie values (defensive)', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.refresh(
        { signedCookies: { session_id: false }, cookies: { session_id: 'plain' } } as any,
        res,
      );
      // Falls through to plain cookie.
      expect(res.cookie).toHaveBeenCalledWith(
        'session_id',
        'plain',
        expect.anything(),
      );
    });

    it('should ignore non-string plain cookie values (defensive)', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.refresh(
        { signedCookies: undefined, cookies: { session_id: { foo: 1 } } } as any,
        res,
      );
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout — clear cookie regardless of session presence', () => {
    function ctrl() {
      return new AuthController(
        {
          logout: jest.fn().mockResolvedValue(undefined),
        } as any,
        buildConfig({
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 60,
          nodeEnv: 'test',
        }),
      );
    }

    it('should call AuthService.logout with the resolved session ID + clear cookie with maxAge=0', async () => {
      const c = ctrl();
      const res = buildRes();
      const result = await c.logout(
        { signedCookies: { session_id: 'sid-99' }, cookies: {} } as any,
        res,
      );
      expect(result).toEqual({ message: 'ログアウトしました。' });
      expect(res.clearCookie).toHaveBeenCalledWith(
        'session_id',
        expect.objectContaining({ maxAge: 0 }),
      );
    });

    it('should still clear the cookie when no session cookie is present (idempotent logout)', async () => {
      const c = ctrl();
      const res = buildRes();
      await c.logout({ signedCookies: undefined, cookies: undefined } as any, res);
      expect(res.clearCookie).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-012 — Password reset HTTP specs (forgot-password, reset-password/verify,
// reset-password). All endpoints are PUBLIC (no SessionAuthGuard) — they're
// for users who can't log in. Separate top-level describe so its
// `service` mock (which carries the SCR-012 methods) and Nest app boot
// don't bleed into the SCR-001 block above.
// ═══════════════════════════════════════════════════════════════════════

const VALID_RESET_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('AuthController — password reset (HTTP) — SCR-012', () => {
  let app: INestApplication;
  let service: any;

  beforeEach(async () => {
    service = {
      // SCR-001 methods (mocked but unused here)
      login: jest.fn(),
      verifyMfa: jest.fn(),
      resendMfa: jest.fn(),
      refreshSession: jest.fn(),
      logout: jest.fn(),
      // SCR-012 methods to be added by /gen-code-backend
      forgotPassword: jest.fn(),
      verifyResetToken: jest.fn(),
      resetPassword: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          'session.cookieName': 'session_id',
          'session.ttlSeconds': 24 * 60 * 60,
          'session.secret': SESSION_SECRET,
          nodeEnv: 'test',
        };
        return values[key];
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser(SESSION_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const details = errors.map((e) => ({
            field: e.property,
            message: Object.values(e.constraints || {})[0] ?? '入力値が不正です',
          }));
          return new HttpException(
            {
              code: 'VALIDATION_ERROR',
              error_code: 'VALIDATION_ERROR',
              message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
              errors: details,
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function http() {
    return request(app.getHttpServer() as Server);
  }

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-001 — POST /api/v1/auth/forgot-password
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 with success message when email is valid', async () => {
      service.forgotPassword.mockResolvedValue({
        message: 'パスワード再設定用のメールを送信しました。メールを確認してください。',
      });

      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(200);

      expect(res.body.message).toContain('パスワード再設定用のメールを送信しました');
      expect(service.forgotPassword).toHaveBeenCalledWith(
        'admin01',
        'admin@nichino.co.jp',
        expect.objectContaining({ ipAddress: expect.any(String) }),
      );
    });

    it('should return 400 VALIDATION_ERROR when email format is invalid', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'not-an-email' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ]),
      );
    });

    it('should return 400 VALIDATION_ERROR when email is missing', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when login_id is missing', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@nichino.co.jp' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'login_id' }),
        ]),
      );
    });

    it('should return 200 with same message when email is NOT registered (account enumeration prevention)', async () => {
      service.forgotPassword.mockResolvedValue({
        message: 'パスワード再設定用のメールを送信しました。メールを確認してください。',
      });

      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'nobody@example.com' })
        .expect(200);

      expect(res.body.message).toContain('パスワード再設定用のメールを送信しました');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.forgotPassword.mockRejectedValue(new Error('db down'));
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should return 429 PASSWORD_RESET_RATE_LIMIT with cooldown message when service throws', async () => {
      service.forgotPassword.mockRejectedValue(new PasswordResetRateLimitException());

      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ login_id: 'admin01', email: 'admin@nichino.co.jp' })
        .expect(429);

      expect(res.body.error_code).toBe('PASSWORD_RESET_RATE_LIMIT');
      expect(res.body.message).toBe(
        '再送信は5分後に可能です。時間をおいてから再度お試しください。',
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-002 — POST /api/v1/auth/reset-password/verify
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/auth/reset-password/verify', () => {
    it('should return 200 with { data: { valid: true } } when token is valid', async () => {
      service.verifyResetToken.mockResolvedValue({ valid: true });

      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: VALID_RESET_TOKEN })
        .expect(200);

      expect(res.body).toEqual({ data: { valid: true } });
      expect(service.verifyResetToken).toHaveBeenCalledWith(VALID_RESET_TOKEN);
    });

    it('should return 400 INVALID_RESET_TOKEN when token does not match any OTP', async () => {
      service.verifyResetToken.mockRejectedValue(new InvalidResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: VALID_RESET_TOKEN })
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
      expect(res.body.message).toBe('無効なリンクです。');
    });

    it('should return 400 EXPIRED_RESET_TOKEN when token has expired', async () => {
      service.verifyResetToken.mockRejectedValue(new ExpiredResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: VALID_RESET_TOKEN })
        .expect(400);
      expect(res.body.error_code).toBe('EXPIRED_RESET_TOKEN');
      expect(res.body.message).toBe(
        'リンクの有効期限が切れています。再度パスワード再設定をお試しください。',
      );
    });

    it('should return 400 VALIDATION_ERROR when token is missing', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({})
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when token is not 36 chars', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: 'short' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-012-003 — POST /api/v1/auth/reset-password
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/auth/reset-password', () => {
    const VALID_BODY = {
      token: VALID_RESET_TOKEN,
      new_password: 'NewPass123',
      confirm_password: 'NewPass123',
    };

    it('should return 200 with success message when password updated successfully', async () => {
      service.resetPassword.mockResolvedValue({
        message: 'パスワードを更新しました。ログイン画面に移動します。',
      });

      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send(VALID_BODY)
        .expect(200);

      expect(res.body.message).toContain('パスワードを更新しました');
      expect(service.resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          token: VALID_RESET_TOKEN,
          new_password: 'NewPass123',
          confirm_password: 'NewPass123',
        }),
        expect.objectContaining({ ipAddress: expect.any(String) }),
      );
    });

    it('should return 400 INVALID_RESET_TOKEN when service rejects with InvalidResetTokenException', async () => {
      service.resetPassword.mockRejectedValue(new InvalidResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send(VALID_BODY)
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
    });

    it('should return 400 EXPIRED_RESET_TOKEN when service rejects with ExpiredResetTokenException', async () => {
      service.resetPassword.mockRejectedValue(new ExpiredResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send(VALID_BODY)
        .expect(400);
      expect(res.body.error_code).toBe('EXPIRED_RESET_TOKEN');
    });

    it('should return 400 VALIDATION_ERROR when new_password is missing', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: VALID_RESET_TOKEN, confirm_password: 'NewPass123' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when new_password is shorter than 8', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: VALID_RESET_TOKEN, new_password: 'Ab1', confirm_password: 'Ab1' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when new_password fails 2-of-3 character categories rule (service-layer)', async () => {
      // DTO no longer enforces the category rule — that lives in
      // AuthService.hasAtLeastTwoCategories so it can share the same
      // half-width / length error messages with LoginDto. Stub the
      // service to throw the same VALIDATION_ERROR shape it would in
      // production.
      service.resetPassword.mockRejectedValue(
        new HttpException(
          {
            code: 'VALIDATION_ERROR',
            error_code: 'VALIDATION_ERROR',
            message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
            errors: [
              {
                field: 'new_password',
                message:
                  'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。',
              },
            ],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token: VALID_RESET_TOKEN,
          new_password: 'OnlyLetters',
          confirm_password: 'OnlyLetters',
        })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'new_password' }),
        ]),
      );
    });

    it('should return 400 VALIDATION_ERROR when confirm_password mismatch is detected by service', async () => {
      service.resetPassword.mockRejectedValue(
        new HttpException(
          {
            code: 'VALIDATION_ERROR',
            error_code: 'VALIDATION_ERROR',
            message: '入力値が不正です。',
            errors: [
              {
                field: 'confirm_password',
                message: '新しいパスワードと一致していません。',
              },
            ],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({
          token: VALID_RESET_TOKEN,
          new_password: 'NewPass123',
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

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.resetPassword.mockRejectedValue(new Error('db down'));
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send(VALID_BODY)
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
