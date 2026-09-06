// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//          ACSMS-SCR-004 — JAマスタ明細検索画面 (extends with list + delete)
//
// End-to-end integration test for the JA module via the shared
// createIntegrationTestApp() helper:
//   - pg-mem in-memory Postgres (real SQL, no Docker)
//   - ioredis-mock (real session lifecycle)
//   - full Nest pipeline: SessionAuthGuard → PermissionsGuard → ValidationPipe
//     → JaController → JaService → DB transaction → t_log
//
// The helper resolves the four obstacles documented in
// `apps/backend/test/utils/create-integration-app.ts`. Specs only need to
// boot, seed any extra data, and assert.
//
// ACSMS-SCR-004 NOTE — DELETE's §4.4 conflict check queries six tables, only
// some of which are registered TypeORM entities yet (m_kanri_shiten,
// m_shiten, m_hanbaiten, m_tanka, t_dokusya land in later screens).
// We create those tables with their bare-minimum columns in `seedSql`
// so the service's COUNT(*) queries succeed against an empty result.

import request from 'supertest';
import type { Server } from 'http';

import { JaModule } from '@/modules/ja/ja.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('JA module — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [JaModule],
      seedSql: [
        // Pre-existing JA row for GET / UPDATE tests. ja_id is auto-allocated
        // by the SERIAL sequence (first insert → ja_id=1). pg-mem doesn't
        // implement pg_get_serial_sequence so we can't setval explicitly.
        `INSERT INTO m_ja
          (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
           yubin_no, address, tel, fax, email,
           tanto_busho, tanto_name, zei_kubun, biko, created_at, created_by, updated_at, updated_by)
         VALUES
          ('1301001001', 'JA東京中央', 'ジェイエイトウキョウチュウオウ', '13', true,
           '1000001', '東京都千代田区丸の内1-1-1',
           '0312345678', '0312345679', 'info@ja-tokyo-chuo.or.jp',
           '総務部', '田中太郎', 1, '', NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,

        // ACSMS-SCR-004 conflict-check stub tables. Bare-minimum schema with the
        // single FK-bearing column the service's COUNT(*) needs.
        // m_kanri_shiten / m_shiten / m_tanka / m_hanbaiten are now provided
        // by TypeORM synchronize (entities in ALL_ENTITIES). Only t_dokusya
        // still needs a stub until its SCR ships.
        // Minimal FK-conflict helper — DROP + bare recreate (full Dokusya
        // entity is synchronized first; bare columns also dodge this pg-mem
        // version's strict AST check on inline DDL constraints).
        `DROP TABLE IF EXISTS t_dokusya`,
        `CREATE TABLE t_dokusya (
           dokusya_id INT,
           ja_id BIGINT,
           deleted_at TIMESTAMPTZ
         )`,
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
      permissions: ['ja.view', 'ja.create', 'ja.update', 'ja.delete'],
    });
  }

  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      account_id: 2,
      login_id: 'chuokai01',
      role_id: 3,
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['ja.view', 'ja.update'],
    });
  }

  function asJaHonten(jaId = 1) {
    return ctx.seedSession({
      account_id: 3,
      login_id: 'hn01',
      role_id: 4,
      role_code: 'JA_HONTEN',
      ja_id: jaId,
      permissions: ['ja.view', 'ja.update'],
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-005-001 — GET /api/v1/ja/:ja_id
  // ───────────────────────────────────────────────────────────────────
  it('should return 200 with JA including todofuken_name when NICHINO_ADMIN GETs ja_id=1', async () => {
    const sid = await asAdmin();
    const res = await http()
      .get('/api/v1/ja/1')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(200);

    expect(res.body.data).toMatchObject({
      ja_id: 1,
      ja_code: '1301001001',
      todofuken_name: '東京都',
      zei_kubun: 1,
    });
  });

  it('should return 401 when session cookie is absent', async () => {
    await http().get('/api/v1/ja/1').expect(401);
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-005-002 — POST /api/v1/ja
  // ───────────────────────────────────────────────────────────────────
  it('should create a JA and write t_log row in the same transaction when NICHINO_ADMIN POSTs valid body', async () => {
    const sid = await asAdmin();
    const body = {
      ja_code: '1301003001',
      ja_name: 'JA東京みどり',
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘ',
      todofuken_code: '13',
      chuokai_flg: false,
      yubin_no: '1600022',
      address: '東京都新宿区新宿3-1-1',
      tel: '0323456789',
      fax: '0323456780',
      email: 'info@ja-tokyo-midori.or.jp',
      tanto_busho: '企画課',
      tanto_name: '鈴木花子',
      zei_kubun: 1,
      biko: '',
    };

    const res = await http()
      .post('/api/v1/ja')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(body)
      .expect(201);

    expect(res.body.data.ja_code).toBe('1301003001');

    const rows = await ctx.dataSource.query(
      `SELECT ja_id FROM m_ja WHERE ja_code = '1301003001'`,
    );
    expect(rows).toHaveLength(1);

    const logs = await ctx.dataSource.query(
      `SELECT log_type, operation, result_status, target_table, target_id
       FROM t_log
       WHERE target_table = 'm_ja' AND target_id = $1`,
      [rows[0].ja_id],
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].operation).toBe('CREATE');
    expect(logs[0].log_type).toBe(1);
    expect(logs[0].result_status).toBe(1);
  });

  it('should return 400 DUPLICATE_CODE when ja_code already exists', async () => {
    const sid = await asAdmin();
    const body = {
      ja_code: '1301001001', // collides with pre-seeded row
      ja_name: 'dup',
      todofuken_code: '13',
      chuokai_flg: false,
      zei_kubun: 1,
      biko: '',
    };

    const res = await http()
      .post('/api/v1/ja')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(body)
      .expect(400);

    expect(res.body.error_code).toBe('DUPLICATE_CODE');
  });

  it('should return 400 when todofuken_code not in m_todofuken', async () => {
    const sid = await asAdmin();
    const body = {
      ja_code: '9999999999',
      ja_name: 'badpref',
      todofuken_code: '99',
      chuokai_flg: false,
      zei_kubun: 1,
      biko: '',
    };

    await http()
      .post('/api/v1/ja')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(body)
      .expect(400);
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-005-003 — PUT /api/v1/ja/:ja_id
  // ───────────────────────────────────────────────────────────────────
  it('should update m_ja and write t_log UPDATE row in same tx when NICHINO_ADMIN PUTs full body', async () => {
    const sid = await asAdmin();
    const body = {
      ja_name: 'JA東京中央(改定)',
      todofuken_code: '13',
      chuokai_flg: true,
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info-new@ja-tokyo-chuo.or.jp',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 2,
      biko: '住所変更済み',
    };

    const res = await http()
      .put('/api/v1/ja/1')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(body)
      .expect(200);

    expect(res.body.data.ja_name).toBe('JA東京中央(改定)');
    expect(res.body.data.zei_kubun).toBe(2);

    const logs = await ctx.dataSource.query(
      `SELECT operation, log_type, result_status FROM t_log
       WHERE target_id = 1 AND target_table = 'm_ja'`,
    );
    expect(
      logs.some((l: any) => l.operation === 'UPDATE' && l.log_type === 1),
    ).toBe(true);
  });

  it('should silently ignore non-allow-list fields when CHUOKAI updates (※4 field-level restriction)', async () => {
    const sid = await asChuokai(1);
    const body = {
      ja_name: 'ATTEMPT_TO_CHANGE', // not in CHUOKAI allow-list
      todofuken_code: '99', // not in CHUOKAI allow-list
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info@ex.com',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 1,
      biko: 'メモ',
    };

    await http()
      .put('/api/v1/ja/1')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(body)
      .expect(200);

    const [row] = await ctx.dataSource.query(
      `SELECT ja_name, todofuken_code, address FROM m_ja WHERE ja_id = 1`,
    );
    expect(row.ja_name).not.toBe('ATTEMPT_TO_CHANGE');
    expect(row.todofuken_code).not.toBe('99');
    expect(row.address).toBe('東京都千代田区丸の内2-2-2');
  });

  it('should return 404 when CHUOKAI tries to update JA outside own scope (ja_id mismatch)', async () => {
    await ctx.dataSource.query(`
      INSERT INTO m_ja (ja_id, ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
                        yubin_no, address, tel, fax, email,
                        tanto_busho, tanto_name, zei_kubun, biko,
                        created_at, created_by, updated_at, updated_by)
      VALUES (2, '2702001001', 'JA大阪', 'ジェイエイオオサカ', '27', false,
              '5000001', '大阪府大阪市',
              '0612345678', '', '', '', '', 1, '',
              NOW(), 'SYSTEM', NOW(), 'SYSTEM')
    `);
    const sid = await asChuokai(1); // owns ja_id=1, tries to update ja_id=2

    await http()
      .put('/api/v1/ja/2')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send({
        // Minimal valid CHUOKAI partial body — empty strings would trip
        // @Matches(/^\d+$/) on tel/fax and @IsEmail on email, masking the
        // 404 we want to assert.
        yubin_no: '1000001',
        address: '東京都千代田区丸の内2-2-2',
        zei_kubun: 1,
      })
      .expect(404);
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-004-001 — GET /api/v1/ja
  // ───────────────────────────────────────────────────────────────────
  describe('API-004-001 — GET /api/v1/ja (list / search)', () => {
    beforeEach(async () => {
      // Seed a 2nd JA in 大阪 so we can prove DataScope filters CHUOKAI's
      // result down to its own ja_id only.
      await ctx.dataSource.query(`
        INSERT INTO m_ja (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
                          yubin_no, address, tel, fax, email,
                          tanto_busho, tanto_name, zei_kubun, biko,
                          created_at, created_by, updated_at, updated_by)
        VALUES ('2702001001', 'JA大阪なにわ', 'ジェイエイオオサカナニワ', '27', false,
                '5300001', '大阪府大阪市北区',
                '0612345678', '0612345679', 'info@osaka.or.jp',
                '総務部', '山田次郎', 1, '',
                NOW(), 'SYSTEM', NOW(), 'SYSTEM')
      `);
    });

    it('should return 200 with both JA rows when NICHINO_ADMIN lists without filters', async () => {
      // COVERS: 4.3 NICHINO_ADMIN sees all rows (no ja_id scope)
      const sid = await asAdmin();
      const res = await http()
        .get('/api/v1/ja')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
      // Each row must include todofuken_name from LEFT JOIN m_todofuken
      const tokyoRow = res.body.data.find((r: any) => r.ja_code === '1301001001');
      expect(tokyoRow).toBeDefined();
      expect(tokyoRow.todofuken_name).toBe('東京都');
    });

    it('should filter by ja_name partial match (ILIKE)', async () => {
      // COVERS: 4.3 検索条件 — ja_name ILIKE '%東京%'
      const sid = await asAdmin();
      const res = await http()
        .get('/api/v1/ja?ja_name=東京')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.every((r: any) => r.ja_name.includes('東京'))).toBe(true);
    });

    it('should filter by ja_code partial match (ILIKE)', async () => {
      // COVERS: 4.3 検索条件 — ja_code ILIKE '%1301%'
      const sid = await asAdmin();
      const res = await http()
        .get('/api/v1/ja?ja_code=1301')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.every((r: any) => r.ja_code.startsWith('1301'))).toBe(true);
    });

    it('should restrict CHUOKAI list to own ja_id only (DataScope)', async () => {
      // COVERS: 4.3 DataScope — CHUOKAI ja_id=1 sees only ja_id=1, not 大阪 row
      const sid = await asChuokai(1);
      const res = await http()
        .get('/api/v1/ja')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.every((r: any) => r.ja_id === 1)).toBe(true);
    });

    it('should restrict JA_HONTEN list to own ja_id only (DataScope)', async () => {
      // COVERS: 4.3 DataScope — JA_HONTEN behaves like CHUOKAI here
      const sid = await asJaHonten(1);
      const res = await http()
        .get('/api/v1/ja')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.every((r: any) => r.ja_id === 1)).toBe(true);
    });

    it('should paginate via page + per_page', async () => {
      // COVERS: 4.5 ページング — per_page=1 splits into 2 pages
      const sid = await asAdmin();
      const res = await http()
        .get('/api/v1/ja?page=1&per_page=1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.per_page).toBe(1);
      expect(res.body.meta.total_pages).toBeGreaterThanOrEqual(2);
    });

    it('should exclude soft-deleted rows', async () => {
      // COVERS: 4.3 基本条件 — deleted_at IS NULL
      await ctx.dataSource.query(`UPDATE m_ja SET deleted_at = NOW() WHERE ja_code = '2702001001'`);
      const sid = await asAdmin();

      const res = await http()
        .get('/api/v1/ja')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data.find((r: any) => r.ja_code === '2702001001')).toBeUndefined();
    });

    it('should return 401 when session cookie is absent', async () => {
      await http().get('/api/v1/ja').expect(401);
    });

    it('should return 400 VALIDATION_ERROR when per_page exceeds 100', async () => {
      const sid = await asAdmin();
      const res = await http()
        .get('/api/v1/ja?per_page=500')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should NOT write t_log for read-only list operation', async () => {
      // COVERS: GET endpoints do not produce audit log rows
      const sid = await asAdmin();
      const before = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS c FROM t_log WHERE target_table = 'm_ja'`,
      );
      await http()
        .get('/api/v1/ja')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const after = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS c FROM t_log WHERE target_table = 'm_ja'`,
      );
      expect(after[0].c).toBe(before[0].c);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-004-002 — DELETE /api/v1/ja/:ja_id
  // ───────────────────────────────────────────────────────────────────
  describe('API-004-002 — DELETE /api/v1/ja/:ja_id', () => {
    it('should soft-delete and write t_log DELETE row in same tx when NICHINO_ADMIN deletes a JA with no related rows', async () => {
      // COVERS: 4.5 UPDATE deleted_at, 4.6 t_log INSERT (operation='DELETE', log_type=1, result_status=1)
      // No rows pre-seeded in m_kanri_shiten / m_shiten / m_hanbaiten / m_tanka /
      // t_dokusya / m_account → conflict check passes.
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.message).toBe('削除しました。');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM m_ja WHERE ja_id = 1`,
      );
      expect(row.deleted_at).not.toBeNull();

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status FROM t_log
         WHERE target_table = 'm_ja' AND target_id = 1 AND operation = 'DELETE'`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].log_type).toBe(1);
      expect(logs[0].result_status).toBe(1);
    });

    it('should return 401 when session cookie is absent', async () => {
      await http().delete('/api/v1/ja/1').expect(401);
    });

    it('should return 403 FORBIDDEN when CHUOKAI lacks ja.delete permission', async () => {
      // COVERS: err:FORBIDDEN — only NICHINO_ADMIN can delete
      const sid = await asChuokai(1);

      await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
    });

    it('should return 403 FORBIDDEN when JA_HONTEN lacks ja.delete permission', async () => {
      // COVERS: err:FORBIDDEN — JA_HONTEN does not hold ja.delete per seeder.md §3
      const sid = await asJaHonten(1);

      await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
    });

    it('should return 404 NOT_FOUND when target ja_id does not exist', async () => {
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/9999')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);

      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when target ja_id is already soft-deleted', async () => {
      // COVERS: 4.3 — already-deleted row treated as missing
      await ctx.dataSource.query(`UPDATE m_ja SET deleted_at = NOW() WHERE ja_id = 1`);
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);

      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 409 CONFLICT when m_kanri_shiten has related rows', async () => {
      // COVERS: 4.4 関連データチェック — 管理支店
      await ctx.dataSource.query(`
        INSERT INTO m_kanri_shiten
          (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
           yubin_no, todofuken_code, address, tel, fax, paper_flg, denshi_flg, biko,
           created_at, created_by, updated_at, updated_by)
        VALUES
          (1, '113-3300-001', '関連管理支店', 'カンレンカンリシテン',
           '1000001', '13', '千代田区千代田1-1-1', '0312345678', '0312345679', true, true, '',
           NOW(), 'SYSTEM', NOW(), 'SYSTEM')
      `);
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);

      expect(res.body.error_code).toBe('CONFLICT');

      // m_ja must NOT be soft-deleted on conflict
      const [row] = await ctx.dataSource.query(`SELECT deleted_at FROM m_ja WHERE ja_id = 1`);
      expect(row.deleted_at).toBeNull();
    });

    it('should return 409 CONFLICT when t_dokusya has related rows', async () => {
      // COVERS: 4.4 関連データチェック — 購読者
      await ctx.dataSource.query(`INSERT INTO t_dokusya (ja_id) VALUES (1)`);
      const sid = await asAdmin();

      await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
    });

    it('should return 409 CONFLICT when m_account has related rows', async () => {
      // COVERS: 4.4 関連データチェック — アカウント (this is the only related
      // table that exists as a real entity)
      await ctx.dataSource.query(`
        INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id,
                               paper_flg, denshi_flg, email, login_failure_count,
                               account_lock_flg, biko, mfa_enable_flg,
                               created_at, created_by, updated_at, updated_by)
        VALUES ('related-user', 'hash', '関連アカウント', 1, 1,
                false, false, 'r@example.com', 0,
                false, '', false,
                NOW(), 'SYSTEM', NOW(), 'SYSTEM')
      `);
      const sid = await asAdmin();

      await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
    });

    it('should return 409 CONFLICT when t_oshirase has related rows', async () => {
      // COVERS: 4.4 関連データチェック — お知らせ（不具合修正2026-08）
      await ctx.dataSource.query(`
        INSERT INTO t_oshirase
          (ja_id, oshirase_type, publish_location, status, title, content,
           publish_start_date, created_by, updated_by)
        VALUES
          (1, 1, 1, 2, '関連お知らせ', '本文', NOW(), 'SYSTEM', 'SYSTEM')
      `);
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);

      expect(res.body.error_code).toBe('CONFLICT');

      const [row] = await ctx.dataSource.query(`SELECT deleted_at FROM m_ja WHERE ja_id = 1`);
      expect(row.deleted_at).toBeNull();
    });

    it('should return 409 CONFLICT when t_dokusya_rireki has related rows (append-only, no deleted_at)', async () => {
      // COVERS: 4.4 関連データチェック — 購読者履歴（不具合修正2026-08。
      // t_dokusya が空でも履歴テーブルに残っていれば 409 にする）
      // t_dokusya と異なり t_dokusya_rireki はここでは stub 化されておらず
      // TypeORM synchronize による本物のスキーマ（NOT NULL 列あり）なので、
      // 最低限の必須列を埋める。
      await ctx.dataSource.query(`
        INSERT INTO t_dokusya_rireki
          (dokusya_id, rireki_no, ja_id, kanri_shiten_id, dokusya_shubetsu, tetsuzuki_shurui,
           shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
           yubin_no, todofuken_code, shikuchoson, chome_banchi, renrakusaki_1,
           shiharai_hoho, dokusya_kaishi_date)
        VALUES
          (1, 1, 1, 1, 1, 1,
           'テスト', '太郎', 'テスト', 'タロウ',
           '1000001', '13', '千代田区', '1-1-1', '0312345678',
           1, '2026-01-01')
      `);
      const sid = await asAdmin();

      const res = await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);

      expect(res.body.error_code).toBe('CONFLICT');

      const [row] = await ctx.dataSource.query(`SELECT deleted_at FROM m_ja WHERE ja_id = 1`);
      expect(row.deleted_at).toBeNull();
    });

    it('should NOT write a success t_log row when conflict check fails', async () => {
      // COVERS: 409 path — no operation='DELETE' result_status=1 row produced
      await ctx.dataSource.query(`
        INSERT INTO m_kanri_shiten
          (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
           yubin_no, todofuken_code, address, tel, fax, paper_flg, denshi_flg, biko,
           created_at, created_by, updated_at, updated_by)
        VALUES
          (1, '113-3300-001', '関連管理支店', 'カンレンカンリシテン',
           '1000001', '13', '千代田区千代田1-1-1', '0312345678', '0312345679', true, true, '',
           NOW(), 'SYSTEM', NOW(), 'SYSTEM')
      `);
      const sid = await asAdmin();

      await http()
        .delete('/api/v1/ja/1')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);

      const successDeleteLogs = await ctx.dataSource.query(
        `SELECT 1 FROM t_log
         WHERE target_table = 'm_ja' AND target_id = 1
           AND operation = 'DELETE' AND log_type = 1 AND result_status = 1`,
      );
      expect(successDeleteLogs).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API-COMMON-003 — GET /api/v1/ja/dropdown (perm-any-of)
  // ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/ja/dropdown — authenticated-only (shared dropdown)', () => {
    it('should return 200 for a JA_KANRI_SHITEN holding only file.upload (no ja.view) — ファイルアップロード画面', async () => {
      // Regression — the ファイルアップロード画面 (ACSMS-SCR-023) は JA roles にも
      // 開放されており (account_concept ※5)、その 都道府県→JA picker が
      // /ja/dropdown を叩く。JA_KANRI_SHITEN は file.upload を持つが ja.view
      // は持たない。共有ドロップダウンは authenticated-only なので 200。
      const sid = await ctx.seedSession({
        account_id: 5,
        login_id: 'kanri01',
        role_id: 5,
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['file.upload', 'file.download'],
      });

      await http()
        .get('/api/v1/ja/dropdown')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
    });

    it('should return 200 for any authenticated user regardless of CRUD permissions (data scoped server-side)', async () => {
      const sid = await ctx.seedSession({
        account_id: 6,
        login_id: 'minimal01',
        role_id: 5,
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['log.view'],
      });

      await http()
        .get('/api/v1/ja/dropdown')
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
    });

    it('should return 401 when the session cookie is missing', async () => {
      await http().get('/api/v1/ja/dropdown').expect(401);
    });
  });
});
