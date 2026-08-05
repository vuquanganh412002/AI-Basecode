// Screen: ACSMS-SCR-030 — ログ参照画面
//
// LogController HTTP specs for:
//   - GET /api/v1/log         — API-030-001
//   - GET /api/v1/log/export  — API-030-002

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

import { LogController } from '@/modules/log/log.controller';
import { LogService } from '@/modules/log/log.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('LogController (HTTP)', () => {
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
    canActivate: () => {
      if (!currentPermissions.includes('log.view')) {
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
      getLogList: jest.fn(),
      exportLogCsv: jest.fn(),
    };
    currentSession = buildSession({ permissions: ['log.view'] });
    currentPermissions = ['log.view'];

    const module = await Test.createTestingModule({
      controllers: [LogController],
      providers: [{ provide: LogService, useValue: service }],
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
  // GET /api/v1/log
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/log', () => {
    it('should return 200 with paginated body when service resolves with data + meta', async () => {
      service.getLogList.mockResolvedValue({
        data: [{ log_id: 1, log_type: 1, log_type_label: 'ユーザー操作' }],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http()
        .get(apiUrl('log'))
        .query({ page: 1, per_page: 20 })
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 1,
            page: 1,
            per_page: 20,
          }),
        }),
      );
    });

    it('should pass query params + session to LogService.getLogList when search filters are sent', async () => {
      service.getLogList.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      await http()
        .get(apiUrl('log'))
        .query({
          date_from: '2026/04/01 00:00:00',
          date_to: '2026/04/17 23:59:59',
          log_type: 1,
          account_id: 10,
        })
        .expect(200);

      expect(service.getLogList).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2026/04/01 00:00:00',
          date_to: '2026/04/17 23:59:59',
          log_type: 1,
          account_id: 10,
        }),
        expect.objectContaining({ account_id: 1 }),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;

      const res = await http().get(apiUrl('log')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
      expect(service.getLogList).not.toHaveBeenCalled();
    });

    it('should return 403 FORBIDDEN when caller does not hold log.view permission', async () => {
      currentPermissions = [];
      currentSession = buildSession({ permissions: [] });

      const res = await http().get(apiUrl('log')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
      expect(service.getLogList).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      const res = await http()
        .get(apiUrl('log'))
        .query({ per_page: 101 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 DATE_RANGE_INVALID when service rejects with date_from > date_to', async () => {
      service.getLogList.mockRejectedValue(
        new HttpException(
          { code: 'DATE_RANGE_INVALID', error_code: 'DATE_RANGE_INVALID', message: '「開始日」は「終了日」以前の日付を入力してください。' },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .get(apiUrl('log'))
        .query({
          date_from: '2026/04/30 00:00:00',
          date_to: '2026/04/01 00:00:00',
        })
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
    });

    it('should return 400 DATE_RANGE_TOO_LONG when service rejects with range > 5 years', async () => {
      service.getLogList.mockRejectedValue(
        new HttpException(
          { code: 'DATE_RANGE_TOO_LONG', error_code: 'DATE_RANGE_TOO_LONG', message: '検索期間は5年以内で指定してください。' },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .get(apiUrl('log'))
        .query({
          date_from: '2024/01/01 00:00:00',
          date_to: '2026/04/01 00:00:00',
        })
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_TOO_LONG');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.getLogList.mockRejectedValue(new Error('db-down'));

      const res = await http().get(apiUrl('log')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/log/export
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/log/export', () => {
    it('should return 200 with text/csv Content-Type when service returns a CSV buffer', async () => {
      service.exportLogCsv.mockResolvedValue({
        buffer: Buffer.from('﻿"ログID","ログ種別"\n"1","ユーザー操作"\n', 'utf8'),
        filename: 'log_export_20260417_143045.csv',
      });

      const res = await http().get(apiUrl('log/export')).expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toContain(
        'attachment; filename="log_export_20260417_143045.csv"',
      );
    });

    it('should pass query params + session + req to LogService.exportLogCsv', async () => {
      service.exportLogCsv.mockResolvedValue({
        buffer: Buffer.from('﻿', 'utf8'),
        filename: 'log_export_20260417_143045.csv',
      });

      await http()
        .get(apiUrl('log/export'))
        .query({
          date_from: '2026/04/01 00:00:00',
          date_to: '2026/04/17 23:59:59',
          log_type: 1,
        })
        .expect(200);

      expect(service.exportLogCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2026/04/01 00:00:00',
          date_to: '2026/04/17 23:59:59',
          log_type: 1,
        }),
        expect.objectContaining({ account_id: 1 }),
        expect.any(Object),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('log/export')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller does not hold log.view permission', async () => {
      currentPermissions = [];
      currentSession = buildSession({ permissions: [] });
      const res = await http().get(apiUrl('log/export')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 409 EXPORT_LIMIT_EXCEEDED when service rejects with count > 5000', async () => {
      service.exportLogCsv.mockRejectedValue(
        new HttpException(
          { code: 'EXPORT_LIMIT_EXCEEDED', error_code: 'EXPORT_LIMIT_EXCEEDED', message: '検索結果が5,000件を超えています。条件を絞り込んでください。' },
          HttpStatus.CONFLICT,
        ),
      );

      const res = await http().get(apiUrl('log/export')).expect(409);
      expect(res.body.error_code).toBe('EXPORT_LIMIT_EXCEEDED');
    });

    it('should return 400 DATE_RANGE_INVALID when service rejects with date_from > date_to', async () => {
      service.exportLogCsv.mockRejectedValue(
        new HttpException(
          { code: 'DATE_RANGE_INVALID', error_code: 'DATE_RANGE_INVALID', message: '「開始日」は「終了日」以前の日付を入力してください。' },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http().get(apiUrl('log/export')).expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
    });

    it('should return 400 DATE_RANGE_TOO_LONG when service rejects with range > 5 years', async () => {
      service.exportLogCsv.mockRejectedValue(
        new HttpException(
          { code: 'DATE_RANGE_TOO_LONG', error_code: 'DATE_RANGE_TOO_LONG', message: '検索期間は5年以内で指定してください。' },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http().get(apiUrl('log/export')).expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_TOO_LONG');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.exportLogCsv.mockRejectedValue(new Error('boom'));
      const res = await http().get(apiUrl('log/export')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
