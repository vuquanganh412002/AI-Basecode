// Screen: ACSMS-SCR-017 — 販売店情報登録画面
//
// Integration spec — boots the whole Nest app against pg-mem +
// ioredis-mock. Covers GET / POST / PUT for the 販売店 form endpoints
// over the real TypeORM + ValidationPipe + SessionAuthGuard +
// PermissionsGuard + GlobalExceptionFilter chain.

import type { Server } from 'http';
import request from 'supertest';

import { HanbaitenModule } from '@/modules/hanbaiten/hanbaiten.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateHanbaitenBody,
  buildUpdateHanbaitenBody,
} from '@test/fixtures/hanbaiten-form.factory';

describe('ACSMS-SCR-017 integration — hanbaiten form endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [HanbaitenModule],
      seedSql: [
        // m_ja seed — DataScope FK target.
        `INSERT INTO m_ja (ja_id, ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
                            yubin_no, address, tel, fax, email,
                            tanto_busho, tanto_name, zei_kubun, biko,
                            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'JA001', 'JA東京', 'ｼﾞｪｲｴｰﾄｳｷｮｳ', '13', false,
            '1000001', '東京都千代田区1-1-1', '0312345678', '0312345679',
            'a@a.jp', '', '', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (2, 'JA002', 'JA大阪', 'ｼﾞｪｲｴｰｵｵｻｶ', '27', false,
            '5300001', '大阪府大阪市1-1', '0612345678', '0612345679',
            'b@b.jp', '', '', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_code seed for the 3 categories validated by the create/update flow.
        `INSERT INTO m_code (code_id, code_category, code_value, code_name, code_name_short, sort_order, biko, created_by, updated_by)
         VALUES
           (101, 'ITAKU_KUBUN', '1', '振込',     '振込',     1, '', 'SYSTEM', 'SYSTEM'),
           (102, 'ITAKU_KUBUN', '2', '日農委託', '日農委託', 2, '', 'SYSTEM', 'SYSTEM'),
           (103, 'ITAKU_KUBUN', '9', 'その他',   'その他',   3, '', 'SYSTEM', 'SYSTEM'),
           (104, 'TESURYO_KUBUN',  '1', 'JA',     'JA',     1, '', 'SYSTEM', 'SYSTEM'),
           (105, 'TESURYO_KUBUN',  '2', '販売店', '販売店', 2, '', 'SYSTEM', 'SYSTEM'),
           (106, 'YOKIN_SHUBETSU', '1', '普通',   '普通',   1, '', 'SYSTEM', 'SYSTEM'),
           (107, 'YOKIN_SHUBETSU', '2', '当座',   '当座',   2, '', 'SYSTEM', 'SYSTEM')
         ON CONFLICT DO NOTHING`,
        // Seed m_tanka rows so the Layer 4 FK guard on
        // haitatsuryo_tanka_id (added in commit dc8d144) passes for the
        // default fixture value `haitatsuryo_tanka_id: 10`. Without
        // this, every POST/PUT in this spec rejects with 400 because
        // the FK guard requires the referenced tanka to exist AND
        // belong to the caller's JA.
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (10, 1, 'T010', 2, '配達手数料',
            500, 455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // One seeded hanbaiten so GET detail + PUT have a target.
        `INSERT INTO m_hanbaiten
           (ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana, todofuken_code,
            tel, fax, address, shocho_name, itaku_kubun,
            haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'H001', '販売店A', 'ﾊﾝﾊﾞｲﾃﾝA', '13',
            '03-1234-5678', '03-1234-5679', '東京都千代田区1-1-1', '山田太郎', 1,
            false, NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  async function chuokaiCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
      kanri_shiten_id: null,
      permissions: ['hanbaiten.view', 'hanbaiten.create', 'hanbaiten.update'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function noPermCookie() {
    const sid = await ctx.seedSession({
      account_id: 11,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: 1,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/hanbaiten/:hanbaiten_id — ACSMS-API-017-001
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/hanbaiten/:hanbaiten_id', () => {
    it('should return the seeded hanbaiten when CHUOKAI fetches by id', async () => {
      const cookie = await chuokaiCookie(1);
      const rows = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM m_hanbaiten WHERE hanbaiten_code = 'H001' LIMIT 1`,
      );
      const id = Number(rows[0].hanbaiten_id);

      const res = await http()
        .get(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        hanbaiten_id: id,
        ja_id: 1,
        hanbaiten_code: 'H001',
        hanbaiten_name: '販売店A',
        itaku_kubun: 1,
      });
    });

    it('should return 404 NOT_FOUND when hanbaiten_id does not exist', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .get(apiUrl('hanbaiten/9999'))
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when the hanbaiten belongs to another JA (DataScope masks)', async () => {
      const rows = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM m_hanbaiten WHERE hanbaiten_code = 'H001' LIMIT 1`,
      );
      const id = Number(rows[0].hanbaiten_id);

      const cookie = await chuokaiCookie(2); // CHUOKAI of JA 2 querying JA 1's row
      const res = await http()
        .get(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http().get(apiUrl('hanbaiten/1')).expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/hanbaiten — API-017-002
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/hanbaiten', () => {
    it('should create and persist a new hanbaiten when CHUOKAI posts a valid body', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'H200' }))
        .expect(201);

      expect(res.body.data.hanbaiten_code).toBe('H200');
      expect(res.body.data.hanbaiten_id).toBeGreaterThan(0);

      const rows = await ctx.dataSource.query(
        `SELECT ja_id, hanbaiten_code, hanbaiten_name FROM m_hanbaiten WHERE hanbaiten_code = 'H200'`,
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].ja_id)).toBe(1);
    });

    it('should reject with 400 DUPLICATE_CODE when hanbaiten_code already exists within the same JA', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'H001' }))
        .expect(400);
      expect(res.body.error_code).toBe('DUPLICATE_CODE');
    });

    it('should return 400 VALIDATION_ERROR when hanbaiten_code is missing', async () => {
      const cookie = await chuokaiCookie(1);
      const body = buildCreateHanbaitenBody({ hanbaiten_code: '' });
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when itaku_kubun=1 and bank_code is missing (conditional-required)', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(buildCreateHanbaitenBody({
          hanbaiten_code: 'H300',
          itaku_kubun: 1,
          bank_code: '',
        }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should write a CREATE audit log row (t_log) when creating succeeds', async () => {
      const cookie = await chuokaiCookie(1);
      await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'H400' }))
        .expect(201);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, after_value
           FROM t_log
          WHERE target_table = 'm_hanbaiten' AND operation = 'CREATE' AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('CREATE');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http()
        .post(apiUrl('hanbaiten'))
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'H500' }))
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.create permission', async () => {
      const cookie = await noPermCookie();
      const res = await http()
        .post(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .send(buildCreateHanbaitenBody({ hanbaiten_code: 'H600' }))
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PUT /api/v1/hanbaiten/:hanbaiten_id — API-017-003
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/hanbaiten/:hanbaiten_id', () => {
    async function targetId(): Promise<number> {
      const rows = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM m_hanbaiten WHERE hanbaiten_code = 'H001' LIMIT 1`,
      );
      return Number(rows[0].hanbaiten_id);
    }

    it('should update and persist the hanbaiten when CHUOKAI puts a valid body', async () => {
      const cookie = await chuokaiCookie(1);
      const id = await targetId();

      const res = await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody({ hanbaiten_name: '販売店A改定' }))
        .expect(200);

      expect(res.body.data.hanbaiten_name).toBe('販売店A改定');

      const rows = await ctx.dataSource.query(
        `SELECT hanbaiten_name, biko FROM m_hanbaiten WHERE hanbaiten_id = $1`,
        [id],
      );
      expect(rows[0].hanbaiten_name).toBe('販売店A改定');
      expect(rows[0].biko).toBe('更新しました');
    });

    it('should float the updated hanbaiten to the top of the list (default updated_at desc)', async () => {
      const cookie = await chuokaiCookie(1);

      // Seed a SECOND, newer row so H001 starts below it in the default
      // (updated_at desc) order.
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana, todofuken_code,
            tel, fax, address, shocho_name, itaku_kubun,
            haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'H002', '販売店B', 'ﾊﾝﾊﾞｲﾃﾝB', '13',
            '03-2222-2222', '03-2222-2223', '東京都中央区2-2-2', '佐藤花子', 1,
            false, NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );

      // Before the update H002 (most recently inserted) is first.
      const before = await http()
        .get(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .expect(200);
      expect(before.body.data[0].hanbaiten_code).toBe('H002');

      // Update the OLDER row — manager.update() bumps updated_at (@UpdateDateColumn).
      const id = await targetId();
      await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody({ hanbaiten_name: '販売店A改定' }))
        .expect(200);

      // It now sorts first — most-recently-touched record floats to the top.
      const after = await http()
        .get(apiUrl('hanbaiten'))
        .set('Cookie', cookie)
        .expect(200);
      expect(after.body.data[0].hanbaiten_code).toBe('H001');
    });

    it('should NOT update hanbaiten_code when the body smuggles it in (forbidNonWhitelisted rejects the field)', async () => {
      const cookie = await chuokaiCookie(1);
      const id = await targetId();

      const res = await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send({ ...buildUpdateHanbaitenBody(), hanbaiten_code: 'X999' })
        .expect(400);
      expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(res.body.error_code);

      const rows = await ctx.dataSource.query(
        `SELECT hanbaiten_code FROM m_hanbaiten WHERE hanbaiten_id = $1`,
        [id],
      );
      expect(rows[0].hanbaiten_code).toBe('H001'); // unchanged
    });

    it('should return 404 NOT_FOUND when hanbaiten_id does not exist', async () => {
      const cookie = await chuokaiCookie(1);
      const res = await http()
        .put(apiUrl('hanbaiten/9999'))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when itaku_kubun=1 and bank_code is missing (conditional-required)', async () => {
      const cookie = await chuokaiCookie(1);
      const id = await targetId();

      const res = await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody({ itaku_kubun: 1, bank_code: '' }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should write an UPDATE audit log row (t_log) with bare UPDATE operation when update succeeds', async () => {
      const cookie = await chuokaiCookie(1);
      const id = await targetId();

      await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody({ hanbaiten_name: '販売店A改定2' }))
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, before_value, after_value
           FROM t_log
          WHERE target_table = 'm_hanbaiten' AND operation = 'UPDATE' AND target_id = $1
          ORDER BY log_id DESC LIMIT 1`,
        [id],
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('UPDATE');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http()
        .put(apiUrl('hanbaiten/1'))
        .send(buildUpdateHanbaitenBody())
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.update permission', async () => {
      const cookie = await noPermCookie();
      const id = await targetId();

      const res = await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 404 NOT_FOUND when caller is CHUOKAI of a different JA (DataScope masks)', async () => {
      const cookie = await chuokaiCookie(2); // ja_id=2 cannot edit ja_id=1's row
      const id = await targetId();

      const res = await http()
        .put(apiUrl(`hanbaiten/${id}`))
        .set('Cookie', cookie)
        .send(buildUpdateHanbaitenBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });
  });
});
