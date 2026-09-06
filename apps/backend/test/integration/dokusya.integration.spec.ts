//
// Screens: ACSMS-SCR-011 — 購読者情報登録画面
//          ACSMS-SCR-014 — 購読者明細検索画面
//          ACSMS-SCR-013 — 購読者履歴情報画面
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
import { todayIsoJst } from '@/common/utils/datetime';
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

describe('ACSMS-SCR-011 integration — dokusya CRUD/approve/reject/history', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // ─── Reference data — m_ja (2 rows for cross-scope tests) ─────────
        `INSERT INTO m_ja
           (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no,
            address, tel, fax, email, tanto_busho, tanto_name,
            zei_kubun, biko, chuokai_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('1301002001', '東京中央会', 'ﾄｳｷｮｳﾁｭｳｵｳ', '13', '1000001',
            '東京都千代田区', '03-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('2701002001', '大阪中央会', 'ｵｵｻｶﾁｭｳｵｳ', '27', '5300001',
            '大阪府大阪市', '06-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_account — the gate (assertShubetsuFlag) re-queries
        //     m_account.paper_flg / denshi_flg by session.account_id.
        //     1/10/11/12 hold BOTH flags so the CRUD/approve happy paths
        //     pass; 13 is denshi-only, 14 is paper-only for the 403 gate
        //     tests. ─────────────────────────────────────────────────────
        `INSERT INTO m_account
           (account_id, login_id, password_hash, account_name, role_id,
            ja_id, kanri_shiten_id, paper_flg, denshi_flg,
            created_by, updated_by)
         VALUES
           (1,  'admin01',  'x', '管理者',      1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (10, 'chuo01',   'x', '中央会',      3, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (11, 'honten01', 'x', 'JA本店',      4, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (12, 'kanri01',  'x', 'JA管理支店',  5, 1,    1,    true,  true,  'SYSTEM', 'SYSTEM'),
           (13, 'denshi01', 'x', '電子版のみ',  3, 1,    NULL, false, true,  'SYSTEM', 'SYSTEM'),
           (14, 'paper01',  'x', '紙版のみ',    3, 1,    NULL, true,  false, 'SYSTEM', 'SYSTEM')`,
        // ─── m_kanri_shiten — explicit ids so the create fixture FK ids
        //     (kanri_shiten_id=10) AND the helper default (ksId=1) both
        //     resolve, all under JA 1. kanri_shiten_code must be exactly 10
        //     digits — DenshibanPushService.resolveJacd() strips non-digits
        //     and requires /^\d{10}$/ for the electronic-version push; any
        //     test that creates a 電子版 dokusya under these kanri_shiten
        //     rows hits DENSHIBAN_PUSH_FAILED otherwise. ────────────────────
        `INSERT INTO m_kanri_shiten
           (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name,
            kanri_shiten_name_kana, yubin_no, todofuken_code, address, tel,
            fax, biko, created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '1000000001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (10, 1, '1000000010', '管理支店10', 'ｶﾝﾘｼﾃﾝ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_shiten — kinyu rows for bank_shiten_id (1, 50) + the
        //     subscriber-branch fixture id (100). All JA 1. ────────────────
        `INSERT INTO m_shiten
           (shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
            kinyu_shiten_flg,
            jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
            jastem_tyokin_shubetsu, jastem_koza_no,
            kanri_shiten_id, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '201', '千代田支店', 'ﾁﾖﾀﾞ',
            TRUE, '001', '本店', '1', '1234567', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (50, 1, '250', '銀行支店50', 'ｷﾞﾝｺｳ',
            TRUE, '050', '支店50', '1', '5000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (100, 1, 'SH100', '購読支店100', 'ｼﾃﾝﾋｬｸ',
            TRUE, '100', '支店100', '1', '1000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_hanbaiten — fixture id (5) + the original (1). All JA 1. ────
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
            hanbaiten_name_kana, torihikisaki_no, todofuken_code, yubin_no,
            address, tel, fax, shocho_name, bank_code, bank_name,
            bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'HB001', '山田販売店', 'ﾔﾏﾀﾞ',
            '', '13', '1000001', '東京都千代田区1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (5, 1, 'HB005', '販売店5', 'ﾊﾝﾊﾞｲﾃﾝ',
            '', '13', '1000001', '東京都千代田区5-5', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_tanka (購読料) — explicit id 1 (fixture tanka_id). JA 1. ────
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'T001', 1, '基本購読料（月額）',
            4900, 4455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_code rows for the 4 categories the service validates ────────
        `INSERT INTO m_code
           (code_id, code_category, code_value, code_name, code_name_short, sort_order,
            biko, created_by, updated_by)
         VALUES
           (101, 'DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', 'SYSTEM', 'SYSTEM'),
           (102, 'DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
           (103, 'DOKUSYA_SHUBETSU', '3', '併読', '併読', 3, '', 'SYSTEM', 'SYSTEM'),
           (104, 'TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', 'SYSTEM', 'SYSTEM'),
           (105, 'TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', 'SYSTEM', 'SYSTEM'),
           (106, 'YUBIN_KUBUN', '0', '空', '空', 1, '', 'SYSTEM', 'SYSTEM'),
           (107, 'YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', 'SYSTEM', 'SYSTEM'),
           (108, 'SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
           (109, 'SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
           (110, 'YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', 'SYSTEM', 'SYSTEM'),
           (111, 'YOKIN_SHUBETSU', '2', '当座', '当座', 2, '', 'SYSTEM', 'SYSTEM'),
           (112, 'GENDER', '1', '男性', '男性', 1, '', 'SYSTEM', 'SYSTEM'),
           (113, 'GENDER', '2', '女性', '女性', 2, '', 'SYSTEM', 'SYSTEM'),
           (114, 'MAIL_MAGAZINE_FLG', '0', '配信しない', 'OFF', 1, '', 'SYSTEM', 'SYSTEM'),
           (115, 'MAIL_MAGAZINE_FLG', '1', '配信する', 'ON', 2, '', 'SYSTEM', 'SYSTEM')`,
        // ─── Roles + permissions ─────────────────────────────────────────
        `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
         VALUES (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM'),
                (4, 'JA_HONTEN', 'JA本店', 'SYSTEM', 'SYSTEM'),
                (5, 'JA_KANRI_SHITEN', 'JA管理支店', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_permissions
           (permission_id, permission_code, permission_name, created_by, updated_by)
         VALUES
           (1, 'dokusya.create', '購読者登録', 'SYSTEM', 'SYSTEM'),
           (2, 'dokusya.view',   '購読者参照', 'SYSTEM', 'SYSTEM'),
           (3, 'dokusya.update', '購読者編集', 'SYSTEM', 'SYSTEM')`,
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

  // CHUOKAI sessions whose m_account carries only ONE 購読種別 flag —
  // used to assert the gate (account_concept.md §139-145).
  function asDenshiOnly(jaId = 1) {
    return ctx.seedSession({
      account_id: 13,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }
  function asPaperOnly(jaId = 1) {
    return ctx.seedSession({
      account_id: 14,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
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
  // ACSMS-API-011-002 — POST /api/v1/dokusya (create — exercised first to seed)
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

    it('should reject a body ja_id and bind ja_id from session — security', async () => {
      // CreateDokusyaDto declares ja_id with @IsEmpty() — the body MUST NOT
      // carry it (ja_id is session-derived). A smuggled ja_id → 400, nothing
      // persisted. A clean body binds ja_id from the session (=1).
      const sid = await asChuokai(1);

      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'SEC-BAD', ja_id: 99 } as any))
        .expect(400);
      const bad = await ctx.dataSource.query(
        `SELECT ja_id FROM t_dokusya WHERE kumiaiin_code = 'SEC-BAD'`,
      );
      expect(bad).toHaveLength(0);

      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-SEC' }))
        .expect(201);
      const [persisted] = await ctx.dataSource.query(
        `SELECT ja_id FROM t_dokusya WHERE kumiaiin_code = 'INT-SEC'`,
      );
      expect(Number(persisted.ja_id)).toBe(1);
    });

    it('should reject creating a 併読(dokusya_shubetsu=3) subscriber with 400 — バッチ連携管理で新規作成不可 (顧客要件)', async () => {
      // 併読(紙版＋電子版)は外部の電子版読者管理システムがバッチ連携で管理するため
      // 本システムでは新規作成不可。編集/停止/削除は isDokusyaReadOnly(403)、Excel取込も
      // 取込不可。単票作成はここで VALIDATION_ERROR。
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'HEIDOKU',
            dokusya_shubetsu: 3,
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(
        res.body.errors.some(
          (e: { field: string }) => e.field === 'dokusya_shubetsu',
        ),
      ).toBe(true);
      const persisted = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE kumiaiin_code = 'HEIDOKU'`,
      );
      expect(persisted).toHaveLength(0);
    });

    it('should reject cross-tenant FK ids (Layer 4) — JA-2 user referencing JA-1 master → 403', async () => {
      // [layer4-fk-guard] A CHUOKAI bound to JA 2 posts a 購読者 whose
      // kanri_shiten/shiten/hanbaiten/tanka ids (fixture defaults 10/100/5/1)
      // all belong to JA 1. The FK-scope guard must reject with
      // DATA_SCOPE_VIOLATION (403) and persist nothing.
      const sid = await asChuokai(2);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'XT-001' }))
        .expect(403);
      expect(res.body.error_code).toBe('DATA_SCOPE_VIOLATION');

      const leaked = await ctx.dataSource.query(
        `SELECT * FROM t_dokusya WHERE kumiaiin_code = 'XT-001'`,
      );
      expect(leaked).toHaveLength(0);
    });

    it('should reverse-lookup m_shiten and persist bank_branch_code from shiten_code (not jastem_toriatsukai_tenpo_code)', async () => {
      // 顧客要件 2026-07 — bank_branch_code は shiten_code を保存する。
      // seed shiten_id=1: shiten_code='201', jastem_toriatsukai_tenpo_code='001'
      // → 保存値が '201' であることで shiten_code 由来を証明する。
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
      expect(persisted.bank_branch_code).toBe('201');
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
          kumiaiin_code: 'BAD-BANK',
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

    it('should return 400 DUPLICATE_EMAIL when same email exists among 電子版 records in same ja_id', async () => {
      const sid = await asChuokai(1);
      // Seed first 電子版 record (email unique among 電子版/併読 only).
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-DUP-1',
          dokusya_shubetsu: 2,
          email: 'dup-test@example.com',
        }))
        .expect(201);

      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-DUP-2',
          dokusya_shubetsu: 2,
          email: 'dup-test@example.com',
        }))
        .expect(400);

      expect(res.body.error_code).toBe('DUPLICATE_EMAIL');
    });

    it('should allow a duplicate email between 紙版 records (uniqueness is 電子版/併読 only)', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-PDUP-1',
          dokusya_shubetsu: 1,
          email: 'paper-dup@example.com',
        }))
        .expect(201);

      // Same email, also 紙版 → permitted (紙版 is not checked for uniqueness).
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-PDUP-2',
          dokusya_shubetsu: 1,
          email: 'paper-dup@example.com',
        }))
        .expect(201);
    });

    it('should allow a 電子版 email that collides only with a 紙版 record', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-MIX-1',
          dokusya_shubetsu: 1,
          email: 'mixed@example.com',
        }))
        .expect(201);

      // A 電子版 row with the same email — the 紙版 row is ignored by the
      // uniqueness check, so this is allowed.
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'INT-MIX-2',
          dokusya_shubetsu: 2,
          email: 'mixed@example.com',
        }))
        .expect(201);
    });

    it('should return 400 VALIDATION_ERROR when email is missing for 電子版', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'EML-REQ',
          dokusya_shubetsu: 2,
          email: undefined,
        }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ]),
      );
    });

    it('should allow a missing email for 紙版', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'EML-OPT',
          dokusya_shubetsu: 1,
          email: undefined,
        }))
        .expect(201);
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

    // ─── 購読種別-flag permission gate (account_concept.md §139-145) ────────
    it('should return 403 SHUBETSU_PERMISSION_DENIED creating 紙版 without paper_flg', async () => {
      const sid = await asDenshiOnly(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-NP', dokusya_shubetsu: 1 }))
        .expect(403);
      expect(res.body.error_code).toBe('SHUBETSU_PERMISSION_DENIED');
      const rows = await ctx.dataSource.query(
        `SELECT 1 FROM t_dokusya WHERE kumiaiin_code = 'INT-NP'`,
      );
      expect(rows).toHaveLength(0);
    });

    it('should return 403 SHUBETSU_PERMISSION_DENIED creating 電子版 without denshi_flg', async () => {
      const sid = await asPaperOnly(1);
      const res = await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'INT-ND',
            dokusya_shubetsu: 2,
            shiharai_hoho: 1,
          }),
        )
        .expect(403);
      expect(res.body.error_code).toBe('SHUBETSU_PERMISSION_DENIED');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // ACSMS-API-011-001 — GET /api/v1/dokusya/:id
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
      const id = await seedDokusya('GET-CROSS');
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

    it('should append a 2nd (future) t_dokusya_rireki row WITHOUT changing t_dokusya immediately (顧客要件 2026-07 未来日のみ)', async () => {
      // 情報変更適用日は未来日のみ（当日不可）。よって更新は未来行を追加するだけで、
      // t_dokusya の業務項目は当日時点では変わらない（夜間バッチが到来日に反映）。
      // 有効行が無い（全行未来）間は最早行=作成行が saishin=true（不変維持）。
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
        `SELECT chome_banchi FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      // 未来更新なので t_dokusya は作成時の住所を保持（バッチ未実行）。
      expect(updated.chome_banchi).toBe('千代田1-1');

      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no, saishin_data_flg FROM t_dokusya_rireki
           WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [id],
      );
      expect(rireki).toHaveLength(2);
      // 全行未来 → 最早行（作成行 rireki_no=1）が saishin=true。
      expect(rireki[0].saishin_data_flg).toBe(true);
      expect(rireki[1].saishin_data_flg).toBe(false);
    });

    it('should set zougen_hokoku_flg=true when 配達先住所 changes (haitatsu_same_flg=false + 別住所) — 顧客要件', async () => {
      // 作成時は配達先同一(haitatsu_same_flg=true・配達先住所は空)。編集で
      // haitatsu_same_flg=false + 別配達先住所を入力すると配達先が変わる＝増減報告
      // 対象。部数・販売店・購読者住所は作成時と同値にして、配達先変更だけを
      // 増減トリガとして検証する。
      const { id, sid } = await seed();
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            dokusya_busu: 1, // 作成時と同値（部数変更なし）
            chome_banchi: '千代田1-1', // 作成時と同値（購読者住所変更なし）
            haitatsu_same_flg: false,
            haitatsu_yubin_no: '1500001',
            haitatsu_todofuken_code: '13',
            haitatsu_shikuchoson: '渋谷区',
            haitatsu_chome_banchi: '道玄坂2-1-1',
            haitatsu_tatemono_mei: '',
            haitatsu_shimei_sei: '配達',
            haitatsu_shimei_mei: '先太郎',
            haitatsu_shimei_kana_sei: 'ハイタツ',
            haitatsu_shimei_kana_mei: 'サキタロウ',
          }),
        )
        .expect(200);

      const [row] = await ctx.dataSource.query(
        `SELECT zougen_hokoku_flg, haitatsu_chome_banchi
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(row.zougen_hokoku_flg).toBe(true);
      expect(row.haitatsu_chome_banchi).toBe('道玄坂2-1-1');
    });

    it('should write exactly ONE rireki row (joho=販売店適用日) when 販売店+情報 changed together — 1更新1レコード (顧客要件 2026-07)', async () => {
      // 顧客要件 2026-07: 画面編集(UI)は販売店適用日を廃止し joho に統一。販売店と
      // その他情報を同時に変えても履歴は1件だけ追加され、販売店を変えた行の
      // 販売店変更も適用日は joho に一本化（別日付の2行分割はしない・顧客要件2026-07）。
      const { id, sid } = await seed();
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            hanbaiten_id: 1, // 5 → 1（販売店変更）
            chome_banchi: '千代田1-2-both', // 情報変更も同時
          }),
        )
        .expect(200);

      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no, hanbaiten_id, joho_henko_tekiyo_date
           FROM t_dokusya_rireki WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [id],
      );
      // 作成行(1) + 今回の更新行(2) の計2行のみ（＝更新で1件だけ追加）。
      expect(rireki).toHaveLength(2);
      const added = rireki[1];
      expect(Number(added.rireki_no)).toBe(2);
      expect(Number(added.hanbaiten_id)).toBe(1); // 新販売店
    });

    it('should REJECT dokusya_chushi_date in the update body with 400 (停止は専用API — 顧客要件 2026-07 改訂)', async () => {
      // 購読停止(解約予約)は update から分離し、専用 POST /dokusya/:id/stop へ移設した。
      // update body に購読中止日を含めると @IsEmpty で 400（dokusya_id と同じ混入防止）。
      const { id, sid } = await seed();
      const res = await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            dokusya_chushi_date: '2027-12-01',
            joho_henko_tekiyo_date: '2027-12-01',
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(
        res.body.errors.some(
          (e: { field: string }) => e.field === 'dokusya_chushi_date',
        ),
      ).toBe(true);

      // 予約行は作られていない（作成行 rireki_no=1 のみ）。
      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no FROM t_dokusya_rireki WHERE dokusya_id = $1`,
        [id],
      );
      expect(rireki).toHaveLength(1);
    });

    it('POST /:id/stop should insert the SAME 解約予約(Phase 1) row + return "購読停止を予約しました。" (SCR-014 専用API・顧客要件 2026-07)', async () => {
      // 一覧の「購読を停止する」ボタン専用エンドポイント。中止日だけを送り、PUT の
      // chushi 分岐と同じ予約行(部数0・zougen・chushi・joho=chushi・kaiyaku_flg=false・
      // saishin=false)を1件挿入する。
      const { id, sid } = await seed();
      const chushi = '2027-11-30';
      const res = await http()
        .post(apiUrl(`dokusya/${id}/stop`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ dokusya_chushi_date: chushi })
        .expect(200);
      expect(res.body.message).toBe('購読停止を予約しました。');

      const [row] = await ctx.dataSource.query(
        `SELECT dokusya_busu, kaiyaku_flg, zougen_hokoku_flg, saishin_data_flg,
                torikeshi_flg, shinki_flg, dokusya_chushi_date, joho_henko_tekiyo_date
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(Number(row.dokusya_busu)).toBe(0);
      expect(row.zougen_hokoku_flg).toBe(true);
      expect(row.kaiyaku_flg).toBe(false); // Phase 2 バッチが解約確定する
      expect(row.saishin_data_flg).toBe(false);
      expect(row.torikeshi_flg).toBe(false);
      expect(row.shinki_flg).toBe(false);
      expect(String(row.dokusya_chushi_date).slice(0, 10)).toBe(chushi);
      expect(String(row.joho_henko_tekiyo_date).slice(0, 10)).toBe(chushi);

      // [scheduled-chushi] 予約行は未来日で effective ではないが、購読中止日は
      // 予約時点で master(t_dokusya) に即時反映され一覧(SCR-014)/詳細(SCR-011)に
      // 表示される（顧客要件 2026-07）。
      const [master] = await ctx.dataSource.query(
        `SELECT dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(String(master.dokusya_chushi_date).slice(0, 10)).toBe(chushi);
    });

    it('POST /:id/stop should block a 2nd 解約予約 (400 VALIDATION_ERROR — 既に解約予約) — 顧客要件 2026-07', async () => {
      const { id, sid } = await seed();
      await http()
        .post(apiUrl(`dokusya/${id}/stop`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ dokusya_chushi_date: '2027-11-30' })
        .expect(200);
      // 2回目 → 既に有効な解約予約あり → 二重解約は拒否。
      const res = await http()
        .post(apiUrl(`dokusya/${id}/stop`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ dokusya_chushi_date: '2027-12-31' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors[0].field).toBe('dokusya_chushi_date');
      expect(res.body.errors[0].message).toContain('既に解約予約');
    });

    it('POST /:id/stop then 取消 the 解約予約 → master.dokusya_chushi_date reverts to null — 顧客要件 2026-07', async () => {
      const { id, sid } = await seed();
      await http()
        .post(apiUrl(`dokusya/${id}/stop`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ dokusya_chushi_date: '2027-11-30' })
        .expect(200);
      // 反映確認: 予約直後は master に中止日が入る。
      const [afterStop] = await ctx.dataSource.query(
        `SELECT dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(String(afterStop.dokusya_chushi_date).slice(0, 10)).toBe(
        '2027-11-30',
      );
      // 予約行(tail)を取消 → loadScheduledChushiDate が torikeshi 行を除外 →
      // recomputeMaster が master の中止日を null へ戻す（自動クリア）。
      const list = await http()
        .get(apiUrl(`dokusya/${id}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const reservationId = Number(list.body.data[0].dokusya_rireki_id);
      await http()
        .post(apiUrl(`dokusya/${id}/rireki/${reservationId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: '解約予約の取消' })
        .expect(200);
      const [afterCancel] = await ctx.dataSource.query(
        `SELECT dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(afterCancel.dokusya_chushi_date).toBeNull();
    });

    // NOTE: 「解約予定日 < 最終変更適用日(MAX joho)」ガードと「二重解約ブロック」は
    // update から stop へ移設した（顧客要件 2026-07 改訂）。PUT で購読中止日を送ると
    // 上の @IsEmpty(400) で弾かれるため、これらの相対チェックは POST /dokusya/:id/stop
    // 側（本ファイルの stop テスト + dokusya.service.spec.ts(stop)）が担う。

    it('(C) should insert a 再購読(shinki) row when 解約済み + 手続種類=新規 + new 購読開始日 — 顧客要件 2026-07', async () => {
      const { id, sid } = await seed();
      // 到来日バッチが解約を反映した状態を模擬（master を解約状態へ）。
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET tetsuzuki_shurui = 0 WHERE dokusya_id = $1`,
        [id],
      );
      // 編集画面で 手続種類=新規 + 新しい購読開始日で再加入。
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            tetsuzuki_shurui: 1, // 新規（再購読）
            dokusya_busu: 2,
            dokusya_kaishi_date: '2027-01-01',
            joho_henko_tekiyo_date: '2027-01-01',
          }),
        )
        .expect(200);

      const [row] = await ctx.dataSource.query(
        `SELECT tetsuzuki_shurui, kaiyaku_flg, shinki_flg, dokusya_chushi_date, dokusya_kaishi_date
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(Number(row.tetsuzuki_shurui)).toBe(1); // 購読中へ復帰
      expect(row.kaiyaku_flg).toBe(false);
      expect(row.shinki_flg).toBe(true); // 解約→再購読 は新規フラグ
      expect(row.dokusya_chushi_date).toBeNull();
      expect(String(row.dokusya_kaishi_date).slice(0, 10)).toBe('2027-01-01');
    });

    it('(C) 再購読: 旧解約日で弾かれず + t_dokusya へ即時反映(購読中) even over an effective 解約 row (joho<=today) — 顧客要件 2026-07', async () => {
      // 実シナリオ(id=8): 解約が到来済み(有効な解約行 joho<=当日)で master 解約。編集で
      // 新規 + 新開始日(未来)を指定。旧解約日を上限参照にすると誤って弾かれる不具合 +
      // 新規作成同様に t_dokusya を即時 購読中 にする（到来日を待たない・顧客要件 2026-07）。
      const { id, sid } = await seed();
      // 解約予約（履歴に予約行）— 停止は専用エンドポイント（顧客要件 2026-07 改訂）。
      await http()
        .post(apiUrl(`dokusya/${id}/stop`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ dokusya_chushi_date: '2027-06-01' })
        .expect(200);
      // 到来日バッチ相当: 解約行の適用日を過去日にして「有効な解約(joho<=当日)」に
      // し、master も解約状態へ。これで recomputeMaster は解約行を有効行に選ぶ。
      await ctx.dataSource.query(
        `UPDATE t_dokusya_rireki
            SET joho_henko_tekiyo_date = '2026-06-01', dokusya_chushi_date = '2026-06-01'
          WHERE dokusya_id = $1 AND kaiyaku_flg = true`,
        [id],
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET tetsuzuki_shurui = 0 WHERE dokusya_id = $1`,
        [id],
      );
      // 再購読: 新開始日 2027-12-01（旧解約日 2027-06-01/実質2026-06-01 より後）でも通る。
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            tetsuzuki_shurui: 1,
            dokusya_busu: 2,
            dokusya_kaishi_date: '2027-12-01',
            joho_henko_tekiyo_date: '2027-12-01',
          }),
        )
        .expect(200);

      // 履歴: 新規(再購読)行は「初回新規作成と同じ形」。適用日(joho)=購読開始日、
      // zenkai_* は null。
      const [row] = await ctx.dataSource.query(
        `SELECT tetsuzuki_shurui, shinki_flg, kaiyaku_flg, dokusya_kaishi_date,
                joho_henko_tekiyo_date,
                zenkai_hanbaiten_id, zenkai_dokusya_busu
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(Number(row.tetsuzuki_shurui)).toBe(1);
      expect(row.shinki_flg).toBe(true);
      expect(row.kaiyaku_flg).toBe(false);
      expect(String(row.dokusya_kaishi_date).slice(0, 10)).toBe('2027-12-01');
      // joho = 購読開始日（初回新規作成と同じ）。
      expect(String(row.joho_henko_tekiyo_date).slice(0, 10)).toBe('2027-12-01');
      expect(row.zenkai_hanbaiten_id).toBeNull(); // zenkai は継承しない
      expect(row.zenkai_dokusya_busu).toBeNull();

      // t_dokusya は即時 購読中(tetsuzuki=1)。有効な解約行があっても再購読が勝つ。
      const [master] = await ctx.dataSource.query(
        `SELECT tetsuzuki_shurui, dokusya_kaishi_date, dokusya_chushi_date
           FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(master.tetsuzuki_shurui)).toBe(1);
      expect(String(master.dokusya_kaishi_date).slice(0, 10)).toBe('2027-12-01');
      // 再購読で購読中止日は null に戻る（旧ライフサイクルの解約日を残さない・
      // 顧客要件 2026-07）。loadScheduledChushiDate を現ライフサイクルに限定した
      // ことで、旧解約行(rireki_no < 再購読行)の中止日は master へ復元されない。
      expect(master.dokusya_chushi_date).toBeNull();
    });

    it('should return 403 DOKUSYA_READ_ONLY when updating a 併読(3) record (any account)', async () => {
      // 併読 cannot be created via POST, so create a 紙版 row then flip its
      // 購読種別 to 3 directly to mimic the converted/synced state. seeder.md
      // §425 — 併読者は編集・削除不可。
      const { id, sid } = await seed();
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_shubetsu = 3 WHERE dokusya_id = $1`,
        [id],
      );
      const res = await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildUpdateDokusyaBody({ kumiaiin_code: 'INT-UPD' }))
        .expect(403);
      expect(res.body.error_code).toBe('DOKUSYA_READ_ONLY');
    });

    it('should set the new rireki row zougen_hokoku_flg=true when dokusya_busu changed', async () => {
      // 顧客要件 — dokusya_busu / hanbaiten_id / 住所5項目 の変更で増減報告対象。
      const { id, sid } = await seed(); // create body busu=1
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        // buildUpdateDokusyaBody default busu=2 → 1→2 変更。
        .send(buildUpdateDokusyaBody({ kumiaiin_code: 'INT-UPD' }))
        .expect(200);
      // 未来更新なので saishin は作成行に残る。増減フラグは「今回追加した行」
      // （最大 rireki_no）で検証する。
      const [row] = await ctx.dataSource.query(
        `SELECT zougen_hokoku_flg FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(row.zougen_hokoku_flg).toBe(true);
    });

    it('should set the new rireki row zougen_hokoku_flg=false when only a non-trigger field changed', async () => {
      const { id, sid } = await seed();
      await http()
        .put(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        // dokusya_busu / hanbaiten_id / 住所5項目 を create と同値に固定、biko のみ変更。
        .send(
          buildUpdateDokusyaBody({
            kumiaiin_code: 'INT-UPD',
            dokusya_busu: 1,
            hanbaiten_id: 5,
            haitatsu_same_flg: true,
            chome_banchi: '千代田1-1',
            biko: '変更後メモ',
          }),
        )
        .expect(200);
      // 今回追加した行（最大 rireki_no）で増減フラグを検証する。
      const [row] = await ctx.dataSource.query(
        `SELECT zougen_hokoku_flg FROM t_dokusya_rireki
          WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(row.zougen_hokoku_flg).toBe(false);
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

    it('should set denshi_shonin_status=1 immediately, write one 承認 history row (saishin), + return 承認 message', async () => {
      const { id, sid } = await seedPending();
      const res = await http()
        .put(apiUrl(`dokusya/${id}/approve`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.message).toBe('承認しました。');

      const [persisted] = await ctx.dataSource.query(
        `SELECT denshi_shonin_status, rireki_no FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.denshi_shonin_status)).toBe(1);

      // 顧客要件: 承認時も履歴(t_dokusya_rireki)へ 1 レコード追記する。
      // 作成行(rireki_no=1) + 承認行 の計2行になり、承認行が saishin=true。
      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no, denshi_shonin_status, saishin_data_flg, joho_henko_tekiyo_date
           FROM t_dokusya_rireki WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [id],
      );
      expect(rireki.length).toBeGreaterThanOrEqual(2);
      const latest = rireki[rireki.length - 1];
      expect(Number(latest.denshi_shonin_status)).toBe(1);
      expect(latest.saishin_data_flg).toBe(true);
      expect(Number(persisted.rireki_no)).toBe(Number(latest.rireki_no));
      // 電子版は適用日が常に当日 → 承認イベント行の joho も当日。
      expect(String(latest.joho_henko_tekiyo_date).slice(0, 10)).toBe(todayIsoJst());
      // saishin=true は最新行のみ。
      expect(rireki.filter((r: any) => r.saishin_data_flg === true).length).toBe(1);
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

    it('should set denshi_shonin_status=2 immediately, write one 否認 history row (saishin), + return 否認 message', async () => {
      const { id, sid } = await seedPending();
      const res = await http()
        .put(apiUrl(`dokusya/${id}/reject`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.message).toBe('否認しました。');

      const [persisted] = await ctx.dataSource.query(
        `SELECT denshi_shonin_status, rireki_no FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.denshi_shonin_status)).toBe(2);

      // 顧客要件: 否認時も履歴へ 1 レコード追記し、否認行を saishin=true にする。
      const rireki = await ctx.dataSource.query(
        `SELECT rireki_no, denshi_shonin_status, saishin_data_flg, joho_henko_tekiyo_date
           FROM t_dokusya_rireki WHERE dokusya_id = $1 ORDER BY rireki_no`,
        [id],
      );
      expect(rireki.length).toBeGreaterThanOrEqual(2);
      const latest = rireki[rireki.length - 1];
      expect(Number(latest.denshi_shonin_status)).toBe(2);
      expect(latest.saishin_data_flg).toBe(true);
      expect(Number(persisted.rireki_no)).toBe(Number(latest.rireki_no));
      // 電子版は適用日が常に当日 → 否認イベント行の joho も当日。
      expect(String(latest.joho_henko_tekiyo_date).slice(0, 10)).toBe(todayIsoJst());
      expect(rireki.filter((r: any) => r.saishin_data_flg === true).length).toBe(1);
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

    it('should return tetsuzuki_shurui as a code value with no *_label field', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'HIST-LBL' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('HIST-LBL');

      const res = await http()
        .get(apiUrl(`dokusya/${id}/history`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      // 認証エンドポイントはコード値のみ返し、ラベルは FE の useCodesStore が
      // 解決する（.claude/rules/nestjs.md §m_code response serialization）。
      expect(res.body.data[0].tetsuzuki_shurui).toBe(1);
      expect(res.body.data[0]).not.toHaveProperty('tetsuzuki_shurui_label');
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
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'HIST-CRS' }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('HIST-CRS');

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

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-014 integration — search / delete / export endpoints
// ════════════════════════════════════════════════════════════════════════════

describe('ACSMS-SCR-014 integration — dokusya list / delete / export', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // m_ja (2 rows for cross-scope tests)
        `INSERT INTO m_ja
           (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no,
            address, tel, fax, email, tanto_busho, tanto_name,
            zei_kubun, biko, chuokai_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('1301002001', '東京中央会', 'ﾄｳｷｮｳﾁｭｳｵｳ', '13', '1000001',
            '東京都千代田区', '03-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('2701002001', '大阪中央会', 'ｵｵｻｶﾁｭｳｵｳ', '27', '5300001',
            '大阪府大阪市', '06-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_account — the gate (assertShubetsuFlag) re-queries
        //     m_account.paper_flg / denshi_flg by session.account_id.
        //     1/10/11/12 hold BOTH flags so the CRUD/approve happy paths
        //     pass; 13 is denshi-only, 14 is paper-only for the 403 gate
        //     tests. ─────────────────────────────────────────────────────
        `INSERT INTO m_account
           (account_id, login_id, password_hash, account_name, role_id,
            ja_id, kanri_shiten_id, paper_flg, denshi_flg,
            created_by, updated_by)
         VALUES
           (1,  'admin01',  'x', '管理者',      1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (10, 'chuo01',   'x', '中央会',      3, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (11, 'honten01', 'x', 'JA本店',      4, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (12, 'kanri01',  'x', 'JA管理支店',  5, 1,    1,    true,  true,  'SYSTEM', 'SYSTEM'),
           (13, 'denshi01', 'x', '電子版のみ',  3, 1,    NULL, false, true,  'SYSTEM', 'SYSTEM'),
           (14, 'paper01',  'x', '紙版のみ',    3, 1,    NULL, true,  false, 'SYSTEM', 'SYSTEM')`,
        // m_kanri_shiten
        // Explicit ids matching buildCreateDokusyaBody FK defaults
        // (kanri_shiten_id=10, shiten_id=100, hanbaiten_id=5, tanka_id=1,
        // bank_shiten_id=50/1) — all JA 1 — so create-seeded POSTs pass the
        // Layer 4 FK guard. Originals (id=1) kept for helpers referencing 1.
        `INSERT INTO m_kanri_shiten
           (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name,
            kanri_shiten_name_kana, yubin_no, todofuken_code, address, tel,
            fax, biko, created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '1000000001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (10, 1, '1000000010', '管理支店10', 'ｶﾝﾘｼﾃﾝ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_shiten — kinyu rows for bank_shiten_id (1, 50) + subscriber
        // branch (100). All JA 1.
        `INSERT INTO m_shiten
           (shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
            kinyu_shiten_flg,
            jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
            jastem_tyokin_shubetsu, jastem_koza_no,
            kanri_shiten_id, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '201', '千代田支店', 'ﾁﾖﾀﾞ',
            TRUE, '001', '本店', '1', '1234567', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (50, 1, '250', '銀行支店50', 'ｷﾞﾝｺｳ',
            TRUE, '050', '支店50', '1', '5000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (100, 1, 'SH100', '購読支店100', 'ｼﾃﾝﾋｬｸ',
            TRUE, '100', '支店100', '1', '1000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_hanbaiten — fixture id (5) + original (1). All JA 1.
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
            hanbaiten_name_kana, torihikisaki_no, todofuken_code, yubin_no,
            address, tel, fax, shocho_name, bank_code, bank_name,
            bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'HB001', '山田販売店', 'ﾔﾏﾀﾞ',
            '', '13', '1000001', '東京都千代田区1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (5, 1, 'HB005', '販売店5', 'ﾊﾝﾊﾞｲﾃﾝ',
            '', '13', '1000001', '東京都千代田区5-5', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_tanka — id 1 = 有効(active), id 2 = 失効(active_flg=FALSE)。
        // id 2 は SCR-020 error gate 連携の失効単価参照フィルタ検証用。JA 1。
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'T001', 1, '基本購読料（月額）',
            4900, 4455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (2, 1, 'T002', 1, '旧購読料（失効）',
            4900, 4455, 10.00,
            '2026-01-01', '2026-03-31', '', FALSE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // FK-conflict helper for DELETE — dokusya.remove() checks
        // t_koza_furikae (not yet a synchronized entity). 本番マイグレーション
        // と同じく deleted_at 列は持たない（出力スナップショット表・ソフト
        // デリートなし）。fixture をスキーマと一致させ、remove() が
        // `deleted_at IS NULL` で絞ると 500 になる回帰を防ぐ。
        `DROP TABLE IF EXISTS t_koza_furikae`,
        `CREATE TABLE t_koza_furikae (
           dokusya_id INT
         )`,
        // m_todofuken (haitatsu concatenation needs todofuken_name)
        `INSERT INTO m_todofuken
           (todofuken_code, todofuken_name, todofuken_name_kana)
         VALUES
           ('13', '東京都', 'トウキョウト')
         ON CONFLICT DO NOTHING`,
        // m_code rows
        `INSERT INTO m_code
           (code_id, code_category, code_value, code_name, code_name_short, sort_order,
            biko, created_by, updated_by)
         VALUES
           (101, 'DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', 'SYSTEM', 'SYSTEM'),
           (102, 'DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
           (103, 'DOKUSYA_SHUBETSU', '3', '併読', '併読', 3, '', 'SYSTEM', 'SYSTEM'),
           (104, 'TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', 'SYSTEM', 'SYSTEM'),
           (105, 'TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', 'SYSTEM', 'SYSTEM'),
           (106, 'YUBIN_KUBUN', '0', '空', '空', 1, '', 'SYSTEM', 'SYSTEM'),
           (107, 'YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', 'SYSTEM', 'SYSTEM'),
           (108, 'SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
           (109, 'SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
           (110, 'SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '', 'SYSTEM', 'SYSTEM'),
           (111, 'YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', 'SYSTEM', 'SYSTEM'),
           (112, 'GENDER', '1', '男性', '男性', 1, '', 'SYSTEM', 'SYSTEM'),
           (113, 'MAIL_MAGAZINE_FLG', '0', '配信しない', 'OFF', 1, '', 'SYSTEM', 'SYSTEM'),
           (114, 'MAIL_MAGAZINE_FLG', '1', '配信する', 'ON', 2, '', 'SYSTEM', 'SYSTEM')`,
        // Roles + permissions
        `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
         VALUES (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM'),
                (4, 'JA_HONTEN', 'JA本店', 'SYSTEM', 'SYSTEM'),
                (5, 'JA_KANRI_SHITEN', 'JA管理支店', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_permissions
           (permission_id, permission_code, permission_name, created_by, updated_by)
         VALUES
           (1, 'dokusya.create', '購読者登録', 'SYSTEM', 'SYSTEM'),
           (2, 'dokusya.view',   '購読者参照', 'SYSTEM', 'SYSTEM'),
           (3, 'dokusya.update', '購読者編集', 'SYSTEM', 'SYSTEM'),
           (4, 'dokusya.delete', '購読者削除', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_roles_permissions (role_id, permission_id, created_by, updated_by)
         VALUES
           (3, 1, 'SYSTEM', 'SYSTEM'), (3, 2, 'SYSTEM', 'SYSTEM'),
           (3, 3, 'SYSTEM', 'SYSTEM'), (3, 4, 'SYSTEM', 'SYSTEM'),
           (4, 1, 'SYSTEM', 'SYSTEM'), (4, 2, 'SYSTEM', 'SYSTEM'),
           (4, 3, 'SYSTEM', 'SYSTEM'), (4, 4, 'SYSTEM', 'SYSTEM'),
           (5, 1, 'SYSTEM', 'SYSTEM'), (5, 2, 'SYSTEM', 'SYSTEM'),
           (5, 3, 'SYSTEM', 'SYSTEM'), (5, 4, 'SYSTEM', 'SYSTEM')`,
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
      role_id: 3,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update', 'dokusya.delete'],
    });
  }
  function asJaHonten(jaId = 1) {
    return ctx.seedSession({
      account_id: 11,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update', 'dokusya.delete'],
    });
  }

  async function getDokusyaIdByKumiaiin(code: string): Promise<number> {
    const [row] = await ctx.dataSource.query(
      `SELECT dokusya_id FROM t_dokusya WHERE kumiaiin_code = $1 ORDER BY dokusya_id LIMIT 1`,
      [code],
    );
    return Number(row.dokusya_id);
  }

  // ════════════════════════════════════════════════════════════════════════
  // API-014-001 — GET /api/v1/dokusya (search)
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya (SCR-014 list)', () => {
    it('should return paginated rows scoped to own JA when CHUOKAI calls', async () => {
      const sid = await asChuokai(1);
      // Seed one row in ja_id=1
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'INT-014-A' }))
        .expect(201);

      const res = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'INT-014-A' })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          page: 1,
          per_page: expect.any(Number),
        }),
      );
      expect(res.body.data.some((r: any) => r.kumiaiin_code === 'INT-014-A')).toBe(true);
    });

    it('should respect partial-match (ILIKE) filter on kumiaiin_code', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'PREFIX-X1',
            email: 'prefix-x1@example.com',
          }),
        )
        .expect(201);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'OTHER-Y1',
            email: 'other-y1@example.com',
          }),
        )
        .expect(201);

      const res = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'PREFIX' })
        .expect(200);

      const codes = res.body.data.map((r: any) => r.kumiaiin_code);
      expect(codes).toEqual(expect.arrayContaining(['PREFIX-X1']));
      expect(codes).not.toEqual(expect.arrayContaining(['OTHER-Y1']));
    });

    it('should filter by 有効単価フラグ (active_tanka_flg): false→失効単価参照のみ / true→有効単価参照のみ (SCR-020 error gate 連携)', async () => {
      const sid = await asChuokai(1);
      // A: 有効単価(tanka_id=1) を参照する購読者。
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'INACT-A',
            email: 'int-inact-a@example.com',
            tanka_id: 1,
          }),
        )
        .expect(201);
      // B: tanka_id=2 参照の購読者。作成時点は一時的に有効化しておく——不具合修正
      // 2026-08 で失効(active_flg=false)単価の新規選択が VALIDATION_ERROR に
      // なったため、作成後に失効させる（tanka-expire バッチが後から失効させる
      // ケースを再現）。
      await ctx.dataSource.query(
        `UPDATE m_tanka SET active_flg = TRUE WHERE tanka_id = 2`,
      );
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildCreateDokusyaBody({
            kumiaiin_code: 'INACT-B',
            email: 'int-inact-b@example.com',
            tanka_id: 2,
          }),
        )
        .expect(201);
      // 失効単価(tanka_id=2, active_flg=FALSE)へ戻す — 以降のフィルタ検証対象。
      await ctx.dataSource.query(
        `UPDATE m_tanka SET active_flg = FALSE WHERE tanka_id = 2`,
      );

      // フィルタ OFF → A・B 両方返る。
      const off = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'INACT' })
        .expect(200);
      const offCodes = off.body.data.map((r: any) => r.kumiaiin_code);
      expect(offCodes).toEqual(expect.arrayContaining(['INACT-A', 'INACT-B']));

      // 無効(active_tanka_flg=false) → 失効単価参照の B のみ。A は除外される。
      const invalid = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'INACT', active_tanka_flg: 'false' })
        .expect(200);
      const invalidCodes = invalid.body.data.map((r: any) => r.kumiaiin_code);
      expect(invalidCodes).toEqual(expect.arrayContaining(['INACT-B']));
      expect(invalidCodes).not.toEqual(expect.arrayContaining(['INACT-A']));

      // 有効(active_tanka_flg=true) → 有効単価参照の A のみ。B は除外される。
      const valid = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'INACT', active_tanka_flg: 'true' })
        .expect(200);
      const validCodes = valid.body.data.map((r: any) => r.kumiaiin_code);
      expect(validCodes).toEqual(expect.arrayContaining(['INACT-A']));
      expect(validCodes).not.toEqual(expect.arrayContaining(['INACT-B']));
    });

    it('should compute is_read_only=true for 併読者 (dokusya_shubetsu=3) in list response', async () => {
      const sid = await asChuokai(1);
      // 併読は本システムで API 作成不可（バッチ連携管理）。外部連携で併読データが
      // 入った状態を模擬するため、紙版で作成後 DB で併読(3)へ変更し、一覧の
      // is_read_only 計算だけを検証する。
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'I14-HEIDO' }))
        .expect(201);
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_shubetsu = 3 WHERE kumiaiin_code = 'I14-HEIDO'`,
      );

      const res = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'I14-HEIDO' })
        .expect(200);

      const target = res.body.data.find(
        (r: any) => r.kumiaiin_code === 'I14-HEIDO',
      );
      expect(target?.is_read_only).toBe(true);
    });

    it('should exclude rows in other JA (DataScope)', async () => {
      // Seed in JA=1
      const sid1 = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid1)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'I14-JA1ON' }))
        .expect(201);

      // Other-JA user searches — must NOT see ja_id=1 row
      const sid2 = await asJaHonten(2);
      const res = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid2)])
        .query({ kumiaiin_code: 'I14-JA1ON' })
        .expect(200);

      const found = res.body.data.find(
        (r: any) => r.kumiaiin_code === 'I14-JA1ON',
      );
      expect(found).toBeUndefined();
    });

    it('should return 400 VALIDATION_ERROR when email format is invalid', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ email: 'not-an-email' })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().get(apiUrl('dokusya')).expect(401);
    });

    it.skip('should JOIN t_dokusya_rireki when joho_henko_tekiyo_date_from/_to is provided (history-table branch)', () => {
      // requires real postgres — covered by service unit spec
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-002 — DELETE /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/dokusya/:dokusya_id', () => {
    async function seedDeletable(code = 'DEL01') {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: code,
          dokusya_shubetsu: 1, // 紙版 — deletable
          shiharai_hoho: 1,
        }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin(code);
      return { id, sid };
    }

    it('should soft-delete + return 削除しました。 message', async () => {
      const { id, sid } = await seedDeletable();
      const res = await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      expect(res.body.message).toBe('削除しました。');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(row.deleted_at).not.toBeNull();
    });

    it('should return 409 CONFLICT (not 500) when t_koza_furikae references the dokusya', async () => {
      // 回帰: t_koza_furikae は deleted_at 列を持たない。remove() の FK ガードが
      // `deleted_at IS NULL` で絞ると本番で「column does not exist」→ 500。
      // 行があれば 409 CONFLICT で弾けることを実スキーマ準拠の fixture で保証。
      const { id, sid } = await seedDeletable('DEL-FK');
      await ctx.dataSource.query(
        `INSERT INTO t_koza_furikae (dokusya_id) VALUES ($1)`,
        [id],
      );
      const res = await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(409);
      expect(res.body.error_code).toBe('CONFLICT');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(row.deleted_at).toBeNull();

      // クリーンアップ（後続テストの FK ガードに影響させない）。
      await ctx.dataSource.query(
        `DELETE FROM t_koza_furikae WHERE dokusya_id = $1`,
        [id],
      );
    });

    it('should return 403 SHUBETSU_PERMISSION_DENIED deleting a 紙版 row without paper_flg', async () => {
      // account_concept.md §139-145 — 紙版(1) の削除には paper_flg が必要。
      // 13 (denshi-only) は paper_flg=false → 403.
      const { id } = await seedDeletable('DEL-NP');
      // account 13 = denshi-only (paper_flg=false) — seeded in this block too.
      const sid = await ctx.seedSession({
        account_id: 13,
        role_code: 'CHUOKAI',
        role_id: 3,
        ja_id: 1,
        permissions: ['dokusya.view', 'dokusya.delete'],
      });
      const res = await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
      expect(res.body.error_code).toBe('SHUBETSU_PERMISSION_DENIED');

      const [row] = await ctx.dataSource.query(
        `SELECT deleted_at FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(row.deleted_at).toBeNull();
    });

    it('should write a t_log row (operation=DELETE, log_type=1, result_status=1) in the same tx', async () => {
      const { id, sid } = await seedDeletable('DEL-LOG');
      await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status, target_table
           FROM t_log
          WHERE target_table = 't_dokusya' AND target_id = $1
          ORDER BY log_id DESC LIMIT 1`,
        [id],
      );
      expect(logs[0]).toMatchObject({
        operation: 'DELETE',
        target_table: 't_dokusya',
      });
      expect(Number(logs[0].log_type)).toBe(1);
      expect(Number(logs[0].result_status)).toBe(1);
    });

    it('should return 404 NOT_FOUND when target does not exist', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .delete(apiUrl('dokusya/99999'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 when target belongs to a different JA (DataScope masks as 404)', async () => {
      const { id } = await seedDeletable('DEL-CROSS');
      const sid = await asJaHonten(2);
      const res = await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 403 DOKUSYA_READ_ONLY when target is 電子版 + クレカ (dokusya_shubetsu=2, shiharai_hoho=6)', async () => {
      const sid = await asChuokai(1);
      // create() blocks 電子版 + 非口座引落 (クレカ comes from the e-subscription
      // sync, not the manual form). So create a 電子版 + 口座引落 row, then set
      // shiharai_hoho=6 directly to mimic the synced state the delete guard
      // must treat as read-only.
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({
          kumiaiin_code: 'I14-RDONLY',
          dokusya_shubetsu: 2,
          shiharai_hoho: 1,
        }))
        .expect(201);
      const id = await getDokusyaIdByKumiaiin('I14-RDONLY');
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET shiharai_hoho = 6 WHERE dokusya_id = $1`,
        [id],
      );

      const res = await http()
        .delete(apiUrl(`dokusya/${id}`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
      expect(res.body.error_code).toBe('DOKUSYA_READ_ONLY');
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().delete(apiUrl('dokusya/1')).expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-003 — GET /api/v1/dokusya/export
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/export', () => {
    it('should return 200 + Excel binary when at least one row matches', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'I14-EXP' }))
        .expect(201);

      const res = await http()
        .get(apiUrl('dokusya/export'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'I14-EXP' })
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // RFC 6266 filename*=UTF-8'' — 購読者一覧出力_YYYYMMDD_HHmmss.xlsx を
      // URL エンコードした形（%E8%B3%BC… で始まる）。
      expect(res.headers['content-disposition']).toMatch(
        /filename\*=UTF-8''.+_\d{8}_\d{6}\.xlsx/,
      );
    });

    it('should return 404 EXPORT_NO_DATA when no rows match', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/export'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'NOSUCHCODE' })
        .expect(404);
      expect(res.body.error_code).toBe('EXPORT_NO_DATA');
    });

    it('should write a t_log row with operation=EXPORT_EXCEL when export succeeds', async () => {
      const sid = await asChuokai(1);
      await http()
        .post(apiUrl('dokusya'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildCreateDokusyaBody({ kumiaiin_code: 'I14-EXPLOG' }))
        .expect(201);

      await http()
        .get(apiUrl('dokusya/export'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'I14-EXPLOG' })
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, log_type, result_status
           FROM t_log
          WHERE target_table = 't_dokusya' AND operation = 'EXPORT_EXCEL'
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs[0]).toMatchObject({ operation: 'EXPORT_EXCEL' });
      expect(Number(logs[0].log_type)).toBe(1);
      expect(Number(logs[0].result_status)).toBe(1);
    });

    it('should return 401 when session cookie is missing', async () => {
      await http().get(apiUrl('dokusya/export')).expect(401);
    });

    it.skip('should reject with 409 EXPORT_LIMIT_EXCEEDED when count > 30000 (skipped — seed cost prohibitive)', () => {
      // covered by service unit spec
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-013 integration — 購読者履歴情報画面 (paginated rireki list)
// ════════════════════════════════════════════════════════════════════════════
//
// Boots the full app and exercises the REAL multi-join SELECT for
// GET /api/v1/dokusya/:dokusya_id/rireki against pg-mem. Two history rows
// are seeded by reusing the proven SCR-011 create (rireki_no=1) + update
// (rireki_no=2) endpoints, then the new endpoint is queried.

describe('ACSMS-SCR-013 integration — dokusya rireki list', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // m_ja (2 rows for cross-scope tests)
        `INSERT INTO m_ja
           (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no,
            address, tel, fax, email, tanto_busho, tanto_name,
            zei_kubun, biko, chuokai_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           ('1301002001', '東京中央会', 'ﾄｳｷｮｳﾁｭｳｵｳ', '13', '1000001',
            '東京都千代田区', '03-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('2701002001', '大阪中央会', 'ｵｵｻｶﾁｭｳｵｳ', '27', '5300001',
            '大阪府大阪市', '06-1234-5678', '', '', '', '',
            1, '', false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_account — the gate (assertShubetsuFlag) re-queries
        //     m_account.paper_flg / denshi_flg by session.account_id.
        //     1/10/11/12 hold BOTH flags so the CRUD/approve happy paths
        //     pass; 13 is denshi-only, 14 is paper-only for the 403 gate
        //     tests. ─────────────────────────────────────────────────────
        `INSERT INTO m_account
           (account_id, login_id, password_hash, account_name, role_id,
            ja_id, kanri_shiten_id, paper_flg, denshi_flg,
            created_by, updated_by)
         VALUES
           (1,  'admin01',  'x', '管理者',      1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (10, 'chuo01',   'x', '中央会',      3, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (11, 'honten01', 'x', 'JA本店',      4, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (12, 'kanri01',  'x', 'JA管理支店',  5, 1,    1,    true,  true,  'SYSTEM', 'SYSTEM'),
           (13, 'denshi01', 'x', '電子版のみ',  3, 1,    NULL, false, true,  'SYSTEM', 'SYSTEM'),
           (14, 'paper01',  'x', '紙版のみ',    3, 1,    NULL, true,  false, 'SYSTEM', 'SYSTEM')`,
        // Explicit ids matching buildCreateDokusyaBody FK defaults
        // (kanri_shiten_id=10, shiten_id=100, hanbaiten_id=5, tanka_id=1,
        // bank_shiten_id=50/1) — all JA 1 — so create-seeded POSTs pass.
        `INSERT INTO m_kanri_shiten
           (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name,
            kanri_shiten_name_kana, yubin_no, todofuken_code, address, tel,
            fax, biko, created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '1000000001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (10, 1, '1000000010', '管理支店10', 'ｶﾝﾘｼﾃﾝ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_shiten — kinyu rows for bank_shiten_id (1, 50) + branch (100).
        `INSERT INTO m_shiten
           (shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
            kinyu_shiten_flg,
            jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
            jastem_tyokin_shubetsu, jastem_koza_no,
            kanri_shiten_id, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, '201', '千代田支店', 'ﾁﾖﾀﾞ',
            TRUE, '001', '本店', '1', '1234567', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (50, 1, '250', '銀行支店50', 'ｷﾞﾝｺｳ',
            TRUE, '050', '支店50', '1', '5000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (100, 1, 'SH100', '購読支店100', 'ｼﾃﾝﾋｬｸ',
            TRUE, '100', '支店100', '1', '1000000', 1, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_hanbaiten — fixture id (5) + original (1).
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
            hanbaiten_name_kana, torihikisaki_no, todofuken_code, yubin_no,
            address, tel, fax, shocho_name, bank_code, bank_name,
            bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'HB001', '山田販売店', 'ﾔﾏﾀﾞ',
            '', '13', '1000001', '東京都千代田区1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (5, 1, 'HB005', '販売店5', 'ﾊﾝﾊﾞｲﾃﾝ',
            '', '13', '1000001', '東京都千代田区5-5', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_tanka — explicit id 1 (fixture tanka_id).
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'T001', 1, '基本購読料（月額）',
            4900, 4455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // m_todofuken (haitatsu / zenkai address concat needs todofuken_name)
        `INSERT INTO m_todofuken
           (todofuken_code, todofuken_name, todofuken_name_kana)
         VALUES
           ('13', '東京都', 'トウキョウト')
         ON CONFLICT DO NOTHING`,
        // m_code — required by the create() path used to seed history rows.
        `INSERT INTO m_code
           (code_id, code_category, code_value, code_name, code_name_short, sort_order,
            biko, created_by, updated_by)
         VALUES
           (101, 'DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', 'SYSTEM', 'SYSTEM'),
           (102, 'DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
           (103, 'DOKUSYA_SHUBETSU', '3', '併読', '併読', 3, '', 'SYSTEM', 'SYSTEM'),
           (104, 'TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', 'SYSTEM', 'SYSTEM'),
           (105, 'TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', 'SYSTEM', 'SYSTEM'),
           (106, 'YUBIN_KUBUN', '0', '空', '空', 1, '', 'SYSTEM', 'SYSTEM'),
           (107, 'YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', 'SYSTEM', 'SYSTEM'),
           (108, 'SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
           (109, 'SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
           (110, 'SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '', 'SYSTEM', 'SYSTEM'),
           (111, 'YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', 'SYSTEM', 'SYSTEM'),
           (112, 'GENDER', '1', '男性', '男性', 1, '', 'SYSTEM', 'SYSTEM'),
           (113, 'MAIL_MAGAZINE_FLG', '0', '配信しない', 'OFF', 1, '', 'SYSTEM', 'SYSTEM'),
           (114, 'MAIL_MAGAZINE_FLG', '1', '配信する', 'ON', 2, '', 'SYSTEM', 'SYSTEM')`,
        // Roles + permissions (dokusya.view gates this endpoint)
        `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
         VALUES (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM'),
                (4, 'JA_HONTEN', 'JA本店', 'SYSTEM', 'SYSTEM'),
                (5, 'JA_KANRI_SHITEN', 'JA管理支店', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_permissions
           (permission_id, permission_code, permission_name, created_by, updated_by)
         VALUES
           (1, 'dokusya.create', '購読者登録', 'SYSTEM', 'SYSTEM'),
           (2, 'dokusya.view',   '購読者参照', 'SYSTEM', 'SYSTEM'),
           (3, 'dokusya.update', '購読者編集', 'SYSTEM', 'SYSTEM')`,
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

  function asChuokai(jaId = 1) {
    return ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
    });
  }

  // Seed a dokusya with TWO history rows by reusing the proven create
  // (rireki_no=1) + update (rireki_no=2) endpoints. Returns dokusya_id.
  async function seedDokusyaWithTwoHistoryRows(sid: string): Promise<number> {
    const createRes = await http()
      .post(apiUrl('dokusya'))
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(buildCreateDokusyaBody({ kumiaiin_code: 'RIREKI-001' }))
      .expect(201);
    const dokusyaId = Number(createRes.body.data.dokusya_id);

    await http()
      .put(apiUrl(`dokusya/${dokusyaId}`))
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send(buildUpdateDokusyaBody({ chome_banchi: '千代田2-2' }))
      .expect(200);

    return dokusyaId;
  }

  describe('GET /api/v1/dokusya/:dokusya_id/rireki', () => {
    it('should return 200 with 2 rows ordered rireki_no DESC + meta envelope', async () => {
      // COVERS: §4.5 SELECT … ORDER BY rireki_no DESC + §4.6 meta
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(Number(res.body.data[0].rireki_no)).toBe(2);
      expect(Number(res.body.data[1].rireki_no)).toBe(1);
      expect(res.body.meta).toMatchObject({ total: 2, page: 1, per_page: 20, total_pages: 1 });
    });

    it('should surface the SCR-013 追加列 (購読種別/新聞単価 JOIN/支払い方法/郵送区分/サイクル/備考) — 顧客要件', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      const row = res.body.data[0];
      // 追加列がレスポンスに載る。
      for (const key of [
        'dokusya_shubetsu',
        'tanka_id',
        'tanka_name',
        'tanka_kingaku',
        'shiharai_hoho',
        'yubin_kubun',
        'dokusyaryo_shiharai_cycle',
        'biko',
      ]) {
        expect(row).toHaveProperty(key);
      }
      // 新聞単価は m_tanka JOIN で名称解決、金額は m_ja 税区分で解決（number）。
      expect(typeof row.tanka_name).toBe('string');
      expect(row.tanka_name.length).toBeGreaterThan(0);
      expect(typeof row.tanka_kingaku).toBe('number');
      // *_label は載せない（m_code 値のみ・authenticated endpoint）。
      expect(row).not.toHaveProperty('dokusya_shubetsu_label');
      expect(row).not.toHaveProperty('shiharai_hoho_label');
    });

    it('should paginate — per_page=1 yields 1 row and total_pages=2', async () => {
      // COVERS: §3.1 ページネーション
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki?page=1&per_page=1`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ total: 2, page: 1, per_page: 1, total_pages: 2 });
    });

    it('should return 404 when the dokusya does not exist', async () => {
      // COVERS: err:NOT_FOUND
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/999999/rireki'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 (DataScope mask) when a CHUOKAI of another JA requests the dokusya', async () => {
      // COVERS: §4.2 DataScope — out-of-scope masked as 404
      const ownerSid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(ownerSid);

      const otherSid = await asChuokai(2);
      await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, otherSid)])
        .expect(404);
    });

    it('should return 401 when the session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED
      await http().get(apiUrl('dokusya/1/rireki')).expect(401);
    });

    it('should flag can_torikeshi=true only on the chain tail (非新規) row', async () => {
      // COVERS: API-013-002 can_torikeshi — tail(更新, rireki #2) は取消可、
      // 先頭(新規, rireki #1) は shinki_flg で取消不可。
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      // data[0] = rireki #2 (tail, 更新) → 取消可 ; data[1] = rireki #1 (新規) → 取消不可。
      expect(res.body.data[0].can_torikeshi).toBe(true);
      expect(res.body.data[0].torikeshi_flg).toBe(false);
      expect(res.body.data[1].can_torikeshi).toBe(false);
      expect(res.body.data[1].shinki_flg).toBe(true);
    });

    it('should flag can_torikeshi=false on the tail when it is 電子版 (紙版のみ可・顧客要件2026-07)', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      // 末尾(rireki #2, 更新)を電子版に書き換え → 電子版連携のため取消不可になる。
      await ctx.dataSource.query(
        `UPDATE t_dokusya_rireki SET dokusya_shubetsu = 2 WHERE dokusya_id = $1 AND rireki_no = 2`,
        [dokusyaId],
      );

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(Number(res.body.data[0].rireki_no)).toBe(2); // 末尾
      expect(res.body.data[0].can_torikeshi).toBe(false); // 電子版 → 取消不可
    });

    it('should flag can_torikeshi=false on the tail when its 適用日 has already arrived (適用日未来のみ可)', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      // 両行の適用日を過去日へ（#2 を末尾に保つため #2 > #1）→ 末尾の適用日到来済みで取消不可。
      await ctx.dataSource.query(
        `UPDATE t_dokusya_rireki
            SET joho_henko_tekiyo_date = CASE rireki_no WHEN 1 THEN '2000-01-01' ELSE '2000-06-01' END
          WHERE dokusya_id = $1`,
        [dokusyaId],
      );

      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(Number(res.body.data[0].rireki_no)).toBe(2); // 末尾（適用日 2000-06-01 で最大）
      expect(res.body.data[0].can_torikeshi).toBe(false); // 適用日到来済み → 取消不可
    });
  });

  describe('POST /api/v1/dokusya/:dokusya_id/rireki/:dokusya_rireki_id/torikeshi', () => {
    /** rireki #2 (tail, 更新行) の dokusya_rireki_id を取得する。*/
    async function tailRirekiId(sid: string, dokusyaId: number): Promise<number> {
      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      return Number(res.body.data[0].dokusya_rireki_id); // rireki_no=2 が先頭
    }

    it('should 取消 the tail row: flag it + insert a reversing row + record reason in both biko + t_log', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      const targetId = await tailRirekiId(sid, dokusyaId);

      const res = await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/${targetId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: '誤入力のため取消' })
        .expect(200);
      expect(res.body.message).toBe('取消しました。');

      // 対象行: torikeshi_flg=true + biko=理由。
      const [target] = await ctx.dataSource.query(
        `SELECT torikeshi_flg, biko FROM t_dokusya_rireki WHERE dokusya_rireki_id = $1`,
        [targetId],
      );
      expect(target.torikeshi_flg).toBe(true);
      expect(target.biko).toBe('誤入力のため取消');

      // 打ち消し行(新規 rireki): torikeshi_flg=true + biko=理由。
      const counters = await ctx.dataSource.query(
        `SELECT torikeshi_flg, biko FROM t_dokusya_rireki
           WHERE dokusya_id = $1 AND torikeshi_flg = true AND dokusya_rireki_id <> $2`,
        [dokusyaId, targetId],
      );
      expect(counters).toHaveLength(1);
      expect(counters[0].biko).toBe('誤入力のため取消');

      // t_log に取消理由が記録される（afterValue の torikeshi_reason）。
      const logs = await ctx.dataSource.query(
        `SELECT after_value FROM t_log
           WHERE target_table = 't_dokusya_rireki' AND operation = 'UPDATE'
           ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(String(logs[0].after_value)).toContain('誤入力のため取消');
    });

    it('should recompute the master back to rireki #1 after the tail is 取消', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      const targetId = await tailRirekiId(sid, dokusyaId);

      await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/${targetId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: 'r' })
        .expect(200);

      // 更新(#2)を取消 → 有効レコードは #1 に戻り、master は #1 の住所へ。
      const [master] = await ctx.dataSource.query(
        `SELECT chome_banchi FROM t_dokusya WHERE dokusya_id = $1`,
        [dokusyaId],
      );
      expect(master.chome_banchi).toBe('千代田1-1'); // create 時の住所（更新前）
    });

    it('should return 400 TORIKESHI_NOT_ALLOWED for a 新規(先頭) row', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      // rireki #1 (新規) の dokusya_rireki_id。
      const res = await http()
        .get(apiUrl(`dokusya/${dokusyaId}/rireki`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);
      const shinkiId = Number(res.body.data[1].dokusya_rireki_id); // rireki_no=1

      const r = await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/${shinkiId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: 'x' })
        .expect(400);
      expect(r.body.error_code).toBe('TORIKESHI_NOT_ALLOWED');
    });

    it('should return 400 TORIKESHI_NOT_ALLOWED for a 電子版 tail row (紙版のみ可・顧客要件2026-07)', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      const targetId = await tailRirekiId(sid, dokusyaId);
      // 末尾を電子版に書き換え → 取消不可。
      await ctx.dataSource.query(
        `UPDATE t_dokusya_rireki SET dokusya_shubetsu = 2 WHERE dokusya_rireki_id = $1`,
        [targetId],
      );

      const r = await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/${targetId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: 'x' })
        .expect(400);
      expect(r.body.error_code).toBe('TORIKESHI_NOT_ALLOWED');
    });

    it('should return 400 VALIDATION_ERROR when reason is empty', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);
      const targetId = await tailRirekiId(sid, dokusyaId);

      await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/${targetId}/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: '' })
        .expect(400);
    });

    it('should return 404 when the rireki does not belong to the dokusya', async () => {
      const sid = await asChuokai(1);
      const dokusyaId = await seedDokusyaWithTwoHistoryRows(sid);

      await http()
        .post(apiUrl(`dokusya/${dokusyaId}/rireki/999999/torikeshi`))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send({ reason: 'r' })
        .expect(404);
    });

    it('should return 401 when the session cookie is missing', async () => {
      await http()
        .post(apiUrl('dokusya/1/rireki/1/torikeshi'))
        .send({ reason: 'r' })
        .expect(401);
    });
  });
});
