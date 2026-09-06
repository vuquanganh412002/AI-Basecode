// Screen: ACSMS-SCR-006 — 支店マスタ明細検索画面
//
// Integration tests covering the 2 list/delete endpoints over a real
// Nest + pg-mem stack — exercise guards, ValidationPipe, ILIKE filtering,
// DataScope, FK conflict check, and audit log atomicity.

import type { Server } from 'http';
import request from 'supertest';

import { ShitenModule } from '@/modules/shiten/shiten.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('Shiten — integration list + delete (SCR-006 over pg-mem)', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationTestApp({
      modules: [ShitenModule],
      seedSql: [
        // m_ja seed (FK target).
        `INSERT INTO m_ja (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
                            yubin_no, address, tel, fax, email,
                            tanto_busho, tanto_name, zei_kubun, biko,
                            created_at, created_by, updated_at, updated_by)
         VALUES
           ('JA001', 'JA東京', 'ジェイエートウキョウ', '13', false,
            '1000001', '東京都千代田区千代田1-1-1', '0312345678', '0312345679',
            'a@a.jp', '', '', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA002', 'JA大阪', 'ジェイエーオオサカ', '27', false,
            '5300001', '大阪府大阪市1-1', '0612345678', '0612345679',
            'b@b.jp', '', '', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_kanri_shiten seed (FK target — required by m_shiten.kanri_shiten_id).
        `INSERT INTO m_kanri_shiten (ja_id, kanri_shiten_code, kanri_shiten_name,
                                       kanri_shiten_name_kana, yubin_no, todofuken_code,
                                       address, tel, fax, paper_flg, denshi_flg, biko,
                                       created_at, created_by, updated_at, updated_by)
         VALUES (1, 'KS-001', '東京管理支店', 'トウキョウカンリシテン',
                 '1000010', '13', '東京都千代田区千代田1-2-3', '0312345600', '0312345601',
                 true, true, '',
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // §4.4 conflict-check stub table for t_dokusya — minimal schema for
        // COUNT(*) to succeed. Drop when t_dokusya entity ships.
        // Minimal FK-conflict helper — DROP + bare recreate (full Dokusya
        // entity is synchronized first; bare columns also dodge this pg-mem
        // version's strict AST check on inline DDL constraints).
        `DROP TABLE IF EXISTS t_dokusya`,
        `CREATE TABLE t_dokusya (
           dokusya_id INT,
           shiten_id BIGINT,
           deleted_at TIMESTAMPTZ
         )`,
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  afterEach(async () => {
    // Reset state between tests so DELETE / list expectations don't leak.
    await ctx.dataSource.query(`DELETE FROM t_dokusya`);
    await ctx.dataSource.query(`DELETE FROM m_shiten`);
    await ctx.dataSource.query(`DELETE FROM m_account`);
    await ctx.dataSource.query(`DELETE FROM t_dokusya_rireki`);
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // ─── helpers ─────────────────────────────────────────────────────────
  async function chuokaiCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['shiten.view', 'shiten.delete'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function insertShiten(opts: {
    jaId?: number; shitenCode?: string; shitenName?: string; biko?: string;
  } = {}) {
    const rows = await ctx.dataSource.query(
      `INSERT INTO m_shiten (
         ja_id, shiten_code, shiten_name, shiten_name_kana,
         kinyu_shiten_flg, kanri_shiten_id, biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, 'ｼﾃﾝ',
         false, 1, $4,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       RETURNING shiten_id`,
      [opts.jaId ?? 1, opts.shitenCode ?? '001', opts.shitenName ?? '本店', opts.biko ?? ''],
    );
    return Number(rows[0].shiten_id);
  }

  describe('GET /api/v1/shiten — list + DataScope', () => {
    it('should return ja_id=1 rows only when CHUOKAI of ja_id=1 lists', async () => {
      await insertShiten({ jaId: 1, shitenCode: '001', shitenName: '本店' });
      await insertShiten({ jaId: 1, shitenCode: '002', shitenName: '東支店' });
      await insertShiten({ jaId: 2, shitenCode: '001', shitenName: 'JA大阪本店' });

      const cookie = await chuokaiCookie(1);
      const res = await http().get('/api/v1/shiten').set('Cookie', cookie).expect(200);

      expect(res.body.meta.total).toBe(2);
      expect(res.body.data.every((r: any) => r.ja_id === 1)).toBe(true);
    });

    it('should apply ILIKE filter when shiten_name=本店 is passed', async () => {
      await insertShiten({ shitenCode: '001', shitenName: '本店営業部' });
      await insertShiten({ shitenCode: '002', shitenName: '東支店' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/shiten')
        .query({ shiten_name: '本店' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].shiten_name).toContain('本店');
    });

    it('should return biko in each row (v1.3 schema)', async () => {
      await insertShiten({ shitenCode: '001', shitenName: '本店', biko: 'テスト備考' });
      const cookie = await chuokaiCookie(1);
      const res = await http().get('/api/v1/shiten').set('Cookie', cookie).expect(200);
      expect(res.body.data[0].biko).toBe('テスト備考');
    });

    it('should return kanri_shiten_name joined from m_kanri_shiten', async () => {
      // Seeded m_kanri_shiten row: kanri_shiten_id=1, name='東京管理支店'.
      // Every insertShiten() above defaults kanriShitenId=1.
      await insertShiten({ shitenCode: '001', shitenName: '本店' });
      const cookie = await chuokaiCookie(1);
      const res = await http().get('/api/v1/shiten').set('Cookie', cookie).expect(200);
      expect(res.body.data[0].kanri_shiten_name).toBe('東京管理支店');
    });

    it('should return empty data when no row matches the filter', async () => {
      await insertShiten({ shitenName: '本店' });
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/shiten')
        .query({ shiten_name: 'ZZZ' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
      const res = await http().get('/api/v1/shiten').expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/v1/shiten/:id', () => {
    it('should soft-delete the row + write t_log entry when no conflicting data', async () => {
      const shitenId = await insertShiten({ shitenCode: '001', shitenName: '削除対象' });
      const cookie = await chuokaiCookie(1);

      await http().delete(`/api/v1/shiten/${shitenId}`).set('Cookie', cookie).expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_shiten WHERE shiten_id = $1`,
        [shitenId],
      );
      expect(rows[0].deleted_at).not.toBeNull();

      const logs = await ctx.dataSource.query(
        `SELECT operation FROM t_log
         WHERE target_table = 'm_shiten' AND target_id = $1 AND operation = 'DELETE'`,
        [shitenId],
      );
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should return 404 NOT_FOUND when shiten_id does not exist', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http().delete('/api/v1/shiten/999').set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when CHUOKAI attempts to delete row of another JA (out-of-scope mask)', async () => {
      const otherJaId = await insertShiten({ jaId: 2, shitenCode: '001' });
      const cookie = await chuokaiCookie(1);
      const res = await http().delete(`/api/v1/shiten/${otherJaId}`).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when related t_dokusya rows reference the shiten', async () => {
      const shitenId = await insertShiten({ shitenCode: '001', shitenName: '本店' });
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (shiten_id, deleted_at) VALUES ($1, NULL)`,
        [shitenId],
      );

      const cookie = await chuokaiCookie(1);
      const res = await http().delete(`/api/v1/shiten/${shitenId}`).set('Cookie', cookie).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');
    });

    it('should return 409 CONFLICT when m_account references the shiten (fk_m_account_shiten ON DELETE RESTRICT, 不具合修正2026-08)', async () => {
      const shitenId = await insertShiten({ shitenCode: '001', shitenName: '本店' });
      await ctx.dataSource.query(
        `INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id, shiten_id,
                                paper_flg, denshi_flg, email, login_failure_count,
                                account_lock_flg, biko, mfa_enable_flg,
                                created_at, created_by, updated_at, updated_by)
         VALUES ('related-user', 'hash', '関連アカウント', 1, 1, $1,
                 false, false, 'r@example.com', 0,
                 false, '', false,
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        [shitenId],
      );

      const cookie = await chuokaiCookie(1);
      const res = await http().delete(`/api/v1/shiten/${shitenId}`).set('Cookie', cookie).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');

      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_shiten WHERE shiten_id = $1`,
        [shitenId],
      );
      expect(rows[0].deleted_at).toBeNull();
    });

    it('should return 409 CONFLICT when t_dokusya_rireki has related rows (append-only, no deleted_at, 不具合修正2026-08)', async () => {
      const shitenId = await insertShiten({ shitenCode: '001', shitenName: '本店' });
      // t_dokusya_rireki is a full TypeORM-synchronized entity (not stubbed
      // here) — provide every NOT NULL column so the INSERT succeeds.
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya_rireki
           (dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, dokusya_shubetsu, tetsuzuki_shurui,
            shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
            yubin_no, todofuken_code, shikuchoson, chome_banchi, renrakusaki_1,
            shiharai_hoho, dokusya_kaishi_date)
         VALUES
           (1, 1, 1, 1, $1, 1, 1,
            'テスト', '太郎', 'テスト', 'タロウ',
            '1000001', '13', '千代田区', '1-1-1', '0312345678',
            1, '2026-01-01')`,
        [shitenId],
      );

      const cookie = await chuokaiCookie(1);
      const res = await http().delete(`/api/v1/shiten/${shitenId}`).set('Cookie', cookie).expect(409);
      expect(res.body.error_code).toBe('CONFLICT');

      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_shiten WHERE shiten_id = $1`,
        [shitenId],
      );
      expect(rows[0].deleted_at).toBeNull();
    });

    it('should return 401 when no session cookie is provided', async () => {
      const shitenId = await insertShiten();
      await http().delete(`/api/v1/shiten/${shitenId}`).expect(401);
    });
  });
});
