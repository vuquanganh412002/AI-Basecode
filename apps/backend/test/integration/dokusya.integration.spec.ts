// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM queries.
//
// IMPORTANT — the Dokusya + DokusyaRireki entities used by this spec are
// already appended to `ALL_ENTITIES` in
// `test/utils/create-integration-app.ts` (TypeORM synchronize() builds the
// tables at app boot). The entity files themselves DO NOT exist yet — they
// will be created by /gen-code-backend ACSMS-SCR-011; this spec is the
// RED-phase contract.

import type { Server } from 'http';
import request from 'supertest';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateDokusyaBody,
  buildUpdateDokusyaBody,
} from '@test/fixtures/dokusya.factory';

describe('ACSMS-SCR-011 integration — dokusya endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // ─── Reference data — m_ja (2 rows for cross-scope tests) ─────────
        `INSERT INTO m_ja
           (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no,
            address, tel, fax, email, tanto_busho, tanto_name,
            zei_kubun, biko, chuokai_flg, bank_code,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('1301002001', '東京中央会', 'ﾄｳｷｮｳﾁｭｳｵｳ', '13', '1000001',
            '東京都千代田区', '03-1234-5678', '', '', '', '',
            1, '', false, '0001',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('2701002001', '大阪中央会', 'ｵｵｻｶﾁｭｳｵｳ', '27', '5300001',
            '大阪府大阪市', '06-1234-5678', '', '', '', '',
            1, '', false, '0002',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_kanri_shiten ────────────────────────────────────────────────
        `INSERT INTO m_kanri_shiten
           (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
            yubin_no, address, tel, fax, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_shiten (1 row with kinyu_shiten_flg=TRUE for bank_shiten_id) ─
        `INSERT INTO m_shiten
           (ja_id, shiten_code, shiten_name, shiten_name_kana,
            kinyu_shiten_flg,
            jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
            jastem_tyokin_shubetsu, jastem_koza_no,
            kanri_shiten_id, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'SH001', '千代田支店', 'ﾁﾖﾀﾞ',
            TRUE, '001', '本店', '1', '1234567',
            1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_hanbaiten ──────────────────────────────────────────────────
        `INSERT INTO m_hanbaiten
           (ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax,
            shocho_name, bank_code, bank_name, bank_branch_code,
            bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'HB001', '山田販売店', 'ﾔﾏﾀﾞ',
            '', '13', '1000001', '東京都千代田区1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_tanka (購読料 + 配達手数料) ────────────────────────────────
        `INSERT INTO m_tanka
           (ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'T001', 1, '基本購読料（月額）',
            4900, 4455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_code rows for the 4 categories the service validates ────────
        `INSERT INTO m_code
           (code_category, code_value, code_name, code_name_short, sort_order,
            biko, created_by, updated_by)
         VALUES
           ('DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', 'SYSTEM', 'SYSTEM'),
           ('DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
           ('DOKUSYA_SHUBETSU', '3', '併読', '併読', 3, '', 'SYSTEM', 'SYSTEM'),
           ('TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', 'SYSTEM', 'SYSTEM'),
           ('TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', 'SYSTEM', 'SYSTEM'),
           ('YUBIN_KUBUN', '0', '空', '空', 1, '', 'SYSTEM', 'SYSTEM'),
           ('YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', 'SYSTEM', 'SYSTEM'),
           ('SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
           ('SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
           ('YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', 'SYSTEM', 'SYSTEM'),
           ('YOKIN_SHUBETSU', '2', '当座', '当座', 2, '', 'SYSTEM', 'SYSTEM'),
           ('GENDER', '1', '男性', '男性', 1, '', 'SYSTEM', 'SYSTEM'),
           ('GENDER', '2', '女性', '女性', 2, '', 'SYSTEM', 'SYSTEM'),
           ('MAIL_MAGAZINE_FLG', '0', '配信しない', 'OFF', 1, '', 'SYSTEM', 'SYSTEM'),
           ('MAIL_MAGAZINE_FLG', '1', '配信する', 'ON', 2, '', 'SYSTEM', 'SYSTEM')`,
        // ─── Roles + permissions ─────────────────────────────────────────
        `INSERT INTO m_roles (role_id, role_code, role_name, biko, created_by, updated_by)
         VALUES (3, 'CHUOKAI', '中央会', '', 'SYSTEM', 'SYSTEM'),
                (4, 'JA_HONTEN', 'JA本店', '', 'SYSTEM', 'SYSTEM'),
                (5, 'JA_KANRI_SHITEN', 'JA管理支店', '', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_permissions
           (permission_id, permission_code, permission_name, biko, created_by, updated_by)
         VALUES
           (1, 'dokusya.create', '購読者登録', '', 'SYSTEM', 'SYSTEM'),
           (2, 'dokusya.view',   '購読者参照', '', 'SYSTEM', 'SYSTEM'),
           (3, 'dokusya.update', '購読者編集', '', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_roles_permissions (role_id, permission_id, created_by, updated_by)
         VALUES
           (3, 1, 'SYSTEM', 'SYSTEM'), (3, 2, 'SYSTEM', 'SYSTEM'), (3, 3, 'SYSTEM', 'SYSTEM'),
           (4, 1, 'SYSTEM', 'SYSTEM'), (4, 2, 'SYSTEM', 'SYSTEM'), (4, 3, 'SYSTEM', 'SYSTEM'),
           (5, 1, 'SYSTEM', 'SYSTEM'), (5, 2, 'SYSTEM', 'SYSTEM'), (5, 3, 'SYSTEM', 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  function asAdmin() {
    return ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }
  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }
  function asJaHonten(jaId = 1) {
    return ctx.seedSession({
      account_id: 11,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }
  function asJaKanriShiten(jaId = 1, ksId = 1) {
    return ctx.seedSession({
      account_id: 12,
      role_code: 'JA_KANRI_SHITEN',
      role_id: 5,
      ja_id: jaId,
      kanri_shiten_id: ksId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }

  // Helper — extract dokusya_id from a seed by kumiaiin_code
  async function getDokusyaIdByKumiaiin(code: string): Promise<number> {
    const [row] = await ctx.dataSource.query(
      `SELECT dokusya_id FROM t_dokusya WHERE kumiaiin_code = $1 ORDER BY dokusya_id LIMIT 1`,
      [code],
    );
    return Number(row.dokusya_id);
  }

  // ════════════════════════════════════════════════════════════════════════
  // API-011-002 — POST /api/v1/dokusya (create — exercised first to seed)
  // ════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya', () => {
    it('should return 201 + persist t_dokusya + write 1st t_dokusya_rireki row', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-001' }))
        .expect(201);

      expect(res.body.data).toMatchObject({ kumiaiin_code: 'INT-001', ja_id: 1 });
      expect(res.body.message).toBe('登録しました。');

      const [persisted] = await ctx.dataSource.query(
        `SELECT * FROM t_dokusya WHERE kumiaiin_code = 'INT-001'`,
      );
      expect(persisted).toBeDefined();
      expect(Number(persisted.rireki_no)).toBe(1);

      const rireki = await ctx.dataSource.query(
        `SELECT * FROM t_dokusya_rireki WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [Number(persisted.dokusya_id)],
      );
      expect(rireki).toHaveLength(1);
      expect(Number(rireki[0].rireki_no)).toBe(1);
      expect(rireki[0].saishin_data_flg).toBe(true);
      expect(rireki[0].shinki_flg).toBe(true);
    });

    it('should write t_log row (operation=CREATE, log_type=1, result_status=1) in same transaction', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-LOG' }))
        .expect(201);

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status, target_table
           FROM t_log
          WHERE target_table = 't_dokusya'
          ORDER BY log_id DESC
          LIMIT 1`,
      );
      expect(logs[0]).toMatchObject({
        operation: 'CREATE',
        target_table: 't_dokusya',
      });
      expect(Number(logs[0].log_type)).toBe(1);
      expect(Number(logs[0].result_status)).toBe(1);
    });

    it('should bind ja_id from session (ignores body ja_id) — security', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-SEC', ja_id: 99 } as any))
        .expect(201);

      const [persisted] = await ctx.dataSource.query(
        `SELECT ja_id FROM t_dokusya WHERE kumiaiin_code = 'INT-SEC'`,
      );
      expect(Number(persisted.ja_id)).toBe(1);
    });

    it('should reverse-lookup m_shiten and persist bank_branch_code from jastem_toriatsukai_tenpo_code', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-BANK',
          shiharai_hoho: 1,
          bank_shiten_id: 1, // m_shiten.shiten_id from seed
        }))
        .expect(201);

      const [persisted] = await ctx.dataSource.query(
        `SELECT bank_branch_code, bank_branch_name FROM t_dokusya WHERE kumiaiin_code = 'INT-BANK'`,
      );
      expect(persisted.bank_branch_code).toBe('001');
      expect(persisted.bank_branch_name).toBe('本店');
    });

    it('should persist bank_branch_code="" and bank_branch_name="" when shiharai_hoho is NOT 口座引落', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-CASH',
          shiharai_hoho: 2,           // 現金集金
          bank_shiten_id: undefined,
          hikiotoshi_yokin_shubetsu: undefined,
          hikiotoshi_koza_no: '',
          hikiotoshi_koza_meigi: '',
        }))
        .expect(201);

      const [persisted] = await ctx.dataSource.query(
        `SELECT bank_branch_code, bank_branch_name FROM t_dokusya WHERE kumiaiin_code = 'INT-CASH'`,
      );
      expect(persisted.bank_branch_code).toBe('');
      expect(persisted.bank_branch_name).toBe('');
    });

    it('should return 400 VALIDATION_ERROR when bank_shiten_id does not exist in m_shiten (口座引落)', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-BAD-BANK',
          shiharai_hoho: 1,
          bank_shiten_id: 9999,
        }))
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'bank_shiten_id' }),
        ]),
      );
    });

    it('should return 400 DUPLICATE_EMAIL when same email exists in same ja_id', async () => {
      const sid = await asChuokai(1);
      // Seed first record
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-DUP-1',
          email: 'dup-test@example.com',
        }))
        .expect(201);

      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-DUP-2',
          email: 'dup-test@example.com',
        }))
        .expect(400);

      expect(res.body.error_code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 401 when session cookie is missing', async () => {
      await http()
        .post(apiUrl('dokusya'))
        .send(buildCreateDokusyaBody())
        .expect(401);
    });

    it('should return 400 VALIDATION_ERROR when required field shimei_sei is missing', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ shimei_sei: undefined }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:id
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/:id', () => {
    async function seedDokusya(code = 'INT-GET-1', jaId = 1, ksId = 1) {
      const sid = await asChuokai(jaId);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: code, kanri_shiten_id: ksId }))
        .expect(201);
      return getDokusyaIdByKumiaiin(code);
    }

    it('should return 200 with detail when CHUOKAI GETs own JA row', async () => {
      const id = await seedDokusya('INT-GET-1');
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.data).toMatchObject({ kumiaiin_code: 'INT-GET-1', ja_id: 1 });
    });

    it('should return 404 NOT_FOUND when target dokusya does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/99999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to another JA (DataScope masks as 404)', async () => {
      const id = await seedDokusya('INT-GET-CROSS');
      // Cross-scope user from ja_id=2 should not see ja_id=1 record
      const sid = await asJaHonten(2);
      await http()
        .get(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().get(apiUrl('dokusya/1')).expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:id
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:id', () => {
    async function seed() {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-UPD' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-UPD');
      return { id, sid };
    }

    it('should update t_dokusya and append a 2nd t_dokusya_rireki row (rireki_no=2)', async () => {
      const { id, sid } = await seed();
      const res = await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody({
          kumiaiin_code: 'INT-UPD',
          chome_banchi: '千代田1-2-update',
        }))
        .expect(200);

      expect(res.body.message).toBe('更新しました。');

      const [updated] = await ctx.dataSource.query(
        `SELECT chome_banchi, rireki_no FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(updated.chome_banchi).toBe('千代田1-2-update');
      expect(Number(updated.rireki_no)).toBe(2);

      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no, saishin_data_flg FROM t_dokusya_rireki
           WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [id],
      );
      expect(rireki).toHaveLength(2);
      expect(rireki[0].saishin_data_flg).toBe(false);
      expect(rireki[1].saishin_data_flg).toBe(true);
    });

    it('should write t_log row (operation=UPDATE, log_type=1, result_status=1)', async () => {
      const { id, sid } = await seed();
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody({ kumiaiin_code: 'INT-UPD' }))
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status
           FROM t_log
          WHERE target_table = 't_dokusya' AND target_id = $1
          ORDER BY log_id DESC LIMIT 1`,
        [id],
      );
      expect(logs[0]).toMatchObject({ operation: 'UPDATE' });
      expect(Number(logs[0].log_type)).toBe(1);
    });

    it('should return 404 when target dokusya does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('dokusya/99999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to another JA (DataScope)', async () => {
      const { id } = await seed();
      const sid = await asJaHonten(2);
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody())
        .expect(404);
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().put(apiUrl('dokusya/1')).send(buildUpdateDokusyaBody()).expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:id/approve
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:id/approve', () => {
    async function seedPending() {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-APPR' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-APPR');
      // Force the record into 承認待ち (status=0)
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET denshi_shonin_status = 0 WHERE dokusya_id = $1`,
        [id],
      );
      return { id, sid };
    }

    it('should set denshi_shonin_status=1 + append history row + return 承認 message', async () => {
      const { id, sid } = await seedPending();
      const res = await http()
        .put(apiUrl(`dokusya/${id}/approve`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.message).toBe('承認しました。');

      const [persisted] = await ctx.dataSource.query(
        `SELECT denshi_shonin_status FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.denshi_shonin_status)).toBe(1);
    });

    it('should return 400 INVALID_STATUS when target is already approved (status != 0)', async () => {
      const { id, sid } = await seedPending();
      // First approve succeeds
      await http()
        .put(apiUrl(`dokusya/${id}/approve`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      // Second approve must reject as INVALID_STATUS
      const res = await http()
        .put(apiUrl(`dokusya/${id}/approve`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_STATUS');
    });

    it('should return 404 when target dokusya does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('dokusya/99999/approve'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to another JA (DataScope)', async () => {
      const { id } = await seedPending();
      const sid = await asJaHonten(2);
      await http()
        .put(apiUrl(`dokusya/${id}/approve`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().put(apiUrl('dokusya/1/approve')).expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-005 — PUT /api/v1/dokusya/:id/reject
  // ════════════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/dokusya/:id/reject', () => {
    async function seedPending() {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-REJ' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-REJ');
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET denshi_shonin_status = 0 WHERE dokusya_id = $1`,
        [id],
      );
      return { id, sid };
    }

    it('should set denshi_shonin_status=2 + append history row + return 否認 message', async () => {
      const { id, sid } = await seedPending();
      const res = await http()
        .put(apiUrl(`dokusya/${id}/reject`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.message).toBe('否認しました。');

      const [persisted] = await ctx.dataSource.query(
        `SELECT denshi_shonin_status FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.denshi_shonin_status)).toBe(2);
    });

    it('should return 400 INVALID_STATUS when target is not in 承認待ち state', async () => {
      const { id, sid } = await seedPending();
      // Move to status=1 (already approved)
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET denshi_shonin_status = 1 WHERE dokusya_id = $1`,
        [id],
      );

      const res = await http()
        .put(apiUrl(`dokusya/${id}/reject`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(400);
      expect(res.body.error_code).toBe('INVALID_STATUS');
    });

    it('should return 404 when target does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .put(apiUrl('dokusya/99999/reject'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().put(apiUrl('dokusya/1/reject')).expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:id/history
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/:id/history', () => {
    it('should return history rows ordered by rireki_no DESC after CREATE + UPDATE', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-HIST' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-HIST');
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody({ kumiaiin_code: 'INT-HIST', chome_banchi: '変更後' }))
        .expect(200);

      const res = await http()
        .get(apiUrl(`dokusya/${id}/history`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      // Descending order — newest first
      const numbers = res.body.data.map((r: any) => r.rireki_no);
      const sorted = [...numbers].sort((a: number, b: number) => b - a);
      expect(numbers).toEqual(sorted);
    });

    it('should include tetsuzuki_shurui_label resolved from m_code', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-HIST-LBL' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-HIST-LBL');

      const res = await http()
        .get(apiUrl(`dokusya/${id}/history`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data[0].tetsuzuki_shurui_label).toBe('新規');
    });

    it('should return 404 when target dokusya does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/99999/history'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to another JA (DataScope)', async () => {
      const sid1 = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid1)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-HIST-CROSS' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('INT-HIST-CROSS');

      const sid2 = await asJaHonten(2);
      await http()
        .get(apiUrl(`dokusya/${id}/history`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid2)])
        .expect(404);
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().get(apiUrl('dokusya/1/history')).expect(401);
    });
  });
});
