// Screen: ACSMS-SCR-025 — アカウントマスタ登録画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Covers GET / POST / PUT against the real TypeORM + ValidationPipe +
// SessionAuthGuard + PermissionsGuard + GlobalExceptionFilter chain.

import type { Server } from 'http';
import request from 'supertest';

import { AccountModule } from '@/modules/account/account.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateAccountBody,
  buildUpdateAccountBody,
} from '@test/fixtures/account-form.factory';

describe('ACSMS-SCR-025 integration — account form endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [AccountModule],
      seedSql: [
        // 5 canonical roles.
        `INSERT INTO m_roles (role_code, role_name, description, created_at, created_by, updated_at, updated_by)
         VALUES
           ('NICHINO_ADMIN',   '日農（管理者）', '日本農業新聞 管理者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('NICHINO_STAFF',   '日農（担当者）', '日本農業新聞 担当者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('CHUOKAI',         '中央会',         '中央会アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_HONTEN',       'JA本店',         'JA本店アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_KANRI_SHITEN', 'JA管理支店',     'JA管理支店アカウント',         NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // 1 JA (the create body references ja_id=10).
        `INSERT INTO m_ja
           (ja_id, ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
            yubin_no, address, tel, fax, email, tanto_busho, tanto_name, zei_kubun, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (10, '1301001001', 'JA東京中央', 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳ', '13', FALSE,
            '1000001', '東京都千代田区丸の内1-1-1', '0312345678', '0312345679', 'info@ja-tokyo-chuo.or.jp',
            '総務部', '田中太郎', '1', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // 1 seeded admin account so getAccountDetail / update have a target.
        `INSERT INTO m_account
           (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
            todofuken_code, paper_flg, denshi_flg, email, sub_email_1, sub_email_2, sub_email_3,
            login_failure_count, account_lock_flg, biko, mfa_enable_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('admin001', 'hash1', '管理者 太郎', 1, NULL, NULL, NULL,
            TRUE, FALSE, 'admin@example.com', '', '', '', 0, FALSE, '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  async function asAdmin() {
    const sid = await ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      kanri_shiten_id: null,
      permissions: ['account.view', 'account.create', 'account.update'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function asChuokai() {
    const sid = await ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: 10,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/accounts/:account_id — ACSMS-API-025-001
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/accounts/:account_id', () => {
    it('should return the seeded admin account when NICHINO_ADMIN fetches by id', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        account_id: 1,
        login_id: 'admin001',
        role_id: 1,
        sub_email_1: '',
        sub_email_2: '',
        sub_email_3: '',
      });
    });

    it('should return 404 NOT_FOUND when account_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts/9999'))
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http().get(apiUrl('accounts/1')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .get(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/accounts — ACSMS-API-025-002
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/accounts', () => {
    it('should create and persist a new account when NICHINO_ADMIN posts a valid body', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .post(apiUrl('accounts'))
        .set('Cookie', cookie)
        .send(buildCreateAccountBody({ login_id: 'ja_honten_new' }))
        .expect(201);

      expect(res.body.data.login_id).toBe('ja_honten_new');
      expect(res.body.data.account_id).toBeGreaterThan(0);

      const rows = await ctx.dataSource.query(
        `SELECT login_id, sub_email_1 FROM m_account WHERE login_id = 'ja_honten_new'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].sub_email_1).toBe('honten001.sub1@example.com');
    });

    it('should reject with 400 DUPLICATE_CODE when login_id already exists', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .post(apiUrl('accounts'))
        .set('Cookie', cookie)
        .send(buildCreateAccountBody({ login_id: 'admin001' }))
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 400 VALIDATION_ERROR when password is too short', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .post(apiUrl('accounts'))
        .set('Cookie', cookie)
        .send(buildCreateAccountBody({ password: 'Aa1!' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should write a CREATE audit log row (t_log) when creating succeeds', async () => {
      const cookie = await asAdmin();
      await http()
        .post(apiUrl('accounts'))
        .set('Cookie', cookie)
        .send(buildCreateAccountBody({ login_id: 'audit_user' }))
        .expect(201);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, after_value
           FROM t_log
          WHERE target_table = 'm_account' AND operation = 'CREATE' AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].after_value).not.toMatch(/password_?hash/i);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http()
        .post(apiUrl('accounts'))
        .send(buildCreateAccountBody({ login_id: 'noauth' }))
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .post(apiUrl('accounts'))
        .set('Cookie', cookie)
        .send(buildCreateAccountBody({ login_id: 'chuokai_user' }))
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PUT /api/v1/accounts/:account_id — ACSMS-API-025-003
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/accounts/:account_id', () => {
    it('should update and persist the account when NICHINO_ADMIN puts a valid body', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody({
          role_id: 1,
          todofuken_code: null,
          ja_id: null,
          kanri_shiten_id: null,
          account_name: '管理者（更新）',
          email: 'admin_new@example.com',
          sub_email_1: 'sub1@example.com',
        }))
        .expect(200);

      expect(res.body.data.account_name).toBe('管理者（更新）');

      const rows = await ctx.dataSource.query(
        `SELECT account_name, email, sub_email_1 FROM m_account WHERE account_id = 1`,
      );
      expect(rows[0].account_name).toBe('管理者（更新）');
      expect(rows[0].email).toBe('admin_new@example.com');
      expect(rows[0].sub_email_1).toBe('sub1@example.com');
    });

    it('should NOT change password_hash when password is empty string', async () => {
      const cookie = await asAdmin();
      const before = await ctx.dataSource.query(
        `SELECT password_hash FROM m_account WHERE account_id = 1`,
      );

      await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody({
          password: '',
          role_id: 1,
          todofuken_code: null,
          ja_id: null,
          kanri_shiten_id: null,
          account_name: '管理者',
        }))
        .expect(200);

      const after = await ctx.dataSource.query(
        `SELECT password_hash FROM m_account WHERE account_id = 1`,
      );
      expect(after[0].password_hash).toBe(before[0].password_hash);
    });

    it('should change password_hash when password is provided', async () => {
      const cookie = await asAdmin();
      const before = await ctx.dataSource.query(
        `SELECT password_hash FROM m_account WHERE account_id = 1`,
      );

      await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody({
          password: 'NewPass123!',
          role_id: 1,
          todofuken_code: null,
          ja_id: null,
          kanri_shiten_id: null,
          account_name: '管理者',
        }))
        .expect(200);

      const after = await ctx.dataSource.query(
        `SELECT password_hash FROM m_account WHERE account_id = 1`,
      );
      expect(after[0].password_hash).not.toBe(before[0].password_hash);
      expect(after[0].password_hash).toMatch(/^\$2[abxy]\$/);
    });

    it('should return 404 NOT_FOUND when account_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('accounts/9999'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when sub_email_1 has invalid email format', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody({ sub_email_1: 'not-an-email' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should write an UPDATE audit log row (t_log) with bare UPDATE operation when update succeeds', async () => {
      const cookie = await asAdmin();
      await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody({
          role_id: 1,
          todofuken_code: null,
          ja_id: null,
          kanri_shiten_id: null,
          account_name: '管理者（再更新）',
        }))
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, before_value, after_value
           FROM t_log
          WHERE target_table = 'm_account' AND operation = 'UPDATE' AND target_id = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('UPDATE');
      expect(logs[0].before_value).not.toMatch(/password_?hash/i);
      expect(logs[0].after_value).not.toMatch(/password_?hash/i);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http()
        .put(apiUrl('accounts/1'))
        .send(buildUpdateAccountBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .put(apiUrl('accounts/1'))
        .set('Cookie', cookie)
        .send(buildUpdateAccountBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });
});
