// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面
//
// End-to-end integration tests for the auth + oshirase modules via the
// shared createIntegrationTestApp() helper:
//   - pg-mem (m_account, m_roles, m_permissions, m_roles_permissions,
//     t_mfa_otp, t_login_log, t_oshirase)
//   - ioredis-mock (real session lifecycle through SessionService)
//   - full Nest pipeline: ValidationPipe → AuthController → AuthService →
//     bcrypt → DB transaction → SessionService → cookie-parser
//
// AuthModule is always wired by the helper. We add OshiraseModule for
// the public oshirase endpoint test.

import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Server } from 'http';

import { OshiraseModule } from '@/modules/oshirase/oshirase.module';
import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('Auth + Oshirase modules — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('P@ssw0rd123', 10);
  });

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [OshiraseModule],
      seedSql: [
        // Roles
        `INSERT INTO m_roles (role_id, role_code, role_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'NICHINO_ADMIN', '日農（管理者）', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        `INSERT INTO m_roles (role_id, role_code, role_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (3, 'CHUOKAI', '中央会', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,

        // Permissions (3 sample codes — full set unnecessary for this suite)
        `INSERT INTO m_permissions (permission_id, permission_code, permission_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'dokusya.view', '購読者参照', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        `INSERT INTO m_permissions (permission_id, permission_code, permission_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (2, 'dokusya.create', '購読者登録', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,

        `INSERT INTO m_roles_permissions (role_permission_id, role_id, permission_id, created_by, updated_by, created_at, updated_at)
         VALUES (1, 1, 1, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        `INSERT INTO m_roles_permissions (role_permission_id, role_id, permission_id, created_by, updated_by, created_at, updated_at)
         VALUES (2, 1, 2, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
      ],
    });

    // m_account: hashed real password — bcrypt.compare in AuthService MUST match.
    await ctx.dataSource.query(
      `INSERT INTO m_account
        (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
         todofuken_code, paper_flg, denshi_flg, email, biko, mfa_enable_flg,
         login_failure_count, account_lock_flg,
         created_by, updated_by, created_at, updated_at)
       VALUES
        ('admin01', $1, '管理者太郎', 1, NULL, NULL,
         NULL, false, false, 'admin@nichino.co.jp', '', false,
         0, false,
         'SYSTEM', 'SYSTEM', NOW(), NOW())`,
      [passwordHash],
    );

    // MFA-enabled account
    await ctx.dataSource.query(
      `INSERT INTO m_account
        (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
         todofuken_code, paper_flg, denshi_flg, email, biko, mfa_enable_flg,
         login_failure_count, account_lock_flg,
         created_by, updated_by, created_at, updated_at)
       VALUES
        ('chuokai01', $1, '中央会太郎', 3, 1, NULL,
         '13', true, true, 'chuokai@ja-example.or.jp', '', true,
         0, false,
         'SYSTEM', 'SYSTEM', NOW(), NOW())`,
      [passwordHash],
    );

    // Locked account
    await ctx.dataSource.query(
      `INSERT INTO m_account
        (login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id,
         todofuken_code, paper_flg, denshi_flg, email, biko, mfa_enable_flg,
         login_failure_count, account_lock_flg,
         created_by, updated_by, created_at, updated_at)
       VALUES
        ('locked01', $1, 'ロック太郎', 1, NULL, NULL,
         NULL, false, false, 'locked@nichino.co.jp', '', false,
         5, true,
         'SYSTEM', 'SYSTEM', NOW(), NOW())`,
      [passwordHash],
    );

    // Public oshirase notices (status=2 = 公開, ja_id=NULL = 全体向け).
    // updated_at is set OPPOSITE to publish_start_date so the ordering
    // test distinguishes the COALESCE(updated_at, created_at) DESC rule
    // from the old publish_start_date DESC rule:
    //   システム … publish 04-10 (newer date) but updated 04-10 (older update)
    //   新機能   … publish 04-05 (older date) but updated 04-11 (newer update)
    // → expected order is 新機能 then システム.
    await ctx.dataSource.query(
      `INSERT INTO t_oshirase
        (ja_id, oshirase_type, publish_location, status, title, content,
         publish_start_date, publish_end_date, target_kanri_kubun,
         created_by, updated_by, created_at, updated_at)
       VALUES
        (NULL, 1, 1, 2, 'システムメンテナンスのお知らせ', '本文',
         '2026-04-10'::timestamptz, NULL, '',
         'SYSTEM', 'SYSTEM', '2026-04-10T09:00:00Z'::timestamptz, '2026-04-10T09:00:00Z'::timestamptz)`,
    );
    await ctx.dataSource.query(
      `INSERT INTO t_oshirase
        (ja_id, oshirase_type, publish_location, status, title, content,
         publish_start_date, publish_end_date, target_kanri_kubun,
         created_by, updated_by, created_at, updated_at)
       VALUES
        (NULL, 3, 1, 2, '新機能リリースのお知らせ', '本文',
         '2026-04-05'::timestamptz, NULL, '',
         'SYSTEM', 'SYSTEM', '2026-04-05T09:00:00Z'::timestamptz, '2026-04-11T09:00:00Z'::timestamptz)`,
    );
    // Type 4 (締め切り時間) at login location — must be EXCLUDED by the
    // oshirase_type IN (1,2,3) filter even though it matches location=1.
    await ctx.dataSource.query(
      `INSERT INTO t_oshirase
        (ja_id, oshirase_type, publish_location, status, title, content,
         publish_start_date, publish_end_date, target_kanri_kubun,
         created_by, updated_by, created_at, updated_at)
       VALUES
        (NULL, 4, 1, 2, '締め切り時間のお知らせ', '本文',
         '2026-04-20'::timestamptz, NULL, '',
         'SYSTEM', 'SYSTEM', '2026-04-20T09:00:00Z'::timestamptz, '2026-04-20T09:00:00Z'::timestamptz)`,
    );
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login (API-001-001)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user payload + Set-Cookie when credentials are valid (no MFA)', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'P@ssw0rd123' })
        .expect(200);

      expect(res.body.data.mfa_required).toBe(false);
      expect(res.body.data.user).toMatchObject({
        login_id: 'admin01',
        role_code: 'NICHINO_ADMIN',
        ja_id: null,
        permissions: expect.arrayContaining(['dokusya.view', 'dokusya.create']),
      });
      const cookies = res.headers['set-cookie'];
      const joined = Array.isArray(cookies) ? cookies.join(';') : cookies;
      expect(joined).toMatch(/session_id=s%3A/i);
      expect(joined).toMatch(/HttpOnly/i);
      expect(joined).toMatch(/SameSite=Strict/i);
    });

    it('should return 200 with mfa_required=true + mfa_token when account has mfa_enable_flg=true', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'chuokai01', password: 'P@ssw0rd123' })
        .expect(200);

      expect(res.body.data.mfa_required).toBe(true);
      expect(res.body.data.mfa_token).toEqual(expect.any(String));
      expect(res.body.data.expires_in).toBe(300);
      // No session cookie until OTP verifies.
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('should return 401 INVALID_CREDENTIALS when account does not exist', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'unknown', password: 'P@ssw0rd123' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should return 401 INVALID_CREDENTIALS when password is wrong', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'WrongPass1' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should return 401 ACCOUNT_LOCKED with admin-contact message when account is already locked', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'locked01', password: 'P@ssw0rd123' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('ACCOUNT_LOCKED');
          expect(res.body.message).toBe(
            'アカウントがロックされています。管理者へお問い合わせください。',
          );
        });
    });

    it('should auto-lock the account on the 5th consecutive wrong password (atomic UPDATE) and surface ACCOUNT_LOCKED on the 6th attempt', async () => {
      // Pre-condition: account "chuokai01" has login_failure_count=0,
      // mfa_enable_flg=true. 4 wrong attempts must each return
      // INVALID_CREDENTIALS without locking the account.
      for (let i = 0; i < 4; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ login_id: 'chuokai01', password: 'WrongPass1' })
          .expect(401)
          .expect((res) => {
            expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
          });
      }

      // 5th wrong attempt — counter hits the threshold, lock flag flips
      // inside the same UPDATE, but the response is still INVALID_CREDENTIALS
      // (the user just discovered they typed the wrong password again,
      // not that the account is now locked).
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'chuokai01', password: 'WrongPass1' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
        });

      // 6th attempt (any password, even the correct one) — the lock check
      // fires before bcrypt and surfaces the dedicated message.
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'chuokai01', password: 'P@ssw0rd123' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('ACCOUNT_LOCKED');
          expect(res.body.message).toBe(
            'アカウントがロックされています。管理者へお問い合わせください。',
          );
        });

      // Database state: lock flag set, lock timestamp recorded.
      const [row] = await ctx.dataSource.query(
        `SELECT login_failure_count, account_lock_flg, account_lock_at
         FROM m_account WHERE login_id = 'chuokai01'`,
      );
      expect(row.login_failure_count).toBe(5);
      expect(row.account_lock_flg).toBe(true);
      expect(row.account_lock_at).not.toBeNull();
    });

    it('should return 400 VALIDATION_ERROR when login_id contains full-width characters', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: '管理者０１', password: 'P@ssw0rd123' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should write t_login_log with login_result=2 when login fails', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'WrongPass1' })
        .expect(401);

      const rows = await ctx.dataSource.query(
        `SELECT login_id, login_result FROM t_login_log WHERE login_id = 'admin01' ORDER BY login_log_id DESC LIMIT 1`,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].login_result).toBe(2);
    });

    it('should reset login_failure_count to 0 when login succeeds', async () => {
      // First, fail twice to bump the count.
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'wrongpassword!' });
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'wrongpassword!' });

      // Then succeed.
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'P@ssw0rd123' })
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT login_failure_count, last_login_at FROM m_account WHERE login_id = 'admin01'`,
      );
      expect(Number(rows[0].login_failure_count)).toBe(0);
      expect(rows[0].last_login_at).not.toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh (API-001-004)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('should return 401 UNAUTHORIZED when no session cookie is present', async () => {
      await http()
        .post('/api/v1/auth/refresh')
        .expect(401)
        .expect((res) => {
          expect(res.body.error_code).toBe('UNAUTHORIZED');
        });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/logout (API-001-005)
  // ───────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 with success message when called without session', async () => {
      const res = await http().post('/api/v1/auth/logout').expect(200);
      expect(res.body.message).toBe('ログアウトしました。');
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // GET /api/v1/oshirase/login (API-001-006) — 認証不要
  // ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/oshirase/login', () => {
    it('should return 200 with login-screen notices ordered by COALESCE(updated_at, created_at) DESC when called without auth', async () => {
      const res = await http()
        .get('/api/v1/oshirase/login?limit=20')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      // Type 4 row is filtered out → only the two type 1/3 rows remain,
      // newest-updated first (新機能 updated 04-11 before システム 04-10).
      const titles = res.body.data.map((n: any) => n.title);
      expect(titles).toEqual([
        '新機能リリースのお知らせ',
        'システムメンテナンスのお知らせ',
      ]);
    });

    it('should exclude oshirase_type 4 (締め切り時間) from the login banner', async () => {
      const res = await http()
        .get('/api/v1/oshirase/login?limit=20')
        .expect(200);

      const types = res.body.data.map((n: any) => n.oshirase_type);
      expect(types).not.toContain(4);
      expect(types.every((t: number) => [1, 2, 3].includes(t))).toBe(true);
    });

    it('should return 400 VALIDATION_ERROR when limit > 20', async () => {
      await http()
        .get('/api/v1/oshirase/login?limit=21')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });
  });
});
