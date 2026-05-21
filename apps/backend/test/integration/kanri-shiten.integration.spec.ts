// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面
//
// End-to-end integration test for KanriShiten module via the shared
// createIntegrationTestApp() helper:
//   - pg-mem in-memory Postgres
//   - ioredis-mock (real session lifecycle)
//   - full Nest pipeline: SessionAuthGuard → PermissionsGuard →
//     ValidationPipe → KanriShitenController → KanriShitenService →
//     DB transaction → t_log
//
// SCR-008 conflict check (§4.4) queries m_shiten, t_dokusya, m_account.
// m_account ships in core entities; m_shiten and t_dokusya are still in
// later SCRs so we create bare-minimum stub tables in seedSql.

import request from 'supertest';
import type { Server } from 'http';

import { KanriShitenModule } from '@/modules/kanri-shiten/kanri-shiten.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('KanriShiten module — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [KanriShitenModule],
      seedSql: [
        // Two JAs for cross-scope assertions (JA #1 owned by CHUOKAI / JA_HONTEN /
        // JA_KANRI_SHITEN sessions; JA #2 belongs to a different organization).
        `INSERT INTO m_ja
          (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
           yubin_no, address, tel, fax, email,
           tanto_busho, tanto_name, zei_kubun, biko, created_at, created_by, updated_at, updated_by)
         VALUES
          ('1301001001', 'JA東京中央', 'ジェイエイトウキョウチュウオウ', '13', false,
           '1000001', '東京', '03', '03', 'a@a.jp', '', '', 1, '', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
          ('0101001002', 'JA北海道中央', 'ジェイエイホッカイドウチュウオウ', '01', false,
           '0600001', '札幌', '011', '011', 'b@b.jp', '', '', 1, '', NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,

        // SCR-008 §4.4 conflict-check stub table — minimal schema for
        // COUNT(*) to succeed. m_shiten now ships in ACSMS-SCR-007 so
        // pg-mem's synchronize creates the real table from the entity;
        // only t_dokusya remains stubbed until its SCR ships.
        `CREATE TABLE IF NOT EXISTS t_dokusya (
           dokusya_id SERIAL PRIMARY KEY,
           kanri_shiten_id BIGINT NOT NULL,
           deleted_at TIMESTAMPTZ NULL
         )`,

        // Pre-existing m_kanri_shiten rows (entity ships in this SCR — pg-mem
        // synchronize creates the table from the KanriShiten entity in
        // ALL_ENTITIES once that's added). For now we seed via SQL.
        `INSERT INTO m_kanri_shiten
          (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
           yubin_no, todofuken_code, address, tel, fax, paper_flg, denshi_flg, biko,
           created_at, created_by, updated_at, updated_by)
         VALUES
          (1, '113-3300-001', '東京中央支店', 'トウキョウチュウオウシテン',
           '1000001', '13', '千代田区千代田1-1-1', '0312345678', '0312345679', true, true, '',
           NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
          (1, '113-3300-002', '東京第二支店', 'トウキョウダイニシテン',
           '1000002', '13', '千代田区千代田2-2-2', '0312345680', '0312345681', true, false, '',
           NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
          (2, '013-3300-001', 'JA北海道中央管理支店', 'ジェイエイホッカイドウチュウオウカンリシテン',
           '0600001', '01', '札幌市中央区', '0112223333', '0112223334', true, true, '',
           NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  function asAdmin() {
    return ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['kanri_shiten.view', 'kanri_shiten.delete'],
    });
  }

  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['kanri_shiten.view'],
    });
  }

  function asJaHonten(jaId = 1) {
    return ctx.seedSession({
      role_code: 'JA_HONTEN',
      ja_id: jaId,
      permissions: ['kanri_shiten.view'],
    });
  }

  function asJaKanriShiten(jaId = 1, kanriShitenId = 1) {
    return ctx.seedSession({
      role_code: 'JA_KANRI_SHITEN',
      ja_id: jaId,
      kanri_shiten_id: kanriShitenId,
      permissions: ['kanri_shiten.view'],
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // GET /api/v1/kanri-shiten
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/kanri-shiten', () => {
    it('should return all 3 rows across both JAs when caller is NICHINO_ADMIN', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('kanri-shiten')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBe(3);
    });

    it('should return only own-JA rows when caller is CHUOKAI with ja_id=1', async () => {
      const cookie = await asChuokai(1);
      const res = await http().get(apiUrl('kanri-shiten')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((r: any) => r.ja_id === 1)).toBe(true);
    });

    it('should return only own-JA rows when caller is JA_HONTEN with ja_id=2', async () => {
      const cookie = await asJaHonten(2);
      const res = await http().get(apiUrl('kanri-shiten')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kanri_shiten_code).toBe('013-3300-001');
    });

    it('should return only own kanri_shiten when caller is JA_KANRI_SHITEN', async () => {
      const cookie = await asJaKanriShiten(1, 1);
      const res = await http().get(apiUrl('kanri-shiten')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kanri_shiten_id).toBe(1);
    });

    it('should filter by kanri_shiten_code ILIKE when query has kanri_shiten_code=3300', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('kanri-shiten'))
        .query({ kanri_shiten_code: '3300' })
        .set('Cookie', [buildSessionCookie(ctx.app, cookie)])
        .expect(200);
      expect(res.body.data).toHaveLength(3); // all 3 rows contain "3300"
    });

    it('should filter by kanri_shiten_name ILIKE when query has kanri_shiten_name=北海道', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('kanri-shiten'))
        .query({ kanri_shiten_name: '北海道' })
        .set('Cookie', [buildSessionCookie(ctx.app, cookie)])
        .expect(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should filter by todofuken_code exact match when query has todofuken_code=01 (dropdown, v1.3)', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('kanri-shiten'))
        .query({ todofuken_code: '01' })
        .set('Cookie', [buildSessionCookie(ctx.app, cookie)])
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].todofuken_code).toBe('01');
    });

    it('should return empty data when no row matches', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .get(apiUrl('kanri-shiten'))
        .query({ kanri_shiten_code: 'ZZZZZZZZZ' })
        .set('Cookie', [buildSessionCookie(ctx.app, cookie)])
        .expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 401 when no session cookie is provided', async () => {
      const res = await http().get(apiUrl('kanri-shiten')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 when caller lacks kanri_shiten.view permission', async () => {
      const cookie = await ctx.seedSession({
        role_code: 'NICHINO_ADMIN',
        ja_id: null,
        permissions: [], // explicit empty
      });
      await http().get(apiUrl('kanri-shiten')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // DELETE /api/v1/kanri-shiten/:id
  // ═════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/kanri-shiten/:id', () => {
    it('should soft-delete the row and write t_log entry when no conflicting data', async () => {
      const cookie = await asAdmin();

      await http().delete(apiUrl('kanri-shiten/1')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_kanri_shiten WHERE kanri_shiten_id = 1`,
      );
      expect(rows[0].deleted_at).not.toBeNull();

      const logs = await ctx.dataSource.query(
        `SELECT operation, target_id FROM t_log WHERE target_table = 'm_kanri_shiten' AND operation = 'DELETE'`,
      );
      expect(logs).toHaveLength(1);
      expect(Number(logs[0].target_id)).toBe(1);
    });

    it('should return 404 NOT_FOUND when kanri_shiten_id does not exist', async () => {
      const cookie = await asAdmin();
      await http().delete(apiUrl('kanri-shiten/9999')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(404);
    });

    it('should return 409 CONFLICT when related t_dokusya rows exist', async () => {
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (kanri_shiten_id, deleted_at) VALUES (1, NULL)`,
      );
      const cookie = await asAdmin();

      const res = await http().delete(apiUrl('kanri-shiten/1')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');

      // Row stays soft-undeleted
      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_kanri_shiten WHERE kanri_shiten_id = 1`,
      );
      expect(rows[0].deleted_at).toBeNull();
    });

    it('should return 409 CONFLICT when related m_shiten rows exist', async () => {
      // m_shiten now ships with full schema from the Shiten entity (SCR-007).
      // Provide every NOT NULL column so the INSERT succeeds; the conflict
      // check only counts non-soft-deleted rows by kanri_shiten_id.
      await ctx.dataSource.query(
        `INSERT INTO m_shiten (
           ja_id, shiten_code, shiten_name, shiten_name_kana,
           kinyu_shiten_flg, kanri_shiten_id, biko, deleted_at,
           created_at, created_by, updated_at, updated_by
         ) VALUES (
           1, '001', 'テスト支店', 'ﾃｽﾄｼﾃﾝ',
           false, 1, '', NULL,
           NOW(), 'SYSTEM', NOW(), 'SYSTEM'
         )`,
      );
      const cookie = await asAdmin();
      await http().delete(apiUrl('kanri-shiten/1')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(409);
    });

    it('should return 403 FORBIDDEN when CHUOKAI attempts to delete (画面定義§1.3: NICHINO_ADMIN only)', async () => {
      const cookie = await asChuokai(1);
      // CHUOKAI session is seeded WITHOUT kanri_shiten.delete permission
      await http().delete(apiUrl('kanri-shiten/1')).set('Cookie', [buildSessionCookie(ctx.app, cookie)]).expect(403);
    });

    it('should return 401 when no session cookie is provided', async () => {
      await http().delete(apiUrl('kanri-shiten/1')).expect(401);
    });
  });
});
