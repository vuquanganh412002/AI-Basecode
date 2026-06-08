// Screen: ACSMS-SCR-018 — 販売店明細検索画面
//
// Integration tests covering the 2 endpoints over a real Nest + pg-mem
// stack — exercise guards, ValidationPipe, ILIKE filtering, DataScope,
// FK-conflict check, default haiten_flg=false filter, and audit log
// atomicity (t_log row written in the same transaction as the DELETE).
//
// SCR-018 NOTE — the Hanbaiten entity ships with /gen-code-backend
// (which appends it to ALL_ENTITIES in test/utils/create-integration-app.ts).
// In the meantime we declare the table inline via CREATE TABLE so
// integration tests can boot. The same trick is used for the conflict-check
// tables (t_dokusya, t_dokusya_rireki) — they only need the FK column.

import type { Server } from 'http';
import request from 'supertest';

import { HanbaitenModule } from '@/modules/hanbaiten/hanbaiten.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('Hanbaiten — integration (SCR-018 over pg-mem)', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationTestApp({
      modules: [HanbaitenModule],
      seedSql: [
        // m_ja seed (DataScope FK target).
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
        // m_hanbaiten — entity now in ALL_ENTITIES (TypeORM synchronize
        // creates the table from entity metadata before this seedSql
        // block runs). The bare-minimum inline CREATE TABLE that lived
        // here in TDD red phase is no longer needed.
        // FK-conflict-check stub tables for §4.4 — only the FK column needed.
        // Minimal FK-conflict helpers — DROP + bare recreate (full Dokusya
        // entity is synchronized first; bare columns also dodge this pg-mem
        // version's strict AST check on inline DDL constraints).
        `DROP TABLE IF EXISTS t_dokusya`,
        `CREATE TABLE t_dokusya (
           dokusya_id INT,
           hanbaiten_id BIGINT,
           deleted_at TIMESTAMPTZ
         )`,
        `DROP TABLE IF EXISTS t_dokusya_rireki`,
        `CREATE TABLE t_dokusya_rireki (
           dokusya_rireki_id INT,
           hanbaiten_id BIGINT
         )`,
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  afterEach(async () => {
    // Reset state between tests so list / DELETE expectations don't leak.
    await ctx.dataSource.query(`DELETE FROM t_dokusya`);
    await ctx.dataSource.query(`DELETE FROM t_dokusya_rireki`);
    await ctx.dataSource.query(`DELETE FROM m_hanbaiten`);
    await ctx.dataSource.query(
      `DELETE FROM t_log WHERE target_table = 'm_hanbaiten'`,
    );
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // ─── helpers ─────────────────────────────────────────────────────────
  async function nichinoStaffCookie() {
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_STAFF',
      ja_id: null,
      permissions: ['hanbaiten.view'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function chuokaiCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['hanbaiten.view', 'hanbaiten.delete'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function insertHanbaiten(opts: {
    jaId?: number;
    hanbaitenCode?: string;
    hanbaitenName?: string;
    tel?: string;
    fax?: string;
    address?: string;
    shochoName?: string;
    todofukenCode?: string;
    haitenFlg?: boolean;
  } = {}) {
    const rows = await ctx.dataSource.query(
      `INSERT INTO m_hanbaiten
         (ja_id, hanbaiten_code, hanbaiten_name, todofuken_code,
          tel, fax, address, shocho_name, haiten_flg,
          created_at, created_by, updated_at, updated_by)
       VALUES
         ($1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          NOW(), 'SYSTEM', NOW(), 'SYSTEM')
       RETURNING hanbaiten_id`,
      [
        opts.jaId ?? 1,
        opts.hanbaitenCode ?? 'H001',
        opts.hanbaitenName ?? '山田新聞販売店',
        opts.todofukenCode ?? '13',
        opts.tel ?? '0312345678',
        opts.fax ?? '0312345679',
        opts.address ?? '東京都千代田区千代田1-1',
        opts.shochoName ?? '山田太郎',
        opts.haitenFlg ?? false,
      ],
    );
    return Number(rows[0].hanbaiten_id);
  }

  // ═════════════════════════════════════════════════════════════════════
  // API-018-001 — GET /api/v1/hanbaiten
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten — list + DataScope', () => {
    it('should return all rows when NICHINO_STAFF lists with no filters', async () => {
      // COVERS: §4.3 — NICHINO_STAFF bypass (ja_id=null)
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await insertHanbaiten({ jaId: 2, hanbaitenCode: 'H002' });

      const cookie = await nichinoStaffCookie();
      const res = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should return only ja_id=1 rows when CHUOKAI of ja_id=1 lists (DataScope)', async () => {
      // COVERS: §4.3 — CHUOKAI scope by own ja_id
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002' });
      await insertHanbaiten({ jaId: 2, hanbaitenCode: 'H003' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
      expect(res.body.data.every((r: any) => r.ja_id === 1)).toBe(true);
    });

    it('should return only 営業中 rows by default (haiten_flg=false)', async () => {
      // COVERS: customer 2026-05-26 — exact-match semantic. Default
      // = haiten_flg=false (営業中のみ).
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', haitenFlg: false });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', haitenFlg: true });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].haiten_flg).toBe(false);
    });

    it('should return only 廃店 rows when haiten_flg=true is explicitly passed', async () => {
      // COVERS: customer 2026-05-26 — exact-match. checked = 廃店のみ
      // (NOT "include 廃店").
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', haitenFlg: false });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', haitenFlg: true });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ haiten_flg: 'true' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].haiten_flg).toBe(true);
    });

    it('should apply ILIKE filter when hanbaiten_name=山田 is passed', async () => {
      // COVERS: §4.3 — hanbaiten_name partial match
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', hanbaitenName: '山田新聞販売店' });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', hanbaitenName: '佐藤書店' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ hanbaiten_name: '山田' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].hanbaiten_name).toContain('山田');
    });

    it('should apply ILIKE filter when tel=03 is passed (partial match)', async () => {
      // COVERS: §4.3 — tel partial match
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', tel: '0312345678' });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', tel: '0612345678' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ tel: '03' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].tel.startsWith('03')).toBe(true);
    });

    it('should return todofuken_name joined from m_todofuken', async () => {
      // COVERS: §4.3 — LEFT JOIN m_todofuken. Seeded code='13' → '東京都'
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', todofukenCode: '13' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data[0].todofuken_name).toBe('東京都');
    });

    it('should return empty data when no row matches the filter (HTTP 200 §4.6)', async () => {
      await insertHanbaiten({ jaId: 1, hanbaitenName: '山田' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ hanbaiten_name: 'ZZZ' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is provided', async () => {
      const res = await http().get('/api/v1/hanbaiten').expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 400 VALIDATION_ERROR when sort_by is outside the allow-list', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ sort_by: 'tel' })
        .set('Cookie', cookie)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should exclude soft-deleted rows from the result', async () => {
      // COVERS: §4.3 基本条件 — deleted_at IS NULL
      const id = await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await ctx.dataSource.query(
        `UPDATE m_hanbaiten SET deleted_at = NOW() WHERE hanbaiten_id = $1`,
        [id],
      );

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-018-002 — DELETE /api/v1/hanbaiten/:hanbaiten_id
  // ═════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/hanbaiten/:hanbaiten_id', () => {
    it('should soft-delete the row + write t_log DELETE row in the same transaction when no conflicts', async () => {
      // COVERS: §4.5 UPDATE deleted_at + §4.6 audit log atomicity
      const id = await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      const cookie = await chuokaiCookie(1);

      const res = await http()
        .delete(`/api/v1/hanbaiten/${id}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.message).toBe('削除しました。');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = $1`,
        [id],
      );
      expect(row.deleted_at).not.toBeNull();

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status FROM t_log
         WHERE target_table = 'm_hanbaiten' AND target_id = $1`,
        [id],
      );
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].operation).toBe('DELETE');
      expect(logs[0].log_type).toBe(1);
      expect(logs[0].result_status).toBe(1);
    });

    it('should return 404 NOT_FOUND when hanbaiten_id does not exist', async () => {
      // COVERS: err:NOT_FOUND
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .delete('/api/v1/hanbaiten/999')
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when CHUOKAI attempts to delete row of another JA (out-of-scope mask)', async () => {
      // COVERS: §4.3 — ja_id mismatch masked as NOT_FOUND
      const otherId = await insertHanbaiten({ jaId: 2, hanbaitenCode: 'H002' });
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .delete(`/api/v1/hanbaiten/${otherId}`)
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when t_dokusya has rows referencing the hanbaiten', async () => {
      // COVERS: §4.4 関連データチェック — 購読者
      const id = await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (hanbaiten_id, deleted_at) VALUES ($1, NULL)`,
        [id],
      );

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .delete(`/api/v1/hanbaiten/${id}`)
        .set('Cookie', cookie)
        .expect(409);

      expect(res.body.error_code).toBe('CONFLICT');
      expect(res.body.message).toBe(
        'この販売店は関連オブジェクトに紐づいているため削除できません。',
      );

      // m_hanbaiten must NOT be soft-deleted on conflict
      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = $1`,
        [id],
      );
      expect(row.deleted_at).toBeNull();
    });

    it.todo(
      'should return 409 CONFLICT when t_dokusya_rireki has rows referencing the hanbaiten (re-enable when 購読者 SCR ships t_dokusya_rireki table)',
    );

    it('should NOT write a success t_log row when the conflict check fails', async () => {
      // COVERS: 409 path — no operation='DELETE' result_status=1 row produced
      const id = await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya (hanbaiten_id) VALUES ($1)`,
        [id],
      );

      const cookie = await chuokaiCookie(1);
      await http()
        .delete(`/api/v1/hanbaiten/${id}`)
        .set('Cookie', cookie)
        .expect(409);

      const successDeleteLogs = await ctx.dataSource.query(
        `SELECT 1 FROM t_log
         WHERE target_table = 'm_hanbaiten' AND target_id = $1
           AND operation = 'DELETE' AND log_type = 1 AND result_status = 1`,
        [id],
      );
      expect(successDeleteLogs).toHaveLength(0);
    });

    it('should return 401 when no session cookie is provided', async () => {
      const id = await insertHanbaiten();
      await http().delete(`/api/v1/hanbaiten/${id}`).expect(401);
    });
  });
});
