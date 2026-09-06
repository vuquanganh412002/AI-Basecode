// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM queries.
//
// IMPORTANT — when /gen-code-backend creates `Tanka` entity, append
//   import { Tanka } from '@/database/entities/tanka.entity';
//   ALL_ENTITIES.push(Tanka);
// to `test/utils/create-integration-app.ts`. pg-mem's DataSource needs an
// explicit list (dataSourceFactory bypasses TypeORM's autoLoadEntities).

import type { Server } from 'http';
import request from 'supertest';

import { TankaModule } from '@/modules/tanka/tanka.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('ACSMS-SCR-002 integration — tanka endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [TankaModule],
      seedSql: [
        // Tables that DELETE conflict check queries. m_tanka / m_hanbaiten
        // are provided by TypeORM synchronize (Tanka / Hanbaiten entities
        // are in ALL_ENTITIES at test/utils/create-integration-app.ts).
        // The stubs below are for tables that don't have entities yet —
        // the DELETE conflict check runs raw `SELECT COUNT(*) FROM ...`
        // against them.
        // Minimal helper table for the FK-conflict delete check. The full
        // Dokusya entity is synchronized first (many NOT NULL columns), so
        // DROP + recreate a bare table whose only columns this spec needs —
        // lets the conflict-row INSERT below pass without the unrelated
        // NOT NULL columns. Bare columns also avoid this pg-mem version's
        // strict AST-coverage rejection of inline constraints on raw DDL.
        `DROP TABLE IF EXISTS t_dokusya`,
        `CREATE TABLE t_dokusya (
           dokusya_id INT,
           ja_id BIGINT,
           tanka_id BIGINT,
           deleted_at TIMESTAMPTZ
         )`,
        // Seed two tanka rows for the active CHUOKAI (ja_id=1)
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
           (1, 'T002', 2, '配達手数料',
            500, 455, 10.00,
            '2026-01-01', NULL, '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['tanka.view', 'tanka.delete'],
    });
  }

  // ─── GET /api/v1/tanka ──────────────────────────────────────────────────
  describe('GET /api/v1/tanka', () => {
    it('should return seeded rows for the caller jaId', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter to active-only when active_flg=true', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka?active_flg=true'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data.every((r: any) => r.active_flg === true)).toBe(true);
      expect(res.body.meta.total).toBe(1);
    });

    it('should filter to disabled-only when active_flg=false', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka?active_flg=false'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data.every((r: any) => r.active_flg === false)).toBe(true);
    });

    it('should return both states when active_flg filter omitted', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const states = res.body.data.map((r: any) => r.active_flg);
      expect(states).toEqual(expect.arrayContaining([true, false]));
    });

    it('should filter by tanka_type exact match', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka?tanka_type=1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data.every((r: any) => r.tanka_type === 1)).toBe(true);
    });

    it('should filter by tanka_name partial match (ILIKE)', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka?tanka_name=' + encodeURIComponent('基本')))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].tanka_code).toBe('T001');
    });

    it('should exclude soft-deleted rows', async () => {
      const sid = await asChuokai(1);
      await ctx.dataSource.query(
        `UPDATE m_tanka SET deleted_at = NOW() WHERE tanka_code = 'T001'`,
      );
      const res = await http()
        .get(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const codes = res.body.data.map((r: any) => r.tanka_code);
      expect(codes).not.toContain('T001');
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().get(apiUrl('tanka')).expect(401);
    });

    it('should return only own-JA rows when CHUOKAI calls (DataScope)', async () => {
      // Seed a tanka in a different JA — caller must NOT see it
      await ctx.dataSource.query(
        `INSERT INTO m_tanka
           (ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (99, 'OTHER', 1, '他JA単価',
            1000, 909, 10.00, '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const codes = res.body.data.map((r: any) => r.tanka_code);
      expect(codes).not.toContain('OTHER');
    });

    it('should respect per_page and page', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('tanka?page=1&per_page=1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({
        page: 1,
        per_page: 1,
        total: 2,
        total_pages: 2,
      });
    });
  });

  // ─── DELETE /api/v1/tanka/:tanka_id ─────────────────────────────────────
  describe('DELETE /api/v1/tanka/:tanka_id', () => {
    async function getTankaIdByCode(code: string): Promise<number> {
      const [{ tanka_id }] = await ctx.dataSource.query(
        `SELECT tanka_id FROM m_tanka WHERE tanka_code = $1`,
        [code],
      );
      return Number(tanka_id);
    }

    it('should soft-delete the row (deleted_at set) and return 200', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      const res = await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.message).toBe('削除しました。');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_tanka WHERE tanka_id = $1`,
        [id],
      );
      expect(row.deleted_at).not.toBeNull();
    });

    it('should write a t_log row (operation=DELETE, log_type=1, result_status=1) in the same transaction', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status, target_id, target_table
           FROM t_log
          WHERE target_table = 'm_tanka' AND target_id = $1
          ORDER BY log_id DESC
          LIMIT 1`,
        [id],
      );
      expect(logs[0]).toMatchObject({
        operation: 'DELETE',
        target_table: 'm_tanka',
      });
      expect(Number(logs[0].log_type)).toBe(1);
      expect(Number(logs[0].result_status)).toBe(1);
    });

    it('should return 404 when tanka does not exist', async () => {
      const sid = await asChuokai(1);
      await http()
        .delete(apiUrl('tanka/99999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404)
        .expect((res) => {
          expect(res.body.error_code).toBe('NOT_FOUND');
        });
    });

    it('should return 404 when tanka belongs to another JA (DataScope masks as not-found)', async () => {
      await ctx.dataSource.query(
        `INSERT INTO m_tanka
           (ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (99, 'OTHER', 1, '他JA単価',
            1000, 909, 10.00, '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const otherId = await getTankaIdByCode('OTHER');
      const sid = await asChuokai(1);
      await http()
        .delete(apiUrl(`tanka/${otherId}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });

    it('should return 409 CONFLICT when m_hanbaiten references the tanka', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      await ctx.dataSource.query(
        // m_hanbaiten is now a full TypeORM-synced table — must satisfy
        // every NOT NULL column (hanbaiten_code/_name/_kana, todofuken_code,
        // tel/fax, kana, koza_meigi, etc.). Defaults to empty strings via
        // entity-default values; we only set ja_id + the FK we want to
        // detect (haitatsuryo_tanka_id).
        `INSERT INTO m_hanbaiten
           (ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax,
            shocho_name, bank_code, bank_name, bank_branch_code,
            bank_branch_name, koza_no, koza_meigi, biko, haitatsuryo_tanka_id,
            haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES (1, 'HX001', '販売店X', 'ﾊﾝﾊﾞｲﾃﾝX',
                 '', '', '', '', '', '',
                 '', '', '', '', '', '', '', '', $1,
                 false, NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        [id],
      );
      await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409)
        .expect((res) => {
          expect(res.body.error_code).toBe('CONFLICT');
        });
    });

    it('should return 409 CONFLICT when t_dokusya references the tanka', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (ja_id, tanka_id) VALUES (1, $1)`,
        [id],
      );
      await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
    });

    it('should return 409 CONFLICT when t_dokusya_rireki references the tanka (append-only, no deleted_at, 不具合修正2026-08)', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      // t_dokusya_rireki is a full TypeORM-synchronized entity (not stubbed
      // here) — provide every NOT NULL column so the INSERT succeeds.
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya_rireki
           (dokusya_id, rireki_no, ja_id, kanri_shiten_id, tanka_id, dokusya_shubetsu, tetsuzuki_shurui,
            shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
            yubin_no, todofuken_code, shikuchoson, chome_banchi, renrakusaki_1,
            shiharai_hoho, dokusya_kaishi_date)
         VALUES
           (1, 1, 1, 1, $1, 1, 1,
            'テスト', '太郎', 'テスト', 'タロウ',
            '1000001', '13', '千代田区', '1-1-1', '0312345678',
            1, '2026-01-01')`,
        [id],
      );
      const res = await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
      expect(res.body.error_code).toBe('CONFLICT');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_tanka WHERE tanka_id = $1`,
        [id],
      );
      expect(row.deleted_at).toBeNull();
    });

    it('should leave m_tanka row untouched when conflict-check rejects', async () => {
      const sid = await asChuokai(1);
      const id = await getTankaIdByCode('T001');
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (ja_id, tanka_id) VALUES (1, $1)`,
        [id],
      );
      await http()
        .delete(apiUrl(`tanka/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_tanka WHERE tanka_id = $1`,
        [id],
      );
      expect(row.deleted_at).toBeNull();
    });

    it('should return 401 without session cookie', async () => {
      await http().delete(apiUrl('tanka/1')).expect(401);
    });
  });
});
