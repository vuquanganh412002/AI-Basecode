// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Integration spec for the two SCR-015 endpoints appended to DokusyaController:
//   GET  /api/v1/dokusya/replace-hanbaiten/search (API-015-001)
//   POST /api/v1/dokusya/replace-hanbaiten        (API-015-002)
//
// Split into two suites:
//   1. Gates (pg-mem, always run) — SessionAuthGuard / PermissionsGuard /
//      ValidationPipe / 購読種別フラグ check. No SQL pg-mem can't handle.
//   2. Search / replace SQL (real Postgres, `describeRealPg`, runs only when
//      REAL_PG=1) — the happy paths use `= ANY($1)`, `RETURNING`,
//      `INSERT … SELECT`, and CONCAT/`||` LIKE predicates pg-mem rejects.
//
// Shared seed + helpers live at module scope so both suites reuse them.

import type { Server } from 'node:http';
import request from 'supertest';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  createRealPgIntegrationApp,
  describeRealPg,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import { buildReplaceBody } from '@test/fixtures/dokusya.factory';

// ─── Shared reference seed (both suites) ──────────────────────────────────
// NB: m_hanbaiten uses EXPLICIT hanbaiten_id 200 (current) / 201 (replace
// target) so the t_dokusya.hanbaiten_id FK resolves on real Postgres. (Under
// pg-mem serial IDs happened to be irrelevant because the SQL-heavy tests
// were skipped; real PG enforces the FK.)
const SCR015_SEED_SQL: string[] = [
  // FK dependency order matters on real Postgres (parents before children):
  // roles/permissions → ja → account → kanri_shiten → shiten → hanbaiten →
  // tanka. pg-mem ignores FK ordering, real PG enforces it.
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
  `INSERT INTO m_account
     (account_id, login_id, password_hash, account_name, role_id,
      ja_id, kanri_shiten_id, paper_flg, denshi_flg, created_by, updated_by)
   VALUES
     (1,  'admin01', 'x', '管理者',  1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
     (10, 'chuo01',  'x', '中央会',  3, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
     (15, 'noflag01','x', 'フラグ無', 3, 1,    NULL, false, false, 'SYSTEM', 'SYSTEM')`,
  `INSERT INTO m_kanri_shiten
     (ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
      yubin_no, todofuken_code, address, tel, fax, biko,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
      '1000001', '13', '東京都千代田区', '', '', '',
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
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
  `INSERT INTO m_hanbaiten
     (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
      torihikisaki_no, todofuken_code, yubin_no, address, tel, fax,
      shocho_name, bank_code, bank_name, bank_branch_code,
      bank_branch_name, koza_no, koza_meigi, biko,
      haitatsuryo_tanka_id, haiten_flg,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (200, 1, 'H001', '千代田販売店', 'ﾁﾖﾀﾞ',
      '', '13', '1000001', '東京都千代田区1-1', '', '',
      '', '', '', '', '', '', '', '',
      NULL, false,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     (201, 1, 'H002', '中央販売店', 'ﾁｭｳｵｳ',
      '', '13', '1000002', '東京都千代田区2-2', '', '',
      '', '', '', '', '', '', '', '',
      NULL, false,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
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
];

// ─── Shared session + seed helpers (parameterized by the active ctx) ──────
function makeHelpers(getCtx: () => IntegrationTestContext) {
  function asChuokai(jaId = 1) {
    return getCtx().seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.replace_hanbaiten'],
    });
  }

  // NICHINO_STAFF / NICHINO_ADMIN do NOT hold dokusya.replace_hanbaiten.
  function asNichinoAdmin() {
    return getCtx().seedSession({
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
    await getCtx().dataSource.query(
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
      // Positional params match the $1..$7 placeholders in the VALUES list:
      // $1 ja_id, $2 kanri_shiten_id, $3 shiten_id, $4 kumiaiin_code,
      // $5 dokusya_shubetsu, $6 hanbaiten_id, $7 shiharai_hoho.
      [
        o.ja_id,
        o.kanri_shiten_id,
        o.shiten_id,
        kumiaiin,
        o.dokusya_shubetsu,
        o.hanbaiten_id,
        o.shiharai_hoho,
      ],
    );
    const [row] = await getCtx().dataSource.query(
      `SELECT dokusya_id FROM t_dokusya WHERE kumiaiin_code = $1 ORDER BY dokusya_id DESC LIMIT 1`,
      [kumiaiin],
    );
    const dokusyaId = Number(row.dokusya_id);
    // Seed the matching rireki #1 (現行データ). Production の購読者は必ず
    // 新規登録/取込で rireki #1 を持つ。一括置換は applyChange(UPDATE) 経由に
    // なったので「適用日時点の有効レコード」= この rireki を predecessor として
    // 読む。master 行をそのまま複製し、履歴専用列は shinki=saishin=true 等を付与。
    await getCtx().dataSource.query(
      `INSERT INTO t_dokusya_rireki (
         dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
         dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
         shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
         dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
         renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
         haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
         haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
         haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
         hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
         bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
         dokusyaso_bunrui, nogyosya_bunrui, shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
         joho_henko_tekiyo_date, seikyu_kaishi_month, biko, denshi_shonin_status,
         henko_riyu, saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg, torikeshi_flg,
         joho_henko_tekiyo_date, created_at, created_by)
       SELECT
         dokusya_id, 1, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
         dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
         shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
         dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
         renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
         haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
         haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
         haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
         hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
         bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
         dokusyaso_bunrui, nogyosya_bunrui, shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
         -- 現行 rireki の適用日は購読開始日に揃える（master seed は joho 未設定=NULL の
         -- ため、loadEffectiveRow の joho<=asOf 条件で除外されないよう有効日を入れる）。
         COALESCE(joho_henko_tekiyo_date, dokusya_kaishi_date), seikyu_kaishi_month, biko, denshi_shonin_status,
         '', true, true, true, false, false,
         NULL, created_at, created_by
       FROM t_dokusya WHERE dokusya_id = $1`,
      [dokusyaId],
    );
    return dokusyaId;
  }

  return { asChuokai, asNichinoAdmin, seedEligibleDokusya };
}

// ════════════════════════════════════════════════════════════════════════
// Suite 1 — gates (pg-mem, always run)
// ════════════════════════════════════════════════════════════════════════
describe('ACSMS-SCR-015 integration — replace-hanbaiten gates (pg-mem)', () => {
  let ctx: IntegrationTestContext;
  const { asChuokai, asNichinoAdmin } = makeHelpers(() => ctx);

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: SCR015_SEED_SQL,
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  describe('GET /api/v1/dokusya/replace-hanbaiten/search', () => {
    it('should return 401 when the session cookie is missing', async () => {
      await http().get(apiUrl('dokusya/replace-hanbaiten/search')).expect(401);
    });

    it('should return 403 when the role lacks dokusya.replace_hanbaiten (NICHINO_ADMIN)', async () => {
      const sid = await asNichinoAdmin();
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/dokusya/replace-hanbaiten', () => {
    it('should return 401 when the session cookie is missing', async () => {
      await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .send(buildReplaceBody())
        .expect(401);
    });

    it('should return 403 when the role lacks dokusya.replace_hanbaiten (NICHINO_ADMIN)', async () => {
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
      const sid = await asChuokai(1);
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// Suite 2 — search / replace SQL (real Postgres only; REAL_PG=1)
// ════════════════════════════════════════════════════════════════════════
describeRealPg(
  'ACSMS-SCR-015 integration — replace-hanbaiten search/replace (real postgres)',
  () => {
    let ctx: IntegrationTestContext;
    const { asChuokai, seedEligibleDokusya } = makeHelpers(() => ctx);

    beforeEach(async () => {
      ctx = await createRealPgIntegrationApp({
        modules: [DokusyaModule],
        seedSql: SCR015_SEED_SQL,
      });
    });

    afterEach(async () => {
      await ctx.close();
    });

    const http = () => request(ctx.app.getHttpServer() as Server);

    it('should return 200 + { data, meta } when an in-scope CHUOKAI searches', async () => {
      // COVERS: §4.5/§4.6 happy path — CONCAT(...) LIKE + joined ordering.
      const sid = await asChuokai(1);
      await seedEligibleDokusya('RPL-SEARCH');

      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        // 販売店適用日は必須（顧客要件 2026-07）。遠未来日で eligible 判定を通す。
        .query({ page: 1, per_page: 20, joho_henko_tekiyo_date: '2099-12-31', dokusya_shubetsu: 1 })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ page: 1, per_page: 20 });
    });

    it('should return 400 DATE_RANGE_INVALID when joho_henko_tekiyo_date is past (未来日のみ)', async () => {
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ joho_henko_tekiyo_date: '2000-01-01', dokusya_shubetsu: 1 })
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
    });

    it('should return 400 VALIDATION_ERROR (電子版は本画面では対象外) when dokusya_shubetsu=2 (ACSMS-MSG-015-009・顧客要件 2026-07 改訂)', async () => {
      // 電子版=電子配信で販売店を持たない → 一括置換の対象外。FE の検索ボタン無効化に
      // 対する防御的サーバ側ガード（日付に関係なく種別2は拒否）。
      const sid = await asChuokai(1);
      const res = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ joho_henko_tekiyo_date: '2099-12-31', dokusya_shubetsu: 2 })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        { field: 'dokusya_shubetsu', message: '電子版は本画面では対象外です。' },
      ]);
    });

    it('should EXCLUDE a 購読者 whose 解約予定日 is on/before the 適用日, and INCLUDE when 適用日 is earlier', async () => {
      // §4.3 置換可能条件 — (chushi IS NULL OR chushi > 適用日)。適用日が解約予定日
      // 以降 → 除外、解約予定日より前 → 含む。両ケースとも適用日は未来日。
      const sid = await asChuokai(1);
      await seedEligibleDokusya('RPL-CHUSHI');
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_chushi_date = '2099-06-01'
           WHERE kumiaiin_code = 'RPL-CHUSHI' AND deleted_at IS NULL`,
      );

      // 適用日 = 2099-12-31 (>= 解約予定日) → 除外。
      const excluded = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'RPL-CHUSHI', joho_henko_tekiyo_date: '2099-12-31', dokusya_shubetsu: 1 })
        .expect(200);
      expect(excluded.body.data).toHaveLength(0);

      // 適用日 = 2099-01-01 (< 解約予定日) → 含む。
      const included = await http()
        .get(apiUrl('dokusya/replace-hanbaiten/search'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .query({ kumiaiin_code: 'RPL-CHUSHI', joho_henko_tekiyo_date: '2099-01-01', dokusya_shubetsu: 1 })
        .expect(200);
      expect(included.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 + append a future-dated rireki row with the new 販売店 when the replace succeeds', async () => {
      // COVERS: §4.5/§4.7 happy path — applyChange(UPDATE) で未来適用日の履歴行を
      // 追加する。適用日は未来（futureDate(2)）なので recomputeMaster(asOf=当日) は
      // 到来前の変更を master へ反映しない（到来日バッチの担当）。したがって:
      //   - master t_dokusya.hanbaiten_id は旧販売店(200)のまま（未来分は未反映）
      //   - 追加された最新 rireki 行が新販売店(201)を持つ
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-OK', { hanbaiten_id: 200 });

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildReplaceBody({ dokusya_ids: [id], new_hanbaiten_id: 201 }))
        .expect(200);

      expect(res.body.message).toBe('置換処理が完了しました。');
      expect(res.body.data).toMatchObject({ new_hanbaiten_id: 201 });

      // master は当日時点の有効販売店（旧=200）のまま。未来適用日の変更は到来日
      // バッチで反映される（現状バッチ未実装のため反映されないのが正しい挙動）。
      const [persisted] = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(persisted.hanbaiten_id)).toBe(200);

      // 追加された最新の履歴行（最大 rireki_no）が新販売店(201)を持つ。
      const [latestRireki] = await ctx.dataSource.query(
        `SELECT hanbaiten_id FROM t_dokusya_rireki
           WHERE dokusya_id = $1
           ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(Number(latestRireki.hanbaiten_id)).toBe(201);
    });

    it('should IGNORE a torikeshi_flg=true history row (取消済) when validating 適用日 (顧客要件)', async () => {
      // 取消済みの履歴行が早い解約予定日(2026-08-01)を持っていても、それを参照して
      // 弾いてはならない。参照は torikeshi_flg=false の有効レコード = master のみ
      // （master の chushi は null のまま）。→ 販売店適用日 2026-09-01 は成功すべき。
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-TORIKESHI', { hanbaiten_id: 200 });
      // 取消済み rireki #2 を追加（早い chushi 付き）。master(chushi=null) は変えない。
      // #1 は有効(torikeshi_flg=false)のまま残すので applyChange の predecessor も健在。
      await ctx.dataSource.query(
        `INSERT INTO t_dokusya_rireki (
           dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
           dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
           shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
           dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
           renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
           haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
           haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
           haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
           hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
           bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
           dokusyaso_bunrui, nogyosya_bunrui, shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
           joho_henko_tekiyo_date, seikyu_kaishi_month, biko, denshi_shonin_status,
           henko_riyu, saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg, torikeshi_flg,
           joho_henko_tekiyo_date, created_at, created_by)
         SELECT
           dokusya_id, 2, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
           dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
           shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
           dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
           renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
           haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
           haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
           haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
           hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
           bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
           dokusyaso_bunrui, nogyosya_bunrui, shoki_dokusya_kaishi_date, dokusya_kaishi_date, '2026-08-01',
           '2026-06-01', seikyu_kaishi_month, biko, denshi_shonin_status,
           '取消', false, false, false, false, true,
           NULL, created_at, created_by
         FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildReplaceBody({
            dokusya_ids: [id],
            new_hanbaiten_id: 201,
            joho_henko_tekiyo_date: '2026-09-01', // 取消行の chushi(2026-08-01)より後
          }),
        )
        .expect(200);
      expect(res.body.data).toMatchObject({ new_hanbaiten_id: 201 });
    });

    it('should return 400 DATE_RANGE_INVALID when 販売店適用日 >= 解約予定日 (顧客要件 2026-07)', async () => {
      // COVERS: §4.1 適用日整合性 — 販売店適用日 < 解約予定日(before)。
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-CHUSHI', { hanbaiten_id: 200 });
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_chushi_date = '2026-08-01' WHERE dokusya_id = $1`,
        [id],
      );
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildReplaceBody({
            dokusya_ids: [id],
            new_hanbaiten_id: 201,
            joho_henko_tekiyo_date: '2026-09-01', // >= chushi & >= today
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
      expect(res.body.message).toContain('解約予定日');
    });

    it('should return 400 DATE_RANGE_INVALID when 販売店適用日 < 購読開始日 (未来開始)', async () => {
      // COVERS: §4.1 適用日整合性 — 販売店適用日 >= 購読開始日(before)。
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-KAISHI', { hanbaiten_id: 200 });
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_kaishi_date = '2030-01-01' WHERE dokusya_id = $1`,
        [id],
      );
      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildReplaceBody({
            dokusya_ids: [id],
            new_hanbaiten_id: 201,
            joho_henko_tekiyo_date: '2026-09-01', // >= today but < kaishi(2030)
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
      expect(res.body.message).toContain('購読開始日');
    });

    it('should return 400 SAME_HANBAITEN when a candidate already has new_hanbaiten_id', async () => {
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

    it('should return 400 DATE_RANGE_INVALID (種別不一致) when a candidate is 併読 — 併読 は dokusya_shubetsu で送れず一致チェックで弾く', async () => {
      // COVERS: §4.1 候補種別の整合チェック — 併読(3) は dto.dokusya_shubetsu(1/2)
      // と一致しないため mismatch で弾かれる（顧客要件 2026-07）。
      const sid = await asChuokai(1);
      const id = await seedEligibleDokusya('RPL-INELIG', {
        hanbaiten_id: 200,
        dokusya_shubetsu: 3,
      });

      const res = await http()
        .post(apiUrl('dokusya/replace-hanbaiten'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        // buildReplaceBody は dokusya_shubetsu=1(紙版) 既定 → 併読候補と不一致。
        .send(buildReplaceBody({ dokusya_ids: [id], new_hanbaiten_id: 201 }))
        .expect(400);
      expect(res.body.error_code).toBe('DATE_RANGE_INVALID');
    });
  },
);
