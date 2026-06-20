// Screen: ACSMS-SCR-006 — 支店マスタ明細検索画面 (list + delete HTTP)
//         ACSMS-SCR-007 — 支店マスタ登録画面 (detail + create + update HTTP)
//
// Two sibling top-level describe blocks for ShitenController — each
// SCR has its own Nest app boot + service mock so guards and DI don't
// cross-contaminate. Merged into one file (was previously in
// __tests__/shiten-list.controller.spec.ts) to follow the project's
// "1 source = 1 spec file" rule.

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

import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { ShitenController } from '@/modules/shiten/shiten.controller';
import { ShitenService } from '@/modules/shiten/shiten.service';
import { buildChuokaiSession, buildSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('ShitenController — SCR-006 HTTP (list / delete)', () => {
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
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      remove: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['shiten.view', 'shiten.delete'],
    });
    permissionsGuardValue = true;

    const module = await Test.createTestingModule({
      controllers: [ShitenController],
      providers: [{ provide: ShitenService, useValue: service }],
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

  const sampleListItem = {
    shiten_id: 1,
    ja_id: 1,
    shiten_code: '001',
    shiten_name: '本店営業部',
    shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
    kinyu_shiten_flg: false,
    kanri_shiten_id: 1,
    kanri_shiten_name: '東京中央管理支店',
    biko: '本店ビル1F',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: null,
  };

  // ═════════════════════════════════════════════════════════════════════
  // API-006-001 — GET /api/v1/shiten
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/shiten (API-006-001)', () => {
    it('should return 200 + paginated body when service resolves', async () => {
      service.findAll.mockResolvedValue({
        data: [sampleListItem],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http().get(apiUrl('shiten')).expect(200);

      expect(res.body).toEqual({
        data: [sampleListItem],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });
      expect(service.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ ja_id: 1 }),
      );
    });

    it('should pass shiten_name + pagination + sort params through to the service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, per_page: 50, total_pages: 0 },
      });

      await http()
        .get(apiUrl('shiten'))
        .query({ shiten_name: '本店', page: 2, per_page: 50, sort_by: 'shiten_name', sort_order: 'desc' })
        .expect(200);

      const [query] = service.findAll.mock.calls[0];
      expect(query).toMatchObject({
        shiten_name: '本店',
        page: 2,
        per_page: 50,
        sort_by: 'shiten_name',
        sort_order: 'desc',
      });
    });

    it('should return 400 VALIDATION_ERROR when sort_by is not in the allow-list', async () => {
      const res = await http().get(apiUrl('shiten')).query({ sort_by: 'kanri_shiten_id' }).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when no session cookie', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('shiten')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks shiten.view permission', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('shiten')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.findAll.mockRejectedValue(new Error('db crashed'));
      const res = await http().get(apiUrl('shiten')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-006-002 — DELETE /api/v1/shiten/:id
  // ═════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/shiten/:id (API-006-002)', () => {
    it('should return 200 + message when service resolves', async () => {
      service.remove.mockResolvedValue({ message: '削除しました。' });

      const res = await http().delete(apiUrl('shiten/1')).expect(200);

      expect(res.body).toEqual({ message: '削除しました。' });
      expect(service.remove).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ ja_id: 1 }),
        expect.anything(),
      );
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.remove.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定された支店が見つかりません' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().delete(apiUrl('shiten/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when service throws ConflictException (related data exists)', async () => {
      service.remove.mockRejectedValue(
        new HttpException(
          {
            code: 'CONFLICT',
            error_code: 'CONFLICT',
            message: '関連データが存在するため削除できません',
          },
          HttpStatus.CONFLICT,
        ),
      );
      const res = await http().delete(apiUrl('shiten/1')).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
    });

    it('should return 401 UNAUTHORIZED when no session cookie', async () => {
      currentSession = null;
      const res = await http().delete(apiUrl('shiten/1')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks shiten.delete permission', async () => {
      permissionsGuardValue = false;
      const res = await http().delete(apiUrl('shiten/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.remove.mockRejectedValue(new Error('db crashed'));
      const res = await http().delete(apiUrl('shiten/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-007 — detail + create + update HTTP (separate top-level describe so
// its service mock — findById / create / update — and form-specific
// session permissions don't leak into the SCR-006 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('ShitenController — SCR-007 HTTP (detail / create / update)', () => {
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
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      permissions: ['shiten.view', 'shiten.create', 'shiten.update'],
    });
    permissionsGuardValue = true;

    const module = await Test.createTestingModule({
      controllers: [ShitenController],
      providers: [{ provide: ShitenService, useValue: service }],
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
    shiten_id: 1,
    ja_id: 1,
    shiten_code: '001',
    shiten_name: '本店営業部',
    shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
    kinyu_shiten_flg: false,
    kanri_shiten_id: 1,
    biko: '本店ビル1F',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
  };

  // ═════════════════════════════════════════════════════════════════════
  // API-007-001 — GET /api/v1/shiten/:id
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/shiten/:id (API-007-001)', () => {
    it('should return 200 + detail body when service resolves', async () => {
      service.findById.mockResolvedValue(sampleDetail);

      const res = await http().get(apiUrl('shiten/1')).expect(200);

      expect(res.body.data).toMatchObject({
        shiten_id: 1,
        shiten_code: '001',
        biko: '本店ビル1F',
      });
      expect(service.findById).toHaveBeenCalledWith(1, expect.objectContaining({ ja_id: 1 }));
    });

    it('should return 401 UNAUTHORIZED when no session cookie', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('shiten/1')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks shiten.view permission', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('shiten/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.findById.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定された支店が見つかりません' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().get(apiUrl('shiten/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      service.findById.mockRejectedValue(new Error('db crashed'));
      const res = await http().get(apiUrl('shiten/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-007-002 — POST /api/v1/shiten
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/shiten (API-007-002)', () => {
    const validBody = {
      shiten_code: '001',
      shiten_name: '本店営業部',
      shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: false,
      biko: '本店ビル1F',
    };

    it('should return 201 + created body when service resolves with valid input', async () => {
      service.create.mockResolvedValue({ ...sampleDetail, shiten_id: 10, message: '登録しました。' });

      const res = await http().post(apiUrl('shiten')).send(validBody).expect(201);

      expect(res.body.data).toMatchObject({ shiten_id: 10, shiten_code: '001' });
      expect(res.body.message).toBe('登録しました。');
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ shiten_code: '001' }),
        expect.objectContaining({ ja_id: 1 }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR with errors[] when shiten_code is missing', async () => {
      const { shiten_code: _drop, ...invalid } = validBody;
      const res = await http().post(apiUrl('shiten')).send(invalid).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e: any) => e.field === 'shiten_code')).toBe(true);
    });

    it('should return 400 VALIDATION_ERROR when shiten_code is not 3 digits', async () => {
      const res = await http()
        .post(apiUrl('shiten'))
        .send({ ...validBody, shiten_code: 'ABC' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 DUPLICATE_CODE when service throws DuplicateCodeException', async () => {
      service.create.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_CODE',
            error_code: 'DUPLICATE_CODE',
            message: '支店コード「001」はすでに登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http().post(apiUrl('shiten')).send(validBody).expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
      expect(res.body.message).toContain('001');
    });

    it('should return 401 UNAUTHORIZED when no session', async () => {
      currentSession = null;
      const res = await http().post(apiUrl('shiten')).send(validBody).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks shiten.create permission', async () => {
      permissionsGuardValue = false;
      const res = await http().post(apiUrl('shiten')).send(validBody).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-007-003 — PUT /api/v1/shiten/:id
  // ═════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/shiten/:id (API-007-003)', () => {
    const validBody = {
      shiten_name: '本店営業部（名称変更）',
      shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: true,
      // kinyu_shiten_flg=true なので JASTEM 4項目は必須（半角）。
      jastem_toriatsukai_tenpo_code: '001',
      jastem_tenpo_name: 'ﾎﾝﾃﾝ',
      jastem_tyokin_shubetsu: '1',
      jastem_koza_no: '1234567',
      biko: '本店ビル1F 改装済み',
    };

    it('should return 200 + updated body when service resolves', async () => {
      service.update.mockResolvedValue({
        ...sampleDetail,
        shiten_name: validBody.shiten_name,
        message: '更新しました。',
      });

      const res = await http().put(apiUrl('shiten/1')).send(validBody).expect(200);

      expect(res.body.data).toMatchObject({ shiten_id: 1, shiten_name: validBody.shiten_name });
      expect(res.body.message).toBe('更新しました。');
    });

    it('should return 400 VALIDATION_ERROR when shiten_name is missing', async () => {
      const { shiten_name: _drop, ...invalid } = validBody;
      const res = await http().put(apiUrl('shiten/1')).send(invalid).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.some((e: any) => e.field === 'shiten_name')).toBe(true);
    });

    it('should return 400 VALIDATION_ERROR when caller smuggles shiten_code into the body', async () => {
      // forbidNonWhitelisted: true → smuggled shiten_code rejected at pipe.
      const res = await http()
        .put(apiUrl('shiten/1'))
        .send({ ...validBody, shiten_code: '999' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 NOT_FOUND when service throws (target row missing or out-of-scope)', async () => {
      service.update.mockRejectedValue(
        new HttpException(
          { code: 'NOT_FOUND', error_code: 'NOT_FOUND', message: '指定された支店が見つかりません' },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().put(apiUrl('shiten/999')).send(validBody).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 UNAUTHORIZED when no session', async () => {
      currentSession = null;
      const res = await http().put(apiUrl('shiten/1')).send(validBody).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks shiten.update permission', async () => {
      permissionsGuardValue = false;
      const res = await http().put(apiUrl('shiten/1')).send(validBody).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-API-COMMON-008 — Get Koza Shiten Dropdown (定義元: ACSMS-SCR-020)
// GET /api/v1/shiten/koza-dropdown — 認証済みなら誰でも可（呼び出し元画面の権限に依存）。
// ══════════════════════════════════════════════════════════════════════
describe('ShitenController — COMMON-008 HTTP (koza-dropdown)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any = null;

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

  beforeEach(async () => {
    service = { getKozaDropdown: jest.fn() };
    currentSession = buildSession({ ja_id: 1 });

    const module = await Test.createTestingModule({
      controllers: [ShitenController],
      providers: [{ provide: ShitenService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  it('should return 200 with the koza-shiten list when the session is valid', async () => {
    service.getKozaDropdown.mockResolvedValue({
      data: [
        { shiten_id: 10, shiten_code: '001', shiten_name: '本店', kanri_shiten_id: 1 },
        { shiten_id: 11, shiten_code: '002', shiten_name: '北支店', kanri_shiten_id: 1 },
      ],
    });

    const res = await http().get(apiUrl('shiten/koza-dropdown')).expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ shiten_id: 10, shiten_code: '001' });
  });

  it('should pass kanri_shiten_ids query into the service when provided', async () => {
    service.getKozaDropdown.mockResolvedValue({ data: [] });

    await http().get(apiUrl('shiten/koza-dropdown')).query({ kanri_shiten_ids: '1,2' }).expect(200);

    expect(service.getKozaDropdown).toHaveBeenCalled();
  });

  it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
    currentSession = null;
    const res = await http().get(apiUrl('shiten/koza-dropdown')).expect(401);
    expect(res.body.error_code).toBe('UNAUTHORIZED');
  });

  it('should return 500 INTERNAL_SERVER_ERROR when the service throws an unexpected error', async () => {
    service.getKozaDropdown.mockRejectedValue(new Error('boom'));
    const res = await http().get(apiUrl('shiten/koza-dropdown')).expect(500);
    expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
  });
});
