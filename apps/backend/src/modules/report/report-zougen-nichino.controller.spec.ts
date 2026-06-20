// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// ReportController HTTP specs for the 増減通知（日本農業新聞）endpoints:
//   - GET  /api/v1/report/zougen-nichino/preview — API-029-001
//   - POST /api/v1/report/zougen-nichino/export  — API-029-002
//
// Full Nest HTTP stack via Test.createTestingModule + supertest. Kept in a
// SEPARATE file (not appended to report.controller.spec.ts) during the RED
// phase — that file is GREEN and ts-jest type-checks, so referencing the
// not-yet-implemented controller handlers there would break SCR-026/028.
// Merge back into the root controller spec after /gen-code-backend.

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

import { ReportController } from '@/modules/report/report.controller';
import { ReportService } from '@/modules/report/report.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildChuokaiSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('ReportController (HTTP) — 増減通知（日本農業新聞） (SCR-029)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any;
  let currentPermissions: string[];

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
    canActivate: () => {
      if (!currentPermissions.includes('report.export_zougen_nichino')) {
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
      previewZougenNichino: jest.fn(),
      exportZougenNichinoPdf: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['report.export_zougen_nichino'],
    });
    currentPermissions = ['report.export_zougen_nichino'];

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: service }],
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

  // ─── GET /api/v1/report/zougen-nichino/preview ────────────────────────
  describe('GET /api/v1/report/zougen-nichino/preview', () => {
    it('should return 200 with data wrapper when query is valid', async () => {
      service.previewZougenNichino.mockResolvedValue({
        tekiyo_date: '2026-03-01',
        reports: [],
      });

      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01', kanri_shiten_id: [20] })
        .expect(200);

      expect(res.body.data).toMatchObject({ tekiyo_date: '2026-03-01' });
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ kanri_shiten_id: [20] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_zougen_nichino', async () => {
      currentPermissions = [];
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service rejects out-of-scope access', async () => {
      service.previewZougenNichino.mockRejectedValue(
        new ForbiddenException({
          code: 'DATA_SCOPE_VIOLATION',
          error_code: 'DATA_SCOPE_VIOLATION',
          message: 'このデータへのアクセス権限がありません。',
        }),
      );
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01', kanri_shiten_id: [999] })
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 200 with empty reports (NOT 404) when service reports no matching data', async () => {
      service.previewZougenNichino.mockResolvedValue({
        tekiyo_date: '2026-03-01',
        reports: [],
      });
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01' })
        .expect(200);
      expect(res.body.data.reports).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.previewZougenNichino.mockRejectedValue(new Error('boom'));
      const res = await http()
        .get(apiUrl('report/zougen-nichino/preview'))
        .query({ tekiyo_date: '2026-03-01' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── POST /api/v1/report/zougen-nichino/export ────────────────────────
  describe('POST /api/v1/report/zougen-nichino/export', () => {
    it('should return 200 with a pdf attachment when a single 管理支店 matches', async () => {
      service.exportZougenNichinoPdf.mockResolvedValue({
        empty: false,
        buffer: Buffer.from('%PDF-1.4'),
        filename: '増減通知_1AA-3300-001_20260301.pdf',
        asciiFilename: 'zougen_nichino_1AA-3300-001_20260301.pdf',
        contentType: 'application/pdf',
      });

      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01', kanri_shiten_id: [20] })
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return 200 with a zip attachment when multiple 管理支店 match', async () => {
      service.exportZougenNichinoPdf.mockResolvedValue({
        empty: false,
        buffer: Buffer.from('PK'),
        filename: '増減通知_20260301.zip',
        asciiFilename: 'zougen_nichino_20260301.zip',
        contentType: 'application/zip',
      });

      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01', kanri_shiten_id: [20, 21] })
        .expect(200);

      expect(res.headers['content-type']).toContain('application/zip');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ kanri_shiten_id: [20] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_zougen_nichino', async () => {
      currentPermissions = [];
      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 200 application/json with empty reports (NOT 404) when service reports no matching data', async () => {
      service.exportZougenNichinoPdf.mockResolvedValue({ empty: true });
      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01' })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.data.reports).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when export throws an unexpected error', async () => {
      service.exportZougenNichinoPdf.mockRejectedValue(new Error('pdf-down'));
      const res = await http()
        .post(apiUrl('report/zougen-nichino/export'))
        .send({ tekiyo_date: '2026-03-01', kanri_shiten_id: [20] })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
