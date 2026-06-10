// AccountController HTTP specs — covers every endpoint of the single
// AccountController class:
//   - PATCH /api/v1/account/me/mfa        — header self-service (this file's original scope)
//   - GET   /api/v1/accounts              — ACSMS-SCR-024 (search)
//   - DELETE /api/v1/accounts/{id}        — ACSMS-SCR-024 (delete)
//   - GET   /api/v1/accounts/{id}         — ACSMS-SCR-025 (detail)
//   - POST  /api/v1/accounts              — ACSMS-SCR-025 (create)
//   - PUT   /api/v1/accounts/{id}         — ACSMS-SCR-025 (update)
//   - GET   /api/v1/account/dropdown      — ACSMS-SCR-030 / COMMON-005
//
// Tests are organised as sibling top-level describe blocks so each
// surface has its own mock scope (some need PermissionsGuard override,
// some need cookie-parser, some need both). Spec count + assertions
// remain 1:1 with the originals; only the location changed (merged
// from __tests__/ into this file so the module follows "1 source =
// 1 spec file").

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
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { AccountController } from '@/modules/account/account.controller';
import { AccountService } from '@/modules/account/account.service';
import {
  buildAccountDetailResponse,
  buildCreateAccountBody,
  buildUpdateAccountBody,
} from '@test/fixtures/account-form.factory';
import {
  buildAccountListRows,
  buildSearchAccountsQuery,
} from '@test/fixtures/accounts.factory';
import { buildSession, buildChuokaiSession } from '@test/fixtures/session.factory';
import { apiUrl } from '@test/utils/api-url';

describe('AccountController (HTTP)', () => {
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
    service = {
      toggleMfa: jest.fn(),
    };
    currentSession = buildSession({ account_id: 42 });

    const module = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(sessionGuard)
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

  describe('PATCH /api/v1/account/me/mfa', () => {
    it('should return 200 with updated state when service resolves with enabled=true', async () => {
      service.toggleMfa.mockResolvedValue({
        mfa_enable_flg: true,
        message: '2段階認証を有効にしました。',
      });

      const res = await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: true })
        .expect(200);

      expect(res.body.data).toEqual({
        mfa_enable_flg: true,
        message: '2段階認証を有効にしました。',
      });
    });

    it('should call AccountService.toggleMfa with the session account_id from req.user', async () => {
      service.toggleMfa.mockResolvedValue({
        mfa_enable_flg: false,
        message: '2段階認証を無効にしました。',
      });

      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: false })
        .expect(200);

      // session.account_id (42) is wired in beforeEach — service must
      // receive it from the authenticated session, NOT from URL or body.
      expect(service.toggleMfa).toHaveBeenCalledWith(
        42,
        false,
        expect.any(Object),
      );
    });

    it('should return 401 UNAUTHORIZED when session cookie is missing', async () => {
      currentSession = null;

      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: true })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });

      expect(service.toggleMfa).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when body.enabled is not a boolean', async () => {
      await http()
        .patch('/api/v1/account/me/mfa')
        .send({ enabled: 'yes' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
          expect(res.body.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'enabled' }),
            ]),
          );
        });

      expect(service.toggleMfa).not.toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when body is empty', async () => {
      await http()
        .patch('/api/v1/account/me/mfa')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-024 — アカウントマスタ明細検索画面 (GET + DELETE /accounts).
// Sibling top-level describe so its PermissionsGuard override and
// cookie-parser middleware don't leak into the header-MFA block above.
// ═══════════════════════════════════════════════════════════════════════

describe('AccountController (HTTP) — SCR-024 (search + delete)', () => {
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
      // SCR-024 endpoints
      searchAccounts: jest.fn(),
      deleteAccount: jest.fn(),
      // Existing endpoint stub so DI compiles
      toggleMfa: jest.fn(),
    };
    currentSession = buildSession({
      account_id: 100,
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      permissions: ['account.view', 'account.delete'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
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

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-024-001 — GET /api/v1/accounts
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/accounts (searchAccounts)', () => {
    it('should return 200 with { data, meta } shape when NICHINO_ADMIN calls with valid query', async () => {
      service.searchAccounts.mockResolvedValue({
        data: buildAccountListRows(),
        meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
      });

      const res = await http()
        .get(apiUrl('accounts'))
        .query(buildSearchAccountsQuery())
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: 2,
          page: 1,
          per_page: 20,
          total_pages: 1,
        }),
      });
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('accounts')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks account.view permission', async () => {
      // COVERS: §4.2 — account.view is NICHINO_ADMIN only
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('accounts')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 400 VALIDATION_ERROR when login_id exceeds 20 chars', async () => {
      // COVERS: §4.1 login_id max 20
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ login_id: 'a'.repeat(21) })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 400 VALIDATION_ERROR when role_id is outside 1..5 range', async () => {
      // COVERS: §4.1 role_id 1〜5
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ role_id: 6 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      // COVERS: §4.1 per_page 1〜100
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ per_page: 101 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when sort_by is not in the whitelist', async () => {
      // COVERS: §4.1 許可されたカラム名（login_id, role_id, created_at）
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ sort_by: 'password_hash' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.searchAccounts.mockRejectedValue(new Error('db down'));
      const res = await http().get(apiUrl('accounts')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-024-002 — DELETE /api/v1/accounts/{account_id}
  // ═══════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/accounts/:account_id (deleteAccount)', () => {
    it('should return 200 with { message } when NICHINO_ADMIN deletes an existing account', async () => {
      service.deleteAccount.mockResolvedValue({ message: '削除しました。' });
      const res = await http().delete(apiUrl('accounts/5')).expect(200);
      expect(res.body).toEqual({ message: '削除しました。' });
    });

    it('should return 400 BAD_REQUEST when account_id is not numeric', async () => {
      const res = await http().delete(apiUrl('accounts/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().delete(apiUrl('accounts/5')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks account.delete permission', async () => {
      // COVERS: §4.2 — account.delete is NICHINO_ADMIN only
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().delete(apiUrl('accounts/5')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.deleteAccount.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定されたアカウントが見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().delete(apiUrl('accounts/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定されたアカウント');
    });

    it('should return 409 CONFLICT when service throws ConflictException for related data', async () => {
      // COVERS: §4.3 関連データチェック — 409 CONFLICT
      service.deleteAccount.mockRejectedValue(
        new HttpException(
          {
            code: 'CONFLICT',
            error_code: 'CONFLICT',
            message: '関連データが存在するため削除できません。',
          },
          HttpStatus.CONFLICT,
        ),
      );
      const res = await http().delete(apiUrl('accounts/5')).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
      expect(res.body.message).toContain('関連データが存在するため');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.deleteAccount.mockRejectedValue(new Error('db down'));
      const res = await http().delete(apiUrl('accounts/5')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── TOO_MANY_REQUESTS — only testable at integration layer ──────────
  it.todo('should return 429 TOO_MANY_REQUESTS when throttle limit exceeded — covered in integration');
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-025 — アカウントマスタ登録画面 (GET/POST/PUT /accounts). Sibling
// top-level describe with its own service-mock shape + permissions
// triple (account.view + account.create + account.update).
// ═══════════════════════════════════════════════════════════════════════

describe('AccountController (HTTP) — SCR-025 (detail + create + update)', () => {
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
      // SCR-025 endpoints
      getAccountDetail: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      // Existing endpoints (SCR-024 + header MFA) — stubbed so DI compiles.
      searchAccounts: jest.fn(),
      deleteAccount: jest.fn(),
      toggleMfa: jest.fn(),
    };
    currentSession = buildSession({
      account_id: 100,
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      permissions: ['account.view', 'account.create', 'account.update'],
    });
    permissionsGuardValue = true;

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
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

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-025-001 — GET /api/v1/accounts/:account_id
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/accounts/:account_id (getAccountDetail)', () => {
    it('should return 200 with { data } shape when NICHINO_ADMIN fetches an existing account', async () => {
      service.getAccountDetail.mockResolvedValue({
        data: buildAccountDetailResponse(),
      });

      const res = await http().get(apiUrl('accounts/2')).expect(200);

      expect(res.body.data).toMatchObject({
        account_id: 2,
        login_id: 'ja_honten001',
        role_id: 4,
        sub_email_1: 'honten001.sub1@example.com',
      });
    });

    it('should return 400 BAD_REQUEST when account_id is not numeric', async () => {
      const res = await http().get(apiUrl('accounts/abc')).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('accounts/2')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks account.view permission', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http().get(apiUrl('accounts/2')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.getAccountDetail.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定されたアカウントが見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http().get(apiUrl('accounts/999')).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定されたアカウント');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.getAccountDetail.mockRejectedValue(new Error('db down'));
      const res = await http().get(apiUrl('accounts/2')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-025-002 — POST /api/v1/accounts
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/accounts (createAccount)', () => {
    it('should return 201 with the created account when NICHINO_ADMIN posts a valid body', async () => {
      service.createAccount.mockResolvedValue({
        data: buildAccountDetailResponse({ account_id: 15 }),
      });

      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody())
        .expect(201);

      expect(res.body.data.account_id).toBe(15);
      expect(res.body.data.sub_email_1).toBeDefined();
    });

    it('should return 400 VALIDATION_ERROR when login_id is missing', async () => {
      const body = buildCreateAccountBody();
      delete body.login_id;
      const res = await http().post(apiUrl('accounts')).send(body).expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 400 VALIDATION_ERROR when password is too short', async () => {
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody({ password: 'Aa1!' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when role_id is outside 1..5 range', async () => {
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody({ role_id: 6 }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when sub_email_1 is not in valid email format', async () => {
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody({ sub_email_1: 'bad-email' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when DUPLICATE_CODE is thrown for an existing login_id', async () => {
      // COVERS: エラー一覧 — DUPLICATE_CODE on unique-constraint violation
      service.createAccount.mockRejectedValue(
        new HttpException(
          {
            code: 'DUPLICATE_CODE',
            error_code: 'DUPLICATE_CODE',
            message: '同一のログインIDコードが既に登録されています。',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody())
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http().post(apiUrl('accounts')).send(buildCreateAccountBody()).expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks account.create permission', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.createAccount.mockRejectedValue(new Error('db down'));
      const res = await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-025-003 — PUT /api/v1/accounts/:account_id
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/accounts/:account_id (updateAccount)', () => {
    it('should return 200 with the updated account when NICHINO_ADMIN puts a valid body', async () => {
      service.updateAccount.mockResolvedValue({
        data: buildAccountDetailResponse({
          account_id: 2,
          account_name: 'JA本店 花子（更新）',
          sub_email_2: 'manager@example.com',
        }),
      });

      const res = await http()
        .put(apiUrl('accounts/2'))
        .send(buildUpdateAccountBody())
        .expect(200);

      expect(res.body.data.account_name).toBe('JA本店 花子（更新）');
      expect(res.body.data.sub_email_2).toBe('manager@example.com');
    });

    it('should return 400 BAD_REQUEST when account_id is not numeric', async () => {
      const res = await http()
        .put(apiUrl('accounts/abc'))
        .send(buildUpdateAccountBody())
        .expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 400 VALIDATION_ERROR when account_name is missing', async () => {
      const body = buildUpdateAccountBody();
      delete body.account_name;
      const res = await http()
        .put(apiUrl('accounts/2'))
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when an unknown field (login_id) is submitted (forbidNonWhitelisted)', async () => {
      // api.md §3 注記 — login_id は更新不可。
      const res = await http()
        .put(apiUrl('accounts/2'))
        .send({ ...buildUpdateAccountBody(), login_id: 'NEW_ID' })
        .expect(400);
      expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(res.body.error_code);
    });

    it('should return 401 UNAUTHORIZED when no session is attached', async () => {
      currentSession = null;
      await http().put(apiUrl('accounts/2')).send(buildUpdateAccountBody()).expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks account.update permission', async () => {
      currentSession = buildChuokaiSession();
      permissionsGuardValue = false;
      const res = await http()
        .put(apiUrl('accounts/2'))
        .send(buildUpdateAccountBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when service throws NotFoundException', async () => {
      service.updateAccount.mockRejectedValue(
        new HttpException(
          {
            code: 'NOT_FOUND',
            error_code: 'NOT_FOUND',
            message: '指定されたアカウントが見つかりません。',
          },
          HttpStatus.NOT_FOUND,
        ),
      );
      const res = await http()
        .put(apiUrl('accounts/999'))
        .send(buildUpdateAccountBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.updateAccount.mockRejectedValue(new Error('db down'));
      const res = await http()
        .put(apiUrl('accounts/2'))
        .send(buildUpdateAccountBody())
        .expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ─── TOO_MANY_REQUESTS — only testable at integration layer ──────────
  it.todo('should return 429 TOO_MANY_REQUESTS when throttle limit exceeded — covered in integration');
});

// ═══════════════════════════════════════════════════════════════════════
// COMMON-005 — GET /api/v1/account/dropdown (consumed by SCR-030 ログ
// 参照画面). Sibling top-level describe — its PermissionsGuard variant
// asserts ForbiddenException directly (different from the SCR-024 /
// SCR-025 boolean-return variant), so it stays isolated.
// ═══════════════════════════════════════════════════════════════════════

describe('AccountController.getAccountDropdown (COMMON-005)', () => {
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
      // COMMON-005 inherits permission from the calling screen. SCR-030
      // calls it with log.view — gate on that here.
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
      // Plus the existing methods so the controller can be constructed.
      toggleMfa: jest.fn(),
      searchAccounts: jest.fn(),
      getAccountDetail: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      getAccountDropdown: jest.fn(),
    };
    currentSession = buildSession({ permissions: ['log.view'] });
    currentPermissions = ['log.view'];

    const module = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
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

  describe('GET /api/v1/account/dropdown', () => {
    // [pagination] Response includes meta.has_more so callers can drive
    // <BaseAccountDropdown>'s infinite scroll.
    const emptyMeta = { total: 0, page: 1, per_page: 50, has_more: false };

    it('should return 200 with data array + meta when service resolves with accounts', async () => {
      service.getAccountDropdown.mockResolvedValue({
        data: [
          {
            account_id: 10,
            login_id: 'ja_honten_001',
            account_name: 'JA本店 太郎',
            role_code: 'JA_HONTEN',
            ja_id: 100,
          },
        ],
        meta: { total: 1, page: 1, per_page: 50, has_more: false },
      });

      const res = await http().get(apiUrl('account/dropdown')).expect(200);

      expect(res.body.data).toEqual([
        {
          account_id: 10,
          login_id: 'ja_honten_001',
          account_name: 'JA本店 太郎',
          role_code: 'JA_HONTEN',
          ja_id: 100,
        },
      ]);
      expect(res.body.meta).toEqual({ total: 1, page: 1, per_page: 50, has_more: false });
    });

    it('should pass the query + session payload to AccountService.getAccountDropdown', async () => {
      service.getAccountDropdown.mockResolvedValue({ data: [], meta: emptyMeta });

      await http()
        .get(apiUrl('account/dropdown'))
        .query({ q: '太郎', match_field: 'name', page: 2, per_page: 50 })
        .expect(200);

      // First arg = parsed DTO; second arg = session.
      expect(service.getAccountDropdown).toHaveBeenCalledWith(
        expect.objectContaining({
          q: '太郎',
          match_field: 'name',
          page: 2,
          per_page: 50,
        }),
        expect.objectContaining({ account_id: 1, role_code: 'NICHINO_ADMIN' }),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      currentSession = null;
      const res = await http().get(apiUrl('account/dropdown')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
      expect(service.getAccountDropdown).not.toHaveBeenCalled();
    });

    it('should return 403 FORBIDDEN when caller does not hold log.view (calling-screen permission)', async () => {
      currentPermissions = [];
      currentSession = buildSession({ permissions: [] });

      const res = await http().get(apiUrl('account/dropdown')).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
      expect(service.getAccountDropdown).not.toHaveBeenCalled();
    });

    it('should reject match_field=invalid via 400 VALIDATION_ERROR', async () => {
      const res = await http()
        .get(apiUrl('account/dropdown'))
        .query({ match_field: 'invalid' })
        .expect(400);
      expect(res.body.code ?? res.body.error_code).toBe('VALIDATION_ERROR');
      expect(service.getAccountDropdown).not.toHaveBeenCalled();
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws an unexpected error', async () => {
      service.getAccountDropdown.mockRejectedValue(new Error('db-down'));

      const res = await http().get(apiUrl('account/dropdown')).expect(500);
      expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
