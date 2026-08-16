// Screen: ACSMS-SCR-024 — アカウントマスタ明細検索画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard + PermissionsGuard + GlobalExceptionFilter +
// ValidationPipe + the real TypeORM queries over m_account / m_roles /
// m_kanri_shiten / m_ja / m_todofuken.
//
// Entities `Account`, `Role`, `KanriShiten`, `Ja`, `Todofuken` are already
// in ALL_ENTITIES at test/utils/create-integration-app.ts — no helper edits
// needed.

import type { Server } from 'http';
import request from 'supertest';

import { AccountModule } from '@/modules/account/account.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('ACSMS-SCR-024 integration — accounts endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [AccountModule],
      seedSql: [
        // Seed the 5 canonical roles per docs/database/seeder.md §3.
        `INSERT INTO m_roles (role_code, role_name, description, created_at, created_by, updated_at, updated_by)
         VALUES
           ('NICHINO_ADMIN',   '日農（管理者）', '日本農業新聞 管理者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('NICHINO_STAFF',   '日農（担当者）', '日本農業新聞 担当者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('CHUOKAI',         '中央会',         '中央会アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_HONTEN',       'JA本店',         'JA本店アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_KANRI_SHITEN', 'JA管理支店',     'JA管理支店アカウント',         NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // Seed 3 sample accounts: 1 admin, 1 JA本店, 1 JA管理支店.
        `INSERT INTO m_account
           (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
            todofuken_code, paper_flg, denshi_flg, email, sub_email_1, sub_email_2, sub_email_3,
            login_failure_count, account_lock_flg, biko, mfa_enable_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('admin001',      'hash1', '管理者 太郎',     1, NULL, NULL, NULL,
            TRUE, FALSE, 'admin@example.com', '', '', '', 0, FALSE, '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('ja_honten001',  'hash2', 'JA本店 花子',     4,   10, NULL, '13',
            TRUE, TRUE,  'honten@example.com', '', '', '', 0, FALSE, '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('ja_shiten001',  'hash3', 'JA管理支店 次郎', 5,   10,   20, '13',
            TRUE, FALSE, 'shiten@example.com', '', '', '', 0, FALSE, '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // t_mfa_otp is now auto-synced via the MfaOtp entity in
        // ALL_ENTITIES (test/utils/create-integration-app.ts). Drop the
        // duplicate CREATE TABLE — pg-mem rejects it once the
        // synchronized schema already exists with stricter columns.
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
      permissions: ['account.view', 'account.delete'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function asChuokai() {
    const sid = await ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: 1,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/accounts — ACSMS-API-024-001
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/accounts', () => {
    it('should return all 3 seeded accounts paginated when NICHINO_ADMIN calls without filters', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta).toMatchObject({
        total: 3,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should filter by login_id partial match when login_id query is provided', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ login_id: 'ja_' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((a: any) => a.login_id.startsWith('ja_'))).toBe(true);
    });

    it('should filter by role_id exact match when role_id=4 (JA本店)', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ role_id: 4 })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role_id).toBe(4);
      expect(res.body.data[0].login_id).toBe('ja_honten001');
    });

    it('should filter by ja_id exact match when ja_id=10', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ ja_id: 10 })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((a: any) => a.ja_id === 10)).toBe(true);
    });

    it('should filter by kanri_shiten_id exact match when kanri_shiten_id=20', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ kanri_shiten_id: 20 })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kanri_shiten_id).toBe(20);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      const res = await http().get(apiUrl('accounts')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .get(apiUrl('accounts'))
        .set('Cookie', cookie)
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ per_page: 101 })
        .set('Cookie', cookie)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return data:[] and meta.total=0 when no rows match', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('accounts'))
        .query({ login_id: 'no-such-user' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/accounts/:account_id — ACSMS-API-024-002
  // ═══════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/accounts/:account_id', () => {
    it('should soft-delete the account and return the success message when NICHINO_ADMIN deletes an existing account', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .delete(apiUrl('accounts/3'))
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toMatchObject({ message: '削除しました。' });

      const rows = await ctx.dataSource.query(
        `SELECT account_id, deleted_at FROM m_account WHERE account_id = 3`,
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('should return 404 NOT_FOUND when account_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .delete(apiUrl('accounts/9999'))
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定されたアカウント');
    });

    it('should return 404 NOT_FOUND when target account_id is already soft-deleted', async () => {
      const cookie = await asAdmin();
      // First delete succeeds.
      await http().delete(apiUrl('accounts/3')).set('Cookie', cookie).expect(200);
      // Second delete on the same id → 404 (already deleted_at IS NOT NULL).
      const res = await http()
        .delete(apiUrl('accounts/3'))
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when target account has unused, unexpired MFA OTP rows', async () => {
      const cookie = await asAdmin();
      await ctx.dataSource.query(
        `INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, used_flg, expired_at, created_at)
         VALUES (3, 'h', 1, FALSE, NOW() + INTERVAL '5 minutes', NOW())`,
      );

      const res = await http()
        .delete(apiUrl('accounts/3'))
        .set('Cookie', cookie)
        .expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
      expect(res.body.message).toContain('関連データが存在するため');
    });

    it('should return 400 BAD_REQUEST when account_id is not numeric', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .delete(apiUrl('accounts/abc'))
        .set('Cookie', cookie)
        .expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http().delete(apiUrl('accounts/3')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .delete(apiUrl('accounts/3'))
        .set('Cookie', cookie)
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should write an audit log row (t_log) with bare DELETE operation when delete succeeds', async () => {
      const cookie = await asAdmin();
      await http().delete(apiUrl('accounts/3')).set('Cookie', cookie).expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, target_id
           FROM t_log
          WHERE target_table = 'm_account' AND target_id = 3 AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('DELETE');
      // The screen prefix should NOT leak into operation column
      expect(logs[0].operation).not.toMatch(/ACCOUNT_/);
    });
  });
});
