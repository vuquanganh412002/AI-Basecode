// Screen: ACSMS-SCR-003 — 単価マスタ登録画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock
// for the 3 SCR-003 endpoints (GET /:id, POST, PUT /:id). The SCR-002
// integration spec (`tanka.integration.spec.ts`) owns the list + delete
// paths; this file isolates SCR-003 so additions don't bloat the existing
// suite.

import type { Server } from 'http';
import request from 'supertest';

import { TankaModule } from '@/modules/tanka/tanka.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateTankaPayload,
  buildUpdateTankaPayload,
} from '@test/fixtures/tanka.factory';

describe('ACSMS-SCR-003 integration — tanka registration endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [TankaModule],
      seedSql: [
        // Stub tables that the DELETE conflict check queries (not exercised
        // here but the module wires the same service — keep parity with
        // tanka.integration.spec.ts so re-running both suites doesn't drift).
        // m_hanbaiten is now an ALL_ENTITIES table (Hanbaiten entity in
        // create-integration-app.ts) — pg-mem synchronize handles it.
        `CREATE TABLE IF NOT EXISTS t_dokusya (
           dokusya_id SERIAL PRIMARY KEY,
           ja_id BIGINT NOT NULL,
           tanka_id BIGINT NULL,
           deleted_at TIMESTAMPTZ NULL
         )`,
        // Seed one tanka row for ja_id=1 to support findById / update tests.
        // ja_id=2 row to exercise DataScope cross-JA isolation.
        `INSERT INTO m_tanka
           (ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'T001', 1, '基本購読料（月額）',
            4900, 4455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (2, 'X999', 1, '他JA単価',
            1000, 909, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  function asChuokai(jaId = 1, extraPerms: string[] = []) {
    return ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['tanka.view', 'tanka.create', 'tanka.update', ...extraPerms],
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tanka/:tanka_id
  // ────────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/tanka/:tanka_id', () => {
    it('should return 200 + detail body when target exists in caller jaId', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data).toMatchObject({
        tanka_id: 1,
        tanka_code: 'T001',
        ja_id: 1,
      });
    });

    it('should return 404 NOT_FOUND for unknown tanka_id', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka/999999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 (DataScope masks existence) when target belongs to another jaId', async () => {
      // ja_id=2 has tanka_code 'X999' (tanka_id=2). CHUOKAI ja_id=1 sees 404.
      const sid = await asChuokai(1);
      await http()
        .get(apiUrl('tanka/2'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });

    it('should return 401 UNAUTHORIZED when no session cookie sent', async () => {
      await http().get(apiUrl('tanka/1')).expect(401);
    });

    it('should return 400 BAD_REQUEST when tanka_id path param is non-numeric', async () => {
      const sid = await asChuokai(1);
      await http()
        .get(apiUrl('tanka/abc'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(400);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tanka
  // ────────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/tanka', () => {
    it('should return 201 + persisted row when payload is valid', async () => {
      const sid = await asChuokai(1);
      const payload = buildCreateTankaPayload({ tanka_code: 'NEW001' });

      const res = await http()
        .post(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(payload)
        .expect(201);

      expect(res.body.data).toMatchObject({
        tanka_code: 'NEW001',
        ja_id: 1,
      });
      expect(typeof res.body.data.tanka_id).toBe('number');
    });

    it('should bind ja_id from session (NOT from payload — security boundary)', async () => {
      const sid = await asChuokai(1);
      // Attacker tries to forge ja_id=99 in body — must be ignored.
      const res = await http()
        .post(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...buildCreateTankaPayload({ tanka_code: 'NEW002' }), ja_id: 99 })
        .expect((r) => {
          // Either 400 (whitelist strip) or 201 with ja_id=1 (silent ignore)
          if (r.status !== 201 && r.status !== 400) {
            throw new Error(`unexpected status ${r.status}`);
          }
        });
      if (res.status === 201) {
        expect(res.body.data.ja_id).toBe(1);
      }
    });

    it('should return 400 DUPLICATE_CODE when tanka_code already exists', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateTankaPayload({ tanka_code: 'T001' })) // seeded row
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 400 VALIDATION_ERROR with field list when required fields missing', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({})
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(expect.any(Array));
      const fields = res.body.errors.map((e: any) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining([
          'tanka_type',
          'tanka_code',
          'tanka_name',
          'tekiyo_start_date',
          'tekiyo_end_date',
        ]),
      );
    });

    it('should return 401 UNAUTHORIZED when no session cookie sent', async () => {
      await http()
        .post(apiUrl('tanka'))
        .send(buildCreateTankaPayload())
        .expect(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // PUT /api/v1/tanka/:tanka_id
  // ────────────────────────────────────────────────────────────────────────
  describe('PUT /api/v1/tanka/:tanka_id', () => {
    it('should return 200 + persisted update when payload is valid', async () => {
      const sid = await asChuokai(1);
      const payload = buildUpdateTankaPayload({
        tanka_name: '基本購読料（月額）改定',
        kingaku_zeikomi: 5200,
      });

      const res = await http()
        .put(apiUrl('tanka/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(payload)
        .expect(200);

      expect(res.body.data).toMatchObject({
        tanka_id: 1,
        tanka_name: '基本購読料（月額）改定',
        kingaku_zeikomi: 5200,
      });
      // tanka_code MUST be preserved (immutable per api.md §API-003-003 footnote)
      expect(res.body.data.tanka_code).toBe('T001');
    });

    it('should return 404 NOT_FOUND when target does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('tanka/999999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateTankaPayload())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to another jaId (DataScope)', async () => {
      const sid = await asChuokai(1);
      // tanka_id=2 belongs to ja_id=2 per seedSql
      await http()
        .put(apiUrl('tanka/2'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateTankaPayload())
        .expect(404);
    });

    it('should return 400 VALIDATION_ERROR when required fields missing', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('tanka/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({})
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should reject tanka_code in body via forbidNonWhitelisted (immutable)', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('tanka/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...buildUpdateTankaPayload(), tanka_code: 'EVIL' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 UNAUTHORIZED when no session cookie sent', async () => {
      await http()
        .put(apiUrl('tanka/1'))
        .send(buildUpdateTankaPayload())
        .expect(401);
    });
  });
});
