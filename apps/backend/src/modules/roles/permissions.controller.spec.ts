// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Drives src/modules/roles/permissions.controller.ts (`/api/v1/permissions`
// endpoint — ACSMS-API-027-004). Lives in the roles module since the permissions
// list is consumed only by the role-edit screen's permission checkbox grid.

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
import { PermissionsController } from '@/modules/roles/permissions.controller';
import { RolesService } from '@/modules/roles/roles.service';
import { buildSession, buildChuokaiSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('PermissionsController (HTTP)', () => {
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
      findAllPermissions: jest.fn(),
    };
    currentSession = buildSession(); // NICHINO_ADMIN by default
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [{ provide: RolesService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(permissionsGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test-secret-32-bytes-xxxxxxxxxxxx'));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  describe('GET /api/v1/permissions (findAllPermissions)', () => {
    it('should return 200 with { data: [...] } shape when NICHINO_ADMIN calls', async () => {
      service.findAllPermissions.mockResolvedValue({
        data: [
          { permission_id: 1, permission_code: 'dokusya.create', permission_name: '購読者登録', description: '購読者情報の新規登録' },
        ],
      });

      const res = await http().get(apiUrl('permissions')).expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        permission_id: 1,
        permission_code: 'dokusya.create',
      });
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('permissions')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('permissions')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.findAllPermissions.mockRejectedValue(new Error('db down'));
      const res = await http().get(apiUrl('permissions')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should serialize description as null when DB column is null per レスポンスデータ row 5', async () => {
      service.findAllPermissions.mockResolvedValue({
        data: [
          { permission_id: 1, permission_code: 'x', permission_name: 'X', description: null },
        ],
      });
      const res = await http().get(apiUrl('permissions')).expect(200);
      expect(res.body.data[0].description).toBeNull();
    });
  });
});
