// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Drives src/modules/roles/roles.controller.ts (`/api/v1/roles` endpoints).
// Test.createTestingModule + supertest — full HTTP stack with ValidationPipe,
// GlobalExceptionFilter, and overridden Guards. Permissions for SCR-027 are
// role-direct (NICHINO_ADMIN only) — the controller relies on a guard or an
// in-method check; this spec uses an overridden permissions guard +
// `currentSession.role_code` to model both paths.

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
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';

import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { RolesController } from '@/modules/roles/roles.controller';
import { RolesService } from '@/modules/roles/roles.service';
import { buildRole, buildUpdateRoleBody } from '@test/fixtures/roles.factory';
import { buildSession, buildChuokaiSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('RolesController (HTTP)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any;
  let permissionsGuardValue: boolean;

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
      findOne: jest.fn(),
      update: jest.fn(),
    };
    currentSession = buildSession(); // NICHINO_ADMIN by default
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(permissionsGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test-secret-32-bytes-xxxxxxxxxxxx'));
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

  const http = () => request(app.getHttpServer() as Server);

  // ═══════════════════════════════════════════════════════════════════
  // API-027-001 — GET /api/v1/roles
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/roles (findAll)', () => {
    it('should return 200 with { data: [...] } shape when NICHINO_ADMIN calls', async () => {
      service.findAll.mockResolvedValue({
        data: [
          { role_id: 1, role_code: 'NICHINO_ADMIN', role_name: '日農（管理者）', description: '管理者' },
        ],
      });

      const res = await http().get(apiUrl('roles')).expect(200);

      expect(res.body).toEqual({
        data: [
          { role_id: 1, role_code: 'NICHINO_ADMIN', role_name: '日農（管理者）', description: '管理者' },
        ],
      });
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('roles')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('roles')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.findAll.mockRejectedValue(new Error('db down'));
      const res = await http().get(apiUrl('roles')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-027-002 — GET /api/v1/roles/:role_id
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/roles/:role_id (findOne)', () => {
    it('should return 200 with role detail + permission_ids when role exists', async () => {
      service.findOne.mockResolvedValue({
        data: {
          role_id: 1,
          role_code: 'NICHINO_ADMIN',
          role_name: '日農（管理者）',
          description: '管理者',
          permission_ids: [16, 17, 18],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      const res = await http().get(apiUrl('roles/1')).expect(200);
      expect(res.body.data.role_id).toBe(1);
      expect(res.body.data.permission_ids).toEqual([16, 17, 18]);
    });

    it('should return 400 BAD_REQUEST when role_id is not numeric', async () => {
      const res = await http().get(apiUrl('roles/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http().get(apiUrl('roles/1')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('roles/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.findOne.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定されたロールが見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().get(apiUrl('roles/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定されたロール');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-027-003 — PUT /api/v1/roles/:role_id
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/roles/:role_id (update)', () => {
    it('should return 200 with updated role when valid body is submitted', async () => {
      const updated = {
        data: {
          role_id: 3,
          role_code: 'CHUOKAI',
          role_name: '中央会',
          description: '中央会アカウント（更新）',
          permission_ids: [1, 2, 28],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-04-14T14:30:00Z',
        },
      };
      service.update.mockResolvedValue(updated);

      const res = await http()
        .put(apiUrl('roles/3'))
        .send(buildUpdateRoleBody({ permission_ids: [1, 2, 28] }))
        .expect(200);

      expect(res.body.data.role_name).toBe('中央会');
      expect(res.body.data.permission_ids).toEqual([1, 2, 28]);
    });

    it('should return 400 VALIDATION_ERROR when role_name is missing', async () => {
      const body = buildUpdateRoleBody();
      delete body.role_name;
      const res = await http().put(apiUrl('roles/3')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 400 VALIDATION_ERROR when role_name exceeds 20 chars', async () => {
      const res = await http()
        .put(apiUrl('roles/3'))
        .send(buildUpdateRoleBody({ role_name: 'あ'.repeat(21) }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when permission_ids contains a non-integer', async () => {
      const res = await http()
        .put(apiUrl('roles/3'))
        .send(buildUpdateRoleBody({ permission_ids: [1, 'two', 3] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 BAD_REQUEST when an unknown field (role_code) is submitted (forbidNonWhitelisted)', async () => {
      // role_code is NOT updatable per api.md §3 注記.
      const res = await http()
        .put(apiUrl('roles/3'))
        .send({ ...buildUpdateRoleBody(), role_code: 'NEW_CODE' })
        .expect(400);
      // VALIDATION_ERROR or BAD_REQUEST — both signal "extra field rejected".
      expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(res.body.error_code);
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http().put(apiUrl('roles/3')).send(buildUpdateRoleBody()).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().put(apiUrl('roles/3')).send(buildUpdateRoleBody()).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.update.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定されたロールが見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().put(apiUrl('roles/999')).send(buildUpdateRoleBody()).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when permission_ids includes a non-existent id', async () => {
      // Service raises VALIDATION_ERROR per §4.1 last block.
      service.update.mockRejectedValue(
        new HttpException(
          {
            code: 'VALIDATION_ERROR',
            error_code: 'VALIDATION_ERROR',
            message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
            errors: [{ field: 'permission_ids', message: '指定された権限が見つかりません' }],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .put(apiUrl('roles/3'))
        .send(buildUpdateRoleBody({ permission_ids: [1, 2, 9999] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors[0].field).toBe('permission_ids');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.update.mockRejectedValue(new Error('db down'));
      const res = await http().put(apiUrl('roles/3')).send(buildUpdateRoleBody()).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── TOO_MANY_REQUESTS — only testable at integration layer ──────────
  it.todo('should return 429 TOO_MANY_REQUESTS when throttle limit exceeded — covered in integration');
});
