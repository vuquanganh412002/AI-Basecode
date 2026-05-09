// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// AuthController HTTP specs covering APIs 012-001 (forgot-password), 012-002
// (reset-password/verify), 012-003 (reset-password). All endpoints are PUBLIC
// (no SessionAuthGuard) — they're for users who can't log in.

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

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';
import {
  InvalidResetTokenException,
  ExpiredResetTokenException,
  PasswordResetRateLimitException,
} from '../exceptions/auth.exceptions';

const SESSION_SECRET = 'test-secret-32-bytes-xxxxxxxxxxxx';
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('AuthController — password reset (HTTP)', () => {
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
        .send({ email: 'admin@nichino.co.jp' })
        .expect(200);

      expect(res.body.message).toContain('パスワード再設定用のメールを送信しました');
      expect(service.forgotPassword).toHaveBeenCalledWith(
        'admin@nichino.co.jp',
        expect.objectContaining({ ipAddress: expect.any(String) }),
      );
    });

    it('should return 400 VALIDATION_ERROR when email format is invalid', async () => {
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
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
        .send({})
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 with same message when email is NOT registered (account enumeration prevention)', async () => {
      service.forgotPassword.mockResolvedValue({
        message: 'パスワード再設定用のメールを送信しました。メールを確認してください。',
      });

      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      expect(res.body.message).toContain('パスワード再設定用のメールを送信しました');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.forgotPassword.mockRejectedValue(new Error('db down'));
      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@nichino.co.jp' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should return 429 PASSWORD_RESET_RATE_LIMIT with cooldown message when service throws', async () => {
      service.forgotPassword.mockRejectedValue(new PasswordResetRateLimitException());

      const res = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@nichino.co.jp' })
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
        .send({ token: VALID_TOKEN })
        .expect(200);

      expect(res.body).toEqual({ data: { valid: true } });
      expect(service.verifyResetToken).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('should return 400 INVALID_RESET_TOKEN when token does not match any OTP', async () => {
      service.verifyResetToken.mockRejectedValue(new InvalidResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: VALID_TOKEN })
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_RESET_TOKEN');
      expect(res.body.message).toBe('無効なリンクです。');
    });

    it('should return 400 EXPIRED_RESET_TOKEN when token has expired', async () => {
      service.verifyResetToken.mockRejectedValue(new ExpiredResetTokenException());
      const res = await http()
        .post('/api/v1/auth/reset-password/verify')
        .send({ token: VALID_TOKEN })
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
      token: VALID_TOKEN,
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
          token: VALID_TOKEN,
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
        .send({ token: VALID_TOKEN, confirm_password: 'NewPass123' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when new_password is shorter than 8', async () => {
      const res = await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: VALID_TOKEN, new_password: 'Ab1', confirm_password: 'Ab1' })
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
          token: VALID_TOKEN,
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
          token: VALID_TOKEN,
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
