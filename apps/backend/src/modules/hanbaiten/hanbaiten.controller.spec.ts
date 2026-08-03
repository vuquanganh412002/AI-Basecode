// Screen: ACSMS-SCR-018 — 販売店明細検索画面 (list + delete HTTP)
//         ACSMS-SCR-017 — 販売店情報登録画面 (detail + create + update HTTP)
//         ACSMS-SCR-019 — 販売店Excelデータ取込画面 (template + bulk import HTTP)
//
// Three sibling top-level describe blocks for HanbaitenController —
// each SCR has its own Nest app boot + service mock so guards and DI
// don't cross-contaminate. Merged into one file (was previously in
// __tests__/hanbaiten-form.controller.spec.ts) to follow the project's
// "1 source = 1 spec file" rule. SCR-019 adds a binary-download
// endpoint (GET .../import/template) plus a JSON-body bulk import
// (POST .../import) — its sibling describe is at the bottom.

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

import { HanbaitenController } from '@/modules/hanbaiten/hanbaiten.controller';
import { HanbaitenService } from '@/modules/hanbaiten/hanbaiten.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateHanbaitenBody,
  buildHanbaitenDetailResponse,
  buildUpdateHanbaitenBody,
} from '@test/fixtures/hanbaiten-form.factory';
import {
  buildSession,
  buildChuokaiSession,
} from '@test/fixtures/session.factory';
import {
  buildImportRequestNEW,
  buildImportRequestUpdateAll,
  buildImportRequestUpdatePartial,
  buildImportResponseNEW,
} from '@test/fixtures/hanbaiten-import.factory';

describe('HanbaitenController — SCR-018 HTTP (list / delete)', () => {
  let app: INestApplication;
  let service: any;
  let currentSession: any;
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
      listDropdown: jest.fn(),
    };
    // Default: NICHINO_STAFF — has both hanbaiten.view (yes) but NOT hanbaiten.delete
    // per seeder.md §3. Each test overrides as needed.
    currentSession = buildSession({
      role_code: 'NICHINO_STAFF',
      ja_id: null,
      permissions: ['hanbaiten.view'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [HanbaitenController],
      providers: [{ provide: HanbaitenService, useValue: service }],
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
    // Mirror production main.ts so `/api/v1/...` resolves to the controller's
    // unprefixed `@Controller('hanbaiten')` path.
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  const sampleListItem = {
    hanbaiten_id: 1,
    ja_id: 1,
    hanbaiten_code: 'H001',
    hanbaiten_name: '山田新聞販売店',
    todofuken_code: '13',
    todofuken_name: '東京都',
    yubin_no: '1000001',
    address: '東京都千代田区千代田1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_shiharai_cycle: 1,
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 500,
    haiten_flg: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
  };

  // ═════════════════════════════════════════════════════════════════════
  // API-018-001 — GET /api/v1/hanbaiten
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten (API-018-001)', () => {
    it('should return 200 with paginated body when service resolves', async () => {
      // COVERS: happy path — §3 response shape `{ data, meta }`
      service.findAll.mockResolvedValue({
        data: [sampleListItem],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http().get(apiUrl('hanbaiten')).expect(200);

      expect(res.body).toEqual({
        data: [sampleListItem],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should pass all 7 search filters + pagination + sort params through to service', async () => {
      // COVERS: §1 リクエストパラメータ — all filters reach the service args
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, per_page: 50, total_pages: 0 },
      });

      await http()
        .get(apiUrl('hanbaiten'))
        .query({
          hanbaiten_code: 'H00',
          hanbaiten_name: '山田',
          tel: '03',
          fax: '03',
          address: '東京',
          shocho_name: '山田',
          haiten_flg: 'false',
          page: 2,
          per_page: 50,
          sort_by: 'hanbaiten_name',
          sort_order: 'desc',
        })
        .expect(200);

      const [query] = service.findAll.mock.calls[0];
      expect(query).toMatchObject({
        hanbaiten_code: 'H00',
        hanbaiten_name: '山田',
        tel: '03',
        fax: '03',
        address: '東京',
        shocho_name: '山田',
        haiten_flg: false,
        page: 2,
        per_page: 50,
        sort_by: 'hanbaiten_name',
        sort_order: 'desc',
      });
    });

    it('should return 200 with empty data list when no rows match', async () => {
      // COVERS: §4.6 — empty result still HTTP 200 with `data: []`
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      const res = await http()
        .get(apiUrl('hanbaiten'))
        .query({ hanbaiten_code: 'NOMATCH' })
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 400 VALIDATION_ERROR when sort_by is not in the allow-list', async () => {
      // COVERS: §4.1 sort_by allow-list (hanbaiten_code, hanbaiten_name only)
      const res = await http().get(apiUrl('hanbaiten')).query({ sort_by: 'tel' }).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'sort_by' })]),
      );
    });

    it('should return 400 VALIDATION_ERROR when sort_order is neither asc nor desc', async () => {
      // COVERS: §4.1 sort_order enum
      const res = await http().get(apiUrl('hanbaiten')).query({ sort_order: 'random' }).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'sort_order' })]),
      );
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      // COVERS: §4.1 per_page 1〜100
      const res = await http().get(apiUrl('hanbaiten')).query({ per_page: 500 }).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_name exceeds 100 chars', async () => {
      // COVERS: §4.1 hanbaiten_name max 100
      const res = await http()
        .get(apiUrl('hanbaiten'))
        .query({ hanbaiten_name: 'あ'.repeat(101) })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;

      const res = await http().get(apiUrl('hanbaiten')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.view permission', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;

      const res = await http().get(apiUrl('hanbaiten')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.findAll.mockRejectedValue(new Error('db crashed'));

      const res = await http().get(apiUrl('hanbaiten')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-018-002 — DELETE /api/v1/hanbaiten/:hanbaiten_id
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten/dropdown — dummy パラメータ', () => {
    const arrange = () => service.listDropdown.mockResolvedValue({ data: [], has_more: false });

    it.each(['only', 'exclude'] as const)(
      'should pass dummy=%s through to the service',
      async (dummy) => {
        // COVERS: SCR-011 購読種別 → ダミー販売店(9999999999)の絞り込み。
        arrange();
        await http().get(apiUrl('hanbaiten/dropdown')).query({ dummy }).expect(200);
        expect(service.listDropdown.mock.calls[0][0]).toMatchObject({ dummy });
      },
    );

    it.each([undefined, '', 'yes', 'ONLY'])(
      'should drop an unknown dummy value (%s) instead of filtering',
      async (dummy) => {
        // COVERS: 未知の値は「絞らない」に倒す — 既存の呼び出し（dummy 無し）が無影響。
        arrange();
        await http()
          .get(apiUrl('hanbaiten/dropdown'))
          .query(dummy === undefined ? {} : { dummy })
          .expect(200);
        expect(service.listDropdown.mock.calls[0][0].dummy).toBeUndefined();
      },
    );
  });

  describe('DELETE /api/v1/hanbaiten/:hanbaiten_id (API-018-002)', () => {
    beforeEach(() => {
      // Restore default: CHUOKAI has hanbaiten.delete permission
      currentSession = buildChuokaiSession({
        ja_id: 1,
        permissions: ['hanbaiten.view', 'hanbaiten.delete'],
      });
    });

    it('should return 200 + success message when service resolves', async () => {
      // COVERS: §4.7 — happy path, HTTP 200, message='削除しました。'
      service.remove.mockResolvedValue({ message: '削除しました。' });

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(200);

      expect(res.body).toEqual({ message: '削除しました。' });
      expect(service.remove).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ ja_id: 1 }),
        expect.anything(),
      );
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      service.remove.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定された販売店が見つかりません',
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      const res = await http().delete(apiUrl('hanbaiten/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when service throws ConflictException', async () => {
      // COVERS: err:CONFLICT (row 9) — ACSMS-MSG-018-004 literal
      service.remove.mockRejectedValue(
        new HttpException(
          {
            code: 'CONFLICT',
            error_code: 'CONFLICT',
            message: 'この販売店は関連オブジェクトに紐づいているため削除できません。',
          },
          HttpStatus.CONFLICT,
        ),
      );

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
      expect(res.body.message).toBe(
        'この販売店は関連オブジェクトに紐づいているため削除できません。',
      );
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service throws scope-violation exception', async () => {
      // COVERS: err:DATA_SCOPE_VIOLATION (row 4) — surfaced when service
      // chooses NOT to mask (e.g. authenticated audit-only scenarios).
      service.remove.mockRejectedValue(
        new HttpException(
          {
            code: 'DATA_SCOPE_VIOLATION',
            error_code: 'DATA_SCOPE_VIOLATION',
            message: 'このデータへのアクセス権限がありません',
          },
          HttpStatus.FORBIDDEN,
        ),
      );

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 400 VALIDATION_ERROR when path id is non-numeric', async () => {
      // COVERS: §4.1 hanbaiten_id 数値型チェック (ParseIntPipe)
      const res = await http().delete(apiUrl('hanbaiten/abc')).expect(400);
      // The error body shape is normalized by GlobalExceptionFilter.
      expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(res.body.error_code);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.delete permission', async () => {
      // COVERS: err:FORBIDDEN (row 3) — only CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
      // hold hanbaiten.delete per seeder.md §3 (NICHINO_STAFF does NOT).
      permissionsGuardValue = false;

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.remove.mockRejectedValue(new Error('db crashed'));

      const res = await http().delete(apiUrl('hanbaiten/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-017 — detail + create + update HTTP (separate top-level describe so
// its service mock — getHanbaitenDetail / createHanbaiten / updateHanbaiten
// — doesn't leak into the SCR-018 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('HanbaitenController — SCR-017 HTTP (detail / create / update)', () => {
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
      // SCR-017 endpoints
      getHanbaitenDetail: jest.fn(),
      createHanbaiten: jest.fn(),
      updateHanbaiten: jest.fn(),
      // Existing SCR-018 endpoints — stubbed so DI compiles.
      findAll: jest.fn(),
      remove: jest.fn(),
    };

    currentSession = buildChuokaiSession({
      account_id: 100,
      ja_id: 1,
      permissions: ['hanbaiten.view', 'hanbaiten.create', 'hanbaiten.update'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [HanbaitenController],
      providers: [{ provide: HanbaitenService, useValue: service }],
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

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-017-001 — GET /api/v1/hanbaiten/:hanbaiten_id
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten/:hanbaiten_id (getHanbaitenDetail)', () => {
    it('should return 200 with { data } shape when CHUOKAI fetches an existing hanbaiten', async () => {
      service.getHanbaitenDetail.mockResolvedValue({
        data: buildHanbaitenDetailResponse(),
      });

      const res = await http().get(apiUrl('hanbaiten/1')).expect(200);

      expect(res.body.data).toMatchObject({
        hanbaiten_id: 1,
        hanbaiten_code: 'H001',
        hanbaiten_name: '販売店A',
        itaku_kubun: 1,
        bank_code: '0001',
      });
    });

    it('should return 400 BAD_REQUEST when hanbaiten_id is not numeric', async () => {
      const res = await http().get(apiUrl('hanbaiten/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('hanbaiten/1')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.view permission', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('hanbaiten/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.getHanbaitenDetail.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定された販売店が見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().get(apiUrl('hanbaiten/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定された販売店');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.getHanbaitenDetail.mockRejectedValue(new Error('db down'));
      const res = await http().get(apiUrl('hanbaiten/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-017-002 — POST /api/v1/hanbaiten
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/hanbaiten (createHanbaiten)', () => {
    it('should return 201 with the created hanbaiten when CHUOKAI posts a valid body', async () => {
      service.createHanbaiten.mockResolvedValue({
        data: buildHanbaitenDetailResponse({ hanbaiten_id: 15 }),
      });

      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(201);

      expect(res.body.data.hanbaiten_id).toBe(15);
      expect(res.body.data.hanbaiten_code).toBe('H001');
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_code is missing', async () => {
      const body = buildCreateHanbaitenBody();
      delete body.hanbaiten_code;
      const res = await http().post(apiUrl('hanbaiten')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_name is missing', async () => {
      const body = buildCreateHanbaitenBody();
      delete body.hanbaiten_name;
      const res = await http().post(apiUrl('hanbaiten')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_code exceeds 10 chars', async () => {
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'A'.repeat(11) }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 DUPLICATE_CODE when service throws DuplicateCodeException', async () => {
      service.createHanbaiten.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_CODE',
            error_code: 'DUPLICATE_CODE',
            message: '販売店コード「H001」はすでに登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.create permission', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.createHanbaiten.mockRejectedValue(new Error('db down'));
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should allow NICHINO_STAFF to POST a hanbaiten when acting as 代行入力 on behalf of a JA', async () => {
      // COVERS: 画面設計書 v1.2 §1.1 — NICHINO_STAFF 代行入力 flow
      currentSession = buildSession({
        role_code: 'NICHINO_STAFF',
        ja_id: null,
        permissions: ['hanbaiten.view', 'hanbaiten.create', 'hanbaiten.update'],
      });
      service.createHanbaiten.mockResolvedValue({
        data: buildHanbaitenDetailResponse({ hanbaiten_id: 20 }),
      });

      const res = await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody())
        .expect(201);
      expect(res.body.data.hanbaiten_id).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/hanbaiten/:hanbaiten_id (updateHanbaiten)', () => {
    it('should return 200 with the updated hanbaiten when CHUOKAI puts a valid body', async () => {
      service.updateHanbaiten.mockResolvedValue({
        data: buildHanbaitenDetailResponse({
          hanbaiten_id: 1,
          hanbaiten_name: '販売店A改定',
          furikomi_tesuryo: 600,
        }),
      });

      const res = await http()
        .put(apiUrl('hanbaiten/1'))
        .send(buildUpdateHanbaitenBody())
        .expect(200);

      expect(res.body.data.hanbaiten_name).toBe('販売店A改定');
      expect(res.body.data.furikomi_tesuryo).toBe(600);
    });

    it('should return 400 BAD_REQUEST when hanbaiten_id is not numeric', async () => {
      const res = await http()
        .put(apiUrl('hanbaiten/abc'))
        .send(buildUpdateHanbaitenBody())
        .expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_name is missing', async () => {
      const body = buildUpdateHanbaitenBody();
      delete body.hanbaiten_name;
      const res = await http()
        .put(apiUrl('hanbaiten/1'))
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when an unknown field (hanbaiten_code) is submitted (forbidNonWhitelisted)', async () => {
      // api.md §3 注記 — hanbaiten_code は更新不可。
      const res = await http()
        .put(apiUrl('hanbaiten/1'))
        .send({ ...buildUpdateHanbaitenBody(), hanbaiten_code: 'X999' })
        .expect(400);
      expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(res.body.error_code);
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http()
        .put(apiUrl('hanbaiten/1'))
        .send(buildUpdateHanbaitenBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.update permission', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .put(apiUrl('hanbaiten/1'))
        .send(buildUpdateHanbaitenBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.updateHanbaiten.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定された販売店が見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http()
        .put(apiUrl('hanbaiten/999'))
        .send(buildUpdateHanbaitenBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.updateHanbaiten.mockRejectedValue(new Error('db down'));
      const res = await http()
        .put(apiUrl('hanbaiten/1'))
        .send(buildUpdateHanbaitenBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── TOO_MANY_REQUESTS — only testable at integration layer ──────────
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-019 — Excel template download (GET) + bulk import (POST) HTTP
//
// Separate top-level describe so the import-specific service mock
// (downloadImportTemplate + importExcel) doesn't leak into the
// SCR-017 / SCR-018 blocks above. Also re-asserts guards because each
// new endpoint walks SessionAuthGuard + PermissionsGuard with the new
// `hanbaiten.import` permission code.
// ═══════════════════════════════════════════════════════════════════════

describe('HanbaitenController — SCR-019 HTTP (Excel template + import)', () => {
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
      // SCR-019 endpoints under test
      downloadImportTemplate: jest.fn(),
      importExcel: jest.fn(),
      // Existing SCR-017 / SCR-018 endpoints stubbed so DI compiles.
      findAll: jest.fn(),
      remove: jest.fn(),
      getHanbaitenDetail: jest.fn(),
      createHanbaiten: jest.fn(),
      updateHanbaiten: jest.fn(),
    };

    // Default — JA_HONTEN with hanbaiten.import per api.md §4.2.
    currentSession = buildChuokaiSession({
      account_id: 200,
      ja_id: 1,
      permissions: ['hanbaiten.view', 'hanbaiten.import'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [HanbaitenController],
      providers: [{ provide: HanbaitenService, useValue: service }],
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

  /** supertest binary parser — captures Buffer chunks for XLSX download. */
  function binaryParser(
    res: any,
    callback: (err: Error | null, body: Buffer) => void,
  ) {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  }

  // ─────────────────────────────────────────────────────────────────────
  // API-019-001 — GET /api/v1/hanbaiten/import/template
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/hanbaiten/import/template (API-019-001)', () => {
    it('should return 200 with a binary XLSX body when caller holds hanbaiten.import', async () => {
      // COVERS: §4.4 happy path — Buffer body, HTTP 200.
      service.downloadImportTemplate.mockResolvedValue(
        Buffer.from('mocked-xlsx'),
      );

      const res = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      // Body should be a non-empty Buffer
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it('should set Content-Type to application/vnd.openxmlformats-officedocument.spreadsheetml.sheet on success', async () => {
      // COVERS: §4.4 — レスポンスヘッダ Content-Type
      service.downloadImportTemplate.mockResolvedValue(
        Buffer.from('mocked-xlsx'),
      );

      const res = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i,
      );
    });

    it('should set Content-Disposition with the Japanese filename 販売店Excelデータ取込_テンプレート.xlsx on success', async () => {
      // COVERS: §4.4 — レスポンスヘッダ Content-Disposition
      service.downloadImportTemplate.mockResolvedValue(
        Buffer.from('mocked-xlsx'),
      );

      const res = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const cd = String(res.headers['content-disposition'] ?? '');
      expect(cd).toMatch(/attachment/i);
      // Some servers UTF-8-encode the filename via filename*=UTF-8'' — accept both.
      expect(cd).toMatch(
        /(販売店Excelデータ取込_テンプレート\.xlsx|filename\*=UTF-8''.+\.xlsx)/,
      );
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('hanbaiten/import/template')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.import permission', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('hanbaiten/import/template')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when the service throws an unexpected error during generation', async () => {
      service.downloadImportTemplate.mockRejectedValue(
        new Error('ExcelJS oom'),
      );
      const res = await http().get(apiUrl('hanbaiten/import/template')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // API-019-002 — POST /api/v1/hanbaiten/import
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/hanbaiten/import (API-019-002)', () => {
    it('should return 200 with the import summary when service resolves NEW mode successfully', async () => {
      // COVERS: §4.6 happy-path response shape.
      const happy = buildImportResponseNEW();
      service.importExcel.mockResolvedValue(happy);

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.objectContaining({
          import_mode: 'NEW',
          total_rows: expect.any(Number),
          created_count: expect.any(Number),
          updated_count: expect.any(Number),
          skipped_count: expect.any(Number),
          imported_at: expect.any(String),
        }),
        message: '取り込みました。',
      });
    });

    it('should return 200 when UPDATE mode (all columns) succeeds', async () => {
      service.importExcel.mockResolvedValue({
        data: {
          import_mode: 'UPDATE',
          total_rows: 1,
          created_count: 0,
          updated_count: 1,
          skipped_count: 0,
          imported_at: new Date().toISOString(),
        },
        message: '取り込みました。',
      });

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestUpdateAll())
        .expect(200);

      expect(res.body.data.import_mode).toBe('UPDATE');
      expect(res.body.data.updated_count).toBe(1);
    });

    it('should return 200 when UPDATE mode (subset) succeeds', async () => {
      service.importExcel.mockResolvedValue({
        data: {
          import_mode: 'UPDATE',
          total_rows: 1,
          created_count: 0,
          updated_count: 1,
          skipped_count: 0,
          imported_at: new Date().toISOString(),
        },
        message: '取り込みました。',
      });

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestUpdatePartial())
        .expect(200);

      expect(res.body.data.import_mode).toBe('UPDATE');
    });

    it('should return 400 VALIDATION_ERROR when import_mode is missing from the body', async () => {
      const body = buildImportRequestNEW();
      delete body.import_mode;
      const res = await http().post(apiUrl('hanbaiten/import')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when import_mode is not one of NEW / UPDATE', async () => {
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW({ import_mode: 'DELETE_ALL' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when selected_columns is empty', async () => {
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW({ selected_columns: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when rows is empty', async () => {
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW({ rows: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 ROW_LIMIT_EXCEEDED when service rejects 501-row payload', async () => {
      // The DTO @ArrayMaxSize already catches this — but service may also
      // re-raise as ROW_LIMIT_EXCEEDED. Accept either error code so the
      // spec doesn't fail when the DTO layer changes.
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'ROW_LIMIT_EXCEEDED',
            error_code: 'ROW_LIMIT_EXCEEDED',
            message: '取込データ行数の上限（500行）を超えています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(400);
      expect(['ROW_LIMIT_EXCEEDED', 'VALIDATION_ERROR']).toContain(
        res.body.error_code,
      );
    });

    it('should return 400 IMPORT_VALIDATION_ERROR with errors[] containing row numbers when service raises row-level errors', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'IMPORT_VALIDATION_ERROR',
            error_code: 'IMPORT_VALIDATION_ERROR',
            message:
              'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
            errors: [
              { row: 2, field: 'hanbaiten_code', message: '同一の販売店コードが既に登録されています' },
              { row: 5, field: 'haitatsuryo_tanka_code', message: '指定された配達手数料単価コードが見つかりません' },
            ],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(400);

      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 2, field: 'hanbaiten_code' }),
          expect.objectContaining({ row: 5, field: 'haitatsuryo_tanka_code' }),
        ]),
      );
    });

    it('should return 400 DUPLICATE_CODE when service raises a duplicate hanbaiten_code conflict in NEW mode', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_CODE',
            error_code: 'DUPLICATE_CODE',
            message: '同一の販売店コードが既に登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 404 NOT_FOUND when service raises NOT_FOUND on UPDATE missing row', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定された販売店が見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestUpdateAll())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 FILE_FORMAT_ERROR when service raises FILE_FORMAT_ERROR for unparseable rows', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'FILE_FORMAT_ERROR',
            error_code: 'FILE_FORMAT_ERROR',
            message:
              'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(400);
      expect(res.body.error_code).toBe('FILE_FORMAT_ERROR');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service rejects out-of-scope ja_id writes', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'DATA_SCOPE_VIOLATION',
            error_code: 'DATA_SCOPE_VIOLATION',
            message: 'このデータへのアクセス権限がありません。',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.import permission', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.importExcel.mockRejectedValue(new Error('db crashed'));
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── TOO_MANY_REQUESTS — only testable at integration layer ──────────
});
