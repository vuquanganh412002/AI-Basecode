// Screen: ACSMS-SCR-007 — 支店マスタ登録画面
//
// Integration tests covering the 3 form endpoints over a real Nest +
// pg-mem stack — exercise guards, ValidationPipe, FK constraints, and
// audit log INSERT inside one transaction.
//
// NOTE: /gen-code-backend acsms-scr-007 must add `Shiten` to ALL_ENTITIES
// in apps/backend/test/utils/create-integration-app.ts before this
// spec can boot (pg-mem needs the entity list at DataSource creation).

import type { Server } from 'http';
import request from 'supertest';

import { ShitenModule } from '@/modules/shiten/shiten.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';

describe('Shiten — integration (SCR-007 over pg-mem)', () => {
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
         VALUES ('JA001', 'JA東京', 'ジェイエートウキョウ', '13', false,
                 '1000001', '東京都千代田区千代田1-1-1', '0312345678', '0312345679',
                 'a@a.jp', '', '', 1, '',
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
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  afterEach(async () => {
    // Reset m_shiten between tests so DUPLICATE_CODE cases don't carry over.
    await ctx.dataSource.query(`DELETE FROM m_shiten`);
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // ─── helper: build a CHUOKAI session cookie scoped to ja_id=1 ────────
  async function chuokaiCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['shiten.view', 'shiten.create', 'shiten.update'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  describe('POST /api/v1/shiten — create + persisted row', () => {
    it('should INSERT a new row + audit log when CHUOKAI sends valid body', async () => {
      const cookie = await chuokaiCookie();
      const body = {
        shiten_code: '001',
        shiten_name: '本店営業部',
        shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
        kanri_shiten_id: 1,
        kinyu_shiten_flg: false,
        biko: '本店ビル1F',
      };

      const res = await http()
        .post('/api/v1/shiten')
        .set('Cookie', cookie)
        .send(body)
        .expect(201);

      expect(res.body.data).toMatchObject({
        shiten_code: '001',
        shiten_name: '本店営業部',
        biko: '本店ビル1F',
      });

      // Verify row persisted in m_shiten.
      const rows = await ctx.dataSource.query(
        `SELECT shiten_id, shiten_code, shiten_name, biko FROM m_shiten WHERE shiten_code = '001'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].biko).toBe('本店ビル1F');

      // Verify audit log row written.
      const logs = await ctx.dataSource.query(
        `SELECT operation, target_table FROM t_log WHERE target_table = 'm_shiten' AND operation = 'CREATE'`,
      );
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should reject DUPLICATE shiten_code in same JA with 400 DUPLICATE_CODE', async () => {
      const cookie = await chuokaiCookie();
      const body = {
        shiten_code: '002',
        shiten_name: 'A支店',
        kanri_shiten_id: 1,
      };
      await http().post('/api/v1/shiten').set('Cookie', cookie).send(body).expect(201);

      const dup = await http().post('/api/v1/shiten').set('Cookie', cookie).send(body).expect(400);
      expect(dup.body.error_code).toBe('DUPLICATE_CODE');
      expect(dup.body.message).toContain('002');
    });

    it('should reject missing shiten_code with 400 VALIDATION_ERROR', async () => {
      const cookie = await chuokaiCookie();
      const res = await http()
        .post('/api/v1/shiten')
        .set('Cookie', cookie)
        .send({ shiten_name: '名前', kanri_shiten_id: 1 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should reject when kanri_shiten_id does not exist', async () => {
      const cookie = await chuokaiCookie();
      const res = await http()
        .post('/api/v1/shiten')
        .set('Cookie', cookie)
        .send({
          shiten_code: '003',
          shiten_name: 'B支店',
          kanri_shiten_id: 999,
        })
        .expect(400);
      expect(res.body.error_code).toBeDefined();
    });
  });

  describe('GET /api/v1/shiten/:id — DataScope', () => {
    it('should return 404 when CHUOKAI requests a row from another JA', async () => {
      // Insert a row under ja_id=2 — out-of-scope for our ja_id=1 session.
      await ctx.dataSource.query(`
        INSERT INTO m_ja (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
                          yubin_no, address, tel, fax, email,
                          tanto_busho, tanto_name, zei_kubun, biko,
                          created_at, created_by, updated_at, updated_by)
        VALUES ('JA002', 'JA大阪', 'ジェイエーオオサカ', '27', false,
                '5300001', '大阪府大阪市1-1', '0612345678', '0612345679',
                'b@b.jp', '', '', 1, '',
                NOW(), 'SYSTEM', NOW(), 'SYSTEM')
      `);
      const otherJaResult = await ctx.dataSource.query(`
        INSERT INTO m_shiten (ja_id, shiten_code, shiten_name, shiten_name_kana,
                              kinyu_shiten_flg, kanri_shiten_id, biko,
                              created_at, created_by, updated_at, updated_by)
        VALUES (2, '999', '別JA支店', 'ﾍﾞﾂｼﾞｪｲｴｰｼﾃﾝ',
                false, 1, '',
                NOW(), 'SYSTEM', NOW(), 'SYSTEM')
        RETURNING shiten_id
      `);
      const otherShitenId = Number(otherJaResult[0].shiten_id);

      const cookie = await chuokaiCookie();
      const res = await http().get(`/api/v1/shiten/${otherShitenId}`).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/shiten/:id — update + audit log', () => {
    it('should update fields and append an UPDATE audit log row', async () => {
      const cookie = await chuokaiCookie();
      const created = await http()
        .post('/api/v1/shiten')
        .set('Cookie', cookie)
        .send({
          shiten_code: '004',
          shiten_name: '元の名前',
          kanri_shiten_id: 1,
          biko: '元の備考',
        })
        .expect(201);
      const newId = created.body.data.shiten_id;

      const res = await http()
        .put(`/api/v1/shiten/${newId}`)
        .set('Cookie', cookie)
        .send({
          shiten_name: '新しい名前',
          kanri_shiten_id: 1,
          biko: '新しい備考',
        })
        .expect(200);

      expect(res.body.data).toMatchObject({
        shiten_id: newId,
        shiten_name: '新しい名前',
        biko: '新しい備考',
      });

      const logs = await ctx.dataSource.query(
        `SELECT operation FROM t_log
         WHERE target_table = 'm_shiten' AND target_id = $1 AND operation = 'UPDATE'`,
        [newId],
      );
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
