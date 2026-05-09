// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __MODULE__     = module name (e.g. "tanka")
//   __CONTROLLER__ = controller class (e.g. "TankaController")
//   __SERVICE__    = service class (e.g. "TankaService")
//
// Tests run through full Nest HTTP stack via Test.createTestingModule +
// supertest. ts-jest emits `design:paramtypes` decorator metadata natively
// so Nest DI works out of the box — no extra plugin needed.

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

import { __CONTROLLER__ } from '@/modules/__MODULE__/__MODULE__.controller';
import { __SERVICE__ } from '@/modules/__MODULE__/__MODULE__.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildSession } from '../../test/fixtures/session.factory';

describe('__CONTROLLER__ (HTTP)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any;
  let permissionsGuardValue: boolean;

  // Sessions: when set, `req.user = currentSession`; when null, throw 401.
  // Permissions: when true, allow; when false, throw 403.
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
  const permissionsGuard: CanActivate = {
    canActivate: () => permissionsGuardValue,
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    currentSession = buildSession();
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [__CONTROLLER__],
      providers: [{ provide: __SERVICE__, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(permissionsGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        // Throw HttpException (NOT plain Error) so GlobalExceptionFilter
        // can format the response body.
        exceptionFactory: (errors) => {
          const details = errors.map((e) => ({
            field: e.property,
            message: Object.values(e.constraints || {})[0] ?? '',
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

  const http = () => request(app.getHttpServer() as Server);

  // ─── One describe per endpoint ─────────────────────────────────────────
  //
  // Mock `service.<method>.mockResolvedValue(...)` with **snake_case**
  // response shape (matching __ENTITY__ResponseDto), and include `message`
  // for create/update endpoints — controller destructures `{message, ...data}`.
  //
  // describe('GET /api/v1/__MODULE__/:id', () => {
  //   it('should return 200 with data when valid id', async () => {
  //     service.findById.mockResolvedValue({
  //       id: 1,
  //       // ... full snake_case JaResponseDto-like shape ...
  //     });
  //     const res = await http().get('/api/v1/__MODULE__/1').expect(200);
  //     expect(res.body.data.id).toBe(1);
  //   });
  //
  //   it('should return 401 UNAUTHORIZED when session cookie missing', async () => {
  //     currentSession = null;
  //     await http().get('/api/v1/__MODULE__/1').expect(401)
  //       .expect((res) => expect(res.body.error_code).toBe('UNAUTHORIZED'));
  //   });
  //
  //   it('should return 403 FORBIDDEN when user lacks permission', async () => {
  //     permissionsGuardValue = false;
  //     await http().get('/api/v1/__MODULE__/1').expect(403)
  //       .expect((res) => expect(res.body.error_code).toBe('FORBIDDEN'));
  //   });
  //
  //   it('should return 404 NOT_FOUND when service throws', async () => {
  //     const { NotFoundException } = await import('@nestjs/common');
  //     service.findById.mockRejectedValue(new NotFoundException({
  //       code: 'NOT_FOUND',
  //       error_code: 'NOT_FOUND',
  //       message: '指定された__SCREEN_ENTITY__が見つかりません。',
  //     }));
  //     await http().get('/api/v1/__MODULE__/999').expect(404)
  //       .expect((res) => expect(res.body.error_code).toBe('NOT_FOUND'));
  //   });
  // });
});
