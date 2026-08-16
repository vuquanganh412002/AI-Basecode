// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面 (list + delete HTTP)
//         ACSMS-SCR-003 — 単価マスタ登録画面 (detail + create + update HTTP)
//
// Two sibling top-level describe blocks for TankaController — each SCR
// has its own Nest app boot + service mock so guards and DI don't
// cross-contaminate. Merged into one file (was previously in
// __tests__/tanka-form.controller.spec.ts) to follow the project's
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
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';

import { API_PREFIX } from '@/common/constants/api.constants';
import {
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { TankaController } from '@/modules/tanka/tanka.controller';
import { TankaService } from '@/modules/tanka/tanka.service';
import {
  buildChuokaiSession,
  buildSession,
} from '@test/fixtures/session.factory';
import {
  buildCreateTankaPayload,
  buildUpdateTankaPayload,
} from '@test/fixtures/tanka.factory';

describe('TankaController — SCR-002 HTTP (list / delete)', () => {
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
      remove: jest.fn(),
    };
    currentSession = buildChuokaiSession({ ja_id: 1, permissions: ['tanka.view', 'tanka.delete'] });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [TankaController],
      providers: [{ provide: TankaService, useValue: service }],
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

  // ─── GET /api/v1/tanka ──────────────────────────────────────────────────
  describe('GET /api/v1/tanka', () => {
    function makeListResponse(rows: any[] = [], total?: number) {
      const t = total ?? rows.length;
      const per_page = 20;
      return {
        data: rows,
        meta: {
          total: t,
          page: 1,
          per_page,
          total_pages: Math.max(1, Math.ceil(t / per_page)),
        },
      };
    }

    it('should return 200 with paginated body when authenticated CHUOKAI calls', async () => {
      // COVERS: §4.7 happy path
      const row = {
        tanka_id: 1,
        tanka_type: 1,
        tanka_code: 'T001',
        tanka_name: '基本購読料（月額）',
        tekiyo_start_date: '2026-01-01',
        tekiyo_end_date: null,
        kingaku_zeikomi: 4900,
        kingaku_zeinuki: 4455,
        tax_rate: 10.0,
        active_flg: true,
        campaign_flg: false,
      };
      service.findAll.mockResolvedValue(makeListResponse([row], 1));

      const res = await http().get('/api/v1/tanka').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ tanka_id: 1, tanka_code: 'T001' });
      expect(res.body.meta).toMatchObject({ total: 1, page: 1, per_page: 20 });
    });

    it('should pass tanka_type filter through to service.findAll as coerced Number', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?tanka_type=2').expect(200);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ tanka_type: 2 }),
        expect.anything(),
      );
    });

    it('should pass tanka_name filter through to service.findAll', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?tanka_name=%E5%9F%BA%E6%9C%AC').expect(200); // '基本' encoded
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ tanka_name: '基本' }),
        expect.anything(),
      );
    });

    it('should pass active_flg=true through as boolean true', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?active_flg=true').expect(200);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ active_flg: true }),
        expect.anything(),
      );
    });

    it('should pass active_flg=false through as boolean false', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?active_flg=false').expect(200);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ active_flg: false }),
        expect.anything(),
      );
    });

    it('should pass campaign_flg=true through as boolean true', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?campaign_flg=true').expect(200);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ campaign_flg: true }),
        expect.anything(),
      );
    });

    it('should pass campaign_flg=false through as boolean false', async () => {
      service.findAll.mockResolvedValue(makeListResponse());
      await http().get('/api/v1/tanka?campaign_flg=false').expect(200);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ campaign_flg: false }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR when sort_order is invalid', async () => {
      // COVERS: err:VALIDATION_ERROR (row 5) — DTO @IsIn for sort_order
      await http()
        .get('/api/v1/tanka?sort_order=random')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'sort_order' }),
            ]),
          );
        });
    });

    it('should return 400 VALIDATION_ERROR when sort_by is not whitelisted (SQLi guard)', async () => {
      await http()
        .get('/api/v1/tanka?sort_by=tanka_code;DROP+TABLE+m_tanka')
        .expect(400);
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      await http().get('/api/v1/tanka?per_page=200').expect(400);
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;
      await http()
        .get('/api/v1/tanka')
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });
    });

    it('should return 403 FORBIDDEN when user lacks tanka.view permission', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;
      await http()
        .get('/api/v1/tanka')
        .expect(403)
        .expect((res) => {
          expect(res.body.error_code).toBe('FORBIDDEN');
        });
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.findAll.mockRejectedValue(new Error('db connection lost'));
      await http()
        .get('/api/v1/tanka')
        .expect(500)
        .expect((res) => {
          expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
        });
    });

  });

  // ─── DELETE /api/v1/tanka/:tanka_id ─────────────────────────────────────
  describe('DELETE /api/v1/tanka/:tanka_id', () => {
    it('should return 200 with success message on successful delete', async () => {
      // COVERS: §4.7 happy path
      service.remove.mockResolvedValue({ message: '削除しました。' });
      const res = await http().delete('/api/v1/tanka/5').expect(200);
      expect(res.body.message).toBe('削除しました。');
    });

    it('should call service.remove with parsed numeric tanka_id from path', async () => {
      service.remove.mockResolvedValue({ message: '削除しました。' });
      await http().delete('/api/v1/tanka/42').expect(200);
      expect(service.remove).toHaveBeenCalledWith(
        42,
        expect.anything(),
        expect.anything(),
      );
    });

    it('should return 400 when tanka_id path param is not numeric', async () => {
      // COVERS: err:BAD_REQUEST (row 1) — ParseIntPipe
      await http().delete('/api/v1/tanka/abc').expect(400);
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      await http()
        .delete('/api/v1/tanka/5')
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });
    });

    it('should return 403 FORBIDDEN when user lacks tanka.delete permission', async () => {
      permissionsGuardValue = false;
      await http()
        .delete('/api/v1/tanka/5')
        .expect(403)
        .expect((res) => {
          expect(res.body.error_code).toBe('FORBIDDEN');
        });
    });

    it('should return 404 NOT_FOUND when service throws for missing tanka_id', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      const { NotFoundException } = await import(
        '@/common/exceptions/common.exceptions'
      );
      service.remove.mockRejectedValue(new NotFoundException('単価'));
      await http()
        .delete('/api/v1/tanka/999')
        .expect(404)
        .expect((res) => {
          expect(res.body.error_code).toBe('NOT_FOUND');
        });
    });

    it('should return 409 CONFLICT when service throws for related-data conflict', async () => {
      // COVERS: err:CONFLICT (row 9) — m_hanbaiten or t_dokusya references the tanka
      const { ConflictException } = await import(
        '@/common/exceptions/common.exceptions'
      );
      service.remove.mockRejectedValue(new ConflictException());
      await http()
        .delete('/api/v1/tanka/5')
        .expect(409)
        .expect((res) => {
          expect(res.body.error_code).toBe('CONFLICT');
        });
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.remove.mockRejectedValue(new Error('db down'));
      await http()
        .delete('/api/v1/tanka/5')
        .expect(500)
        .expect((res) => {
          expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
        });
    });

  });
});

// ═══════════════════════════════════════════════════════════════════════
// ACSMS-SCR-003 — detail + create + update HTTP (separate top-level describe so
// the Nest app boot + service mock surface for the 3 form endpoints
// doesn't leak into the ACSMS-SCR-002 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('TankaController — SCR-003 HTTP (detail / create / update)', () => {
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
    canActivate: () => {
      if (!permissionsGuardValue) {
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
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['tanka.view', 'tanka.create', 'tanka.update', 'tanka.delete'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [TankaController],
      providers: [{ provide: TankaService, useValue: service }],
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
              message:
                '入力値が不正です。詳細はerrorsフィールドを確認してください。',
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

  // ────────────────────────────────────────────────────────────────────────
  // ACSMS-API-003-001 — GET /api/v1/tanka/:tanka_id
  // ────────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/tanka/:tanka_id', () => {
    function makeDetail(overrides: Record<string, unknown> = {}) {
      return {
        tanka_id: 1,
        ja_id: 1,
        tanka_type: 1,
        tanka_code: 'T001',
        tanka_name: '基本購読料（月額）',
        kingaku_zeikomi: 4900,
        kingaku_zeinuki: 4455,
        tax_rate: 10,
        tekiyo_start_date: '2026-01-01',
        tekiyo_end_date: null,
        active_flg: true,
        campaign_flg: false,
        biko: '',
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-03-10T14:30:00.000Z',
        ...overrides,
      };
    }

    it('should return 200 with { data: TankaResponseDto } when target exists', async () => {
      service.findById.mockResolvedValue(makeDetail());

      const res = await http().get('/api/v1/tanka/1').expect(200);
      expect(res.body.data).toMatchObject({
        tanka_id: 1,
        tanka_code: 'T001',
        biko: '',
        active_flg: true,
      });
    });

    it('should parse tanka_id path param as a Number', async () => {
      service.findById.mockResolvedValue(makeDetail({ tanka_id: 42 }));
      await http().get('/api/v1/tanka/42').expect(200);
      expect(service.findById).toHaveBeenCalledWith(42, expect.anything());
    });

    it('should return 400 BAD_REQUEST when tanka_id is non-numeric', async () => {
      // COVERS: §4.1 — tanka_id 数値型チェック
      await http().get('/api/v1/tanka/abc').expect(400);
      expect(service.findById).not.toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      const res = await http().get('/api/v1/tanka/1').expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when tanka.view permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().get('/api/v1/tanka/1').expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.findById.mockRejectedValue(new NotFoundException('単価'));
      const res = await http().get('/api/v1/tanka/999').expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.findById.mockRejectedValue(new Error('DB exploded'));
      const res = await http().get('/api/v1/tanka/1').expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // ACSMS-API-003-002 — POST /api/v1/tanka
  // ────────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/tanka', () => {
    function makeCreated(overrides: Record<string, unknown> = {}) {
      return {
        tanka_id: 10,
        ja_id: 1,
        tanka_type: 1,
        tanka_code: 'T100',
        tanka_name: '新規単価',
        kingaku_zeikomi: 1100,
        kingaku_zeinuki: 1000,
        tax_rate: 10,
        tekiyo_start_date: '2026-06-01',
        tekiyo_end_date: '2027-05-31',
        active_flg: true,
        campaign_flg: false,
        biko: '',
        created_at: '2026-04-09T10:00:00.000Z',
        updated_at: null,
        ...overrides,
      };
    }

    it('should return 201 with { data: TankaResponseDto, message } on happy path', async () => {
      service.create.mockResolvedValue(makeCreated());

      const res = await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload())
        .expect(201);

      expect(res.body.data).toMatchObject({
        tanka_id: 10,
        tanka_code: 'T100',
        active_flg: true,
      });
      expect(res.body.message).toBe('登録しました。');
    });

    it('should pass the DTO to service.create as snake_case', async () => {
      service.create.mockResolvedValue(makeCreated());
      const payload = buildCreateTankaPayload({ tanka_code: 'X999' });

      await http().post('/api/v1/tanka').send(payload).expect(201);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ tanka_code: 'X999' }),
        expect.objectContaining({ ja_id: 1 }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR when tanka_code is missing', async () => {
      await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload({ tanka_code: undefined }))
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'tanka_code' }),
            ]),
          );
        });
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when tanka_name exceeds 100 chars', async () => {
      await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload({ tanka_name: 'あ'.repeat(101) }))
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when tekiyo_start_date is missing', async () => {
      await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload({ tekiyo_start_date: undefined }))
        .expect(400);
    });

    it('should return 400 VALIDATION_ERROR when tax_rate is out of range (101)', async () => {
      await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload({ tax_rate: 101 }))
        .expect(400);
    });

    it('should return 400 DUPLICATE_CODE when service throws DuplicateCodeException', async () => {
      service.create.mockRejectedValue(
        new DuplicateCodeException('単価コード', 'T001'),
      );

      const res = await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload({ tanka_code: 'T001' }))
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      const res = await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when tanka.create permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.create.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .post('/api/v1/tanka')
        .send(buildCreateTankaPayload())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // ACSMS-API-003-003 — PUT /api/v1/tanka/:tanka_id
  // ────────────────────────────────────────────────────────────────────────
  describe('PUT /api/v1/tanka/:tanka_id', () => {
    function makeUpdated(overrides: Record<string, unknown> = {}) {
      return {
        tanka_id: 1,
        ja_id: 1,
        tanka_type: 1,
        tanka_code: 'T001',
        tanka_name: '基本購読料（月額）改定',
        kingaku_zeikomi: 5200,
        kingaku_zeinuki: 4727,
        tax_rate: 10,
        tekiyo_start_date: '2026-04-01',
        tekiyo_end_date: '2027-03-31',
        active_flg: true,
        campaign_flg: false,
        biko: '',
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-04-09T14:30:00.000Z',
        ...overrides,
      };
    }

    it('should return 200 with { data: TankaResponseDto, message } on happy path', async () => {
      service.update.mockResolvedValue(makeUpdated());

      const res = await http()
        .put('/api/v1/tanka/1')
        .send(buildUpdateTankaPayload())
        .expect(200);

      expect(res.body.data).toMatchObject({
        tanka_id: 1,
        tanka_name: '基本購読料（月額）改定',
      });
      expect(res.body.message).toBe('更新しました。');
    });

    it('should pass tanka_id as Number + DTO to service.update', async () => {
      service.update.mockResolvedValue(makeUpdated());
      const payload = buildUpdateTankaPayload({ tanka_name: 'X' });

      await http().put('/api/v1/tanka/7').send(payload).expect(200);

      expect(service.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ tanka_name: 'X' }),
        expect.objectContaining({ ja_id: 1 }),
        expect.anything(),
      );
    });

    it('should reject tanka_code in body via forbidNonWhitelisted (immutable field)', async () => {
      // COVERS: api.md §ACSMS-API-003-003 footnote — tanka_code is not on UpdateTankaDto
      const res = await http()
        .put('/api/v1/tanka/1')
        .send({ ...buildUpdateTankaPayload(), tanka_code: 'EVIL' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when tanka_name is missing', async () => {
      await http()
        .put('/api/v1/tanka/1')
        .send(buildUpdateTankaPayload({ tanka_name: undefined }))
        .expect(400);
    });

    it('should return 400 BAD_REQUEST when tanka_id path param is non-numeric', async () => {
      await http()
        .put('/api/v1/tanka/abc')
        .send(buildUpdateTankaPayload())
        .expect(400);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session is missing', async () => {
      currentSession = null;
      const res = await http()
        .put('/api/v1/tanka/1')
        .send(buildUpdateTankaPayload())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when tanka.update permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .put('/api/v1/tanka/1')
        .send(buildUpdateTankaPayload())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException('単価'));
      const res = await http()
        .put('/api/v1/tanka/999')
        .send(buildUpdateTankaPayload())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.update.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .put('/api/v1/tanka/1')
        .send(buildUpdateTankaPayload())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    // TOO_MANY_REQUESTS — covered at the integration layer (Throttler is
    // app-level middleware; unit-controller spec doesn't wire it).
  });
});
