//
// Screens: ACSMS-SCR-011 — 購読者情報登録画面
//          ACSMS-SCR-014 — 購読者明細検索画面
//          ACSMS-SCR-013 — 購読者履歴情報画面
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
  buildDokusyaListRow,
  buildDokusyaRirekiListRow,
  buildImportBody,
  buildReplaceBody,
  buildReplaceSearchRow,
  buildUpdateDokusyaBody,
} from '@test/fixtures/dokusya.factory';

describe('DokusyaController — SCR-011 (HTTP: detail/create/update/approve/reject/history)', () => {
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

    it('should validate shimei_sei on update (氏名は編集で変更可・検証あり) — 400 when blank', async () => {
      // 顧客要件 2026-07 — 氏名(氏/名/かな) は編集で変更可。UpdateDokusyaDto は
      // CreateDokusyaDto の必須/漢字/ひらがな検証を継承するので、空・非準拠の
      // 氏名は 400 VALIDATION_ERROR となりサービスへ届かない。
      service.update.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 100 }));
      const res = await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody({ shimei_sei: '' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should reach service on update when shimei is conforming (氏名編集可)', async () => {
      service.update.mockResolvedValue(buildDokusyaDetailResponse({ dokusya_id: 100 }));
      await http()
        .put(apiUrl('dokusya/100'))
        .send(buildUpdateDokusyaBody({ shimei_sei: '田中', shimei_kana_sei: 'たなか' }))
        .expect(200);
      expect(service.update).toHaveBeenCalled();
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

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-014 — 購読者明細検索画面 — list / delete / export (HTTP)
// ════════════════════════════════════════════════════════════════════════════

describe('DokusyaController — SCR-014 (HTTP: list/delete/export)', () => {
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
      // SCR-011 methods (kept so DI compiles)
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      getHistory: jest.fn(),
      // SCR-014 methods under test
      search: jest.fn(),
      remove: jest.fn(),
      exportExcel: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      account_id: 11,
      permissions: ['dokusya.view', 'dokusya.delete'],
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
  // API-014-001 — GET /api/v1/dokusya
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya', () => {
    it('should return 200 with { data: [...], meta } envelope on happy path', async () => {
      // COVERS: §4.6 happy path
      service.search.mockResolvedValue({
        data: [buildDokusyaListRow({ dokusya_id: 1001 })],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http().get(apiUrl('dokusya')).expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data[0]).toMatchObject({ dokusya_id: 1001 });
      expect(res.body.meta).toMatchObject({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should pass query params through to service.search (incl. session)', async () => {
      service.search.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      await http()
        .get(apiUrl('dokusya'))
        .query({ kanri_shiten_id: 10, dokusya_shubetsu: 1 })
        .expect(200);

      expect(service.search).toHaveBeenCalledWith(
        expect.objectContaining({
          kanri_shiten_id: 10,
          dokusya_shubetsu: 1,
        }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
      );
    });

    it('should return 400 BAD_REQUEST when kanri_shiten_id is non-numeric (transform failure)', async () => {
      // COVERS: §4.1 — kanri_shiten_id 数値型チェック
      await http()
        .get(apiUrl('dokusya'))
        .query({ kanri_shiten_id: 'abc' })
        .expect(400);
      expect(service.search).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when email format is invalid', async () => {
      // COVERS: §4.1 — email format check + err:VALIDATION_ERROR
      const res = await http()
        .get(apiUrl('dokusya'))
        .query({ email: 'not-an-email' })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ]),
      );
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('dokusya')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.view permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service surfaces a scope violation', async () => {
      // COVERS: §4.2 + err:DATA_SCOPE_VIOLATION (row 4)
      service.search.mockRejectedValue(
        new HttpException(
          {
            code: 'DATA_SCOPE_VIOLATION',
            error_code: 'DATA_SCOPE_VIOLATION',
            message: 'このデータへのアクセス権限がありません。',
          },
          HttpStatus.FORBIDDEN,
        ),
      );

      const res = await http().get(apiUrl('dokusya')).expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });


    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.search.mockRejectedValue(new Error('DB exploded'));
      const res = await http().get(apiUrl('dokusya')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-002 — DELETE /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/dokusya/:dokusya_id', () => {
    it('should return 200 with { message: "削除しました。" } on happy path', async () => {
      // COVERS: §4.6 happy path + message literal
      service.remove.mockResolvedValue({ message: '削除しました。' });

      const res = await http().delete(apiUrl('dokusya/1001')).expect(200);
      expect(res.body.message).toBe('削除しました。');
    });

    it('should parse dokusya_id path param as Number when calling service.remove', async () => {
      service.remove.mockResolvedValue({ message: '削除しました。' });
      await http().delete(apiUrl('dokusya/42')).expect(200);
      expect(service.remove).toHaveBeenCalledWith(
        42,
        expect.anything(),
        expect.anything(),
      );
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      // COVERS: §4.1 — dokusya_id 数値型チェック
      await http().delete(apiUrl('dokusya/abc')).expect(400);
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().delete(apiUrl('dokusya/1001')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.delete permission is missing', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;
      const res = await http().delete(apiUrl('dokusya/1001')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DOKUSYA_READ_ONLY when service rejects readonly target', async () => {
      // COVERS: err:DOKUSYA_READ_ONLY (row 10)
      service.remove.mockRejectedValue(
        new HttpException(
          {
            code: 'DOKUSYA_READ_ONLY',
            error_code: 'DOKUSYA_READ_ONLY',
            message:
              'この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）',
          },
          HttpStatus.FORBIDDEN,
        ),
      );

      const res = await http().delete(apiUrl('dokusya/1001')).expect(403);
      expect(res.body.error_code).toBe('DOKUSYA_READ_ONLY');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      service.remove.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().delete(apiUrl('dokusya/9999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when service rejects due to related data', async () => {
      // COVERS: err:CONFLICT (row 9)
      service.remove.mockRejectedValue(new ConflictException());
      const res = await http().delete(apiUrl('dokusya/1001')).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.remove.mockRejectedValue(new Error('DB exploded'));
      const res = await http().delete(apiUrl('dokusya/1001')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-003 — GET /api/v1/dokusya/export
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/export', () => {
    // Helper — supertest's binary parser to keep the response body as a Buffer
    function binaryParser(
      res: any,
      callback: (err: Error | null, body: Buffer) => void,
    ) {
      const chunks: Buffer[] = [];
      res.setEncoding('binary');
      res.on('data', (chunk: any) => {
        chunks.push(Buffer.from(chunk, 'binary'));
      });
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    }

    it('should return 200 + Excel content-type + Content-Disposition with RFC6266-encoded 購読者一覧出力_*.xlsx filename', async () => {
      // COVERS: §4.7 response headers
      service.exportExcel.mockResolvedValue({
        buffer: Buffer.from('PK\x03\x04mock-xlsx-bytes'),
        filename: '購読者一覧出力_20260530_120000.xlsx',
      });

      const res = await http()
        .get(apiUrl('dokusya/export'))
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // 多バイト名は RFC 6266 filename*=UTF-8'' でエンコードされる。
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename\*=UTF-8''.+_\d{8}_\d{6}\.xlsx/,
      );
      expect(res.headers['content-disposition']).toContain(
        encodeURIComponent('購読者一覧出力_20260530_120000.xlsx'),
      );
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    it('should pass query params to service.exportExcel (page/per_page/sort_by/sort_order also bound but service ignores)', async () => {
      service.exportExcel.mockResolvedValue({
        buffer: Buffer.from('PK\x03\x04'),
        filename: '購読者一覧出力_20260530_120000.xlsx',
      });

      await http()
        .get(apiUrl('dokusya/export'))
        .query({ kanri_shiten_id: 10, dokusya_shubetsu: 1 })
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(service.exportExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          kanri_shiten_id: 10,
          dokusya_shubetsu: 1,
        }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
        expect.anything(),
      );
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('dokusya/export')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.view permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya/export')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 EXPORT_NO_DATA when service rejects with no rows', async () => {
      // COVERS: err:EXPORT_NO_DATA (row 12)
      service.exportExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'EXPORT_NO_DATA',
            error_code: 'EXPORT_NO_DATA',
            message: '出力データがありません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      const res = await http().get(apiUrl('dokusya/export')).expect(404);
      expect(res.body.error_code).toBe('EXPORT_NO_DATA');
    });

    it('should return 409 EXPORT_LIMIT_EXCEEDED when count > 30000', async () => {
      // COVERS: err:EXPORT_LIMIT_EXCEEDED (row 11)
      service.exportExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'EXPORT_LIMIT_EXCEEDED',
            error_code: 'EXPORT_LIMIT_EXCEEDED',
            message: '出力データ件数が30000件を超えています。',
          },
          HttpStatus.CONFLICT,
        ),
      );

      const res = await http().get(apiUrl('dokusya/export')).expect(409);
      expect(res.body.error_code).toBe('EXPORT_LIMIT_EXCEEDED');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.exportExcel.mockRejectedValue(new Error('Excel generation broke'));
      const res = await http().get(apiUrl('dokusya/export')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-013 — 購読者履歴情報画面 — rireki list (HTTP)
// ════════════════════════════════════════════════════════════════════════════
//
// Drives the NEW `GET /api/v1/dokusya/:dokusya_id/rireki` route. Sibling
// top-level describe with its own Nest app + guard mocks (project convention:
// one self-contained beforeEach per SCR block). The service is mocked — these
// tests assert the HTTP contract (envelope, param parse, query binding, guards,
// error_code mapping), NOT the SQL.

describe('DokusyaController — SCR-013 (HTTP: rireki list)', () => {
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
    service = { getRirekiList: jest.fn() };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      account_id: 11,
      permissions: ['dokusya.view'],
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

  const okResult = (rows = [buildDokusyaRirekiListRow()]) => ({
    data: rows,
    meta: { total: rows.length, page: 1, per_page: 20, total_pages: 1 },
  });

  describe('GET /api/v1/dokusya/:dokusya_id/rireki', () => {
    it('should return 200 with the { data, meta } envelope when target exists', async () => {
      // COVERS: §4.6 happy path — paginated envelope
      service.getRirekiList.mockResolvedValue(okResult());

      const res = await http().get(apiUrl('dokusya/1/rireki')).expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toMatchObject({ rireki_no: 3, kanri_shiten_name: '東京中央管理支店' });
      expect(res.body.meta).toMatchObject({ total: 1, page: 1, per_page: 20, total_pages: 1 });
    });

    it('should call service.getRirekiList with parsed numeric dokusya_id + query + session', async () => {
      service.getRirekiList.mockResolvedValue(okResult([]));
      await http().get(apiUrl('dokusya/42/rireki')).expect(200);
      expect(service.getRirekiList).toHaveBeenCalledWith(
        42,
        expect.any(Object),
        expect.anything(),
      );
    });

    it('should bind page / per_page / sort_by / sort_order query params into the DTO', async () => {
      // COVERS: §4.1 — query param transform (transform:true coerces to Number)
      service.getRirekiList.mockResolvedValue(okResult([]));
      await http()
        .get(apiUrl('dokusya/42/rireki?page=2&per_page=10&sort_by=created_at&sort_order=asc'))
        .expect(200);
      expect(service.getRirekiList).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          page: 2,
          per_page: 10,
          sort_by: 'created_at',
          sort_order: 'asc',
        }),
        expect.anything(),
      );
    });

    it('should return 400 BAD_REQUEST when dokusya_id is non-numeric', async () => {
      // COVERS: §4.1 dokusya_id 数値型
      await http().get(apiUrl('dokusya/abc/rireki')).expect(400);
      expect(service.getRirekiList).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when sort_by is outside the allow-list', async () => {
      // COVERS: §4.1 sort_by 許可リスト外
      const res = await http()
        .get(apiUrl('dokusya/1/rireki?sort_by=ja_id'))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(service.getRirekiList).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      // COVERS: §4.1 per_page 最大100
      const res = await http()
        .get(apiUrl('dokusya/1/rireki?per_page=101'))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED (row 2)
      currentSession = null;
      const res = await http().get(apiUrl('dokusya/1/rireki')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.view permission is missing', async () => {
      // COVERS: err:FORBIDDEN (row 3)
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya/1/rireki')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      // COVERS: err:NOT_FOUND (row 8) — incl. DataScope 404-mask
      service.getRirekiList.mockRejectedValue(new NotFoundException('購読者'));
      const res = await http().get(apiUrl('dokusya/999/rireki')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7)
      service.getRirekiList.mockRejectedValue(new Error('DB exploded'));
      const res = await http().get(apiUrl('dokusya/1/rireki')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    // err:TOO_MANY_REQUESTS (row 6) — ThrottlerGuard only fires through the
    // full app pipeline, not the controller-isolated test module. Covered by
    // the rate-limit integration layer.
  });
});

// ════════════════════════════════════════════════════════════════════════════
// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Drives the two NEW endpoints appended to DokusyaController:
//   GET  /api/v1/dokusya/replace-hanbaiten/search → service.searchForReplace (API-015-001)
//   POST /api/v1/dokusya/replace-hanbaiten        → service.replaceHanbaiten  (API-015-002)
//
// Separate top-level describe with its own Nest app + guard mocks (project
// convention: one describe block per screen). The service is fully mocked;
// HTTP/validation/error-mapping behaviour is what's under test here.
// ════════════════════════════════════════════════════════════════════════════
describe('DokusyaController — SCR-015 (HTTP: replace-hanbaiten search + bulk replace)', () => {
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
      // SCR-011/013/014 methods kept so DI compiles.
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      getHistory: jest.fn(),
      search: jest.fn(),
      remove: jest.fn(),
      exportExcel: jest.fn(),
      getRirekiList: jest.fn(),
      // SCR-015 methods under test.
      searchForReplace: jest.fn(),
      replaceHanbaiten: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      account_id: 11,
      permissions: ['dokusya.replace_hanbaiten'],
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

  // ══════════════════════════════════════════════════════════════════════════
  // API-015-001 — GET /api/v1/dokusya/replace-hanbaiten/search
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/replace-hanbaiten/search', () => {
    it('should return 200 with { data: [...], meta } envelope when the search succeeds', async () => {
      // COVERS: §4.6 happy path
      service.searchForReplace.mockResolvedValue({
        data: [buildReplaceSearchRow({ dokusya_id: 5001 })],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({ hanbaiten_tekiyo_date: '2099-12-31' })
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data[0]).toMatchObject({ dokusya_id: 5001 });
      expect(res.body.meta).toMatchObject({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should pass query params + session through to service.searchForReplace when called', async () => {
      service.searchForReplace.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      });

      await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({ kanri_shiten_id: 10, kumiaiin_code: '10001', hanbaiten_tekiyo_date: '2099-12-31' })
        .expect(200);

      expect(service.searchForReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          kanri_shiten_id: 10,
          kumiaiin_code: '10001',
          hanbaiten_tekiyo_date: '2099-12-31',
        }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
      );
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      // COVERS: §4.1 — per_page 1..100
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({ per_page: 101 })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(service.searchForReplace).not.toHaveBeenCalled();
    });

    it('should return 400 DATE_RANGE_INVALID when service rejects the date range', async () => {
      // COVERS: §4.1 + err:DATE_RANGE_INVALID (row 11)
      service.searchForReplace.mockRejectedValue(
        new HttpException(
          {
            code: 'DATE_RANGE_INVALID',
            error_code: 'DATE_RANGE_INVALID',
            message: '「開始日」は「終了日」以前の日付を入力してください。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({
          dokusya_kaishi_date_from: '2026-12-31',
          dokusya_kaishi_date_to: '2026-01-01',
          hanbaiten_tekiyo_date: '2099-12-31',
        })
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
    });

    it('should return 401 UNAUTHORIZED when the session guard denies', async () => {
      currentSession = null;
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.replace_hanbaiten permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service surfaces a scope violation', async () => {
      // COVERS: §4.2 + err:DATA_SCOPE_VIOLATION (row 4)
      service.searchForReplace.mockRejectedValue(
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
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({ hanbaiten_tekiyo_date: '2099-12-31' })
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.searchForReplace.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .query({ hanbaiten_tekiyo_date: '2099-12-31' })
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // API-015-002 — POST /api/v1/dokusya/replace-hanbaiten
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya/replace-hanbaiten', () => {
    function okSummary() {
      return {
        data: {
          total_count: 2,
          replaced_count: 2,
          rireki_count: 2,
          new_hanbaiten_id: 201,
          applied_at: '2026-05-15T10:00:00+09:00',
        },
        message: '置換処理が完了しました。',
      };
    }

    it('should return 200 with the summary + message when the replace succeeds', async () => {
      // COVERS: §4.7 happy path + message literal
      service.replaceHanbaiten.mockResolvedValue(okSummary());

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody({ dokusya_ids: [5001, 5002], new_hanbaiten_id: 201 }))
        .expect(200);

      expect(res.body.data).toMatchObject({
        total_count: 2,
        replaced_count: 2,
        rireki_count: 2,
        new_hanbaiten_id: 201,
      });
      expect(res.body.message).toBe('置換処理が完了しました。');
    });

    it('should pass the body + session + req through to service.replaceHanbaiten when called', async () => {
      service.replaceHanbaiten.mockResolvedValue(okSummary());

      await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody({ dokusya_ids: [5001], new_hanbaiten_id: 201 }))
        .expect(200);

      expect(service.replaceHanbaiten).toHaveBeenCalledWith(
        expect.objectContaining({ dokusya_ids: [5001], new_hanbaiten_id: 201 }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR when dokusya_ids is empty', async () => {
      // COVERS: §4.1 — dokusya_ids 1件以上
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody({ dokusya_ids: [] }))
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(service.replaceHanbaiten).not.toHaveBeenCalled();
    });

    it('should return 400 SAME_HANBAITEN when service rejects same hanbaiten', async () => {
      // COVERS: §4.3 + err:SAME_HANBAITEN (row 9)
      service.replaceHanbaiten.mockRejectedValue(
        new HttpException(
          {
            code: 'SAME_HANBAITEN',
            error_code: 'SAME_HANBAITEN',
            message: '現在の販売店と同じ販売店は選択できません。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody({ new_hanbaiten_id: 200 }))
        .expect(400);
      expect(res.body.error_code).toBe('SAME_HANBAITEN');
      expect(res.body.message).toBe('現在の販売店と同じ販売店は選択できません。');
    });

    it('should return 400 INELIGIBLE_DOKUSYA with errors[] when service rejects ineligible rows', async () => {
      // COVERS: §4.3 + err:INELIGIBLE_DOKUSYA (row 10)
      service.replaceHanbaiten.mockRejectedValue(
        new HttpException(
          {
            code: 'INELIGIBLE_DOKUSYA',
            error_code: 'INELIGIBLE_DOKUSYA',
            message: '電子版クレカ決済者・併読者は編集・削除できません。',
            errors: [
              { dokusya_id: 5001, reason: '併読者のため置換できません。' },
              { dokusya_id: 5002, reason: '電子版クレカ決済者のため置換できません。' },
            ],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(400);
      expect(res.body.error_code).toBe('INELIGIBLE_DOKUSYA');
      expect(res.body.message).toBe(
        '電子版クレカ決済者・併読者は編集・削除できません。',
      );
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ dokusya_id: 5001 }),
        ]),
      );
    });

    it('should return 404 NOT_FOUND when service reports a missing dokusya', async () => {
      // COVERS: §4.3 + err:NOT_FOUND (row 8)
      service.replaceHanbaiten.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定された購読者が見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody({ dokusya_ids: [5001, 9999] }))
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 UNAUTHORIZED when the session guard denies', async () => {
      currentSession = null;
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when dokusya.replace_hanbaiten permission is missing', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service surfaces a scope violation', async () => {
      // COVERS: §4.2/§4.3/§4.4 + err:DATA_SCOPE_VIOLATION (row 4)
      service.replaceHanbaiten.mockRejectedValue(
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
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.replaceHanbaiten.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    // err:TOO_MANY_REQUESTS (row 6) — covered at the integration / throttler layer.
  });
});

// ════════════════════════════════════════════════════════════════════════════
// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Drives the two NEW endpoints appended to DokusyaController:
//   GET  /api/v1/dokusya/import/template → service.downloadImportTemplate (API-016-001)
//   POST /api/v1/dokusya/import          → service.importExcel            (API-016-002)
//
// Separate top-level describe with its own Nest app + guard mocks (project
// convention: one describe block per screen). The service is fully mocked;
// the template endpoint streams a binary via @Res() (mirror exportExcel:
// service returns { buffer, filename }). HTTP / validation / error-mapping
// is what's under test here.
// ════════════════════════════════════════════════════════════════════════════
describe('DokusyaController — SCR-016 (HTTP: Excel import template + bulk import)', () => {
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

  /** supertest binary parser — keeps the XLSX template response as a Buffer. */
  function binaryParser(
    res: any,
    callback: (err: Error | null, body: Buffer) => void,
  ) {
    const chunks: Buffer[] = [];
    res.setEncoding('binary');
    res.on('data', (chunk: any) => {
      chunks.push(Buffer.from(chunk, 'binary'));
    });
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  }

  beforeEach(async () => {
    service = {
      // SCR-011/013/014/015 methods kept so DI compiles.
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      getHistory: jest.fn(),
      search: jest.fn(),
      remove: jest.fn(),
      exportExcel: jest.fn(),
      getRirekiList: jest.fn(),
      searchForReplace: jest.fn(),
      replaceHanbaiten: jest.fn(),
      // SCR-016 methods under test.
      downloadImportTemplate: jest.fn(),
      importExcel: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 1,
      account_id: 11,
      permissions: ['dokusya.import'],
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

  // ══════════════════════════════════════════════════════════════════════════
  // API-016-001 — GET /api/v1/dokusya/import/template
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/import/template', () => {
    it('should return 200 + Excel content-type + Content-Disposition with the Japanese template filename when CHUOKAI is authorised', async () => {
      // COVERS: §4.4 — レスポンスヘッダ Content-Type + Content-Disposition
      service.downloadImportTemplate.mockResolvedValue({
        buffer: Buffer.from('PK\x03\x04mock-xlsx-bytes'),
        filename: '購読者Excelデータ取込_テンプレート.xlsx',
      });

      const res = await http()
        .get(apiUrl('dokusya/import/template'))
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      const cd = String(res.headers['content-disposition'] ?? '');
      expect(cd).toMatch(/attachment/i);
      // Node refuses raw multibyte in a header value — accept the plain
      // Japanese name OR the RFC 6266 filename*=UTF-8'' encoded form.
      expect(cd).toMatch(
        /(購読者Excelデータ取込_テンプレート\.xlsx|filename\*=UTF-8''.+\.xlsx)/,
      );
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('dokusya/import/template')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks dokusya.import permission', async () => {
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('dokusya/import/template')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws during generation', async () => {
      service.downloadImportTemplate.mockRejectedValue(new Error('ExcelJS oom'));
      const res = await http().get(apiUrl('dokusya/import/template')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // API-016-002 — POST /api/v1/dokusya/import
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya/import', () => {
    function okSummary(over: Record<string, unknown> = {}) {
      return {
        data: {
          import_mode: 'NEW',
          total_rows: 1,
          created_count: 1,
          updated_count: 0,
          cancelled_count: 0,
          skipped_count: 0,
          rireki_count: 1,
          imported_at: new Date().toISOString(),
          ...over,
        },
        message: '取り込みました。',
      };
    }

    it('should return 200 with the import summary when service resolves NEW mode successfully', async () => {
      // COVERS: §4.6 — レスポンスデータ shape + ACSMS-MSG-016-004
      service.importExcel.mockResolvedValue(okSummary());

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.objectContaining({
          import_mode: 'NEW',
          total_rows: expect.any(Number),
          created_count: expect.any(Number),
          updated_count: expect.any(Number),
          cancelled_count: expect.any(Number),
          skipped_count: expect.any(Number),
          rireki_count: expect.any(Number),
          imported_at: expect.any(String),
        }),
        message: '取り込みました。',
      });
    });

    it('should pass the body + session + req through to service.importExcel when called', async () => {
      service.importExcel.mockResolvedValue(okSummary());

      await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(200);

      expect(service.importExcel).toHaveBeenCalledWith(
        expect.objectContaining({ import_mode: 'NEW' }),
        expect.objectContaining({ ja_id: 1, account_id: 11 }),
        expect.anything(),
      );
    });

    it('should return 400 VALIDATION_ERROR when import_mode is missing from the body', async () => {
      const body = buildImportBody();
      delete body.import_mode;
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when import_mode is not one of NEW / UPDATE', async () => {
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody({ import_mode: 'DELETE_ALL' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when import_mode is UPDATE_ALL (廃止)', async () => {
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody({ import_mode: 'UPDATE_ALL' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when selected_columns is empty', async () => {
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody({ selected_columns: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when rows is empty', async () => {
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody({ rows: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 ROW_LIMIT_EXCEEDED when service rejects an over-limit payload', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'ROW_LIMIT_EXCEEDED',
            error_code: 'ROW_LIMIT_EXCEEDED',
            message: 'ファイルの行数が上限（30000行）を超えているため、取込みできません。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(400);
      expect(['ROW_LIMIT_EXCEEDED', 'VALIDATION_ERROR']).toContain(
        res.body.error_code,
      );
    });

    it('should return 400 IMPORT_VALIDATION_ERROR with errors[] carrying row numbers when service raises row-level errors', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'IMPORT_VALIDATION_ERROR',
            error_code: 'IMPORT_VALIDATION_ERROR',
            message:
              'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
            errors: [
              { row: 2, field: 'dokusya_shubetsu', message: '購読種別が3:併読のためExcel取込みできません。' },
              { row: 5, field: 'tanka_code', message: '指定された新聞単価コードが見つかりません。' },
            ],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(400);

      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 2, field: 'dokusya_shubetsu' }),
          expect.objectContaining({ row: 5, field: 'tanka_code' }),
        ]),
      );
    });

    it('should return 400 FILE_FORMAT_ERROR when service raises FILE_FORMAT_ERROR', async () => {
      service.importExcel.mockRejectedValue(
        new HttpException(
          {
            code: 'FILE_FORMAT_ERROR',
            error_code: 'FILE_FORMAT_ERROR',
            message: 'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(400);
      expect(res.body.error_code).toBe('FILE_FORMAT_ERROR');
    });

    it('should return 403 DATA_SCOPE_VIOLATION when service raises a cross-scope violation', async () => {
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
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks dokusya.import permission', async () => {
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.importExcel.mockRejectedValue(new Error('DB exploded'));
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });

    // err:TOO_MANY_REQUESTS (row 6) — covered at the integration / throttler layer.
  });
});

// ══════════════════════════════════════════════════════════════════════
// SCR-010 — GET /api/v1/dokusya/pending-approval/count (API-010-002)
// ══════════════════════════════════════════════════════════════════════
describe('DokusyaController — SCR-010 (HTTP: pending-approval count)', () => {
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
      search: jest.fn(),
      remove: jest.fn(),
      exportExcel: jest.fn(),
      getRirekiList: jest.fn(),
      searchForReplace: jest.fn(),
      replaceHanbaiten: jest.fn(),
      downloadImportTemplate: jest.fn(),
      importExcel: jest.fn(),
      getPendingApprovalCount: jest.fn(),
    };
    currentSession = buildChuokaiSession({
      ja_id: 100,
      account_id: 11,
      permissions: ['dokusya.view'],
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
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  it('should return 200 with { data: { count, ja_id } } when the session is authorized', async () => {
    service.getPendingApprovalCount.mockResolvedValue({ count: 5, ja_id: 100 });
    const res = await http()
      .get(apiUrl('dokusya/pending-approval/count'))
      .expect(200);
    expect(res.body).toEqual({ data: { count: 5, ja_id: 100 } });
    expect(service.getPendingApprovalCount).toHaveBeenCalledWith(currentSession);
  });

  it('should return 401 UNAUTHORIZED when no session is present', async () => {
    currentSession = null;
    const res = await http()
      .get(apiUrl('dokusya/pending-approval/count'))
      .expect(401);
    expect(res.body.error_code).toBe('UNAUTHORIZED');
  });

  it('should return 403 FORBIDDEN when the session lacks dokusya.view', async () => {
    permissionsGuardValue = false;
    const res = await http()
      .get(apiUrl('dokusya/pending-approval/count'))
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });
});
