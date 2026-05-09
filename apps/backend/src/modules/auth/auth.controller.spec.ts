// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面
//
// AuthController HTTP specs covering APIs 001-001 through 001-005.
// Verifies status codes, response shapes, and Set-Cookie behaviour.

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

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
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
import { UnauthorizedException as DomainUnauthorizedException } from '../../common/exceptions/common.exceptions';
import { ADMIN_PERMISSIONS } from '../../../test/fixtures/auth.factory';

const SESSION_SECRET = 'test-secret-32-bytes-xxxxxxxxxxxx';

describe('AuthController (HTTP)', () => {
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

      expect(res.body.message).toBe('正常にログアウトしました。');
      const setCookie = res.headers['set-cookie'];
      // Clearing sets Max-Age=0 (or expires in the past).
      expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toMatch(
        /session_id=/i,
      );
    });

    it('should return 200 even when no session cookie is present', async () => {
      service.logout.mockResolvedValue(undefined);

      const res = await http().post('/api/v1/auth/logout').expect(200);

      expect(res.body.message).toBe('正常にログアウトしました。');
    });
  });
});
