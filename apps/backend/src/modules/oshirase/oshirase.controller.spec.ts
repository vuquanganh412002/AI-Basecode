// Screen: ACSMS-SCR-001 — ログイン画面 (公開お知らせ一覧 HTTP)
//         ACSMS-SCR-031 — お知らせ一覧画面 (admin CRUD HTTP)
//
// Two sibling top-level describe blocks for OshiraseController — each
// SCR has its own Nest app boot + service mock so guards and DI don't
// cross-contaminate. Merged into one file (was previously in
// __tests__/oshirase-admin.controller.spec.ts) to follow the project's
// "1 source = 1 spec file" rule.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';

import { OshiraseController } from '@/modules/oshirase/oshirase.controller';
import { OshiraseService } from '@/modules/oshirase/oshirase.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateOshiraseBody,
  buildOshiraseDetail,
  buildOshiraseListResponse,
  buildUpdateOshiraseBody,
} from '@test/fixtures/oshirase.factory';
import { buildSession } from '@test/fixtures/session.factory';

describe('OshiraseController — SCR-001 HTTP (public findLogin)', () => {
  let app: INestApplication;
  let service: any;

  beforeEach(async () => {
    service = {
      findLogin: jest.fn(),
    };

    // SCR-001 /login is a public route (no guard at method level), but the
    // same controller declares SessionAuthGuard + PermissionsGuard on its
    // sibling admin methods. Nest still resolves DI for those guards at
    // module-compile time → SessionService is required. Override both
    // guards with allow-all stubs so the controller compiles without
    // wiring SessionService/ConfigService into the test module.
    const allowAllGuard: CanActivate = { canActivate: () => true };

    const module = await Test.createTestingModule({
      controllers: [OshiraseController],
      providers: [{ provide: OshiraseService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(allowAllGuard)
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
            message: Object.values(e.constraints || {})[0] ?? '入力値が不正です',
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
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  describe('GET /api/v1/oshirase/login', () => {
    it('should return 200 with data array when service returns notices', async () => {
      service.findLogin.mockResolvedValue([
        {
          oshirase_id: 1,
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          title: 'システムメンテナンスのお知らせ',
          publish_start_date: '2026-04-10',
        },
      ]);

      const res = await http()
        .get('/api/v1/oshirase/login?limit=10')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        oshirase_id: 1,
        oshirase_type_label: 'システム',
      });
    });

    it('should return 200 with empty array when no notices match', async () => {
      service.findLogin.mockResolvedValue([]);

      const res = await http().get('/api/v1/oshirase/login').expect(200);

      expect(res.body).toEqual({ data: [] });
    });

    it('should accept request without auth (public endpoint)', async () => {
      service.findLogin.mockResolvedValue([]);

      // No Cookie header set — must still succeed.
      await http().get('/api/v1/oshirase/login').expect(200);
    });

    it('should default limit to 10 when omitted from query', async () => {
      service.findLogin.mockResolvedValue([]);

      await http().get('/api/v1/oshirase/login').expect(200);

      // Service receives a DTO with defaults applied by ValidationPipe transform.
      expect(service.findLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        }),
      );
    });

    // publish_location is no longer accepted on the wire — the route is
    // login-only. The menu-screen variant lives at /api/v1/oshirase/menu.

    it('should return 400 VALIDATION_ERROR when limit exceeds 10', async () => {
      await http()
        .get('/api/v1/oshirase/login?limit=11')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when limit is below 1', async () => {
      await http()
        .get('/api/v1/oshirase/login?limit=0')
        .expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.findLogin.mockRejectedValue(new Error('boom'));

      await http()
        .get('/api/v1/oshirase/login')
        .expect(500)
        .expect((res) => {
          expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
        });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-031 — admin CRUD HTTP (separate top-level describe so its service
// mock — getList / getDetail / create / update / remove — and the
// session/permissions guard overrides don't leak into the SCR-001
// public-path block above).
// ═══════════════════════════════════════════════════════════════════════

describe('OshiraseController — SCR-031 HTTP (admin CRUD)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any = null;
  let currentPermissions: string[] = [];

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
    canActivate: (ctx: ExecutionContext) => {
      // Read @Permissions metadata via reflector would normally do this.
      // Easier in unit test: enforce that EVERY admin endpoint needs at
      // least one oshirase.* permission. Granular per-route check is
      // wired below via per-test mutation of `currentPermissions`.
      const handler = ctx.getHandler();
      const required = Reflect.getMetadata('permissions', handler) as string[] | undefined;
      if (!required || required.length === 0) return true;
      const has = required.every((p) => currentPermissions.includes(p));
      if (!has) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          error_code: 'FORBIDDEN',
          message: 'この画面へのアクセス権限がありません。',
        });
      }
      return true;
    },
  };

  beforeEach(async () => {
    service = {
      // SCR-001 public endpoint (existing).
      findPublic: jest.fn(),
      // SCR-031 admin endpoints.
      getList: jest.fn(),
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    currentSession = buildSession({
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      permissions: ['oshirase.view', 'oshirase.create', 'oshirase.update', 'oshirase.delete'],
    });
    currentPermissions = currentSession.permissions;

    const module = await Test.createTestingModule({
      controllers: [OshiraseController],
      providers: [{ provide: OshiraseService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(permissionsGuard)
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
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/oshirase
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/oshirase', () => {
    it('should return 200 with paginated body when service resolves with data + meta', async () => {
      service.getList.mockResolvedValue(buildOshiraseListResponse());

      const res = await http().get(apiUrl('oshirase')).expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({ total: 25, page: 1, per_page: 20 }),
        }),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('oshirase')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.view', async () => {
      currentPermissions = [];
      currentSession = buildSession({ permissions: [] });
      const res = await http().get(apiUrl('oshirase')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      const res = await http().get(apiUrl('oshirase')).query({ per_page: 101 }).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.getList.mockRejectedValue(new Error('db-down'));
      const res = await http().get(apiUrl('oshirase')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    it.todo('should return 429 TOO_MANY_REQUESTS when throttler ceiling is hit (covered in integration / throttler layer)');
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/oshirase/:id
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/oshirase/:id', () => {
    it('should return 200 with detail body when service resolves', async () => {
      service.getDetail.mockResolvedValue({ data: buildOshiraseDetail() });
      const res = await http().get(apiUrl('oshirase/1')).expect(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          content: expect.any(String),
          target_kanri_kubun: '1,2,3',
        }),
      );
    });

    it('should return 404 NOT_FOUND when service rejects with NotFoundException', async () => {
      service.getDetail.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定されたお知らせが見つかりません。' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().get(apiUrl('oshirase/9999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 BAD_REQUEST when :id is not numeric', async () => {
      const res = await http().get(apiUrl('oshirase/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      await http().get(apiUrl('oshirase/1')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.view', async () => {
      currentPermissions = [];
      currentSession = buildSession({ permissions: [] });
      const res = await http().get(apiUrl('oshirase/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/oshirase
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/oshirase', () => {
    it('should return 201 with created body + message when service resolves', async () => {
      service.create.mockResolvedValue({
        data: buildOshiraseDetail({ oshirase_id: 10 }),
        message: '登録しました。',
      });

      const res = await http()
        .post(apiUrl('oshirase'))
        .send(buildCreateOshiraseBody())
        .expect(201);

      expect(res.body.data.oshirase_id).toBe(10);
      expect(res.body.message).toBe('登録しました。');
    });

    it('should return 400 DEADLINE_NOTICE_DUPLICATE when service rejects with that code', async () => {
      service.create.mockRejectedValue(
        new HttpException(
          {
            code: 'DEADLINE_NOTICE_DUPLICATE',
            error_code: 'DEADLINE_NOTICE_DUPLICATE',
            message:
              '公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('oshirase'))
        .send(buildCreateOshiraseBody({ publish_location: 2, oshirase_type: 4 }))
        .expect(400);
      expect(res.body.error_code).toBe('DEADLINE_NOTICE_DUPLICATE');
    });

    it('should return 400 VALIDATION_ERROR when title is missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).title;

      const res = await http().post(apiUrl('oshirase')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      await http().post(apiUrl('oshirase')).send(buildCreateOshiraseBody()).expect(401);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.create', async () => {
      currentPermissions = ['oshirase.view'];
      currentSession = buildSession({ permissions: ['oshirase.view'] });
      const res = await http()
        .post(apiUrl('oshirase'))
        .send(buildCreateOshiraseBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.create.mockRejectedValue(new Error('db-down'));
      const res = await http()
        .post(apiUrl('oshirase'))
        .send(buildCreateOshiraseBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/oshirase/:id
  // ═══════════════════════════════════════════════════════════════════
  describe('PATCH /api/v1/oshirase/:id', () => {
    it('should return 200 with updated body + message when service resolves', async () => {
      service.update.mockResolvedValue({
        data: buildOshiraseDetail({ oshirase_id: 1, title: '更新後タイトル' }),
        message: '更新しました。',
      });

      const res = await http()
        .patch(apiUrl('oshirase/1'))
        .send(buildUpdateOshiraseBody({ title: '更新後タイトル' }))
        .expect(200);
      expect(res.body.data.oshirase_id).toBe(1);
      expect(res.body.message).toBe('更新しました。');
    });

    it('should return 404 NOT_FOUND when service rejects with that code', async () => {
      service.update.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定されたお知らせが見つかりません。' },
          HttpStatus.NOT_FOUND,
        ),
      );

      const res = await http()
        .patch(apiUrl('oshirase/9999'))
        .send(buildUpdateOshiraseBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when title is empty', async () => {
      const res = await http()
        .patch(apiUrl('oshirase/1'))
        .send(buildUpdateOshiraseBody({ title: '' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 BAD_REQUEST when :id is not numeric', async () => {
      const res = await http()
        .patch(apiUrl('oshirase/abc'))
        .send(buildUpdateOshiraseBody())
        .expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      await http()
        .patch(apiUrl('oshirase/1'))
        .send(buildUpdateOshiraseBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.update', async () => {
      currentPermissions = ['oshirase.view'];
      currentSession = buildSession({ permissions: ['oshirase.view'] });
      const res = await http()
        .patch(apiUrl('oshirase/1'))
        .send(buildUpdateOshiraseBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/oshirase/:id
  // ═══════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/oshirase/:id', () => {
    it('should return 200 with success message when service resolves', async () => {
      service.remove.mockResolvedValue({ message: '削除しました。' });
      const res = await http().delete(apiUrl('oshirase/1')).expect(200);
      expect(res.body).toEqual({ message: '削除しました。' });
    });

    it('should return 404 NOT_FOUND when service rejects with that code', async () => {
      service.remove.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定されたお知らせが見つかりません。' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().delete(apiUrl('oshirase/9999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when service rejects with that code', async () => {
      service.remove.mockRejectedValue(
        new HttpException(
          { code: 'CONFLICT', error_code: 'CONFLICT', message: '関連データが存在するため削除できません。' },
          HttpStatus.CONFLICT,
        ),
      );
      const res = await http().delete(apiUrl('oshirase/1')).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
    });

    it('should return 400 BAD_REQUEST when :id is not numeric', async () => {
      const res = await http().delete(apiUrl('oshirase/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      await http().delete(apiUrl('oshirase/1')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.delete', async () => {
      currentPermissions = ['oshirase.view'];
      currentSession = buildSession({ permissions: ['oshirase.view'] });
      const res = await http().delete(apiUrl('oshirase/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.remove.mockRejectedValue(new Error('db-down'));
      const res = await http().delete(apiUrl('oshirase/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
