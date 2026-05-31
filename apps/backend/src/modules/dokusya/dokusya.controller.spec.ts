// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Drives `src/modules/dokusya/dokusya.controller.ts`. Tests run through the
// full Nest HTTP stack via Test.createTestingModule + supertest, with the
// real GlobalExceptionFilter and ValidationPipe (`exceptionFactory`
// mirroring main.ts) so error responses match the production contract.

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
  ConflictException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { DokusyaController } from '@/modules/dokusya/dokusya.controller';
import { DokusyaService } from '@/modules/dokusya/dokusya.service';
import { apiUrl } from '@test/utils/api-url';
import { buildChuokaiSession } from '@test/fixtures/session.factory';
import {
  buildCreateDokusyaBody,
  buildDokusyaDetailResponse,
  buildUpdateDokusyaBody,
} from '@test/fixtures/dokusya.factory';

describe('DokusyaController (HTTP)', () => {
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
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      getHistory: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      account_id: 11,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [DokusyaController],
      providers: [{ provide: DokusyaService, useValue: service }],
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

  // ════════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/:dokusya_id', () => {
    it('should return 200 with { data: DokusyaResponseDto } when target exists', async () => {
      // COVERS: §4.7 happy path
      service.getDetail.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 1 }));

      const res = await http().get(apiUrl('dokusya/1')).expect(200);

      expect(res.body.data).toMatchObject({
        dokusya_id: 1,
        ja_id: 1,
        shimei_sei: '山田',
      });
    });

    it('should parse dokusya_id path param as Number when calling service.getDetail', async () => {
      service.getDetail.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 42 }));
      await http().get(apiUrl('dokusya/42')).expect(200);
      expect(service.getDetail).toHaveBeenCalledWith(42, expect.anything());
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      // COVERS: §4.1 — dokusya_id 数値型チェック
      await http().get(apiUrl('dokusya/abc')).expect(400);
      expect(service.getDetail).not.toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;
      const res = await http().get(apiUrl('dokusya/1')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.view permission is missing', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya/1')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      service.getDetail.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().get(apiUrl('dokusya/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.getDetail.mockRejectedValue(new Error('DB exploded'));
      const res = await http().get(apiUrl('dokusya/1')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-002 — POST /api/v1/dokusya
  // ════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya', () => {
    it('should return 201 with { data: DokusyaResponseDto, message } on happy path', async () => {
      // COVERS: §4.6 + §4.7 success
      service.create.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 100 }));

      const res = await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody())
        .expect(201);

      expect(res.body.data).toMatchObject({ dokusya_id: 100, ja_id: 1 });
      expect(res.body.message).toBe('登録しました。');
    });

    it('should pass the DTO to service.create as snake_case + session + req', async () => {
      service.create.mockResolvedValue(buildDokusyaDetailResponse());
      const body = buildCreateDokusyaBody({ shimei_sei: '佐藤' });

      await http().post(apiUrl('dokusya')).send(body).expect(201);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ shimei_sei: '佐藤' }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR when shimei_sei is missing', async () => {
      // COVERS: err:VALIDATION_ERROR (row 5) — required field
      await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody({ shimei_sei: undefined }))
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'shimei_sei' }),
            ]),
          );
        });
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when yubin_no length is not 7', async () => {
      // COVERS: §4.1 — yubin_no 半角数字7桁
      await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody({ yubin_no: '12345' }))
        .expect(400);
    });

    it('should return 400 VALIDATION_ERROR when haitatsu_same_flg is missing', async () => {
      // COVERS: §4.1 — haitatsu_same_flg required
      await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody({ haitatsu_same_flg: undefined }))
        .expect(400);
    });

    it('should return 400 DUPLICATE_EMAIL when service throws DUPLICATE_EMAIL HttpException', async () => {
      // COVERS: err:DUPLICATE_EMAIL (row 9)
      service.create.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_EMAIL',
            error_code: 'DUPLICATE_EMAIL',
            message: 'このメールアドレスは既に登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody({ email: 'dup@example.com' }))
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.create permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.create.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:dokusya_id', () => {
    it('should return 200 with { data, message } on happy path', async () => {
      // COVERS: §4.6 success
      service.update.mockResolvedValue(
        buildDokusyaDetailResponse({ dokusya_id: 100, rireki_no: 2 }),
      );

      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody({ chome_banchi: '千代田1-2' }))
        .expect(200);

      expect(res.body.data).toMatchObject({ dokusya_id: 100 });
      expect(res.body.message).toBe('更新しました。');
    });

    it('should pass dokusya_id as Number + DTO + session + req to service.update', async () => {
      service.update.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 7 }));
      const body = buildUpdateDokusyaBody({ shimei_sei: '佐藤' });

      await http().put(apiUrl('dokusya/7')).send(body).expect(200);

      expect(service.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ shimei_sei: '佐藤' }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
        expect.anything(),
      );
    });

    it('should return 400 BAD_REQUEST when dokusya_id path param is non-numeric', async () => {
      await http()
        .put(apiUrl('dokusya/abc'))
        .send(buildUpdateDokusyaBody())
        .expect(400);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when shimei_sei is missing in body', async () => {
      await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody({ shimei_sei: undefined }))
        .expect(400);
    });

    it('should return 400 DUPLICATE_EMAIL when service throws', async () => {
      service.update.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_EMAIL',
            error_code: 'DUPLICATE_EMAIL',
            message: 'このメールアドレスは既に登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody({ email: 'dup@example.com' }))
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.update permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http()
        .put(apiUrl('dokusya/999'))
        .send(buildUpdateDokusyaBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.update.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:dokusya_id/approve
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:dokusya_id/approve', () => {
    it('should return 200 with data + message="承認しました。" on happy path', async () => {
      // COVERS: §4.6
      service.approve.mockResolvedValue({
        data: buildDokusyaDetailResponse({
          dokusya_id: 100, denshi_shonin_status: 1, rireki_no: 2,
        }),
        message: '承認しました。',
      });

      const res = await http().put(apiUrl('dokusya/100/approve')).expect(200);
      expect(res.body.data.denshi_shonin_status).toBe(1);
      expect(res.body.message).toBe('承認しました。');
    });

    it('should call service.approve with parsed numeric dokusya_id', async () => {
      service.approve.mockResolvedValue({
        data: buildDokusyaDetailResponse({ dokusya_id: 42, denshi_shonin_status: 1 }),
        message: '承認しました。',
      });
      await http().put(apiUrl('dokusya/42/approve')).expect(200);
      expect(service.approve).toHaveBeenCalledWith(42, expect.anything(), expect.anything());
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      await http().put(apiUrl('dokusya/abc/approve')).expect(400);
      expect(service.approve).not.toHaveBeenCalled();
    });

    it('should return 400 INVALID_STATUS when service throws INVALID_STATUS', async () => {
      // COVERS: err:INVALID_STATUS (row 10)
      service.approve.mockRejectedValue(
        new HttpException(
          {
            code: 'INVALID_STATUS',
            error_code: 'INVALID_STATUS',
            message: '承認待ちの読者ではありません。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http().put(apiUrl('dokusya/100/approve')).expect(400);
      expect(res.body.error_code).toBe('INVALID_STATUS');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().put(apiUrl('dokusya/100/approve')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.update permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().put(apiUrl('dokusya/100/approve')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.approve.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().put(apiUrl('dokusya/999/approve')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.approve.mockRejectedValue(new Error('DB exploded'));
      const res = await http().put(apiUrl('dokusya/100/approve')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-005 — PUT /api/v1/dokusya/:dokusya_id/reject
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:dokusya_id/reject', () => {
    it('should return 200 with data + message="否認しました。" on happy path', async () => {
      // COVERS: §4.6
      service.reject.mockResolvedValue({
        data: buildDokusyaDetailResponse({
          dokusya_id: 100, denshi_shonin_status: 2, rireki_no: 2,
        }),
        message: '否認しました。',
      });

      const res = await http().put(apiUrl('dokusya/100/reject')).expect(200);
      expect(res.body.data.denshi_shonin_status).toBe(2);
      expect(res.body.message).toBe('否認しました。');
    });

    it('should call service.reject with parsed numeric dokusya_id', async () => {
      service.reject.mockResolvedValue({
        data: buildDokusyaDetailResponse({ dokusya_id: 42, denshi_shonin_status: 2 }),
        message: '否認しました。',
      });
      await http().put(apiUrl('dokusya/42/reject')).expect(200);
      expect(service.reject).toHaveBeenCalledWith(42, expect.anything(), expect.anything());
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      await http().put(apiUrl('dokusya/abc/reject')).expect(400);
      expect(service.reject).not.toHaveBeenCalled();
    });

    it('should return 400 INVALID_STATUS when service throws INVALID_STATUS', async () => {
      // COVERS: err:INVALID_STATUS
      service.reject.mockRejectedValue(
        new HttpException(
          {
            code: 'INVALID_STATUS',
            error_code: 'INVALID_STATUS',
            message: '承認待ちの読者ではありません。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http().put(apiUrl('dokusya/100/reject')).expect(400);
      expect(res.body.error_code).toBe('INVALID_STATUS');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().put(apiUrl('dokusya/100/reject')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.update permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().put(apiUrl('dokusya/100/reject')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.reject.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().put(apiUrl('dokusya/999/reject')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.reject.mockRejectedValue(new Error('DB exploded'));
      const res = await http().put(apiUrl('dokusya/100/reject')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:dokusya_id/history
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/:dokusya_id/history', () => {
    it('should return 200 with { data: [...] } ordered by rireki_no DESC', async () => {
      // COVERS: §4.5 — レスポンス { data: array }
      service.getHistory.mockResolvedValue({
        data: [
          {
            dokusya_rireki_id: 200, dokusya_id: 100, rireki_no: 2,
            tetsuzuki_shurui: 1, tetsuzuki_shurui_label: '新規',
            henko_riyu: '住所変更',
            saishin_data_flg: true, shinki_flg: false, kaiyaku_flg: false,
            zougen_hokoku_flg: true, denshi_shonin_status: null,
            created_at: '2026-05-07T14:30:00.000Z', created_by: 'user01',
          },
          {
            dokusya_rireki_id: 100, dokusya_id: 100, rireki_no: 1,
            tetsuzuki_shurui: 1, tetsuzuki_shurui_label: '新規',
            henko_riyu: '',
            saishin_data_flg: false, shinki_flg: true, kaiyaku_flg: false,
            zougen_hokoku_flg: true, denshi_shonin_status: null,
            created_at: '2026-04-01T10:00:00.000Z', created_by: 'user01',
          },
        ],
      });

      const res = await http().get(apiUrl('dokusya/100/history')).expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].rireki_no).toBe(2);
      expect(res.body.data[1].rireki_no).toBe(1);
    });

    it('should include tetsuzuki_shurui_label in each row', async () => {
      // COVERS: §4.5 — tetsuzuki_shurui_label mapping
      service.getHistory.mockResolvedValue({
        data: [
          {
            dokusya_rireki_id: 100, dokusya_id: 100, rireki_no: 1,
            tetsuzuki_shurui: 1, tetsuzuki_shurui_label: '新規',
            henko_riyu: '', saishin_data_flg: true, shinki_flg: true,
            kaiyaku_flg: false, zougen_hokoku_flg: true,
            denshi_shonin_status: null,
            created_at: '2026-04-01T10:00:00.000Z', created_by: 'user01',
          },
        ],
      });
      const res = await http().get(apiUrl('dokusya/100/history')).expect(200);
      expect(res.body.data[0].tetsuzuki_shurui_label).toBe('新規');
    });

    it('should call service.getHistory with parsed numeric dokusya_id + session', async () => {
      service.getHistory.mockResolvedValue({ data: [] });
      await http().get(apiUrl('dokusya/42/history')).expect(200);
      expect(service.getHistory).toHaveBeenCalledWith(42, expect.anything());
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      await http().get(apiUrl('dokusya/abc/history')).expect(400);
      expect(service.getHistory).not.toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('dokusya/100/history')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.view permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya/100/history')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.getHistory.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().get(apiUrl('dokusya/999/history')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.getHistory.mockRejectedValue(new Error('DB exploded'));
      const res = await http().get(apiUrl('dokusya/100/history')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
