// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM queries for the two SCR-015 endpoints
// appended to DokusyaController:
//   GET  /api/v1/dokusya/replace-hanbaiten/search (API-015-001)
//   POST /api/v1/dokusya/replace-hanbaiten        (API-015-002)
//
// The Dokusya + DokusyaRireki entities are already in ALL_ENTITIES in
// test/utils/create-integration-app.ts (verified), so TypeORM synchronize()
// builds t_dokusya / t_dokusya_rireki at boot.
//
// pg-mem CAVEAT: the bulk-replace path uses raw `ANY(:ids)` parameter
// arrays, `RETURNING`, and `CONCAT(...)` LIKE predicates which pg-mem does
// not fully support. Those mutation/raw-SQL steps are marked it.skip and
// flagged for the nightly real-postgres CI run. Auth / permission / scope
// gating runs entirely through the guard layer so it stays runnable here.

import type { Server } from 'http';
import request from 'supertest';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import { buildReplaceBody } from '@test/fixtures/dokusya.factory';

describe('ACSMS-SCR-015 integration — dokusya replace-hanbaiten (search + bulk replace)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // ─── m_ja (2 rows for cross-scope tests) ───────────────────────────
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
        // ─── m_account — assertAnyDokusyaFlag re-queries paper_flg/denshi_flg
        //     by session.account_id. 1/10 hold both flags so the replace happy
        //     paths pass; 15 has neither for the 403 gate test. ──────────────
        `INSERT INTO m_account
           (account_id, login_id, password_hash, account_name, role_id,
            ja_id, kanri_shiten_id, paper_flg, denshi_flg, created_by, updated_by)
         VALUES
           (1,  'admin01', 'x', '管理者',  1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (10, 'chuo01',  'x', '中央会',  3, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
           (15, 'noflag01','x', 'フラグ無', 3, 1,    NULL, false, false, 'SYSTEM', 'SYSTEM')`,
        // ─── m_kanri_shiten ────────────────────────────────────────────────
        `INSERT INTO m_kanri_shiten
           (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
            yubin_no, todofuken_code, address, tel, fax, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_shiten ──────────────────────────────────────────────────────
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
        // ─── m_hanbaiten (200=current, 201=replace target, both JA=1) ──────
        `INSERT INTO m_hanbaiten
           (ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax,
            shocho_name, bank_code, bank_name, bank_branch_code,
            bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 'H001', '千代田販売店', 'ﾁﾖﾀﾞ',
            '', '13', '1000001', '東京都千代田区1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (1, 'H002', '中央販売店', 'ﾁｭｳｵｳ',
            '', '13', '1000002', '東京都千代田区2-2', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_tanka ──────────────────────────────────────────────────────
        `INSERT INTO m_tanka
           (ja_id, tanka_type, tanka_code, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (1, 1, 'T001', '基本購読料（月額）',
            3850, 3500, 10.00,
            '2024-01-01', NULL, '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_code (categories the service validates) ─────────────────────
        `INSERT INTO m_code
           (code_id, code_category, code_value, code_name, code_name_short, sort_order,
            biko, created_by, updated_by)
         VALUES
           (101, 'DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', 'SYSTEM', 'SYSTEM'),
           (102, 'DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
           (103, 'DOKUSYA_SHUBETSU', '3', '併読', '併読', 3, '', 'SYSTEM', 'SYSTEM'),
           (104, 'TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', 'SYSTEM', 'SYSTEM'),
           (105, 'TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', 'SYSTEM', 'SYSTEM'),
           (106, 'SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
           (107, 'SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
           (108, 'SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '', 'SYSTEM', 'SYSTEM')`,
        // ─── Roles + permissions (CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN hold
        //      dokusya.replace_hanbaiten; NICHINO_ADMIN does NOT) ───────────
        `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
         VALUES (1, 'NICHINO_ADMIN', '日本農業新聞管理者', 'SYSTEM', 'SYSTEM'),
                (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM'),
                (4, 'JA_HONTEN', 'JA本店', 'SYSTEM', 'SYSTEM'),
                (5, 'JA_KANRI_SHITEN', 'JA管理支店', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_permissions
           (permission_id, permission_code, permission_name, created_by, updated_by)
         VALUES
           (1, 'dokusya.view', '購読者参照', 'SYSTEM', 'SYSTEM'),
           (2, 'dokusya.replace_hanbaiten', '購読者販売店一括置換', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_roles_permissions (role_id, permission_id, created_by, updated_by)
         VALUES
           (3, 1, 'SYSTEM', 'SYSTEM'), (3, 2, 'SYSTEM', 'SYSTEM'),
           (4, 1, 'SYSTEM', 'SYSTEM'), (4, 2, 'SYSTEM', 'SYSTEM'),
           (5, 1, 'SYSTEM', 'SYSTEM'), (5, 2, 'SYSTEM', 'SYSTEM')`,
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
      permissions: ['dokusya.view', 'dokusya.replace_hanbaiten'],
    });
  }

  // NICHINO_STAFF / NICHINO_ADMIN do NOT hold dokusya.replace_hanbaiten.
  function asNichinoAdmin() {
    return ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      permissions: ['dokusya.view'],
    });
  }

  // Seed one eligible 紙版 dokusya (hanbaiten_id=200) directly via SQL.
  async function seedEligibleDokusya(
    kumiaiin = 'RPL-001',
    overrides: Record<string, unknown> = {},
  ): Promise<number> {
    const o = {
      ja_id: 1,
      kanri_shiten_id: 1,
      shiten_id: 1,
      hanbaiten_id: 200,
      dokusya_shubetsu: 1,
      shiharai_hoho: 1,
      ...overrides,
    };
    await ctx.dataSource.query(
      `INSERT INTO t_dokusya
         (ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
          dokusya_shubetsu, tetsuzuki_shurui,
          shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
          dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
          renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
          haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
          haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
          haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
          haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
          hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
          bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu,
          hikiotoshi_koza_no, hikiotoshi_koza_meigi,
          dokusyaso_bunrui, nogyosya_bunrui,
          shoki_dokusya_kaishi_date, dokusya_kaishi_date,
          seikyu_kaishi_month, biko, rireki_no,
          created_at, created_by, updated_at, updated_by)
       VALUES
         ($1, $2, $3, $4,
          $5, 1,
          '山田', '太郎', 'ﾔﾏﾀﾞ', 'ﾀﾛｳ',
          1, '1000001', '13', '千代田区', '1-1-1', '千代田マンション101',
          '0312345678', '', 'yamada@example.com', 1, 1980, 1,
          true, '', '', '', '', '',
          '', '', '', '', '', '',
          $6, 1, '0', $7, 1,
          '', '', 1, '', '',
          '農業者', '', '2026-01-01', '2026-04-01',
          '', '', 1,
          NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      // Positional params match the $1..$7 placeholders in the VALUES list.
      [
        kumiaiin,
        o.ja_id,
        o.kanri_shiten_id,
        o.shiten_id,
        o.dokusya_shubetsu,
        o.hanbaiten_id,
        o.shiharai_hoho,
      ],
    );
    const [row] = await ctx.dataSource.query(
      `SELECT dokusya_id FROM t_dokusya WHERE kumiaiin_code = $1 ORDER BY dokusya_id DESC LIMIT 1`,
      [kumiaiin],
    );
    return Number(row.dokusya_id);
  }

  // ════════════════════════════════════════════════════════════════════════
  // API-015-001 — GET /api/v1/dokusya/replace-hanbaiten/search
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/replace-hanbaiten/search', () => {
    it('should return 401 when the session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED
      await http().get(apiUrl('dokusya/replace-hanbaiten/search')).expect(401);
    });

    it('should return 403 when the role lacks dokusya.replace_hanbaiten (NICHINO_ADMIN)', async () => {
      // COVERS: §4.2 + err:FORBIDDEN
      const sid = await asNichinoAdmin();
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it.skip('should return 200 + { data, meta } when an in-scope CHUOKAI searches (requires real postgres — CONCAT LIKE / ANY)', async () => {
      // COVERS: §4.5/§4.6 happy path. pg-mem rejects the CONCAT(...) LIKE
      // search predicates + ordering used by the joined SELECT.
      const sid = await asChuokai(1);
      await seedEligibleDokusya('RPL-SEARCH');

      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ page: 1, per_page: 20 })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ page: 1, per_page: 20 });
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-015-002 — POST /api/v1/dokusya/replace-hanbaiten
  // ════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya/replace-hanbaiten', () => {
    it('should return 401 when the session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED
      await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(401);
    });

    it('should return 403 when the role lacks dokusya.replace_hanbaiten (NICHINO_ADMIN)', async () => {
      // COVERS: §4.2 + err:FORBIDDEN
      const sid = await asNichinoAdmin();
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 SHUBETSU_PERMISSION_DENIED when the account has neither 購読種別 flag', async () => {
      // account_concept.md §139-145 — no paper_flg/denshi_flg → 一括置換不可.
      const sid = await ctx.seedSession({
        account_id: 15,
        role_code: 'CHUOKAI',
        role_id: 3,
        ja_id: 1,
        permissions: ['dokusya.view', 'dokusya.replace_hanbaiten'],
      });
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody())
        .expect(403);
      expect(res.body.error_code).toBe('SHUBETSU_PERMISSION_DENIED');
    });

    it('should return 400 VALIDATION_ERROR when dokusya_ids is empty', async () => {
      // COVERS: §4.1 — dokusya_ids 1件以上
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it.skip('should return 200 + persist hanbaiten_id + append rireki when the replace succeeds (requires real postgres — ANY / RETURNING)', async () => {
      // COVERS: §4.5/§4.7 happy path. pg-mem cannot run `ANY(:ids)` +
      // `RETURNING` in the bulk UPDATE / INSERT … SELECT.
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-OK', { hanbaiten_id: 200 });

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [id], new_hanbaiten_id: 201 }))
        .expect(200);

      expect(res.body.message).toBe('置換処理が完了しました。');
      expect(res.body.data).toMatchObject({ new_hanbaiten_id: 201 });

      const [persisted] = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.hanbaiten_id)).toBe(201);
    });

    it.skip('should return 400 SAME_HANBAITEN when a candidate already has new_hanbaiten_id (requires real postgres — ANY)', async () => {
      // COVERS: §4.3 業務ルール — SAME_HANBAITEN
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-SAME', { hanbaiten_id: 201 });

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [id], new_hanbaiten_id: 201 }))
        .expect(400);
      expect(res.body.error_code).toBe('SAME_HANBAITEN');
    });

    it.skip('should return 400 INELIGIBLE_DOKUSYA when a candidate is 併読 (requires real postgres — ANY)', async () => {
      // COVERS: §4.3 業務ルール — INELIGIBLE_DOKUSYA (併読者)
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-INELIG', {
        hanbaiten_id: 200,
        dokusya_shubetsu: 3,
      });

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [id], new_hanbaiten_id: 201 }))
        .expect(400);
      expect(res.body.error_code).toBe('INELIGIBLE_DOKUSYA');
    });
  });
});
