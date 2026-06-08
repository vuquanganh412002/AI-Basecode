// Screen: ACSMS-SCR-009 — 管理支店マスタ登録画面
//
// End-to-end integration tests for the 3 form endpoints. Uses the same
// pg-mem stack as kanri-shiten.integration.spec but exercises the
// find / create / update paths (delete + list live in the SCR-008 spec).

import request from 'supertest';
import type { Server } from 'http';

import { KanriShitenModule } from '@/modules/kanri-shiten/kanri-shiten.module';
import { TodofukenModule } from '@/modules/todofuken/todofuken.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('KanriShiten form module — integration (pg-mem + ioredis-mock)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [KanriShitenModule, TodofukenModule],
      seedSql: [
        // Two JAs for cross-scope assertions.
        `INSERT INTO m_ja
          (ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
           yubin_no, address, tel, fax, email,
           tanto_busho, tanto_name, zei_kubun, biko, created_at, created_by, updated_at, updated_by)
         VALUES
          ('1301001001', 'JA東京中央', 'ジェイエイトウキョウチュウオウ', '13', false,
           '1000001', '東京', '03', '03', 'a@a.jp', '', '', 1, '', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
          ('0101001002', 'JA北海道中央', 'ジェイエイホッカイドウチュウオウ', '01', false,
           '0600001', '札幌', '011', '011', 'b@b.jp', '', '', 1, '', NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,

        // Seed m_todofuken so the 都道府県 existence check passes.
        // todofuken_name_kana is NOT NULL in the entity — must seed both.
        `INSERT INTO m_todofuken (todofuken_code, todofuken_name, todofuken_name_kana) VALUES
           ('13', '東京都', 'トウキョウト'), ('01', '北海道', 'ホッカイドウ')
         ON CONFLICT DO NOTHING`,

        // Pre-existing kanri_shiten rows for findById + update tests.
        `INSERT INTO m_kanri_shiten
           (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
            yubin_no, todofuken_code, address, tel, fax, paper_flg, denshi_flg, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, '113-3300-001', '東京中央支店', 'ﾄｳｷｮｳﾁｭｳｵｳｼﾃﾝ',
            '1000001', '13', '千代田区千代田1-1-1', '0312345678', '0312345679', true, true, '中央会管轄',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (2, '013-3300-001', 'JA北海道中央管理支店', 'ｼﾞｪｲｴｲﾎｯｶｲﾄﾞｳﾁｭｳｵｳｶﾝﾘｼﾃﾝ',
            '0600001', '01', '札幌市中央区', '0112223333', '0112223334', true, false, '',
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
      permissions: ['kanri_shiten.view', 'kanri_shiten.create', 'kanri_shiten.update'],
    });
  }

  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: jaId,
      permissions: ['kanri_shiten.view', 'kanri_shiten.update'],
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // GET /api/v1/kanri-shiten/:id (API-009-001)
  // ═════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/kanri-shiten/:id', () => {
    it('should return detail with todofuken_name JOIN when NICHINO_ADMIN GETs id=1', async () => {
      const sid = await asAdmin();
      const res = await http()
        .get(apiUrl('kanri-shiten/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data).toMatchObject({
        kanri_shiten_id: 1,
        ja_id: 1,
        kanri_shiten_code: '113-3300-001',
        todofuken_code: '13',
        todofuken_name: '東京都',
      });
    });

    it('should return 404 NOT_FOUND when row does not exist', async () => {
      const sid = await asAdmin();
      await http()
        .get(apiUrl('kanri-shiten/9999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });

    it('should return 404 (DataScope mask) when CHUOKAI requests row of another JA', async () => {
      const sid = await asChuokai(1);
      // kanri_shiten_id=2 belongs to ja_id=2 → out of scope for CHUOKAI(ja_id=1).
      await http()
        .get(apiUrl('kanri-shiten/2'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // POST /api/v1/kanri-shiten (API-009-002)
  // ═════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/kanri-shiten', () => {
    const validBody = {
      ja_id: 1,
      kanri_shiten_code: '113-3300-099',
      kanri_shiten_name: '新規管理支店',
      kanri_shiten_name_kana: 'ｼﾝｷｶﾝﾘｼﾃﾝ',
      todofuken_code: '13',
      yubin_no: '1000099',
      address: '新規住所',
      tel: '0312345699',
      fax: '0312345698',
      paper_flg: true,
      denshi_flg: true,
      biko: '統合テスト',
    };

    it('should insert row + write t_log when valid body sent', async () => {
      const sid = await asAdmin();
      await http()
        .post(apiUrl('kanri-shiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(validBody)
        .expect(201);

      const rows = await ctx.dataSource.query(
        `SELECT kanri_shiten_id, kanri_shiten_code FROM m_kanri_shiten WHERE kanri_shiten_code = $1`,
        [validBody.kanri_shiten_code],
      );
      expect(rows).toHaveLength(1);

      const logs = await ctx.dataSource.query(
        `SELECT operation FROM t_log WHERE target_table = 'm_kanri_shiten' AND operation = 'CREATE'`,
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 DUPLICATE_CODE when kanri_shiten_code already exists', async () => {
      const sid = await asAdmin();
      const res = await http()
        .post(apiUrl('kanri-shiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...validBody, kanri_shiten_code: '113-3300-001' })
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
      expect(res.body.message).toContain('113-3300-001');
    });

    it('should return 400 when todofuken_code does not exist', async () => {
      const sid = await asAdmin();
      const res = await http()
        .post(apiUrl('kanri-shiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...validBody, todofuken_code: '99' })
        .expect(400);
      expect(res.body.message).toContain('都道府県');
    });

    it('should return 400 when ja_id does not exist', async () => {
      const sid = await asAdmin();
      await http()
        .post(apiUrl('kanri-shiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...validBody, ja_id: 9999 })
        .expect(400);
    });

    it('should return 403 FORBIDDEN when CHUOKAI attempts to create', async () => {
      const sid = await asChuokai(1);
      // CHUOKAI session deliberately omits kanri_shiten.create.
      await http()
        .post(apiUrl('kanri-shiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(validBody)
        .expect(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // PUT /api/v1/kanri-shiten/:id (API-009-003)
  // ═════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/kanri-shiten/:id', () => {
    const validUpdate = {
      kanri_shiten_name: '東京中央支店（改名）',
      kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｼﾃﾝ ｶｲﾒｲ',
      todofuken_code: '13',
      yubin_no: '1000001',
      address: '更新後住所',
      tel: '0399999999',
      fax: '0399999998',
      paper_flg: false,
      denshi_flg: true,
      biko: '更新済み',
    };

    it('should update all fields + write t_log when NICHINO_ADMIN sends valid body', async () => {
      const sid = await asAdmin();
      await http()
        .put(apiUrl('kanri-shiten/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(validUpdate)
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT kanri_shiten_name, address FROM m_kanri_shiten WHERE kanri_shiten_id = 1`,
      );
      expect(rows[0].kanri_shiten_name).toBe('東京中央支店（改名）');
      expect(rows[0].address).toBe('更新後住所');

      const logs = await ctx.dataSource.query(
        `SELECT operation FROM t_log WHERE target_table = 'm_kanri_shiten' AND operation = 'UPDATE'`,
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should silently drop kanri_shiten_name when caller is CHUOKAI (allow-list)', async () => {
      const sid = await asChuokai(1);
      // CHUOKAI can update yubin_no/address/tel/fax/biko but NOT name.
      const beforeRows = await ctx.dataSource.query(
        `SELECT kanri_shiten_name FROM m_kanri_shiten WHERE kanri_shiten_id = 1`,
      );
      const beforeName = beforeRows[0].kanri_shiten_name;

      await http()
        .put(apiUrl('kanri-shiten/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({
          ...validUpdate,
          kanri_shiten_name: '勝手に変更したい名前',
        })
        .expect(200);

      const afterRows = await ctx.dataSource.query(
        `SELECT kanri_shiten_name, address FROM m_kanri_shiten WHERE kanri_shiten_id = 1`,
      );
      expect(afterRows[0].kanri_shiten_name).toBe(beforeName); // unchanged
      expect(afterRows[0].address).toBe('更新後住所'); // allowed field DID change
    });

    it('should return 404 (DataScope) when CHUOKAI updates row of another JA', async () => {
      const sid = await asChuokai(1);
      await http()
        .put(apiUrl('kanri-shiten/2'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(validUpdate)
        .expect(404);
    });

    it('should return 400 when todofuken_code does not exist (NICHINO_ADMIN path)', async () => {
      const sid = await asAdmin();
      await http()
        .put(apiUrl('kanri-shiten/1'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ ...validUpdate, todofuken_code: '99' })
        .expect(400);
    });
  });
});
