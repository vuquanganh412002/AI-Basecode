// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// HaitatsuryoController HTTP specs for:
//   - GET  /api/v1/haitatsuryo/preview — API-021-001
//   - POST /api/v1/haitatsuryo/export  — API-021-002
//
// Full Nest HTTP stack via Test.createTestingModule + supertest.

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

import { HaitatsuryoController } from '@/modules/haitatsuryo/haitatsuryo.controller';
import { HaitatsuryoService } from '@/modules/haitatsuryo/haitatsuryo.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildChuokaiSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('HaitatsuryoController (HTTP)', () => {
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
      if (!currentPermissions.includes('haitatsuryo.export')) {
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
      previewHaitatsuryo: jest.fn(),
      exportHaitatsuryoExcel: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['haitatsuryo.export'],
    });
    currentPermissions = ['haitatsuryo.export'];

    const moduleRef = await Test.createTestingModule({
      controllers: [HaitatsuryoController],
      providers: [{ provide: HaitatsuryoService, useValue: service }],
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

  const okPreview = {
    data: [{ hanbaiten_id: 101, hanbaiten_code: 'H001', total_busu: 120, total_kingaku: 588000 }],
    meta: { total: 1, grand_total_busu: 120, grand_total_kingaku: 588000, zei_kubun: 1 },
  };

  // ─── GET /api/v1/haitatsuryo/preview ──────────────────────────────────
  describe('GET /api/v1/haitatsuryo/preview', () => {
    it('should return 200 with data + meta when query is valid', async () => {
      service.previewHaitatsuryo.mockResolvedValue(okPreview);

      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01', haitatsuryo_shiharai_cycle: 3 })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ total: 1, zei_kubun: 1 });
    });

    it('should return 400 VALIDATION_ERROR when target_month is missing', async () => {
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ haitatsuryo_shiharai_cycle: 3 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks haitatsuryo.export', async () => {
      currentPermissions = [];
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service rejects out-of-scope access', async () => {
      service.previewHaitatsuryo.mockRejectedValue(
        new ForbiddenException({
          code: 'DATA_SCOPE_VIOLATION',
          error_code: 'DATA_SCOPE_VIOLATION',
          message: 'このデータへのアクセス権限がありません。',
        }),
      );
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01' })
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 200 with empty data (NOT 404) when service reports no matching data', async () => {
      service.previewHaitatsuryo.mockResolvedValue({
        data: [],
        meta: { total: 0, grand_total_busu: 0, grand_total_kingaku: 0, zei_kubun: 1 },
      });
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01' })
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.previewHaitatsuryo.mockRejectedValue(new Error('boom'));
      const res = await http()
        .get(apiUrl('haitatsuryo/preview'))
        .query({ target_month: '2026-04-01' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── POST /api/v1/haitatsuryo/export ──────────────────────────────────
  describe('POST /api/v1/haitatsuryo/export', () => {
    it('should return 200 with an xlsx attachment when data exists', async () => {
      service.exportHaitatsuryoExcel.mockResolvedValue({
        empty: false,
        buffer: Buffer.from('PK-xlsx'),
        filename: '配達手数料支払情報出力_2026年04月.xlsx',
        asciiFilename: 'haitatsuryo_shiharai_202604.xlsx',
      });

      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ target_month: '2026-04-01', haitatsuryo_shiharai_cycle: 3 })
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return 400 VALIDATION_ERROR when target_month is missing', async () => {
      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ haitatsuryo_shiharai_cycle: 3 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ target_month: '2026-04-01' })
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks haitatsuryo.export', async () => {
      currentPermissions = [];
      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ target_month: '2026-04-01' })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 200 application/json with empty data (NOT 404) when service reports no matching data', async () => {
      service.exportHaitatsuryoExcel.mockResolvedValue({ empty: true });
      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ target_month: '2026-04-01' })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.data).toEqual([]);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when export throws an unexpected error', async () => {
      service.exportHaitatsuryoExcel.mockRejectedValue(new Error('xlsx-down'));
      const res = await http()
        .post(apiUrl('haitatsuryo/export'))
        .send({ target_month: '2026-04-01', haitatsuryo_shiharai_cycle: 3 })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
