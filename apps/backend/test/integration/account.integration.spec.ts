// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: header self-service — MFA toggle
//
// End-to-end integration test for AccountModule via createIntegrationTestApp.
// Verifies: full Nest pipeline (SessionAuthGuard → ValidationPipe →
// AccountController → AccountService) flips m_account.mfa_enable_flg
// AND inserts a t_log row with operation='UPDATE'.

import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Server } from 'http';

import { AccountModule } from '@/modules/account/account.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

describe('Account module — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('P@ssw0rd123', 10);
  });

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [AccountModule],
      seedSql: [
        `INSERT INTO m_roles (role_id, role_code, role_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'NICHINO_ADMIN', '日農（管理者）', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
      ],
    });

    // Seed account_id=1 with mfa_enable_flg=false.
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
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  it('should flip m_account.mfa_enable_flg to true when PATCH /me/mfa with enabled=true is called by authenticated user', async () => {
    const sid = await ctx.seedSession({
      account_id: 1,
      login_id: 'admin01',
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: [],
    });

    const res = await http()
      .patch('/api/v1/account/me/mfa')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send({ enabled: true })
      .expect(200);

    expect(res.body.data.mfa_enable_flg).toBe(true);

    const rows = await ctx.dataSource.query(
      `SELECT mfa_enable_flg FROM m_account WHERE login_id = 'admin01'`,
    );
    expect(rows[0].mfa_enable_flg).toBe(true);
  });

  it('should insert a t_log row with operation=UPDATE when PATCH /me/mfa succeeds', async () => {
    const sid = await ctx.seedSession({
      account_id: 1,
      login_id: 'admin01',
      role_code: 'NICHINO_ADMIN',
    });

    await http()
      .patch('/api/v1/account/me/mfa')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send({ enabled: true })
      .expect(200);

    const logs = await ctx.dataSource.query(
      `SELECT operation, target_table, before_value, after_value
       FROM t_log
       WHERE target_table = 'm_account' AND operation = 'UPDATE'
       ORDER BY log_id DESC LIMIT 1`,
    );
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].operation).toBe('UPDATE');
    expect(logs[0].target_table).toBe('m_account');
    expect(JSON.parse(logs[0].before_value)).toMatchObject({ mfa_enable_flg: false });
    expect(JSON.parse(logs[0].after_value)).toMatchObject({ mfa_enable_flg: true });
  });

  it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
    await http()
      .patch('/api/v1/account/me/mfa')
      .send({ enabled: true })
      .expect(401);
  });

  it('should return 400 VALIDATION_ERROR when body.enabled is non-boolean', async () => {
    const sid = await ctx.seedSession({ account_id: 1 });

    await http()
      .patch('/api/v1/account/me/mfa')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send({ enabled: 'maybe' })
      .expect(400);
  });
});
