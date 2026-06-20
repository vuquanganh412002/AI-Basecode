// Screen: ACSMS-SCR-026 — 購読者名簿出力画面 + ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// ReportController HTTP specs for:
//   - GET  /api/v1/report/meibo/preview            — API-026-001
//   - GET  /api/v1/report/meibo/export             — API-026-002
//   - GET  /api/v1/report/zougen-hanbaiten/preview — API-028-001
//   - POST /api/v1/report/zougen-hanbaiten/export  — API-028-002
//
// Full Nest HTTP stack via Test.createTestingModule + supertest.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  INestApplication,
  NotFoundException,
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

describe('ReportController (HTTP)', () => {
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
      if (!currentPermissions.includes('report.export_meibo')) {
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
      previewMeibo: jest.fn(),
      exportMeiboExcel: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['report.export_meibo'],
    });
    currentPermissions = ['report.export_meibo'];

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

  // ─── GET /api/v1/report/meibo/preview ──────────────────────────────────
  describe('GET /api/v1/report/meibo/preview', () => {
    const previewData = {
      report_type: 'hanbaiten',
      tekiyo_date: '2026-04-01',
      grand_total_busu: 0,
      hanbaiten_groups: [],
      kanri_shiten_groups: [],
    };

    it('should return 200 with data wrapper when query is valid', async () => {
      service.previewMeibo.mockResolvedValue(previewData);

      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
        .expect(200);

      expect(res.body.data).toMatchObject({
        report_type: 'hanbaiten',
        tekiyo_date: '2026-04-01',
      });
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ report_type: 'hanbaiten' })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;

      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
        .expect(401);

      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_meibo', async () => {
      currentPermissions = [];

      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
        .expect(403);

      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service rejects out-of-scope ids', async () => {
      service.previewMeibo.mockRejectedValue(
        new ForbiddenException({
          code: 'DATA_SCOPE_VIOLATION',
          error_code: 'DATA_SCOPE_VIOLATION',
          message: 'このデータへのアクセス権限がありません。',
        }),
      );

      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [999] })
        .expect(403);

      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.previewMeibo.mockRejectedValue(new Error('boom'));

      const res = await http()
        .get(apiUrl('report/meibo/preview'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
        .expect(500);

      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── GET /api/v1/report/meibo/export ───────────────────────────────────
  describe('GET /api/v1/report/meibo/export', () => {
    it('should return 200 with an xlsx attachment when data exists', async () => {
      service.exportMeiboExcel.mockResolvedValue({
        buffer: Buffer.from('xlsx-bytes'),
        filename: '購読者名簿_2026年04月.xlsx',
      });

      const res = await http()
        .get(apiUrl('report/meibo/export'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xlsx');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;

      const res = await http()
        .get(apiUrl('report/meibo/export'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
        .expect(401);

      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_meibo', async () => {
      currentPermissions = [];

      const res = await http()
        .get(apiUrl('report/meibo/export'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
        .expect(403);

      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 REPORT_NO_DATA when service reports no matching data', async () => {
      service.exportMeiboExcel.mockRejectedValue(
        new NotFoundException({
          code: 'REPORT_NO_DATA',
          error_code: 'REPORT_NO_DATA',
          message: '対象のデータが存在しません。',
        }),
      );

      const res = await http()
        .get(apiUrl('report/meibo/export'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'kanri_shiten', kanri_shiten_ids: [10] })
        .expect(404);

      expect(res.body.error_code).toBe('REPORT_NO_DATA');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when export throws an unexpected error', async () => {
      service.exportMeiboExcel.mockRejectedValue(new Error('s3-down'));

      const res = await http()
        .get(apiUrl('report/meibo/export'))
        .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
        .expect(500);

      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
// ══════════════════════════════════════════════════════════════════════
describe('ReportController (HTTP) — 増減連絡票（販売店） (SCR-028)', () => {
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
      if (!currentPermissions.includes('report.export_zougen_hanbaiten')) {
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
      previewMeibo: jest.fn(),
      exportMeiboExcel: jest.fn(),
      previewZougenHanbaiten: jest.fn(),
      exportZougenHanbaitenPdf: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['report.export_zougen_hanbaiten'],
    });
    currentPermissions = ['report.export_zougen_hanbaiten'];

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

  // ─── GET /api/v1/report/zougen-hanbaiten/preview ──────────────────────
  describe('GET /api/v1/report/zougen-hanbaiten/preview', () => {
    it('should return 200 with data wrapper when query is valid', async () => {
      service.previewZougenHanbaiten.mockResolvedValue({
        tekiyo_date: '2026-05-01',
        reports: [],
      });

      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01', hanbaiten_id: [200] })
        .expect(200);

      expect(res.body.data).toMatchObject({ tekiyo_date: '2026-05-01' });
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ hanbaiten_id: [200] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_zougen_hanbaiten', async () => {
      currentPermissions = [];
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service rejects out-of-scope access', async () => {
      service.previewZougenHanbaiten.mockRejectedValue(
        new ForbiddenException({
          code: 'DATA_SCOPE_VIOLATION',
          error_code: 'DATA_SCOPE_VIOLATION',
          message: 'このデータへのアクセス権限がありません。',
        }),
      );
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01', kanri_shiten_id: [999] })
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 200 with empty reports (NOT 404) when service reports no matching data', async () => {
      service.previewZougenHanbaiten.mockResolvedValue({
        tekiyo_date: '2026-05-01',
        reports: [],
      });
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01' })
        .expect(200);
      expect(res.body.data.reports).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.previewZougenHanbaiten.mockRejectedValue(new Error('boom'));
      const res = await http()
        .get(apiUrl('report/zougen-hanbaiten/preview'))
        .query({ tekiyo_date: '2026-05-01' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── POST /api/v1/report/zougen-hanbaiten/export ──────────────────────
  describe('POST /api/v1/report/zougen-hanbaiten/export', () => {
    it('should return 200 with a pdf attachment when data exists', async () => {
      service.exportZougenHanbaitenPdf.mockResolvedValue({
        empty: false,
        buffer: Buffer.from('%PDF-1.4'),
        filename: '増減連絡票_販売店_2026年05月01日.pdf',
        asciiFilename: 'zougen_hanbaiten_20260501.pdf',
      });

      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ tekiyo_date: '2026-05-01', hanbaiten_id: [200] })
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ hanbaiten_id: [200] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ tekiyo_date: '2026-05-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks report.export_zougen_hanbaiten', async () => {
      currentPermissions = [];
      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ tekiyo_date: '2026-05-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 200 application/json with empty reports (NOT 404) when service reports no matching data', async () => {
      service.exportZougenHanbaitenPdf.mockResolvedValue({ empty: true });
      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ tekiyo_date: '2026-05-01' })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.data.reports).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when export throws an unexpected error', async () => {
      service.exportZougenHanbaitenPdf.mockRejectedValue(new Error('pdf-down'));
      const res = await http()
        .post(apiUrl('report/zougen-hanbaiten/export'))
        .send({ tekiyo_date: '2026-05-01', hanbaiten_id: [200] })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
