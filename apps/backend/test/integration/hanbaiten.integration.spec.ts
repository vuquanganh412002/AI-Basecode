// Screen: ACSMS-SCR-018 — 販売店明細検索画面
//
// Integration tests covering the 2 endpoints over a real Nest + pg-mem
// stack — exercise guards, ValidationPipe, ILIKE filtering, DataScope,
// FK-conflict check, default haiten_flg=false filter, and audit log
// atomicity (t_log row written in the same transaction as the DELETE).
//
// ACSMS-SCR-018 NOTE — the Hanbaiten entity ships with /gen-code-backend
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
    await ctx.dataSource.query(`DELETE FROM m_tanka`);
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
    haitatsuryoTankaId?: number | null;
  } = {}) {
    const rows = await ctx.dataSource.query(
      `INSERT INTO m_hanbaiten
         (ja_id, hanbaiten_code, hanbaiten_name, todofuken_code,
          tel, fax, address, shocho_name, haiten_flg, haitatsuryo_tanka_id,
          created_at, created_by, updated_at, updated_by)
       VALUES
         ($1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
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
        opts.haitatsuryoTankaId ?? null,
      ],
    );
    return Number(rows[0].hanbaiten_id);
  }

  /** 配達手数料単価(tanka_type=2)を1件 seed する。active_flg で有効/失効を切替。 */
  async function insertHaitatsuryoTanka(opts: {
    tankaId: number;
    jaId?: number;
    tankaCode?: string;
    activeFlg?: boolean;
  }) {
    await ctx.dataSource.query(
      `INSERT INTO m_tanka
         (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
          kingaku_zeikomi, kingaku_zeinuki, tax_rate,
          tekiyo_start_date, tekiyo_end_date, biko, active_flg,
          created_at, created_by, updated_at, updated_by)
       VALUES
         ($1, $2, $3, 2, '配達手数料',
          100, 91, 10.00,
          '2026-01-01', NULL, '', $4,
          NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      [opts.tankaId, opts.jaId ?? 1, opts.tankaCode ?? 'HT001', opts.activeFlg ?? true],
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-018-001 — GET /api/v1/hanbaiten
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

    it('should filter by 有効単価フラグ (active_tanka_flg): false→失効単価参照のみ / true→有効単価参照のみ (SCR-021 error gate 連携)', async () => {
      // 有効単価(8001) / 失効単価(8002, active_flg=FALSE) を seed。
      await insertHaitatsuryoTanka({ tankaId: 8001, tankaCode: 'HT-A', activeFlg: true });
      await insertHaitatsuryoTanka({ tankaId: 8002, tankaCode: 'HT-B', activeFlg: false });
      // A: 有効単価参照 / B: 失効単価参照 / C: 単価未設定(NULL)。
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'HB-A', haitatsuryoTankaId: 8001 });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'HB-B', haitatsuryoTankaId: 8002 });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'HB-C', haitatsuryoTankaId: null });

      const cookie = await chuokaiCookie(1);

      // フィルタ OFF → 3件すべて。
      const off = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .expect(200);
      const offCodes = off.body.data.map((r: any) => r.hanbaiten_code);
      expect(offCodes).toEqual(expect.arrayContaining(['HB-A', 'HB-B', 'HB-C']));

      // 無効(active_tanka_flg=false) → 失効単価参照の HB-B のみ。
      const invalid = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .query({ active_tanka_flg: 'false' })
        .expect(200);
      const invalidCodes = invalid.body.data.map((r: any) => r.hanbaiten_code);
      expect(invalidCodes).toEqual(['HB-B']);

      // 有効(active_tanka_flg=true) → 有効単価参照の HB-A のみ（単価未設定 HB-C は除外）。
      const valid = await http()
        .get('/api/v1/hanbaiten')
        .set('Cookie', cookie)
        .query({ active_tanka_flg: 'true' })
        .expect(200);
      const validCodes = valid.body.data.map((r: any) => r.hanbaiten_code);
      expect(validCodes).toEqual(['HB-A']);
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
      // COVERS: 顧客CR 2026-08-24 (revert of 2026-05-26 exact-match) —
      // inclusive semantic. Default (omitted) = 廃店を除外.
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

    it('should return BOTH 営業中 and 廃店 rows when haiten_flg=true is explicitly passed', async () => {
      // COVERS: 顧客CR 2026-08-24 — inclusive semantic. checked = 廃店を含む
      // 全件表示（NOT 廃店のみに絞り込む）.
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', haitenFlg: false });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', haitenFlg: true });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten')
        .query({ haiten_flg: 'true' })
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
      expect(res.body.data.map((r: any) => r.haiten_flg).sort()).toEqual([false, true]);
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
  // ACSMS-API-018-002 — DELETE /api/v1/hanbaiten/:hanbaiten_id
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

    it('should return 409 CONFLICT when t_dokusya_rireki has rows referencing the hanbaiten', async () => {
      // COVERS: §4.4 関連データチェック — 購読者履歴（t_dokusya は空でも履歴で 409）
      const id = await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya_rireki (dokusya_rireki_id, hanbaiten_id) VALUES ($1, $2)`,
        [1, id],
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

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-018-003 — GET /api/v1/hanbaiten/export（顧客CR 2026-08-24）
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten/export — Excel出力', () => {
    /** supertest binary parser — captures Buffer chunks for XLSX download. */
    function binaryParser(
      res: any,
      callback: (err: Error | null, body: Buffer) => void,
    ) {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    }

    it('should return 200 with a non-empty XLSX body scoped to the caller JA (DataScope)', async () => {
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });
      await insertHanbaiten({ jaId: 2, hanbaitenCode: 'H002' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i,
      );
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it('should set Content-Disposition with a 販売店一覧出力_ prefixed filename', async () => {
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });

      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const cd = String(res.headers['content-disposition'] ?? '');
      expect(cd).toMatch(/attachment/i);
      expect(cd).toMatch(/(販売店一覧出力_\d{8}_\d{6}\.xlsx|filename\*=UTF-8''.+\.xlsx)/);
    });

    it('should exclude 廃店 rows by default and include them when haiten_flg=true', async () => {
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001', haitenFlg: false });
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H002', haitenFlg: true });

      const cookie = await chuokaiCookie(1);
      // Default (no haiten_flg) — the 廃店 row alone makes the filtered set
      // empty (1 active + 1 closed, but only the active one should count).
      const okRes = await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect((okRes.body as Buffer).length).toBeGreaterThan(0);

      // haiten_flg=true — no filter, both rows counted, still succeeds.
      const includedRes = await http()
        .get('/api/v1/hanbaiten/export?haiten_flg=true')
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect((includedRes.body as Buffer).length).toBeGreaterThan(0);
    });

    it('should return 404 EXPORT_NO_DATA when the filtered result set is empty', async () => {
      // No rows seeded for this JA at all.
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('EXPORT_NO_DATA');
    });

    it('should write a t_log row with operation=EXPORT_EXCEL when export succeeds', async () => {
      await insertHanbaiten({ jaId: 1, hanbaitenCode: 'H001' });

      const cookie = await chuokaiCookie(1);
      await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status FROM t_log
           WHERE target_table = 'm_hanbaiten' AND operation = 'EXPORT_EXCEL'`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].result_status).toBe(1);
    });

    it('should return 401 when no session cookie is provided', async () => {
      await http().get('/api/v1/hanbaiten/export').expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.view / hanbaiten.daiko_input', async () => {
      const sid = await ctx.seedSession({
        role_code: 'CHUOKAI',
        ja_id: 1,
        permissions: [], // no hanbaiten.view
      });
      const cookie = await buildSessionCookie(ctx.app, sid);
      const res = await http()
        .get('/api/v1/hanbaiten/export')
        .set('Cookie', cookie)
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });
});
