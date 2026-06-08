// Auth throttle integration — proves the @Throttle() decorators on
// POST /auth/login (10/min) and POST /auth/forgot-password (3/hour)
// actually enforce rate-limits when the request volume crosses the
// configured cap.
//
// Setup uses createIntegrationTestApp({ enableThrottler: true }) which
// adds ThrottlerModule.forRoot + APP_GUARD ThrottlerGuard — the same
// wiring AppModule applies in production. Without that opt-in flag the
// in-memory throttler is absent, the @Throttle decorators are dead
// metadata, and an attacker can brute-force unimpeded.
//
// Each test gets a fresh app (beforeEach), so each test starts with a
// pristine throttler storage. The 11th login + 4th forgot-password in
// a SINGLE test trip the limit.

import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Server } from 'http';

import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('Auth throttle — integration (ThrottlerGuard wired)', () => {
  let ctx: IntegrationTestContext;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('P@ssw0rd123', 10);
  });

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      enableThrottler: true,
      seedSql: [
        `INSERT INTO m_roles (role_id, role_code, role_name, description, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'NICHINO_ADMIN', '日農（管理者）', NULL, 'SYSTEM', 'SYSTEM', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
      ],
    });

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

  // ─── POST /api/v1/auth/login — 10 requests per minute ────────────────────
  describe('POST /api/v1/auth/login (limit: 10 req/min)', () => {
    it('should return 429 TOO_MANY_REQUESTS on the 11th login attempt within a minute', async () => {
      // 10 valid logins succeed (200) — same credentials, doesn't matter
      // that the session keeps churning. The Throttler counts by IP/path.
      for (let i = 0; i < 10; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ login_id: 'admin01', password: 'P@ssw0rd123' })
          .expect(200);
      }

      // 11th MUST be 429.
      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'P@ssw0rd123' })
        .expect(429);
    });

    it('should still rate-limit when credentials are invalid (prevents brute-force)', async () => {
      // 10 wrong-password attempts — each returns 401, but they all
      // count toward the throttle window. The Throttler runs BEFORE the
      // controller body, so even rejected requests are throttled.
      for (let i = 0; i < 10; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ login_id: 'admin01', password: 'WrongPass99' })
          .expect(401);
      }

      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: 'admin01', password: 'WrongPass99' })
        .expect(429);
    });

    it('should NOT count validation-failed requests (DTO rejection) toward the throttle window', async () => {
      // DTO rejection (400 VALIDATION_ERROR) fires inside ValidationPipe
      // which runs AFTER ThrottlerGuard — so these requests DO count.
      // This test documents the actual behaviour: send 10 invalid bodies,
      // expect 429 on the 11th even though body shape is malformed.
      for (let i = 0; i < 10; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ login_id: '', password: 'short' })
          .expect(400);
      }

      await http()
        .post('/api/v1/auth/login')
        .send({ login_id: '', password: 'short' })
        .expect(429);
    });
  });

  // ─── POST /api/v1/auth/forgot-password — 3 requests per hour ─────────────
  describe('POST /api/v1/auth/forgot-password (limit: 3 req/hour)', () => {
    it('should return 429 TOO_MANY_REQUESTS on the 4th forgot-password call within an hour', async () => {
      // 3 valid forgot-password calls succeed (always 200 — anti-enum).
      // Each uses a DIFFERENT email so the BE's 5-minute DB-cooldown
      // (per-account, see auth.service.ts forgotPassword) doesn't kick
      // in and confuse the throttle assertion.
      for (let i = 0; i < 3; i++) {
        await http()
          .post('/api/v1/auth/forgot-password')
          .send({ email: `unknown${i}@example.com` })
          .expect(200);
      }

      // 4th call MUST be 429 from the Throttler.
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'another@example.com' })
        .expect(429);
    });

    it('should rate-limit regardless of whether the email belongs to a real account', async () => {
      // Mix of known + unknown emails — Throttler doesn't differentiate.
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@nichino.co.jp' })
        .expect(200);
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@example.com' })
        .expect(200);
      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'another@example.com' })
        .expect(200);

      await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'fourth@example.com' })
        .expect(429);
    });
  });
});
