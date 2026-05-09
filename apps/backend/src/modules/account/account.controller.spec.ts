// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: header self-service — MFA toggle
//
// AccountController HTTP specs for PATCH /api/v1/account/me/mfa.

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { buildSession } from '../../../test/fixtures/session.factory';

describe('AccountController (HTTP)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any = null;

  const sessionGuard: CanActivate = {
    canActivate: (ctx: ExecutionContext) => {
      if (!currentSession) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          error_code: 'UNAUTHORIZED',
          message: 'セッションが切れました。再度ログインしてください。',
        });
      }
      ctx.switchToHttp().getRequest().user = currentSession;
      return true;
    },
  };

  beforeEach(async () => {
    service = {
      toggleMfa: jest.fn(),
    };
    currentSession = buildSession({ account_id: 42 });

    const module = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const details = errors.map((e) => ({
            field: e.property,
            message: Object.values(e.constraints || {})[0] ?? '',
          }));
          return new HttpException(
            {
              code: 'VALIDATION_ERROR',
              error_code: 'VALIDATION_ERROR',
              message: '入力値が不正です',
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

  describe('PATCH /api/v1/account/me/mfa', () => {
    it('should return 200 with updated state when service resolves with enabled=true', async () => {
      service.toggleMfa.mockResolvedValue({
        mfa_enable_flg: true,
        message: 'MFAを有効にしました。',
      });

      const res = await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: true })
        .expect(200);

      expect(res.body.data).toEqual({
        mfa_enable_flg: true,
        message: 'MFAを有効にしました。',
      });
    });

    it('should call AccountService.toggleMfa with the session account_id from req.user', async () => {
      service.toggleMfa.mockResolvedValue({
        mfa_enable_flg: false,
        message: 'MFAを無効にしました。',
      });

      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: false })
        .expect(200);

      // session.account_id (42) is wired in beforeEach — service must
      // receive it from the authenticated session, NOT from URL or body.
      expect(service.toggleMfa).toHaveBeenCalledWith(
        42,
        false,
        expect.any(Object),
      );
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;

      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: true })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });

      expect(service.toggleMfa).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when body.enabled is not a boolean', async () => {
      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: 'yes' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'enabled' }),
            ]),
          );
        });

      expect(service.toggleMfa).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when body is empty', async () => {
      await http()
        .patch('/api/v1/account/me/mfa')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });
  });
});
