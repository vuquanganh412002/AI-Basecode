// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// KozaFurikaeController HTTP specs for:
//   - GET  /api/v1/koza-furikae/initial — ACSMS-API-020-001
//   - POST /api/v1/koza-furikae/export  — ACSMS-API-020-002
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

import { KozaFurikaeController } from '@/modules/koza-furikae/koza-furikae.controller';
import { KozaFurikaeService } from '@/modules/koza-furikae/koza-furikae.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildChuokaiSession } from '@test/fixtures/session.factory';
import {
  buildExportKozaFurikaeQuery,
  buildPreviewKozaFurikaeQuery,
} from '@test/fixtures/koza-furikae.factory';
import { apiUrl } from '@test/utils/api-url';

describe('KozaFurikaeController (HTTP)', () => {
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
      if (!currentPermissions.includes('koza_furikae.export')) {
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
      getInitialData: jest.fn(),
      previewData: jest.fn(),
      exportCsv: jest.fn(),
    };
    currentSession = buildChuokaiSession({ ja_id: 1, permissions: ['koza_furikae.export'] });
    currentPermissions = ['koza_furikae.export'];

    const moduleRef = await Test.createTestingModule({
      controllers: [KozaFurikaeController],
      providers: [{ provide: KozaFurikaeService, useValue: service }],
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

  const okInitial = {
    data: {
      ja_id: 1,
      jastem_itakusha_code: '1234567890',
      jastem_itakusha_name: 'ニホンノウギョウシンブン',
      jastem_ja_code: '1234',
      jastem_ja_name: 'ニホンノウギョウ',
      jastem_toriatsukai_tenpo_code: '001',
      jastem_tenpo_name: 'ホンテン',
      jastem_tyokin_shubetsu: '1',
      jastem_koza_no: '1234567',
    },
  };

  // ─── GET /api/v1/koza-furikae/initial ─────────────────────────────────
  describe('GET /api/v1/koza-furikae/initial', () => {
    it('should return 200 with the initial JASTEM data when the session is valid', async () => {
      service.getInitialData.mockResolvedValue(okInitial);

      const res = await http().get(apiUrl('koza-furikae/initial')).expect(200);

      expect(res.body.data).toMatchObject({
        ja_id: 1,
        jastem_itakusha_code: '1234567890',
        jastem_tyokin_shubetsu: '1',
      });
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('koza-furikae/initial')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks koza_furikae.export', async () => {
      currentPermissions = [];
      const res = await http().get(apiUrl('koza-furikae/initial')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when the service throws an unexpected error', async () => {
      service.getInitialData.mockRejectedValue(new Error('boom'));
      const res = await http().get(apiUrl('koza-furikae/initial')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── POST /api/v1/koza-furikae/preview (v1.1) ─────────────────────────
  describe('POST /api/v1/koza-furikae/preview', () => {
    it('should return 200 with the { data, meta } preview list when データ exists', async () => {
      service.previewData.mockResolvedValue({
        data: [{ dokusya_id: 1, koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ', furikae_kingaku: 4900 }],
        meta: { total: 1, page: 1, per_page: 1, total_pages: 1 },
      });

      const res = await http()
        .post(apiUrl('koza-furikae/preview'))
        .send(buildPreviewKozaFurikaeQuery())
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ dokusya_id: 1, furikae_kingaku: 4900 });
      expect(res.body.meta.total).toBe(1);
    });

    it('should return 400 VALIDATION_ERROR when target_month is missing', async () => {
      const res = await http()
        .post(apiUrl('koza-furikae/preview'))
        .send(buildPreviewKozaFurikaeQuery({ target_month: undefined }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e: any) => e.field === 'target_month')).toBe(true);
    });

    it('should return 404 NO_TARGET_DATA when the preview aggregation is empty', async () => {
      service.previewData.mockRejectedValue(
        new HttpException(
          { code: 'NO_TARGET_DATA', error_code: 'NO_TARGET_DATA', message: '対象データがありません。' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http()
        .post(apiUrl('koza-furikae/preview'))
        .send(buildPreviewKozaFurikaeQuery())
        .expect(404);
      expect(res.body.error_code).toBe('NO_TARGET_DATA');
    });

    it('should return 403 FORBIDDEN when user lacks koza_furikae.export', async () => {
      currentPermissions = [];
      const res = await http()
        .post(apiUrl('koza-furikae/preview'))
        .send(buildPreviewKozaFurikaeQuery())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ─── POST /api/v1/koza-furikae/export ─────────────────────────────────
  describe('POST /api/v1/koza-furikae/export', () => {
    it('should return 200 with an octet-stream attachment carrying the ASCII filename + RFC5987 filename* when データ exists', async () => {
      service.exportCsv.mockResolvedValue({
        buffer: Buffer.from('1,21,0,...'),
        filename: '口座振替データ_2026年05月27日',
        asciiFilename: '________2026_05_27_',
        recordCount: 2,
      });

      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(200);

      // 拡張子なしファイル名のため application/octet-stream 固定（text/plain 等の
      // 既知タイプだとブラウザが .txt を自動付与してしまう — SCR-020バグ修正）。
      expect(res.headers['content-type']).toContain('application/octet-stream');
      const cd = res.headers['content-disposition'];
      // ASCII別名は filename、日本語名は RFC 5987 の filename* に載る。
      expect(cd).toContain('filename="________2026_05_27_"');
      expect(cd).toContain("filename*=UTF-8''");
      expect(cd).toContain(encodeURIComponent('口座振替データ_2026年05月27日'));
    });

    it('should return 400 VALIDATION_ERROR when target_month is missing', async () => {
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery({ target_month: undefined }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e: any) => e.field === 'target_month')).toBe(true);
    });

    it('should return 400 VALIDATION_ERROR when jastem_itakusha_code is missing', async () => {
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery({ jastem_itakusha_code: undefined }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks koza_furikae.export', async () => {
      currentPermissions = [];
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when the service rejects out-of-scope ids', async () => {
      service.exportCsv.mockRejectedValue(
        new ForbiddenException({
          code: 'DATA_SCOPE_VIOLATION',
          error_code: 'DATA_SCOPE_VIOLATION',
          message: 'このデータへのアクセス権限がありません。',
        }),
      );
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 404 NO_TARGET_DATA when the service reports no matching データ', async () => {
      service.exportCsv.mockRejectedValue(
        new HttpException(
          { code: 'NO_TARGET_DATA', error_code: 'NO_TARGET_DATA', message: '対象データがありません。' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(404);
      expect(res.body.error_code).toBe('NO_TARGET_DATA');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when the service throws an unexpected error', async () => {
      service.exportCsv.mockRejectedValue(new Error('boom'));
      const res = await http()
        .post(apiUrl('koza-furikae/export'))
        .send(buildExportKozaFurikaeQuery())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

  });
});
