// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//          ACSMS-SCR-004 — JAマスタ明細検索画面 (extends with GET list + DELETE)
//
// Drives src/modules/ja/ja.controller.ts. Uses supertest against a Nest app
// with SessionAuthGuard + PermissionsGuard stubbed via overrideGuard().

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

import { JaController } from '@/modules/ja/ja.controller';
import { JaService } from '@/modules/ja/ja.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { API_PREFIX } from '@/common/constants/api.constants';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { buildJa } from '@test/fixtures/ja.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';

describe('JaController (HTTP)', () => {
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
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      dropdown: jest.fn(),
    };
    currentSession = buildSession();
    permissionsGuardValue = true;

    const module = await Test.createTestingModule({
      controllers: [JaController],
      providers: [{ provide: JaService, useValue: service }],
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

  // ───────────────────────────────────────────────────────────────────
  // GET /api/v1/ja/:ja_id  (API-005-001)
  // ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/ja/:ja_id', () => {
    it('should return 200 with JA detail when NICHINO_ADMIN requests valid ja_id', async () => {
      // COVERS: happy path
      // Service returns JaResponseDto (snake_case). Mock with the response shape.
      service.findById.mockResolvedValue({
        ja_id: 1,
        ja_code: '1301001001',
        ja_name: 'JA東京中央',
        ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳ',
        todofuken_code: '13',
        todofuken_name: '東京都',
        chuokai_flg: true,
        yubin_no: '1000001',
        address: '東京都千代田区丸の内1-1-1',
        tel: '0312345678',
        fax: '0312345679',
        email: 'info@ja-tokyo-chuo.or.jp',
        tanto_busho: '総務部',
        tanto_name: '田中太郎',
        zei_kubun: 1,
        biko: '',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: null,
      });

      const res = await http().get('/api/v1/ja/1').expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.ja_id).toBe(1);
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing or invalid', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;

      await http().get('/api/v1/ja/1').expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when user lacks ja.view permission', async () => {
      // COVERS: err:FORBIDDEN (row 3) — PermissionsGuard denies
      permissionsGuardValue = false;

      await http().get('/api/v1/ja/1').expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.findById.mockRejectedValue(new NotFoundException('JA'));

      await http().get('/api/v1/ja/999').expect(404).expect((res) => {
        expect(res.body.error_code).toBe('NOT_FOUND');
      });
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.findById.mockRejectedValue(new Error('boom'));

      await http().get('/api/v1/ja/1').expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/ja  (API-005-002)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/ja', () => {
    const validBody = {
      ja_code: '1301003001',
      ja_name: 'JA東京みどり',
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘ',
      todofuken_code: '13',
      chuokai_flg: false,
      yubin_no: '1600022',
      address: '東京都新宿区新宿3-1-1',
      tel: '0323456789',
      fax: '0323456780',
      email: 'info@ja-tokyo-midori.or.jp',
      tanto_busho: '企画課',
      tanto_name: '鈴木花子',
      zei_kubun: 1,
      biko: '',
    };

    it('should return 201 with created JA when NICHINO_ADMIN posts valid body', async () => {
      // COVERS: happy path 201
      service.create.mockResolvedValue({
        ja_id: 3,
        ...validBody,
        message: '登録しました。',
      });

      const res = await http().post('/api/v1/ja').send(validBody).expect(201);

      expect(res.body.data.ja_id).toBe(3);
      expect(res.body.message).toBe('登録しました。');
    });

    it('should return 400 VALIDATION_ERROR when ja_code is missing', async () => {
      // COVERS: err:VALIDATION_ERROR (row 5) for required field
      const { ja_code, ...body } = validBody;

      const res = await http().post('/api/v1/ja').send(body).expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'ja_code' })]),
      );
    });

    it('should return 400 VALIDATION_ERROR when email is malformed', async () => {
      // COVERS: 4.1 email format check
      const res = await http()
        .post('/api/v1/ja')
        .send({ ...validBody, email: 'not-an-email' })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });

    it('should return 401 UNAUTHORIZED when no session', async () => {
      // COVERS: err:UNAUTHORIZED
      currentSession = null;

      await http().post('/api/v1/ja').send(validBody).expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when user lacks ja.create permission', async () => {
      // COVERS: err:FORBIDDEN — CHUOKAI/JA_HONTEN denied on create
      permissionsGuardValue = false;
      currentSession = buildChuokaiSession();

      await http().post('/api/v1/ja').send(validBody).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 400 DUPLICATE_CODE when service throws on duplicate ja_code', async () => {
      // COVERS: err:DUPLICATE_CODE (row 9) — HTTP 400 per 共通 policy (CONFLICT is for has-related-data)
      const { BadRequestException } = await import('@nestjs/common');
      service.create.mockRejectedValue(new BadRequestException({
        error_code: 'DUPLICATE_CODE',
        message: '同一のJAコードが既に登録されています。',
      }));

      await http().post('/api/v1/ja').send(validBody).expect(400).expect((res) => {
        expect(res.body.error_code).toBe('DUPLICATE_CODE');
      });
    });

    it('should return 400 BAD_REQUEST when todofuken_code does not exist', async () => {
      // COVERS: 4.3 都道府県コード存在検証
      const { BadRequestException } = await import('@nestjs/common');
      service.create.mockRejectedValue(new BadRequestException({
        error_code: 'BAD_REQUEST',
        message: '都道府県コードが存在しません。',
      }));

      await http().post('/api/v1/ja').send({ ...validBody, todofuken_code: '99' }).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR
      service.create.mockRejectedValue(new Error('DB down'));

      await http().post('/api/v1/ja').send(validBody).expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // PUT /api/v1/ja/:ja_id  (API-005-003)
  // ───────────────────────────────────────────────────────────────────
  describe('PUT /api/v1/ja/:ja_id', () => {
    const fullBody = {
      ja_name: 'JA東京中央（改定）',
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳｶｲﾃｲ',
      todofuken_code: '13',
      chuokai_flg: true,
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info-new@ja-tokyo-chuo.or.jp',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 2,
      biko: '住所変更済み',
    };

    const partialBody = {
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info-new@ja-tokyo-chuo.or.jp',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 2,
      biko: '住所変更済み',
    };

    it('should return 200 with updated JA when NICHINO_ADMIN updates all fields', async () => {
      service.update.mockResolvedValue({
        ja_id: 1,
        ...fullBody,
        message: '更新しました。',
      });

      const res = await http().put('/api/v1/ja/1').send(fullBody).expect(200);

      expect(res.body.data.ja_id).toBe(1);
      expect(res.body.message).toBe('更新しました。');
    });

    it('should return 200 when CHUOKAI updates only ※4 allowed partial fields', async () => {
      currentSession = buildChuokaiSession({ ja_id: 1 });
      service.update.mockResolvedValue({ ja_id: 1, ...partialBody });

      const res = await http().put('/api/v1/ja/1').send(partialBody).expect(200);

      expect(res.body.data.ja_id).toBe(1);
    });

    it('should return 200 when JA_HONTEN updates only ※4 allowed partial fields', async () => {
      currentSession = buildJaHontenSession({ ja_id: 1 });
      service.update.mockResolvedValue({ ja_id: 1, ...partialBody });

      await http().put('/api/v1/ja/1').send(partialBody).expect(200);
    });

    it('should return 403 FORBIDDEN when JA_KANRI_SHITEN attempts update (no ja.update permission)', async () => {
      // COVERS: err:FORBIDDEN — JA_KANRI_SHITEN not in target roles list
      permissionsGuardValue = false;
      currentSession = buildJaKanriShitenSession({ ja_id: 1 });

      await http().put('/api/v1/ja/1').send(partialBody).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 404 NOT_FOUND when service throws for missing ja_id', async () => {
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.update.mockRejectedValue(new NotFoundException('JA'));

      await http().put('/api/v1/ja/999').send(fullBody).expect(404).expect((res) => {
        expect(res.body.error_code).toBe('NOT_FOUND');
      });
    });

    it('should return 403 DATA_SCOPE_VIOLATION when CHUOKAI tries to update JA outside scope', async () => {
      // COVERS: err:DATA_SCOPE_VIOLATION (row 4) — surfaced by service when row filter miss
      const { ForbiddenException } = await import('@nestjs/common');
      currentSession = buildChuokaiSession({ ja_id: 1 });
      service.update.mockRejectedValue(new ForbiddenException({
        error_code: 'DATA_SCOPE_VIOLATION',
        message: 'このデータへのアクセス権限がありません。',
      }));

      await http().put('/api/v1/ja/2').send(partialBody).expect(403).expect((res) => {
        expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
      });
    });

    it('should return 400 VALIDATION_ERROR when email is malformed', async () => {
      const res = await http()
        .put('/api/v1/ja/1')
        .send({ ...fullBody, email: 'bad' })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });

    it('should return 400 BAD_REQUEST when todofuken_code not in m_todofuken', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      service.update.mockRejectedValue(new BadRequestException({
        error_code: 'BAD_REQUEST',
        message: '都道府県コードが存在しません。',
      }));

      await http().put('/api/v1/ja/1').send({ ...fullBody, todofuken_code: '99' }).expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      service.update.mockRejectedValue(new Error('DB down'));

      await http().put('/api/v1/ja/1').send(fullBody).expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // GET /api/v1/ja  (API-004-001 — list / search)
  // ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/ja', () => {
    function makeListResponse(rows: number, total = rows) {
      return {
        data: Array.from({ length: rows }, (_, i) => ({
          ja_id: i + 1,
          ja_code: `13010010${String(i + 1).padStart(2, '0')}`,
          ja_name: `JA東京${i + 1}`,
          yubin_no: '1000001',
          todofuken_code: '13',
          todofuken_name: '東京都',
          tel: '0312345678',
          address: '東京都千代田区',
          fax: '0312345679',
        })),
        meta: {
          total,
          page: 1,
          per_page: 20,
          total_pages: Math.ceil(total / 20),
        },
      };
    }

    it('should return 200 with paginated list when NICHINO_ADMIN searches without filters', async () => {
      // COVERS: happy path — 200 with {data, meta}
      service.findAll.mockResolvedValue(makeListResponse(2));

      const res = await http().get('/api/v1/ja').expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ total: 2, page: 1, per_page: 20, total_pages: 1 });
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should pass query filters (ja_code, ja_name, page, per_page) through to service', async () => {
      // COVERS: 4.1 リクエストパラメータ — filters reach service args
      service.findAll.mockResolvedValue(makeListResponse(0, 0));

      await http()
        .get('/api/v1/ja?ja_code=1301&ja_name=%E6%9D%B1%E4%BA%AC&page=2&per_page=10&sort_by=ja_name&sort_order=desc')
        .expect(200);

      const callArgs = service.findAll.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        ja_code: '1301',
        ja_name: '東京',
        page: 2,
        per_page: 10,
        sort_by: 'ja_name',
        sort_order: 'desc',
      });
    });

    it('should return 200 with empty list when no rows match', async () => {
      // COVERS: 4.7 — empty result has data:[] and meta.total:0
      service.findAll.mockResolvedValue(makeListResponse(0, 0));

      const res = await http().get('/api/v1/ja?ja_code=NOMATCH').expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;

      await http().get('/api/v1/ja').expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when user lacks ja.view permission', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;

      await http().get('/api/v1/ja').expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it.each([
      // COVERS: 4.1 per_page バリデーション — Max(100)
      ['per_page exceeds 100', 'per_page=500', 'per_page'],
      // COVERS: 4.1 sort_order バリデーション — enum [asc, desc]
      ['sort_order is neither asc nor desc', 'sort_order=random', 'sort_order'],
      // COVERS: 4.1 sort_by バリデーション — enum allow-list
      ['sort_by is not a whitelisted column', 'sort_by=password', 'sort_by'],
    ])(
      'should return 400 VALIDATION_ERROR when %s',
      async (_desc, queryString, field) => {
        const res = await http().get(`/api/v1/ja?${queryString}`).expect(400);

        expect(res.body.error_code).toBe('VALIDATION_ERROR');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field })]),
        );
      },
    );

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.findAll.mockRejectedValue(new Error('DB down'));

      await http().get('/api/v1/ja').expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

  });

  // ───────────────────────────────────────────────────────────────────
  // DELETE /api/v1/ja/:ja_id  (API-004-002)
  // ───────────────────────────────────────────────────────────────────
  describe('DELETE /api/v1/ja/:ja_id', () => {
    it('should return 200 with success message when NICHINO_ADMIN deletes a JA with no related data', async () => {
      // COVERS: happy path — 200, message='削除しました。'
      service.remove.mockResolvedValue({ message: '削除しました。' });

      const res = await http().delete('/api/v1/ja/5').expect(200);

      expect(res.body.message).toBe('削除しました。');
      expect(service.remove).toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;

      await http().delete('/api/v1/ja/5').expect(401).expect((res) => {
        expect(res.body.error_code).toBe('UNAUTHORIZED');
      });
    });

    it('should return 403 FORBIDDEN when CHUOKAI lacks ja.delete permission', async () => {
      // COVERS: err:FORBIDDEN (row 3) — only NICHINO_ADMIN can delete
      permissionsGuardValue = false;
      currentSession = buildChuokaiSession({ ja_id: 1 });

      await http().delete('/api/v1/ja/5').expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 403 FORBIDDEN when JA_HONTEN lacks ja.delete permission', async () => {
      // COVERS: err:FORBIDDEN — JA_HONTEN does not hold ja.delete per seeder.md §3
      permissionsGuardValue = false;
      currentSession = buildJaHontenSession({ ja_id: 1 });

      await http().delete('/api/v1/ja/5').expect(403).expect((res) => {
        expect(res.body.error_code).toBe('FORBIDDEN');
      });
    });

    it('should return 400 VALIDATION_ERROR when path id is non-numeric', async () => {
      // COVERS: 4.1 id 数値型チェック (ParseIntPipe)
      const res = await http().delete('/api/v1/ja/abc').expect(400);

      // ParseIntPipe surfaces as BadRequest; error_code may be BAD_REQUEST or VALIDATION_ERROR
      expect(['BAD_REQUEST', 'VALIDATION_ERROR']).toContain(res.body.error_code);
    });

    it('should return 404 NOT_FOUND when service throws for missing ja_id', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      const { NotFoundException } = await import('@/common/exceptions/common.exceptions');
      service.remove.mockRejectedValue(new NotFoundException('JA'));

      await http().delete('/api/v1/ja/999').expect(404).expect((res) => {
        expect(res.body.error_code).toBe('NOT_FOUND');
      });
    });

    it('should return 409 CONFLICT when service throws for related-data conflict', async () => {
      // COVERS: err:CONFLICT (row 9) — related rows exist in m_kanri_shiten / m_shiten / m_hanbaiten / m_tanka / t_dokusya / m_account
      const { ConflictException } = await import('@/common/exceptions/common.exceptions');
      service.remove.mockRejectedValue(new ConflictException());

      await http().delete('/api/v1/ja/5').expect(409).expect((res) => {
        expect(res.body.error_code).toBe('CONFLICT');
      });
    });

    it('should return 500 INTERNAL_SERVER_ERROR on unexpected service error', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.remove.mockRejectedValue(new Error('DB down'));

      await http().delete('/api/v1/ja/5').expect(500).expect((res) => {
        expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // GET /api/v1/ja/dropdown  (ACSMS-API-COMMON-003)
  // ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/ja/dropdown', () => {
    const sampleDropdownPayload = {
      data: [
        { ja_id: 1, ja_code: '1301001001', ja_name: 'JA東京中央' },
        { ja_id: 2, ja_code: '1301002001', ja_name: 'JA東京みどり' },
      ],
      meta: { total: 137, page: 1, per_page: 50, has_more: true },
    };

    it('should return 200 with dropdown payload when valid query is sent', async () => {
      service.dropdown.mockResolvedValue(sampleDropdownPayload);

      const res = await http().get('/api/v1/ja/dropdown').expect(200);
      expect(res.body).toEqual(sampleDropdownPayload);
      expect(service.dropdown).toHaveBeenCalled();
    });

    it('should forward q / page / per_page / include_id query params to the service', async () => {
      service.dropdown.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, per_page: 30, has_more: false },
      });

      await http()
        .get('/api/v1/ja/dropdown')
        .query({ q: '東京', page: 2, per_page: 30, include_id: 99 })
        .expect(200);

      const dto = service.dropdown.mock.calls[0][0];
      expect(dto).toMatchObject({
        q: '東京',
        page: 2,
        per_page: 30,
        include_id: 99,
      });
    });

    it('should reject per_page > 100 with HTTP 400 VALIDATION_ERROR', async () => {
      await http()
        .get('/api/v1/ja/dropdown')
        .query({ per_page: 101 })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          const fields = (res.body.errors as Array<{ field: string }>).map(
            (e) => e.field,
          );
          expect(fields).toContain('per_page');
        });
    });

    it('should reject q > 100 chars with HTTP 400 VALIDATION_ERROR', async () => {
      await http()
        .get('/api/v1/ja/dropdown')
        .query({ q: 'あ'.repeat(101) })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          const fields = (res.body.errors as Array<{ field: string }>).map(
            (e) => e.field,
          );
          expect(fields).toContain('q');
        });
    });

    it('should return 401 when session is missing', async () => {
      currentSession = null;
      await http()
        .get('/api/v1/ja/dropdown')
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });
    });

    it('should return 403 when caller lacks ja.view permission', async () => {
      permissionsGuardValue = false;
      await http()
        .get('/api/v1/ja/dropdown')
        .expect(403);
    });
  });
});
