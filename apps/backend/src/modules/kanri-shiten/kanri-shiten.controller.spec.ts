// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面 (list + delete)
//         ACSMS-SCR-009 — 管理支店マスタ登録画面 (detail + create + update)
//
// Both SCRs share the same KanriShitenController class. Tests are
// organised as two sibling top-level describe blocks so each owns its
// own Nest test app + mock scope. Spec count + assertions remain 1:1
// with the originals; only the location changed (merged from
// __tests__/ into this file so the module follows "1 source = 1 spec
// file").

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

import { KanriShitenController } from '@/modules/kanri-shiten/kanri-shiten.controller';
import { KanriShitenService } from '@/modules/kanri-shiten/kanri-shiten.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { apiUrl } from '@test/utils/api-url';
import { buildSession } from '@test/fixtures/session.factory';

describe('KanriShitenController — SCR-008 (list / delete HTTP)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any = null;
  let permissionsGuardValue: boolean | ((ctx: ExecutionContext) => boolean) = true;

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
    canActivate: (ctx: ExecutionContext) =>
      typeof permissionsGuardValue === 'function'
        ? permissionsGuardValue(ctx)
        : permissionsGuardValue,
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      remove: jest.fn(),
    };
    currentSession = buildSession({
      permissions: ['kanri_shiten.view', 'kanri_shiten.delete'],
    });
    permissionsGuardValue = true;

    const module = await Test.createTestingModule({
      controllers: [KanriShitenController],
      providers: [{ provide: KanriShitenService, useValue: service }],
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

  // ═════════════════════════════════════════════════════════════════════
  // GET /api/v1/kanri-shiten (API-008-001)
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/kanri-shiten', () => {
    const sampleRow = {
      kanri_shiten_id: 1,
      ja_id: 1,
      kanri_shiten_code: '013-3300-001',
      kanri_shiten_name: 'JA北海道中央管理支店',
      yubin_no: '0600001',
      todofuken_code: '01',
      todofuken_name: '北海道',
      address: '札幌市中央区北1条西2丁目',
      tel: '0112223333',
      fax: '0112223334',
      paper_flg: true,
      denshi_flg: true,
    };

    it('should return 200 with paginated body when NICHINO_ADMIN requests no filters', async () => {
      // COVERS: happy path — { data: [...], meta: {...} } shape
      service.findAll.mockResolvedValue({
        data: [sampleRow],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http().get(apiUrl('kanri-shiten')).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should forward query filters into service.findAll when query params are present', async () => {
      // COVERS: §4.1 binding — kanri_shiten_code, kanri_shiten_name, todofuken_code, tel, fax
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      await http()
        .get(apiUrl('kanri-shiten'))
        .query({
          kanri_shiten_code: '3300',
          kanri_shiten_name: '北海道',
          todofuken_code: '01',
          tel: '011',
          fax: '011',
          page: 1,
          per_page: 20,
          sort_by: 'kanri_shiten_code',
          sort_order: 'asc',
        })
        .expect(200);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          kanri_shiten_code: '3300',
          kanri_shiten_name: '北海道',
          todofuken_code: '01',
          tel: '011',
          fax: '011',
          page: 1,
          per_page: 20,
          sort_by: 'kanri_shiten_code',
          sort_order: 'asc',
        }),
        expect.anything(),
      );
    });

    it('should return 200 with empty data + total=0 when no rows match (ACSMS-MSG-008-001 UI text)', async () => {
      // COVERS: §4.6 empty-result path
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      const res = await http().get(apiUrl('kanri-shiten')).expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;
      await http().get(apiUrl('kanri-shiten')).expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when user lacks kanri_shiten.view permission', async () => {
      // COVERS: err:FORBIDDEN (row 3) — PermissionsGuard denies (ACSMS-MSG-008-002)
      permissionsGuardValue = false;
      await http().get(apiUrl('kanri-shiten')).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 400 VALIDATION_ERROR when sort_by is outside the §8.1 allow-list', async () => {
      // COVERS: err:VALIDATION_ERROR (row 5)
      await http()
        .get(apiUrl('kanri-shiten'))
        .query({ sort_by: 'tel' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'sort_by' }),
            ]),
          );
        });
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      await http()
        .get(apiUrl('kanri-shiten'))
        .query({ per_page: 101 })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.findAll.mockRejectedValue(new Error('boom'));
      await http().get(apiUrl('kanri-shiten')).expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

  });

  // ═════════════════════════════════════════════════════════════════════
  // DELETE /api/v1/kanri-shiten/:id (API-008-002)
  // ═════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/kanri-shiten/:id', () => {
    it('should return 200 with success message when service.remove resolves', async () => {
      // COVERS: §4.7 happy path
      service.remove.mockResolvedValue({ message: '削除しました。' });

      const res = await http().delete(apiUrl('kanri-shiten/5')).expect(200);

      expect(res.body.message).toBe('削除しました。');
      expect(service.remove).toHaveBeenCalledWith(5, expect.anything(), expect.anything());
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      await http().delete(apiUrl('kanri-shiten/5')).expect(401);
    });

    it('should return 403 FORBIDDEN when user lacks kanri_shiten.delete permission', async () => {
      // COVERS: §4.2 — NICHINO_ADMIN only
      permissionsGuardValue = false;
      await http().delete(apiUrl('kanri-shiten/5')).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.remove.mockRejectedValue(new NotFoundException('管理支店'));

      await http().delete(apiUrl('kanri-shiten/999')).expect(404).expect((res) => {
        expect(res.body.error_code).toBe('NOT_FOUND');
      });
    });

    it('should return 409 CONFLICT when service throws ConflictException (ACSMS-MSG-008-004)', async () => {
      // COVERS: err:CONFLICT (row 9) — related data exists
      const { ConflictException } = await import('@/common/exceptions/common.exceptions');
      service.remove.mockRejectedValue(new ConflictException());

      await http().delete(apiUrl('kanri-shiten/5')).expect(409).expect((res) => {
        expect(res.body.error_code).toBe('CONFLICT');
      });
    });

    it('should return 400 BAD_REQUEST when path id is not numeric', async () => {
      // COVERS: §4.1 — kanri_shiten_id numeric check
      await http().delete(apiUrl('kanri-shiten/not-a-number')).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.remove.mockRejectedValue(new Error('boom'));
      await http().delete(apiUrl('kanri-shiten/5')).expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-009 — detail + create + update HTTP layer (separate top-level
// describe so its mock setup, especially the findById/create/update
// service stubs, doesn't leak into the SCR-008 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('KanriShitenController — SCR-009 (detail + create + update HTTP)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any = null;
  let permissionsGuardValue: boolean | ((ctx: ExecutionContext) => boolean) = true;

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
    canActivate: (ctx: ExecutionContext) =>
      typeof permissionsGuardValue === 'function'
        ? permissionsGuardValue(ctx)
        : permissionsGuardValue,
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      remove: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    currentSession = buildSession({
      permissions: [
        'kanri_shiten.view',
        'kanri_shiten.create',
        'kanri_shiten.update',
        'kanri_shiten.delete',
      ],
    });
    permissionsGuardValue = true;

    const module = await Test.createTestingModule({
      controllers: [KanriShitenController],
      providers: [{ provide: KanriShitenService, useValue: service }],
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

  const sampleDetail = {
    kanri_shiten_id: 1,
    ja_id: 1,
    kanri_shiten_code: '113-3300-001',
    kanri_shiten_name: '東京中央会支店',
    kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｶｲｼﾃﾝ',
    todofuken_code: '13',
    todofuken_name: '東京都',
    yubin_no: '1000001',
    address: '千代田区千代田1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    paper_flg: true,
    denshi_flg: false,
    biko: '中央会管轄',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: null,
  };

  const validCreateBody = {
    ja_id: 1,
    kanri_shiten_code: '113-3300-002',
    kanri_shiten_name: '東京第二支店',
    kanri_shiten_name_kana: 'ﾄｳｷｮｳﾀﾞｲﾆｼﾃﾝ',
    todofuken_code: '13',
    yubin_no: '1000002',
    address: '千代田区千代田2-2-2',
    tel: '0312345680',
    fax: '0312345681',
    paper_flg: true,
    denshi_flg: true,
    biko: '新規登録テスト',
  };

  // ═════════════════════════════════════════════════════════════════════
  // GET /api/v1/kanri-shiten/:id (API-009-001)
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/kanri-shiten/:id', () => {
    it('should return 200 with detail body when row exists', async () => {
      service.findById.mockResolvedValue(sampleDetail);
      const res = await http().get(apiUrl('kanri-shiten/1')).expect(200);
      expect(res.body.data).toMatchObject({
        kanri_shiten_id: 1,
        kanri_shiten_code: '113-3300-001',
        todofuken_name: '東京都',
      });
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      await http().get(apiUrl('kanri-shiten/1')).expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when caller lacks kanri_shiten.view', async () => {
      permissionsGuardValue = false;
      await http().get(apiUrl('kanri-shiten/1')).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.findById.mockRejectedValue(new NotFoundException('管理支店'));
      await http().get(apiUrl('kanri-shiten/999')).expect(404).expect((res) => {
        expect(res.body.error_code).toBe('NOT_FOUND');
      });
    });

    it('should return 400 BAD_REQUEST when path id is not numeric', async () => {
      await http().get(apiUrl('kanri-shiten/abc')).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.findById.mockRejectedValue(new Error('boom'));
      await http().get(apiUrl('kanri-shiten/1')).expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // POST /api/v1/kanri-shiten (API-009-002)
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/kanri-shiten', () => {
    it('should return 201 with data + message when NICHINO_ADMIN sends valid body', async () => {
      service.create.mockResolvedValue({
        ...sampleDetail,
        kanri_shiten_id: 7,
        kanri_shiten_code: validCreateBody.kanri_shiten_code,
        message: '登録しました。',
      });

      const res = await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(201);
      expect(res.body.data).toMatchObject({ kanri_shiten_id: 7, kanri_shiten_code: validCreateBody.kanri_shiten_code });
      expect(res.body.message).toBe('登録しました。');
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks kanri_shiten.create', async () => {
      permissionsGuardValue = false;
      await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(403);
    });

    it('should return 400 VALIDATION_ERROR when kanri_shiten_code is missing', async () => {
      const { kanri_shiten_code: _drop, ...invalid } = validCreateBody;
      const res = await http().post(apiUrl('kanri-shiten')).send(invalid).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'kanri_shiten_code' })]),
      );
    });

    it('should return 400 DUPLICATE_CODE when service throws DuplicateCodeException', async () => {
      const { DuplicateCodeException } = await import('@/common/exceptions/common.exceptions');
      service.create.mockRejectedValue(
        new DuplicateCodeException('管理支店コード', validCreateBody.kanri_shiten_code),
      );
      const res = await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
      expect(res.body.message).toContain(validCreateBody.kanri_shiten_code);
    });

    it('should return 400 BAD_REQUEST when service throws on missing todofuken_code', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      service.create.mockRejectedValue(new BadRequestException('都道府県コードが存在しません。'));
      await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.create.mockRejectedValue(new Error('boom'));
      await http().post(apiUrl('kanri-shiten')).send(validCreateBody).expect(500);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // PUT /api/v1/kanri-shiten/:id (API-009-003)
  // ═════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/kanri-shiten/:id', () => {
    const validUpdateBody = {
      kanri_shiten_name: '東京中央会支店（改称）',
      kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｶｲｼﾃﾝ ｶｲｼｮｳ',
      todofuken_code: '13',
      yubin_no: '1000001',
      address: '千代田区千代田1-1-1 改修ビル3F',
      tel: '0312345678',
      fax: '0312345679',
      paper_flg: true,
      denshi_flg: true,
      biko: '住所変更済み',
    };

    it('should return 200 with data + message when valid body sent', async () => {
      service.update.mockResolvedValue({
        ...sampleDetail,
        ...validUpdateBody,
        message: '更新しました。',
      });
      const res = await http().put(apiUrl('kanri-shiten/1')).send(validUpdateBody).expect(200);
      expect(res.body.message).toBe('更新しました。');
      expect(res.body.data).toMatchObject({ kanri_shiten_name: '東京中央会支店（改称）' });
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      await http().put(apiUrl('kanri-shiten/1')).send(validUpdateBody).expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks kanri_shiten.update', async () => {
      permissionsGuardValue = false;
      await http().put(apiUrl('kanri-shiten/1')).send(validUpdateBody).expect(403);
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException (DataScope mask)', async () => {
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.update.mockRejectedValue(new NotFoundException('管理支店'));
      await http().put(apiUrl('kanri-shiten/999')).send(validUpdateBody).expect(404);
    });

    it('should return 400 VALIDATION_ERROR when kanri_shiten_name is missing', async () => {
      const { kanri_shiten_name: _drop, ...invalid } = validUpdateBody;
      const res = await http().put(apiUrl('kanri-shiten/1')).send(invalid).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 BAD_REQUEST when path id is not numeric', async () => {
      await http().put(apiUrl('kanri-shiten/abc')).send(validUpdateBody).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.update.mockRejectedValue(new Error('boom'));
      await http().put(apiUrl('kanri-shiten/1')).send(validUpdateBody).expect(500);
    });
  });
});
