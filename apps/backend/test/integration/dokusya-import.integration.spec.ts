// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM / raw SQL queries for the two
// ACSMS-SCR-016 endpoints appended to DokusyaController:
//   GET  /api/v1/dokusya/import/template (ACSMS-API-016-001)
//   POST /api/v1/dokusya/import          (ACSMS-API-016-002)
//
// The Dokusya + DokusyaRireki entities are already in ALL_ENTITIES in
// test/utils/create-integration-app.ts (verified), so TypeORM synchronize()
// builds t_dokusya / t_dokusya_rireki at boot.
//
// pg-mem CAVEAT: the import write path uses raw `ANY(:ids)` parameter
// arrays, `RETURNING`, and dynamic UPDATE SET clauses which pg-mem does not
// fully support. Those mutation / raw-SQL steps are marked it.skip and
// flagged for the nightly real-postgres CI run. Auth / permission / scope
// gating + template download run entirely through the guard layer so they
// stay runnable here.
//
// Seed shape copied from dokusya-replace-hanbaiten.integration.spec.ts
// (reconciled ACSMS-SCR-015 seed): m_ja WITHOUT bank_code, m_kanri_shiten WITH
// todofuken_code, m_tanka with kingaku_zeikomi/kingaku_zeinuki/tax_rate,
// m_code with explicit code_id, m_roles/m_permissions WITHOUT biko — plus
// the extra m_code categories the import validates and the dokusya.import
// permission.

import type { Server } from 'node:http';
import request from 'supertest';
import * as ExcelJS from 'exceljs';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import { DenshibanApiService } from '@/modules/denshiban/denshiban-api.service';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  createRealPgIntegrationApp,
  describeRealPg,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildImportBody,
  buildImportRequiredColumns,
  buildImportRow,
  futureDate,
} from '@test/fixtures/dokusya.factory';
import { addDaysIso, nextMonthFirstIsoJst, todayIsoJst } from '@/common/utils/datetime';

// Shared seed + session helpers (module scope so the pg-mem gate suite and
// the real-PG write-path suite reuse them). FK dependency order matters on
// real Postgres: roles/permissions → ja → account → kanri_shiten → shiten →
// hanbaiten → tanka. pg-mem ignores FK ordering, real PG enforces it.
const SCR016_SEED_SQL: string[] = [
  `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
   VALUES (1, 'NICHINO_ADMIN', '日本農業新聞管理者', 'SYSTEM', 'SYSTEM'),
          (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM'),
          (4, 'JA_HONTEN', 'JA本店', 'SYSTEM', 'SYSTEM'),
          (5, 'JA_KANRI_SHITEN', 'JA管理支店', 'SYSTEM', 'SYSTEM')`,
  `INSERT INTO m_permissions
     (permission_id, permission_code, permission_name, created_by, updated_by)
   VALUES
     (1, 'dokusya.view', '購読者参照', 'SYSTEM', 'SYSTEM'),
     (2, 'dokusya.import', '購読者Excel取込', 'SYSTEM', 'SYSTEM')`,
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
     (1,  'admin01',  'x', '管理者',  1, NULL, NULL, true,  true,  'SYSTEM', 'SYSTEM'),
     (11, 'honten01', 'x', 'JA本店',  4, 1,    NULL, true,  true,  'SYSTEM', 'SYSTEM'),
     (15, 'noflag01', 'x', 'フラグ無', 4, 1,    NULL, false, false, 'SYSTEM', 'SYSTEM')`,
  `INSERT INTO m_kanri_shiten
     (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name,
      kanri_shiten_name_kana, yubin_no, todofuken_code, address,
      tel, fax, biko, paper_flg, denshi_flg,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (101, 1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
      '1000001', '13', '東京都千代田区', '', '', '', true, true,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     -- 同一 JA の別の管理支店（[layer4-scope-guard] 不具合修正2026-08 の
     -- 「JA管理支店アカウントが自分の管理支店以外を Excel から指定できない」
     -- テスト用 — 101 とは別の管理支店であることだけが要件）。
     (102, 1, 'KS002', '麹町管理支店', 'ｺｳｼﾞﾏﾁ',
      '1020083', '13', '東京都千代田区', '', '', '', true, true,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     -- 紙版を取り扱わない管理支店（[layer4-scope-guard] 不具合修正2026-08 の
     -- 「管理支店自体の取扱いフラグ」テスト用）。
     (103, 1, 'KS003', '大手町管理支店', 'ｵｵﾃﾏﾁ',
      '1000004', '13', '東京都千代田区', '', '', '', false, true,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
  // account_id=16: paper_flg のみ（denshi_flg=false）。
  // account_id=17: JA管理支店（kanri_shiten_id=101 に固定）。m_kanri_shiten の
  // FK があるため、この INSERT は上の m_kanri_shiten INSERT より後でなければならない。
  `INSERT INTO m_account
     (account_id, login_id, password_hash, account_name, role_id,
      ja_id, kanri_shiten_id, paper_flg, denshi_flg, created_by, updated_by)
   VALUES
     (16, 'paperonly01', 'x', '紙版専用', 4, 1, NULL, true, false, 'SYSTEM', 'SYSTEM'),
     (17, 'kanrishiten01', 'x', 'JA管理支店', 5, 1, 101, true, true, 'SYSTEM', 'SYSTEM')`,
  `INSERT INTO m_shiten
     (shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
      kinyu_shiten_flg,
      jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
      jastem_tyokin_shubetsu, jastem_koza_no,
      kanri_shiten_id, biko,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (1001, 1, 'SH001', '千代田支店', 'ﾁﾖﾀﾞ',
      TRUE, '001', '本店', '1', '1234567',
      101, '',
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     -- KS001(101) 配下の別支店（[layer4-scope-guard] 不具合修正2026-08 の
     -- 「自支店以外を指定できない」テスト用 — 101 配下という以外は SH001 と無関係）。
     (1002, 1, 'SH002', '麹町支店', 'ｺｳｼﾞﾏﾁ',
      TRUE, '002', '麹町', '1', '2345678',
      101, '',
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
  `INSERT INTO m_hanbaiten
     (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
      hanbaiten_name_kana, torihikisaki_no, todofuken_code, yubin_no,
      address, tel, fax, shocho_name, bank_code, bank_name,
      bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
      haitatsuryo_tanka_id, haiten_flg,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (5, 1, 'H001', '千代田販売店', 'ﾁﾖﾀﾞ',
      '', '13', '1000001', '東京都千代田区1-1', '', '',
      '', '', '', '', '', '', '', '',
      NULL, false,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     -- 同一 JA の2店目。販売店「変更」を作るのに要る（hanbaiten_code は
     -- (ja_id, hanbaiten_code) で UNIQUE ＝ JA を跨ぐと重複しうるため、
     -- ja_id=2 の H999 では同一 JA 内の変更を表現できない）。
     (7, 1, 'H002', '麹町販売店', 'ｺｳｼﾞﾏﾁ',
      '', '13', '1020083', '東京都千代田区麹町1-1', '', '',
      '', '', '', '', '', '', '', '',
      NULL, false,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
     (6, 2, 'H999', '大阪販売店', 'ｵｵｻｶ',
      '', '27', '5300001', '大阪府大阪市1-1', '', '',
      '', '', '', '', '', '', '', '',
      NULL, false,
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
  `INSERT INTO m_tanka
     (tanka_id, ja_id, tanka_type, tanka_code, tanka_name,
      kingaku_zeikomi, kingaku_zeinuki, tax_rate,
      tekiyo_start_date, tekiyo_end_date, biko,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (1, 1, 1, 'T001', '基本購読料（月額）',
      3850, 3500, 10.00,
      '2024-01-01', NULL, '',
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
  `INSERT INTO m_code
     (code_id, code_category, code_value, code_name, code_name_short, sort_order,
      biko, created_by, updated_by)
   VALUES
     (101, 'DOKUSYA_SHUBETSU', '1', '紙版',   '紙版',   1, '', 'SYSTEM', 'SYSTEM'),
     (102, 'DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', 'SYSTEM', 'SYSTEM'),
     (103, 'DOKUSYA_SHUBETSU', '3', '併読',   '併読',   3, '', 'SYSTEM', 'SYSTEM'),
     (104, 'TETSUZUKI_SHURUI', '0', '解約',   '解約',   1, '', 'SYSTEM', 'SYSTEM'),
     (105, 'TETSUZUKI_SHURUI', '1', '新規',   '新規',   2, '', 'SYSTEM', 'SYSTEM'),
     (106, 'SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', 'SYSTEM', 'SYSTEM'),
     (107, 'SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', 'SYSTEM', 'SYSTEM'),
     (108, 'SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '', 'SYSTEM', 'SYSTEM'),
     (109, 'GENDER', '1', '男性', '男性', 1, '', 'SYSTEM', 'SYSTEM'),
     (110, 'GENDER', '2', '女性', '女性', 2, '', 'SYSTEM', 'SYSTEM'),
     (111, 'GENDER', '9', '回答しない', '回答しない', 3, '', 'SYSTEM', 'SYSTEM'),
     (112, 'YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', 'SYSTEM', 'SYSTEM'),
     (113, 'YOKIN_SHUBETSU', '2', '当座', '当座', 2, '', 'SYSTEM', 'SYSTEM'),
     (114, 'MAIL_MAGAZINE_FLG', '0', '配信しない', '配信しない', 1, '', 'SYSTEM', 'SYSTEM'),
     (115, 'MAIL_MAGAZINE_FLG', '1', '配信する', '配信する', 2, '', 'SYSTEM', 'SYSTEM'),
     (116, 'YUBIN_KUBUN', '0', '空', '空', 1, '', 'SYSTEM', 'SYSTEM'),
     (117, 'YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', 'SYSTEM', 'SYSTEM')`,
];

function makeImportHelpers(getCtx: () => IntegrationTestContext) {
  // NICHINO_ADMIN does NOT hold dokusya.import.
  function asNichinoAdmin() {
    return getCtx().seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      permissions: ['dokusya.view'],
    });
  }
  function asJaHonten(jaId = 1) {
    return getCtx().seedSession({
      account_id: 11,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.import'],
    });
  }
  // Holds dokusya.import but m_account has neither 購読種別 flag.
  function asNoFlag(jaId = 1) {
    return getCtx().seedSession({
      account_id: 15,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.import'],
    });
  }
  // paper_flg のみ（denshi_flg=false）— [不具合修正2026-08] 取込の行単位
  // 購読種別ゲート（assertShubetsuFlag）検証用。
  function asPaperOnly(jaId = 1) {
    return getCtx().seedSession({
      account_id: 16,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.import'],
    });
  }
  // JA管理支店（kanri_shiten_id 固定）— [layer4-scope-guard] 不具合修正2026-08
  // の「自分の管理支店以外を Excel から指定できない」検証用。
  function asJaKanriShiten(jaId = 1, kanriShitenId = 101) {
    return getCtx().seedSession({
      account_id: 17,
      role_code: 'JA_KANRI_SHITEN',
      role_id: 5,
      ja_id: jaId,
      kanri_shiten_id: kanriShitenId,
      permissions: ['dokusya.view', 'dokusya.import'],
    });
  }
  return { asNichinoAdmin, asJaHonten, asNoFlag, asPaperOnly, asJaKanriShiten };
}

describe('ACSMS-SCR-016 integration — dokusya Excel import (template + bulk import)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: SCR016_SEED_SQL,
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);
  const { asNichinoAdmin, asJaHonten, asNoFlag } = makeImportHelpers(() => ctx);

  // ════════════════════════════════════════════════════════════════════════
  // ACSMS-API-016-001 — GET /api/v1/dokusya/import/template
  // ════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/dokusya/import/template', () => {
    it('should return 401 when the session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED
      await http().get(apiUrl('dokusya/import/template')).expect(401);
    });

    it('should return 403 when the role lacks dokusya.import (NICHINO_ADMIN)', async () => {
      // COVERS: §4.2 + err:FORBIDDEN
      const sid = await asNichinoAdmin();
      const res = await http()
        .get(apiUrl('dokusya/import/template'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 200 with xlsx mime + Japanese filename when JA_HONTEN with dokusya.import downloads the template', async () => {
      // COVERS: §4.4 — Content-Type + Content-Disposition + binary body
      const sid = await asJaHonten(1);
      const res = await http()
        .get(apiUrl('dokusya/import/template'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      const expectedUtf8 = `filename*=UTF-8''${encodeURIComponent('購読者Excelデータ取込_テンプレート.xlsx')}`;
      expect(res.headers['content-disposition']).toContain(expectedUtf8);
      expect(
        Buffer.isBuffer(res.body) ? res.body.length : res.text.length,
      ).toBeGreaterThan(0);
    });

    it('should ship a header row + one illustrative sample data row (row 2)', async () => {
      const sid = await asJaHonten(1);
      const dl = await http()
        .get(apiUrl('dokusya/import/template'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(dl.body);
      const sheet = wb.worksheets[0];
      expect(sheet.actualRowCount).toBe(2); // header + sample

      const header = (sheet.getRow(1).values as unknown[]).slice(1);
      const sample = (sheet.getRow(2).values as unknown[]).slice(1);
      // 顧客要件 2026-08: 購読者層分類の従属 4 項目を追加（46 → 50 列）。
      // それ以前: 読者情報変更適用日 / 購読中止日 を画面の入力欄へ移して列から撤去
      // （48 → 46。画面と列の二重入力源を作らないため）、購読種別を画面ラジオへ
      // （49 → 48）、販売店適用日を廃止し joho に統一。
      expect(header).toHaveLength(50);
      expect(header).not.toContain('購読種別'); // 撤去（画面ラジオで一括指定）
      expect(header).not.toContain('手続種類'); // 削除（取込で解約は扱わない）
      expect(header).toContain('購読者情報と同じ');
      expect(header).not.toContain('販売店適用日'); // 廃止（joho に統一）
      expect(header).not.toContain('読者情報変更適用日'); // 撤去（画面の入力欄へ）
      expect(header).not.toContain('購読中止日'); // 撤去（画面の入力欄＝一括中止）
      expect(String(sample[header.indexOf('備考')])).toContain('書き換えて');

      // 従属 4 項目は親の分類の直後に並べる（画面 SCR-011 の項目順・DB の列順と同じ）。
      // 取込は列名で突合するので順序自体は動作に影響しないが、テンプレートを
      // 目視で埋める顧客にとって親子が離れていると対応が読めない。
      for (const col of [
        'かつJAグループ役職員',
        '農業関係',
        '読者属性（その他の内容）',
        '主な生産物（その他の内容）',
      ]) {
        expect(header).toContain(col);
      }
      expect(header.indexOf('かつJAグループ役職員')).toBe(
        header.indexOf('購読者層分類') + 1,
      );
      expect(header.indexOf('主な生産物（その他の内容）')).toBe(
        header.indexOf('農業者分類') + 1,
      );
      // サンプル行も全列ぶん埋まっている（ヘッダとズレると顧客が列を取り違える）。
      expect(sample).toHaveLength(header.length);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-016-002 — POST /api/v1/dokusya/import
  // ════════════════════════════════════════════════════════════════════════
  describe('POST /api/v1/dokusya/import — auth + top-level validation', () => {
    it('should return 401 when the session cookie is missing', async () => {
      // COVERS: err:UNAUTHORIZED
      await http()
        .post(apiUrl('dokusya/import'))
        .send(buildImportBody())
        .expect(401);
    });

    it('should return 403 when the role lacks dokusya.import (NICHINO_ADMIN)', async () => {
      // COVERS: §4.2 + err:FORBIDDEN
      const sid = await asNichinoAdmin();
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should return 403 SHUBETSU_PERMISSION_DENIED when the account has neither 購読種別 flag', async () => {
      // account_concept.md §139-145 — no paper_flg/denshi_flg → Excel取込不可.
      const sid = await asNoFlag(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody())
        .expect(403);
      expect(res.body.error_code).toBe('SHUBETSU_PERMISSION_DENIED');
    });

    it('should return 400 VALIDATION_ERROR when import_mode is missing', async () => {
      // COVERS: §4.1 — import_mode 必須
      const sid = await asJaHonten(1);
      const body = buildImportBody();
      delete (body as Record<string, unknown>).import_mode;
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: any) => e.field);
      expect(fields).toContain('import_mode');
    });

    it('should return 400 VALIDATION_ERROR when selected_columns is empty', async () => {
      // COVERS: §4.1 — selected_columns 1件以上
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody({ selected_columns: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/dokusya/import — write path (requires real postgres)', () => {
    it('should return 400 IMPORT_VALIDATION_ERROR (not 500) when a NEW row leaves required FK columns blank (template sample case)', async () => {
      // Regression: blank required FKs slipped past the per-row FK checks
      // (which skip absent codes) and crashed the INSERT as a 500. They must
      // now surface as a graceful per-field IMPORT_VALIDATION_ERROR. Blank
      // FKs also avoid the ANY() lookups, so this runs in pg-mem.
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kanri_shiten_code: undefined,
                tanka_code: undefined,
                hanbaiten_code: undefined,
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('kanri_shiten_code');
      expect(fields).toContain('tanka_code');
      expect(fields).toContain('hanbaiten_code');
    });

    it('should return 400 ROW_LIMIT_EXCEEDED when rows exceed 5000', async () => {
      // COVERS: §4.1 — ROW_LIMIT_EXCEEDED. The DTO ArrayMaxSize check runs in
      // the ValidationPipe before any DB access, so this doesn't touch
      // pg-mem — building 5001 rows is cheap enough to run unconditionally
      // (previously skipped when the limit was 30000/30001, since building
      // 30001 rows was deemed impractical for this suite).
      const sid = await asJaHonten(1);
      const rows = Array.from({ length: 5001 }, (_v, i) =>
        buildImportRow({ kumiaiin_code: `K${i}` }),
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody({ rows }))
        .expect(400);
      expect(['ROW_LIMIT_EXCEEDED', 'VALIDATION_ERROR']).toContain(
        res.body.error_code,
      );
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// SCR-016 write path — real Postgres only (REAL_PG=1). The import issues
// `= ANY($1)` code lookups, `INSERT … RETURNING`, and dynamic UPDATE SET
// clauses pg-mem cannot run.
// ════════════════════════════════════════════════════════════════════════
describeRealPg(
  'ACSMS-SCR-016 integration — dokusya import write path (real postgres)',
  () => {
    let ctx: IntegrationTestContext;
    const { asJaHonten, asPaperOnly, asJaKanriShiten } = makeImportHelpers(() => ctx);

    beforeEach(async () => {
      ctx = await createRealPgIntegrationApp({
        modules: [DokusyaModule],
        seedSql: SCR016_SEED_SQL,
        // 電子版の作成/更新は同一tx内で電子版読者管理システムへ実HTTP push する
        // (DenshibanApiService.updateUserInfo → denshiban.apiUrl=host.docker.internal)。
        // bare jest 実行環境からは到達不可（docker-compose の denshiban-demo
        // ネットワーク越し専用 — 既存コミットで明文化済みの制約）。書込み成功を
        // 前提とする電子版テストのためスタブ化する。
        customize: (builder) =>
          builder.overrideProvider(DenshibanApiService).useValue({
            updateUserInfo: () =>
              Promise.resolve({ statusCode: '0', id: '123456', message: '' }),
          }),
      });
    });

    afterEach(async () => {
      await ctx.close();
    });

    const http = () => request(ctx.app.getHttpServer() as Server);

    it('should return 200 + persist a new dokusya scoped to caller JA when import_mode=NEW', async () => {
      // COVERS: §4.4/§4.6 happy path — INSERT … RETURNING + ANY(:codes)
      // lookups resolve tanka_code→tanka_id / hanbaiten_code→hanbaiten_id and
      // the rireki INSERT snapshots every shared column.
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody())
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          import_mode: 'NEW',
          total_rows: 1,
          created_count: 1,
        }),
      );
      expect(res.body.message).toContain('取り込みました');

      const [{ count }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = $1 AND deleted_at IS NULL`,
        [1],
      );
      expect(Number(count)).toBe(1);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (廃店) when a row selects a closed hanbaiten_code, and write nothing (バグ報告2026-08)', async () => {
      // COVERS: §4.3.2 — haiten_flg=true の販売店は NEW/UPDATE どちらでも
      // 選択不可。修正前は取込が成功してしまい、詳細画面にも廃店の旨が
      // 出ないため運用が気付けなかった。
      const sid = await asJaHonten(1);
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES (301, 1, 'HCLOSED', '廃店済み販売店', 'ﾊｲﾃﾝ',
                 '', '13', '1000001', '東京都千代田区', '', '', '',
                 '', '', '', '', '', '', '', NULL, true,
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KCLOSED', hanbaiten_code: 'HCLOSED' })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('hanbaiten_code');
      const [{ count }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KCLOSED'`,
      );
      expect(Number(count)).toBe(0);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when a 紙版 row selects the digital-only dummy hanbaiten_code (9999999999) (バグ報告2026-08)', async () => {
      // COVERS: §4.3.2 追加ルール — ダミー販売店(9999999999)は電子版単独購読者の
      // 「配達先の販売店が無い」受け皿。紙版で選択できてしまうと増減連絡票・
      // 名簿の配達担当が誤るため、紙版(dokusya_shubetsu≠2)からの選択は拒否する。
      const sid = await asJaHonten(1);
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES (998, 1, '9999999999', '電子版ダミー販売店', 'ﾀﾞﾐｰ',
                 '', '13', '1000001', '東京都千代田区', '', '', '',
                 '', '', '', '', '', '', '', NULL, false,
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            dokusya_shubetsu: 1, // 紙版
            rows: [
              buildImportRow({ kumiaiin_code: 'KDUMMY', hanbaiten_code: '9999999999' }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('hanbaiten_code');
      const [{ count }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KDUMMY'`,
      );
      expect(Number(count)).toBe(0);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (失効) when a row selects an expired tanka_code, and write nothing (バグ報告2026-08)', async () => {
      // COVERS: §4.3.1 — active_flg=false の単価は NEW/UPDATE どちらでも
      // 選択不可。修正前は取込が成功してしまい、詳細画面にも失効の旨が
      // 出ないため運用が気付けなかった。
      const sid = await asJaHonten(1);
      await ctx.dataSource.query(
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_type, tanka_code, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate, active_flg,
            tekiyo_start_date, tekiyo_end_date, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES (301, 1, 1, 'TEXPIRED', '失効済み単価', 3850, 3500, 10.00, false,
                 '2020-01-01', '2025-12-31', '',
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KEXPIRED', tanka_code: 'TEXPIRED' })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('tanka_code');
      const [{ count }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KEXPIRED'`,
      );
      expect(Number(count)).toBe(0);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when a row is 3:併読', async () => {
      // COVERS: §4.1 — 3:併読 はExcel取込み対象外 (ANY lookups precede the row check).
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody({ rows: [buildImportRow({ dokusya_shubetsu: 3 })] }))
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
    });

    it('should INSERT a new t_dokusya_rireki row on two UPDATE imports (regression: 履歴未作成)', async () => {
      // REGRESSION — TypeORM `manager.query()` returns `[rows, affectedCount]`
      // for UPDATE…RETURNING (not the bare rows array as for INSERT…RETURNING),
      // so the previous `result[0]?.dokusya_id` read undefined → affectedDokusyaId
      // null → writeRirekiSnapshot skipped → master updated but NO history row.
      // The unit mock returns the rows array directly so it can't catch this;
      // only real Postgres exposes the 2-element shape.
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];

      // NEW → 1 dokusya + rireki_no=1.
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KUPD1' })] }))
        .expect(200);

      const [{ dokusya_id: did }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya
           WHERE ja_id = 1 AND kumiaiin_code = 'KUPD1' AND deleted_at IS NULL`,
      );
      const rirekiCount = async (): Promise<number> => {
        const [{ c }] = await ctx.dataSource.query(
          `SELECT COUNT(*)::int AS c FROM t_dokusya_rireki WHERE dokusya_id = $1`,
          [did],
        );
        return Number(c);
      };
      expect(await rirekiCount()).toBe(1);

      // buildImportBody の既定 joho（today+2日）は、行の購読開始日
      // （nextMonthFirstIsoJst＝翌月1日）より前になり得るため明示指定
      // （不具合修正2026-08 — kumiaiin_code ストリップ修正で行が正しく
      // 引けるようになったところ、この日付の矛盾が新たに顕在化した）。
      const safeJoho = addDaysIso(nextMonthFirstIsoJst(), 5);

      // 1st UPDATE → a 2nd rireki row.
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            joho_henko_tekiyo_date: safeJoho,
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KUPD1', dokusya_busu: 5 })],
          }),
        )
        .expect(200);
      expect(await rirekiCount()).toBe(2);

      // 2nd UPDATE → a 3rd rireki row.
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            joho_henko_tekiyo_date: addDaysIso(safeJoho, 1),
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KUPD1', dokusya_busu: 9 })],
          }),
        )
        .expect(200);
      expect(await rirekiCount()).toBe(3);

      // 最新データ(saishin_data_flg)は as-of-today の有効行。UPDATE 取込の適用日
      // (joho_henko_tekiyo_date) は未来日（未来日のみルール・顧客要件 2026-07）の
      // ため、今日時点ではまだ有効化されず、saishin は更新前の行に残る。将来変更は
      // 履歴 (rireki 2, 3) として積まれる。ここでの回帰ガードは「UPDATE で履歴が
      // 作成されること」(count 1→2→3) と、最後の取込値が履歴に載ることの2点。
      const saishin = await ctx.dataSource.query(
        `SELECT rireki_no FROM t_dokusya_rireki
           WHERE dokusya_id = $1 AND saishin_data_flg = true`,
        [did],
      );
      // saishin は常にちょうど1行（bitemporal 不変条件）。
      expect(saishin).toHaveLength(1);
      // 最後に取り込んだ変更（最大 rireki_no）が編集値 購読部数=9 を保持する。
      const lastChange = await ctx.dataSource.query(
        `SELECT rireki_no, dokusya_busu FROM t_dokusya_rireki
           WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [did],
      );
      expect(Number(lastChange[0].rireki_no)).toBe(3);
      expect(Number(lastChange[0].dokusya_busu)).toBe(9);
    });

    it('should cascade a retroactive UPDATE import that inserts a joho date BETWEEN two existing history rows (遡及カスケード — Excel取込, cascade計画書§5オープンクエスチョン3の統合確認)', async () => {
      // dokusya_rireki_cascade_implementation_plan.md §2.5 は「Excel取込は
      // applyChange 経由のため Phase 1 のカスケード修正は自動的に効くはずだが、
      // 統合テストで『取込が遡及日付を作るケース』を確認しておくとよい」と書き、
      // §5 オープンクエスチョン3として明示的に未確認のまま残していた。本テストは
      // その確認そのもの — 既存2回の適用日 (johoA/johoB) の "間" (johoC) へ
      // 3回目の UPDATE を取込み、johoB 行がキャリーフォワードしていた
      // 購読部数(busu)を johoC の値へ追随して更新し、johoB 行自身が明示的に
      // 変更した販売店(hanbaiten)はカスケードで上書きされない（zenkai relinkのみ）
      // ことを検証する。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];

      // NEW → rireki #1: busu=3, hanbaiten=H001(id=5)。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KCASC1', dokusya_busu: 3, hanbaiten_code: 'H001' })],
          }),
        )
        .expect(200);

      const [{ dokusya_id: did }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya
           WHERE ja_id = 1 AND kumiaiin_code = 'KCASC1' AND deleted_at IS NULL`,
      );

      const kaishi = nextMonthFirstIsoJst();
      const johoA = addDaysIso(kaishi, 10); // 例: "1/4" 相当 — busu を明示変更
      const johoB = addDaysIso(kaishi, 20); // 例: "5/4" 相当 — hanbaiten を明示変更
      const johoC = addDaysIso(kaishi, 15); // 例: "3/4" 相当 — A/B の間へ遡及挿入、busu を明示変更

      // UPDATE A (johoA): busu 3→5（明示変更）。hanbaiten は未選択＝前値(H001)を維持。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            joho_henko_tekiyo_date: johoA,
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KCASC1', dokusya_busu: 5 })],
          }),
        )
        .expect(200);

      // UPDATE B (johoB): hanbaiten H001→H002（明示変更）。busu は未選択のため
      // 挿入時点の前値（#2 の 5）をキャリーフォワードするだけの行になる。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            joho_henko_tekiyo_date: johoB,
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'hanbaiten_code'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KCASC1', hanbaiten_code: 'H002' })],
          }),
        )
        .expect(200);

      // ここまでの履歴チェーン: #1(K, busu3,H001) → #2(johoA, busu5,H001[carry])
      // → #3(johoB, busu5[carry], H002[明示])。

      // UPDATE C (johoC, A と B の間へ遡及挿入): busu 5→9（明示変更）。hanbaiten は
      // 未選択＝挿入時点の前行(#2, H001)を継承する。この挿入により #3(johoB) の
      // 直前行が #2 から本行へ差し替わり、カスケードが発火する。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            joho_henko_tekiyo_date: johoC,
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KCASC1', dokusya_busu: 9 })],
          }),
        )
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT rireki_no, joho_henko_tekiyo_date::text AS joho, dokusya_busu, zenkai_dokusya_busu,
                hanbaiten_id, zenkai_hanbaiten_id
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1
          ORDER BY joho_henko_tekiyo_date ASC, rireki_no ASC`,
        [did],
      );
      expect(rows).toHaveLength(4);
      const [r1, r2, rC, r3] = rows; // joho 昇順: K, johoA, johoC, johoB

      // #1 新規: busu=3, hanbaiten=H001(id=5)。
      expect(Number(r1.dokusya_busu)).toBe(3);
      expect(Number(r1.hanbaiten_id)).toBe(5);

      // #2 (johoA): 明示変更した busu=5 のまま（挿入行 johoC より前なので触られない）。
      expect(Number(r2.dokusya_busu)).toBe(5);
      expect(Number(r2.hanbaiten_id)).toBe(5); // H001, 未変更

      // 挿入行 (johoC): busu=9（明示変更）。hanbaiten は前行(#2, H001)を継承。
      expect(Number(rC.dokusya_busu)).toBe(9);
      expect(Number(rC.zenkai_dokusya_busu)).toBe(5); // 前行(#2)の busu を継承
      expect(Number(rC.hanbaiten_id)).toBe(5); // H001 を継承（キャリーフォワード）

      // #3 (johoB, もともとの3回目) — カスケードの本題:
      //  - busu: 挿入前は #2(5) をキャリーフォワードしていただけ(5==5) だったので、
      //    挿入後は新しい直前行(johoC, busu=9)へ追随して 9 へ更新される。
      //  - hanbaiten: この行自身が H001→H002 へ明示的に変更した行なので、
      //    現在値(H002)は不変。zenkai だけ新しい直前行(johoC, H001)へ relink。
      expect(Number(r3.dokusya_busu)).toBe(9); // カスケードで 5→9
      expect(Number(r3.zenkai_dokusya_busu)).toBe(9); // relink 後は前行と同値
      expect(Number(r3.hanbaiten_id)).toBe(7); // H002 のまま（意図的変更・不変）
      expect(Number(r3.zenkai_hanbaiten_id)).toBe(5); // relink: 前行(johoC)のH001(id=5)
    });

    it('should preserve the existing todofuken_code (not crash 500) when the column is selected but the UPDATE row leaves it blank', async () => {
      // REGRESSION — todofuken_code is a real FK to m_todofuken (t_dokusya_rireki
      // too). Unlike kanri_shiten_code/shiten_code/hanbaiten_code/tanka_code,
      // it wasn't treated as optionalFk, so selecting the column while the row's
      // cell is blank sent '' → FK violation → unhandled 500 (only reproduces
      // against real Postgres; pg-mem doesn't enforce the FK).
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KTODO1', todofuken_code: '13' })],
          }),
        )
        .expect(200);
      const [{ dokusya_id: did }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya
           WHERE ja_id = 1 AND kumiaiin_code = 'KTODO1' AND deleted_at IS NULL`,
      );

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            // buildImportBody の既定 joho（today+2日）は、行の購読開始日
            // （nextMonthFirstIsoJst＝翌月1日）より前になり得るため明示指定
            // （不具合修正2026-08 — kumiaiin_code ストリップ修正で行が正しく
            // 引けるようになったところ、この日付の矛盾が新たに顕在化した）。
            joho_henko_tekiyo_date: addDaysIso(nextMonthFirstIsoJst(), 5),
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu', 'todofuken_code'],
            rows: [
              buildImportRow({
                dokusya_id: Number(did),
                kumiaiin_code: 'KTODO1',
                dokusya_busu: 5,
                todofuken_code: undefined,
              }),
            ],
          }),
        )
        .expect(200);

      const [{ dokusya_busu, todofuken_code }] = await ctx.dataSource.query(
        `SELECT dokusya_busu, todofuken_code FROM t_dokusya_rireki
           WHERE dokusya_id = $1 ORDER BY rireki_no DESC LIMIT 1`,
        [did],
      );
      expect(Number(dokusya_busu)).toBe(5);
      expect(todofuken_code).toBe('13');
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (joho < 購読開始日) on UPDATE import (顧客要件 2026-07)', async () => {
      // §4.1 適用日整合性 — 読者情報変更適用日 >= 購読開始日(before)。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KDATE1' })] }))
        .expect(200);
      const [{ dokusya_id: did }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KDATE1'`,
      );
      // master の購読開始日を未来へ → joho=当日 が kaishi 未満になる。
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_kaishi_date = '2030-01-01'
           WHERE ja_id = 1 AND kumiaiin_code = 'KDATE1'`,
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: Number(did), kumiaiin_code: 'KDATE1', dokusya_busu: 5 })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('joho_henko_tekiyo_date');
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (joho < 購読開始日) — 紙版 UPDATE reproducing the user-provided Excel file (購読者Excelデータ取込_テンプレート-v3), joho=当日 explicitly picked on the not-yet-started subscriber picker', async () => {
      // ユーザー提供の実ファイル（docs/購読者Excelデータ取込_テンプレート-v3.xlsx）を
      // 実際にパースした値そのままで再現する。紙版・購読開始日=2026-08-20（翌日）。
      // このテストは v1.16 の修正（電子版の適用日省略デフォルト値）とは独立 — joho は
      // 画面のピッカーで明示的に選択された値（省略ではない）なので、既存の
      // collectTekiyoDateViolations（joho < 購読開始日）がそのまま効くはずかを確認する。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      // ファイルが参照する管理支店/新聞単価/販売店コードを ja_id=1 に整備する。
      await ctx.dataSource.query(
        `INSERT INTO m_todofuken (todofuken_code, todofuken_name, todofuken_name_kana)
         VALUES ('20', '長野県', 'ナガノケン')`,
      );
      await ctx.dataSource.query(
        `INSERT INTO m_kanri_shiten
           (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
            yubin_no, todofuken_code, address, tel, fax, biko, paper_flg, denshi_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES (201, 1, '116-5503-000', '松本管理支店', 'ﾏﾂﾓﾄ', '3900874', '20', '長野県松本市', '', '', '', true, true,
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      await ctx.dataSource.query(
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_type, tanka_code, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate, tekiyo_start_date, tekiyo_end_date, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES (201, 1, 1, 'T0002', '購読料（テスト）', 3850, 3500, 10.00, '2024-01-01', NULL, '',
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi, biko,
            haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES (201, 1, '0000000004', '松本販売店', 'ﾏﾂﾓﾄ',
                 '', '20', '3900874', '長野県松本市大手1-1-1', '', '', '',
                 '', '', '', '', '', '', '', NULL, false,
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      // [layer4-scope-guard] shiten_code は buildImportRow() 既定で 'SH001'
      // （KS001(101) 配下）。ファイル1行目は kanri_shiten_code を上で作成した
      // 松本管理支店(201)へ差し替えるが、支店は指定しないため、201 配下の
      // 支店を1件用意して excelRow 側で shiten_code を揃える
      // （不具合修正2026-08 — 管理支店/支店の親子関係チェック追加に伴う対応）。
      await ctx.dataSource.query(
        `INSERT INTO m_shiten
           (shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
            kinyu_shiten_flg,
            jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
            jastem_tyokin_shubetsu, jastem_koza_no,
            kanri_shiten_id, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES (1201, 1, 'SH-MTMT01', '松本支店', 'ﾏﾂﾓﾄ',
                 TRUE, '004', '松本', '1', '9876543',
                 201, '',
                 NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );

      // ファイル1行目をそのまま JSON 化（ID列は除く＝新規作成で採番させる）。
      const excelRow = {
        kanri_shiten_code: '116-5503-000',
        shiten_code: 'SH-MTMT01',
        kumiaiin_code: 'MHV-002',
        // 元の実ファイル値は「松本松QA-1」（ハイフン混入）だったが、shimei_sei に
        // KANJI_NAME_RE 書式チェックを追加した際（不具合修正2026-08・UIとの
        // 整合）ハイフンは許容文字集合に無く弾かれるため、記号を除いた値へ
        // 置き換える（UI の作成/編集画面でも同じ理由でこの値は元々保存できない）。
        shimei_sei: '松本松QA1',
        shimei_mei: '一郎',
        shimei_kana_sei: 'まつもと',
        shimei_kana_mei: 'いちろう',
        dokusya_busu: 3,
        tanka_code: 'T0002',
        email: 'vqa.test14@gmail.com',
        birth_year: 1976,
        gender: 1,
        yubin_no: '3900874',
        todofuken_code: '20',
        shikuchoson: '松本市',
        chome_banchi: '大手1-1-1',
        renrakusaki_1: '0263321111',
        hanbaiten_code: '0000000004',
        yubin_kubun: '0',
        shiharai_hoho: 2,
        dokusyaryo_shiharai_cycle: 1,
        dokusyaso_bunrui: '0',
        nogyosya_bunrui: '0',
        // ファイルの値は絶対日付だったが、実行日に対して相対的に「翌日」で
        // なければ再現条件（joho=当日 < 購読開始日）が崩れるため、日付ドリフト
        // で壊れないよう相対値に置き換える（不具合修正2026-08）。
        dokusya_kaishi_date: addDaysIso(todayIsoJst(), 1),
        biko: 'SCR-011 検証用サンプル1（紙版・配達先=購読者情報と同じ）',
      };

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            dokusya_shubetsu: 1, // 紙版
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code'],
            rows: [buildImportRow(excelRow)],
          }),
        )
        .expect(200);
      const [{ dokusya_id: id }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'MHV-002'`,
      );
      const [{ count: beforeCount }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya_rireki WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(beforeCount)).toBe(1);

      // 「すべて選択」＋IDのみ追加で再取込（ユーザーの再現手順どおり）。
      // 画面の 読者情報変更適用日 ピッカーで「当日」（＝過去日disableの一番早い選択肢）
      // を選んだ想定 — 購読開始日(翌日)より前になる。
      const ALL_COLUMNS = [
        'dokusya_id', 'kanri_shiten_code', 'shiten_code', 'kumiaiin_code',
        'shimei_sei', 'shimei_mei', 'shimei_kana_sei', 'shimei_kana_mei',
        'dokusya_busu', 'tanka_code', 'email', 'mail_magazine_flg', 'birth_year', 'gender',
        'yubin_no', 'todofuken_code', 'shikuchoson', 'chome_banchi', 'tatemono_mei',
        'renrakusaki_1', 'renrakusaki_2', 'haitatsu_same_flg',
        'haitatsu_yubin_no', 'haitatsu_todofuken_code', 'haitatsu_shikuchoson',
        'haitatsu_chome_banchi', 'haitatsu_tatemono_mei', 'haitatsu_renrakusaki_1',
        'haitatsu_renrakusaki_2', 'haitatsu_shimei_sei', 'haitatsu_shimei_mei',
        'haitatsu_shimei_kana_sei', 'haitatsu_shimei_kana_mei', 'hanbaiten_code',
        'yubin_kubun', 'shiharai_hoho', 'dokusyaryo_shiharai_cycle',
        'hikiotoshi_yokin_shubetsu', 'bank_branch_code', 'bank_branch_name',
        'hikiotoshi_koza_no', 'hikiotoshi_koza_meigi', 'dokusyaso_bunrui',
        'ja_yakushokuin_flg', 'nogyo_kankei_flg', 'dokusyaso_bunrui_sonota',
        'nogyosya_bunrui', 'nogyosya_bunrui_sonota', 'biko',
      ];
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            dokusya_shubetsu: 1,
            selected_columns: ALL_COLUMNS,
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [buildImportRow({ ...excelRow, dokusya_id: Number(id) })],
          }),
        )
        .expect(400);

      const [{ count: afterCount }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya_rireki WHERE dokusya_id = $1`,
        [id],
      );

      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('joho_henko_tekiyo_date');
      expect(Number(afterCount)).toBe(1);
    });

    it('should NOT cross-write dokusya_busu between two rows sharing the same kumiaiin_code on UPDATE (バグ報告 2026-08: ユーザー提供ファイルの2行 88685/88686 MHV-002 再現)', async () => {
      // ユーザー提供ファイル（購読者Excelデータ取込_テンプレート-v3.xlsx）は2行とも
      // 組合員コード='MHV-002' で重複している（kumiaiin_code は UNIQUE 制約なし・
      // 仕様上許容）。dokusya_id は両行とも指定されているので曖昧キー防止ガード
      // （isAmbiguousKumiaiinKey）には掛からないはずだが、実際の更新対象解決
      // （resolveImportTargetId, dokusya-import.service.ts:1010）は
      //   WHERE (dokusya_id = $2 OR kumiaiin_code = $3) LIMIT 1
      // という OR 条件で、ORDER BY が無い。2行が同じ kumiaiin_code を持つ場合、
      // 行1の検索も行2の検索も「dokusya_id = 該当ID」だけでなく「kumiaiin_code =
      // 'MHV-002'」にも一致する行（＝もう片方の購読者）を LIMIT 1 で拾える余地があり、
      // 更新対象が意図した dokusya_id と一致する保証が無い。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            dokusya_shubetsu: 1,
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code'],
            rows: [
              buildImportRow({ kumiaiin_code: 'MHV-002', dokusya_busu: 3, email: 'dup-a@example.com' }),
              buildImportRow({ kumiaiin_code: 'MHV-002', dokusya_busu: 7, email: 'dup-b@example.com' }),
            ],
          }),
        )
        .expect(200);
      const created: Array<{ dokusya_id: number; dokusya_busu: number }> =
        await ctx.dataSource.query(
          `SELECT dokusya_id, dokusya_busu FROM t_dokusya
             WHERE ja_id = 1 AND kumiaiin_code = 'MHV-002' ORDER BY dokusya_id`,
        );
      expect(created).toHaveLength(2);
      const idA = created.find((r) => Number(r.dokusya_busu) === 3)!.dokusya_id;
      const idB = created.find((r) => Number(r.dokusya_busu) === 7)!.dokusya_id;
      expect(idA).toBeDefined();
      expect(idB).toBeDefined();

      // A は5部・B は9部へ、それぞれ dokusya_id を明示して同一バッチで更新する。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            dokusya_shubetsu: 1,
            selected_columns: ['dokusya_id', 'dokusya_busu'],
            joho_henko_tekiyo_date: futureDate(20),
            rows: [
              buildImportRow({ dokusya_id: Number(idA), kumiaiin_code: 'MHV-002', dokusya_busu: 5 }),
              buildImportRow({ dokusya_id: Number(idB), kumiaiin_code: 'MHV-002', dokusya_busu: 9 }),
            ],
          }),
        )
        .expect(200);

      // 適用日を未来にしたため master(t_dokusya) は当日時点でまだ未反映（正しい挙動）。
      // 各 dokusya_id の最新（取消除外）履歴行の dokusya_busu で、更新が正しい
      // dokusya_id 側へ書かれたかを確認する。
      const [rowA, rowB] = await Promise.all([
        ctx.dataSource.query(
          `SELECT dokusya_busu FROM t_dokusya_rireki
             WHERE dokusya_id = $1 AND torikeshi_flg = false
             ORDER BY joho_henko_tekiyo_date DESC, rireki_no DESC LIMIT 1`,
          [idA],
        ),
        ctx.dataSource.query(
          `SELECT dokusya_busu FROM t_dokusya_rireki
             WHERE dokusya_id = $1 AND torikeshi_flg = false
             ORDER BY joho_henko_tekiyo_date DESC, rireki_no DESC LIMIT 1`,
          [idB],
        ),
      ]);
      const rirekiCounts = await ctx.dataSource.query(
        `SELECT dokusya_id, COUNT(*)::int AS c FROM t_dokusya_rireki WHERE dokusya_id IN ($1,$2) GROUP BY dokusya_id`,
        [idA, idB],
      );
      // 各 dokusya_id にちょうど2件（NEW作成分 + 今回のUPDATE分）——誤って
      // 片方に2件・もう片方に0件積み上がっていないこと。
      for (const row of rirekiCounts) {
        expect(Number(row.c)).toBe(2);
      }
      expect(Number(rowA[0].dokusya_busu)).toBe(5);
      expect(Number(rowB[0].dokusya_busu)).toBe(9);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (joho < 購読開始日) — 電子版 UPDATE with joho omitted on a not-yet-started subscriber does NOT create a bogus t_dokusya_rireki row (バグ報告 2026-08)', async () => {
      // 再現手順（ユーザー報告）: 電子版を NEW 取込（購読開始日=翌月1日、まだ未到来）
      // → 同じ内容を UPDATE 取込で再取込（電子版は適用日欄が disable なので
      // joho_henko_tekiyo_date は省略）。修正前は書込み側が省略時に当日を補うため
      // joho(当日) < 購読開始日(翌月1日) となり、共通ライタ applyChange の
      // findBefore(joho=当日) が直前行なしと誤判定 → before=null 起点の不完全な
      // 履歴行が余分に作られていた。修正後は本チェックが当日デフォルトを見越して
      // 検証するため 400 で弾かれ、履歴行は1件（NEW時点の1件）のまま増えない。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      // 電子版の作成は resolveJacd で kanri_shiten_code の形式(10桁数字)を検証する
      // （seed既定の 'KS001' は英字混じりで CLOUD エラーになる）。
      await ctx.dataSource.query(
        `UPDATE m_kanri_shiten SET kanri_shiten_code = '1300000101' WHERE kanri_shiten_id = 101`,
      );
      // 電子版の取込にはダミー販売店（販売店コード:9999999999）の事前登録が必要
      // （assertDigitalDummyHanbaitenAvailable）。
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi,
            biko, haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (999, 1, '9999999999', '電子版ダミー販売店', 'ﾀﾞﾐｰ',
            '', '13', '1000001', '東京都千代田区', '', '', '',
            '', '', '', '', '', '', '', NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            dokusya_shubetsu: 2, // 電子版
            // 電子版は email / dokusyaso_bunrui が追加必須（既定13列に含まれない）。
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code', 'email', 'dokusyaso_bunrui'],
            rows: [
              buildImportRow({
                kumiaiin_code: 'KDIGSTART',
                email: 'kdigstart@example.com',
                dokusya_busu: 1, // 電子版は1固定
                hanbaiten_code: '9999999999', // 電子版はダミー販売店固定
                kanri_shiten_code: '1300000101', // resolveJacd 用に10桁化した値に合わせる
                // dokusya_kaishi_date はデフォルト(nextMonthFirstIsoJst()=未到来)のまま。
              }),
            ],
          }),
        )
        .expect(200);
      const [{ dokusya_id: id }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KDIGSTART'`,
      );
      const [{ count: beforeCount }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya_rireki WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(beforeCount)).toBe(1);

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            dokusya_shubetsu: 2,
            selected_columns: ['dokusya_id', 'dokusya_busu'],
            joho_henko_tekiyo_date: undefined, // 電子版は適用日欄が disable → 省略
            rows: [buildImportRow({ dokusya_id: Number(id), dokusya_busu: 1 })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('joho_henko_tekiyo_date');

      // 履歴行が増えていないこと（バグ再現時は before=null 起点の余分な行が作られていた）。
      const [{ count: afterCount }] = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya_rireki WHERE dokusya_id = $1`,
        [id],
      );
      expect(Number(afterCount)).toBe(1);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when 紙版 UPDATE changes a 帳票影響項目 (dokusya_busu) with joho=当日 — 予約変更が必要 (顧客要件 2026-07 改訂)', async () => {
      // §4.1 種別依存の適用日ルール（UI/取込/置換で統一）: 紙版は当日変更可だが
      // 帳票影響項目（部数/販売店/住所）は当日反映不可 → 未来日（予約変更）を要求する。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      // NEW（紙版・busu=1）で作成。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KDATE0', dokusya_busu: 1 })],
          }),
        )
        .expect(200);
      // 購読開始日を過去へ（NEW は未来日で作成されるため、当日 joho が
      // 購読開始日以降となるよう調整。相対チェックではなく当日ルールを検証する）。
      const [{ dokusya_id: did0 }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KDATE0'`,
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_kaishi_date = '2020-01-01'
           WHERE ja_id = 1 AND kumiaiin_code = 'KDATE0'`,
      );
      // UPDATE で部数(帳票影響項目)を当日変更 → 拒否。
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
                dokusya_id: Number(did0),
                kumiaiin_code: 'KDATE0',
                dokusya_busu: 9, // 1 → 9（帳票影響項目の変更）
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      // 当日は許容されるが帳票影響項目の変更で dokusya_busu にエラー。
      expect(fields).toContain('dokusya_busu');
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when 販売店 is changed on 当日 UPDATE (紙版)', async () => {
      // [hanbaiten-key] REPORT_FIELD_PAIRS は販売店を `hanbaiten_id` で見るが、
      // 取込行は `hanbaiten_code` で持つ。変換しないと販売店の変更だけが
      // 帳票影響項目として検出されず、「当日変更で販売店は変えられない」ルールが
      // Excel 経路からすり抜ける（SCR-011 画面では機能していた）。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KHAN01', hanbaiten_code: 'H001' })],
          }),
        )
        .expect(200);
      // 購読開始日を過去へ。NEW は未来日で作るため、これが無いと joho=当日 が
      // 「購読開始日以降」の相対チェックにも触れ、当日ルール単体の検証にならない。
      const [{ dokusya_id: didHan }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KHAN01'`,
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_kaishi_date = '2020-01-01'
          WHERE ja_id = 1 AND kumiaiin_code = 'KHAN01'`,
      );

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'hanbaiten_code'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
                dokusya_id: Number(didHan),
                kumiaiin_code: 'KHAN01',
                hanbaiten_code: 'H002', // H001 → H002（同一 JA の別店＝帳票影響）
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      // エラー項目は Excel の列名で返る（利用者に `hanbaiten_id` を見せても通じない）。
      expect(fields).toContain('hanbaiten_code');
      expect(fields).not.toContain('hanbaiten_id');
    });

    it('should ACCEPT 当日 UPDATE when a selected 帳票影響項目 holds the SAME value', async () => {
      // 既存値ロード漏れの回帰: 既存レコード取得の SELECT に帳票影響項目が無いと、
      // Excel の値が undefined と比較されて「値が同じ行」でも常に変更ありと誤判定し、
      // 紙版の当日取込が理由なく弾かれていた。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KHAN02', yubin_no: '1000001' })],
          }),
        )
        .expect(200);
      // 購読開始日と履歴の適用日を過去へ揃える。NEW は両方を未来日で作るため、
      // master だけ過去にすると joho=当日 の前行が見つからず（findBefore が
      // `joho <= 当日` で空）、履歴生成が ja_id NULL で落ちる。製品上は起きない
      // 組み合わせで、テスト用の状態を作るための調整。
      const [{ dokusya_id: didHan02 }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KHAN02'`,
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_kaishi_date = '2020-01-01'
          WHERE ja_id = 1 AND kumiaiin_code = 'KHAN02'`,
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya_rireki SET joho_henko_tekiyo_date = '2020-01-01',
                                     dokusya_kaishi_date = '2020-01-01'
          WHERE dokusya_id IN (
            SELECT dokusya_id FROM t_dokusya
             WHERE ja_id = 1 AND kumiaiin_code = 'KHAN02')`,
      );

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'yubin_no'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
                dokusya_id: Number(didHan02),
                kumiaiin_code: 'KHAN02',
                yubin_no: '1000001', // 既存と同値 → 変更ではない
              }),
            ],
          }),
        )
        .expect(200);
      expect(res.body.data.updated_count).toBe(1);
    });

    // NOTE: 「紙版 当日 + 非帳票項目 → 200」の正常系は、取込 NEW が購読開始日を
    // 未来日で作るため過去開始日の購読者を取込だけで用意できず（raw 更新は
    // master/履歴の整合を崩し書込経路が別要因で失敗する）、統合では検証しない。
    // ルール自体は dokusya-shubetsu.rules.spec.ts（collectTodayModeReportViolations
    // が非帳票項目で空を返す）+ UI 当日変更モードの単体テストで担保する。

    it('should return 400 IMPORT_VALIDATION_ERROR (購読開始日=当日) on NEW import — 未来日のみ (顧客要件 2026-07)', async () => {
      // §4.1 — NEW取込の購読開始日(=情報変更適用日)は未来日のみ（当日・過去日 不可）。
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KDATE9',
                dokusya_kaishi_date: todayIsoJst(),
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('dokusya_kaishi_date');
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (読者情報変更適用日 >= 解約予定日) on UPDATE import', async () => {
      // §4.1 適用日整合性 — 適用日(joho) < 解約予定日(before)。販売店適用日は廃止し
      // joho に統一（顧客要件 2026-07）ので、範囲違反は joho フィールドで返る。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KDATE2' })] }))
        .expect(200);
      const [{ dokusya_id: didDate2 }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KDATE2'`,
      );
      await ctx.dataSource.query(
        `UPDATE t_dokusya SET dokusya_chushi_date = '2026-08-01'
           WHERE ja_id = 1 AND kumiaiin_code = 'KDATE2'`,
      );
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'kumiaiin_code', 'dokusya_busu'],
            joho_henko_tekiyo_date: '2026-09-01',
            rows: [
              buildImportRow({
                dokusya_id: Number(didDate2),
                kumiaiin_code: 'KDATE2',
                dokusya_busu: 5, // >= chushi & >= today
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('joho_henko_tekiyo_date');
    });

    // ── 一括中止（顧客要件 2026-08）— 中止日を指定した取込は解約予約を入れるだけ ──
    it('should insert a 解約予約 row and reflect the 中止日 on master (紙版 一括中止)', async () => {
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KSTOP1' })] }),
        )
        .expect(200);
      const [{ dokusya_id: id }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSTOP1'`,
      );

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id'],
            joho_henko_tekiyo_date: undefined,
            dokusya_chushi_date: '2099-05-31',
            rows: [buildImportRow({ dokusya_id: Number(id) })],
          }),
        )
        .expect(200);
      expect(res.body.data.import_mode).toBe('UPDATE');

      // 予約行: 部数0・中止日あり・kaiyaku_flg=false（確定は到来日バッチ）。
      const [reservation] = await ctx.dataSource.query(
        `SELECT dokusya_busu, dokusya_chushi_date, kaiyaku_flg, torikeshi_flg
           FROM t_dokusya_rireki
          WHERE dokusya_id = $1 AND dokusya_chushi_date IS NOT NULL
          ORDER BY rireki_no DESC LIMIT 1`,
        [id],
      );
      expect(Number(reservation.dokusya_busu)).toBe(0);
      expect(reservation.kaiyaku_flg).toBe(false);
      expect(reservation.torikeshi_flg).toBe(false);

      // 中止日は予約時点で master にも出る（一覧/詳細へ即時表示するため）。
      const [master] = await ctx.dataSource.query(
        `SELECT dokusya_chushi_date, tetsuzuki_shurui FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(String(master.dokusya_chushi_date)).toContain('2099-05-31');
      // 解約の確定は到来日バッチ。取込時点では購読中のまま。
      expect(Number(master.tetsuzuki_shurui)).toBe(1);
    });

    it('should reject 電子版 一括中止 when 請求開始月 is not set (料金徴収未開始)', async () => {
      // SCR-014 の購読中止は請求開始月が未設定の電子版を停止させない。取込にも
      // 同じルールを適用する（画面からはできないのに Excel からはできる、を作らない）。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            dokusya_shubetsu: 2, // 電子版
            rows: [
              buildImportRow({
                kumiaiin_code: 'KSEIKYU',
                email: 'seikyu@example.com',
                dokusya_busu: 1, // 電子版は1固定
              }),
            ],
          }),
        )
        .expect(200);
      const [{ dokusya_id: id }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSEIKYU'`,
      );
      // 取込 NEW は請求開始月を設定しない → 未設定のまま。

      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            dokusya_shubetsu: 2,
            selected_columns: ['dokusya_id'],
            joho_henko_tekiyo_date: undefined,
            dokusya_chushi_date: '2099-05-31',
            rows: [buildImportRow({ dokusya_id: Number(id) })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const msgs = (res.body.errors ?? []).map(
        (e: { message: string }) => e.message,
      );
      expect(msgs.join()).toContain('徴収はまだ開始されていません');
    });

    it('should NOT write other columns on 一括中止 even when they are selected', async () => {
      // 一括中止は「解約予約を入れる」だけ。画面も列グリッドをキー列へ縮退させるが、
      // 直接呼ばれても他の列を書かないことを BE 側で担保する。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            rows: [buildImportRow({ kumiaiin_code: 'KSTOP2', dokusya_busu: 3 })],
          }),
        )
        .expect(200);
      const [{ dokusya_id: id }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSTOP2'`,
      );

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'biko'],
            joho_henko_tekiyo_date: undefined,
            dokusya_chushi_date: '2099-05-31',
            rows: [
              buildImportRow({ dokusya_id: Number(id), biko: '書き込まれないはず' }),
            ],
          }),
        )
        .expect(200);

      const [master] = await ctx.dataSource.query(
        `SELECT biko FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(String(master.biko ?? '')).not.toContain('書き込まれないはず');
    });

    it('should reject 一括中止 (bulk-stop) when 2+ existing subscribers share the same kumiaiin_code and the row has no dokusya_id (誤解約防止・不具合報告2026-08)', async () => {
      // 組合員コードは重複可（DB に UNIQUE 制約なし）。ID を指定せず組合員コードだけで
      // 一括中止すると、どちらの読者を解約したいのか一意に決まらない。
      // classifyImportRow の isAmbiguousKumiaiinKey ガードが Phase 1（トランザクション
      // 開始前）で弾き、DB に一切書き込まないことを確認する。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      const DUP_CODE = 'KDUP-AMBIG';
      // kumiaiin_code / shimei_sei は NEW モードの必須列一覧に含まれないため、
      // このテストで組合員コードを実際に保存させるには明示的に選択する必要がある
      // （選択されない列は #57893 の stripUnselectedColumns で空欄化される）。
      const newSelectedColumns = [
        ...buildImportRequiredColumns(),
        'kumiaiin_code',
        'shimei_sei',
      ];

      // 同一 JA 内に同じ組合員コードを持つ読者を2人作る。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            selected_columns: newSelectedColumns,
            rows: [buildImportRow({ kumiaiin_code: DUP_CODE, shimei_sei: '一人目' })],
          }),
        )
        .expect(200);
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            selected_columns: newSelectedColumns,
            rows: [buildImportRow({ kumiaiin_code: DUP_CODE, shimei_sei: '二人目' })],
          }),
        )
        .expect(200);
      const dupRows: Array<{ dokusya_id: number }> = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = $1 ORDER BY dokusya_id`,
        [DUP_CODE],
      );
      expect(dupRows).toHaveLength(2);

      // ID を指定せず組合員コードのみで一括中止を試みる → 拒否されるはず。
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id'],
            joho_henko_tekiyo_date: undefined,
            dokusya_chushi_date: '2099-05-31',
            rows: [buildImportRow({ kumiaiin_code: DUP_CODE, dokusya_id: undefined })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const errors = (res.body.errors ?? []) as Array<{
        field: string;
        message: string;
      }>;
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'kumiaiin_code',
          message: '組合員コードが重複しているため、IDを指定してください。',
        }),
      );

      // どちらの読者も解約されていないこと（Phase 1 で弾かれ DML 未実行）。
      const afterRows = await ctx.dataSource.query(
        `SELECT dokusya_id, dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = ANY($1::bigint[])`,
        [dupRows.map((r) => r.dokusya_id)],
      );
      for (const row of afterRows) {
        expect(row.dokusya_chushi_date).toBeNull();
      }
    });

    it('should allow 一括中止 (bulk-stop) via kumiaiin_code when it is unambiguous (only 1 match), and via dokusya_id even when kumiaiin_code is ambiguous', async () => {
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      const DUP_CODE = 'KDUP-BYID';
      const newSelectedColumns = [
        ...buildImportRequiredColumns(),
        'kumiaiin_code',
        'shimei_sei',
      ];

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            selected_columns: newSelectedColumns,
            rows: [buildImportRow({ kumiaiin_code: DUP_CODE, shimei_sei: '一人目' })],
          }),
        )
        .expect(200);
      const [{ dokusya_id: firstId }] = await ctx.dataSource.query(
        `SELECT dokusya_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = $1`,
        [DUP_CODE],
      );
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            selected_columns: newSelectedColumns,
            rows: [buildImportRow({ kumiaiin_code: DUP_CODE, shimei_sei: '二人目' })],
          }),
        )
        .expect(200);

      // 重複が生じた後でも、dokusya_id を指定すれば一意に解約できる。
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id'],
            joho_henko_tekiyo_date: undefined,
            dokusya_chushi_date: '2099-05-31',
            rows: [
              buildImportRow({
                dokusya_id: Number(firstId),
                kumiaiin_code: undefined,
              }),
            ],
          }),
        )
        .expect(200);

      const [master] = await ctx.dataSource.query(
        `SELECT dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = $1`,
        [firstId],
      );
      expect(master.dokusya_chushi_date).not.toBeNull();
    });

    it('should return 400 IMPORT_VALIDATION_ERROR (解約予定日 過去日) on UPDATE import (顧客要件 2026-07)', async () => {
      // §4.1 適用日整合性 — 入力された解約予定日は本日以降（過去日不可）。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KDATE3' })] }))
        .expect(200);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            // 中止日は payload 直下（一括中止）。適用日とは排他なので joho は外す。
            dokusya_chushi_date: '2020-01-01', // 過去日
            joho_henko_tekiyo_date: undefined,
            rows: [buildImportRow({ kumiaiin_code: 'KDATE3', dokusya_busu: 5 })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('dokusya_chushi_date');
    });

    it('should set joho_henko_tekiyo_date = dokusya_kaishi_date on NEW import (t_dokusya + rireki #1)', async () => {
      // 顧客要件: 取込 NEW は読者情報変更適用日を購読開始日に揃える（UI create と
      // 同方針）。販売店適用日は NEW では対象外（NULL のまま）。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];

      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KJOHO1' })] }))
        .expect(200);

      const [master] = await ctx.dataSource.query(
        `SELECT dokusya_id, dokusya_kaishi_date, joho_henko_tekiyo_date
           FROM t_dokusya
           WHERE ja_id = 1 AND kumiaiin_code = 'KJOHO1' AND deleted_at IS NULL`,
      );
      // master: joho = 購読開始日
      expect(master.joho_henko_tekiyo_date).toEqual(master.dokusya_kaishi_date);

      const [rireki] = await ctx.dataSource.query(
        `SELECT joho_henko_tekiyo_date
           FROM t_dokusya_rireki
           WHERE dokusya_id = $1 AND rireki_no = 1`,
        [master.dokusya_id],
      );
      // rireki #1: joho = 購読開始日
      expect(rireki.joho_henko_tekiyo_date).toEqual(master.dokusya_kaishi_date);
    });

    // ════════════════════════════════════════════════════════════════════
    // [不具合修正2026-08] 取込の行単位 購読種別 フラグゲート
    // 従来は importExcel 冒頭の assertAnyDokusyaFlag（「どちらか1つでもあれば可」）
    // しか呼んでおらず、紙版のみ(denshi_flg=false)のアカウントが電子版読者を
    // 一括取込できてしまっていた（画面登録は行ごとに assertShubetsuFlag で防止済み）。
    // ════════════════════════════════════════════════════════════════════
    it('should reject (row-level) a NEW 電子版 row from a paper-only account (denshi_flg=false)', async () => {
      // 電子版モードは 1行=1tx（importExcelPerRow）— 行単位の例外は HTTP 403 では
      // なく 200 + row_errors の部分成功として返る（他の行が電子版へ push 済みなのに
      // tx 全体を巻き戻さないための設計・不具合修正2026-08 #57986 系）。
      //
      // 電子版モードの取込は行を見る前に assertDigitalDummyHanbaitenAvailable が
      // ダミー販売店(9999999999)の存在を要求する — このテストの本題（行単位の
      // 購読種別フラグゲート）とは無関係の前提条件なので先に満たしておく。
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi,
            biko, haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (999, 1, '9999999999', '電子版ダミー販売店', 'ﾀﾞﾐｰ',
            '', '13', '1000001', '東京都千代田区', '', '', '',
            '', '', '', '', '', '', '', NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const sid = await asPaperOnly(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            dokusya_shubetsu: 2, // 電子版
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code', 'email', 'dokusyaso_bunrui'],
            rows: [
              buildImportRow({
                kumiaiin_code: 'KNOFLAG2',
                email: 'knoflag2@example.com',
                dokusya_busu: 1,
                hanbaiten_code: '9999999999',
              }),
            ],
          }),
        )
        .expect(200);
      expect(res.body.data.failed_count).toBe(1);
      expect(res.body.data.created_count).toBe(0);
      expect(res.body.row_errors?.[0]?.message).toContain(
        '電子版購読者の登録・編集・承認を行う権限がありません。',
      );
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KNOFLAG2'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should reject (row-level) an UPDATE targeting an existing 電子版 reader from a paper-only account', async () => {
      // 対象の電子版読者を先に用意する（denshi_flg=true の asJaHonten で作成）。
      const sidHonten = await asJaHonten(1);
      const cookieHonten = [buildSessionCookie(ctx.app, sidHonten)];
      await ctx.dataSource.query(
        `UPDATE m_kanri_shiten SET kanri_shiten_code = '1300000101' WHERE kanri_shiten_id = 101`,
      );
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi,
            biko, haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (999, 1, '9999999999', '電子版ダミー販売店', 'ﾀﾞﾐｰ',
            '', '13', '1000001', '東京都千代田区', '', '', '',
            '', '', '', '', '', '', '', NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookieHonten)
        .send(
          buildImportBody({
            dokusya_shubetsu: 2,
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code', 'email', 'dokusyaso_bunrui'],
            rows: [
              buildImportRow({
                kumiaiin_code: 'KFLAGUPD',
                email: 'kflagupd@example.com',
                dokusya_busu: 1,
                hanbaiten_code: '9999999999',
                kanri_shiten_code: '1300000101',
                // 当日を購読開始日にする — 電子版の当日変更(joho=今日固定)を
                // 後段で行うため、joho(今日) >= kaishi_date でないと
                // 別のバリデーション（情報変更適用日は購読開始日以降）に
                // 先に引っかかってしまう。
                dokusya_kaishi_date: todayIsoJst(),
              }),
            ],
          }),
        )
        .expect(200);
      const [{ dokusya_id: id, dokusya_busu: originalBusu }] = await ctx.dataSource.query(
        `SELECT dokusya_id, dokusya_busu FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KFLAGUPD'`,
      );

      // 紙版のみ(denshi_flg=false)のアカウントが同じ読者を UPDATE 取込しようとする。
      const sidPaperOnly = await asPaperOnly(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sidPaperOnly)])
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            dokusya_shubetsu: 2,
            selected_columns: ['dokusya_id', 'biko'],
            joho_henko_tekiyo_date: undefined,
            rows: [buildImportRow({ dokusya_id: Number(id), biko: 'ヨミトリメイギ変更' })],
          }),
        )
        .expect(200);
      expect(res.body.data.failed_count).toBe(1);
      expect(res.body.row_errors?.[0]?.message).toContain(
        '電子版購読者の登録・編集・承認を行う権限がありません。',
      );

      // 対象行は変更されていないこと。
      const [after] = await ctx.dataSource.query(
        `SELECT dokusya_busu, biko FROM t_dokusya WHERE dokusya_id = $1`,
        [id],
      );
      expect(after.dokusya_busu).toBe(originalBusu);
      expect(after.biko).not.toBe('ヨミトリメイギ変更');
    });

    // ════════════════════════════════════════════════════════════════════
    // [layer4-scope-guard] 不具合修正2026-08 — 管理支店(kanri_shiten)/支店
    // (shiten) 列のスコープ検証。JA管理支店アカウントは自分の管理支店(・支店)
    // 以外を Excel から指定できない — 上書きではなく行エラーで弾く。
    // ════════════════════════════════════════════════════════════════════

    it('should reject a NEW row whose kanri_shiten_code is a different (same-JA) branch from the JA管理支店 account own branch (shiten_id=null)', async () => {
      const sid = await asJaKanriShiten(1, 101); // KS001, shiten_id 未固定
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KSCOPE1',
                // 自分の管理支店(101/KS001)ではなく、同一JA内の別管理支店(102/KS002)。
                kanri_shiten_code: 'KS002',
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'kanri_shiten_code',
      );
      expect(err?.message).toBe('管理支店は自管理支店「KS001」のみ指定できます。');
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSCOPE1'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should reject a NEW row whose shiten_code does not belong to the JA管理支店 account own branch (shiten_id=null)', async () => {
      const sid = await asJaKanriShiten(1, 101); // KS001, shiten_id 未固定
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KSCOPE2',
                kanri_shiten_code: 'KS001', // 自管理支店は正しく指定
                shiten_code: 'SH999', // 存在しない支店コード
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'shiten_code',
      );
      expect(err?.message).toBe('支店「SH999」は管理支店「KS001」配下の支店ではありません。');
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSCOPE2'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should reject a NEW row whose kanri_shiten_code/shiten_code mismatch the JA管理支店 account own branch+shiten (shiten_id set)', async () => {
      // account 17 は seed 上 shiten_id=null（asJaKanriShiten helper は kanri_shiten_id
      // だけ渡す）。ここでは session を直接 shiten_id 付きで発行し、管理支店＋支店の
      // 両方に固定されたアカウントの分岐を検証する。
      const sid = await ctx.seedSession({
        account_id: 17,
        role_code: 'JA_KANRI_SHITEN',
        role_id: 5,
        ja_id: 1,
        kanri_shiten_id: 101,
        shiten_id: 1001, // SH001（KS001 配下）
        permissions: ['dokusya.view', 'dokusya.import'],
      });
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KSCOPE3',
                kanri_shiten_code: 'KS001',
                // 自分の支店(SH001)ではなく、同一JA内の別支店を指定。
                shiten_code: 'SH002',
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'shiten_code',
      );
      expect(err?.message).toBe(
        'このアカウントは管理支店「KS001」／支店「SH001」の読者のみ取込できます。',
      );
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSCOPE3'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should accept a NEW row whose kanri_shiten_code/shiten_code exactly match the JA管理支店 account own branch+shiten', async () => {
      const sid = await ctx.seedSession({
        account_id: 17,
        role_code: 'JA_KANRI_SHITEN',
        role_id: 5,
        ja_id: 1,
        kanri_shiten_id: 101,
        shiten_id: 1001, // SH001
        permissions: ['dokusya.view', 'dokusya.import'],
      });
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KSCOPE4',
                kanri_shiten_code: 'KS001',
                shiten_code: 'SH001',
              }),
            ],
          }),
        )
        .expect(200);
      const [row] = await ctx.dataSource.query(
        `SELECT kanri_shiten_id, shiten_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KSCOPE4'`,
      );
      expect(Number(row.kanri_shiten_id)).toBe(101);
      expect(Number(row.shiten_id)).toBe(1001);
    });

    it('should reject a NEW row combining an unrelated kanri_shiten_code/shiten_code even for an account with NO kanri_shiten scope (バグ報告2026-08)', async () => {
      // JA_HONTEN はどの管理支店/支店も指定できる（スコープ制約なし）が、行内の
      // kanri_shiten_code と shiten_code 自体の親子関係は別に検証されるべき —
      // 以前はスコープ制約の無いアカウントに対してこの検証が丸ごとスキップされ、
      // 無関係な組合せ（例: KS002 と SH001、SH001 は実際には KS001 配下）でも
      // 取込が成功していた。
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KPARENT1',
                kanri_shiten_code: 'KS002',
                // SH001 は実際には KS001(101) 配下の支店 — KS002 とは無関係。
                shiten_code: 'SH001',
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'shiten_code',
      );
      expect(err?.message).toBe(
        '支店「SH001」は管理支店「KS002」配下の支店ではありません。',
      );
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KPARENT1'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should accept a NEW row whose kanri_shiten_code/shiten_code are a real parent-child pair for an account with NO kanri_shiten scope', async () => {
      const sid = await asJaHonten(1);
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            rows: [
              buildImportRow({
                kumiaiin_code: 'KPARENT2',
                kanri_shiten_code: 'KS001',
                shiten_code: 'SH001', // SH001 は KS001(101) 配下 — 正しい組合せ。
              }),
            ],
          }),
        )
        .expect(200);
      const [row] = await ctx.dataSource.query(
        `SELECT kanri_shiten_id, shiten_id FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KPARENT2'`,
      );
      expect(Number(row.kanri_shiten_id)).toBe(101);
      expect(Number(row.shiten_id)).toBe(1001);
    });

    it('should reject a row whose kanri_shiten does not handle 紙版 (m_kanri_shiten.paper_flg=false)', async () => {
      const sid = await asJaHonten(1); // 管理支店に固定されていないアカウント
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            dokusya_shubetsu: 1, // 紙版
            rows: [
              buildImportRow({
                kumiaiin_code: 'KFPAPER1',
                kanri_shiten_code: 'KS003', // paper_flg=false, denshi_flg=true
              }),
            ],
          }),
        );
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'kanri_shiten_code',
      );
      expect(err?.message).toBe(
        '管理支店「KS003」は紙版を取り扱っていないため指定できません。',
      );
      const rows = await ctx.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM t_dokusya WHERE ja_id = 1 AND kumiaiin_code = 'KFPAPER1'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    it('should reject a row whose kanri_shiten does not handle 電子版 (m_kanri_shiten.denshi_flg=false)', async () => {
      // KS001(101) は denshi_flg=true なので、denshi_flg=false の管理支店を
      // 別途用意する（KS003 は denshi_flg=true のままなので使えない）。
      await ctx.dataSource.query(
        `UPDATE m_kanri_shiten SET denshi_flg = false WHERE kanri_shiten_id = 102`,
      );
      await ctx.dataSource.query(
        `INSERT INTO m_hanbaiten
           (hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
            torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
            bank_code, bank_name, bank_branch_code, bank_branch_name, koza_no, koza_meigi,
            biko, haitatsuryo_tanka_id, haiten_flg, created_at, created_by, updated_at, updated_by)
         VALUES
           (999, 1, '9999999999', '電子版ダミー販売店', 'ﾀﾞﾐｰ',
            '', '13', '1000001', '東京都千代田区', '', '', '',
            '', '', '', '', '', '', '', NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      );
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(
          buildImportBody({
            dokusya_shubetsu: 2, // 電子版
            selected_columns: [...buildImportRequiredColumns(), 'kumiaiin_code', 'email', 'dokusyaso_bunrui'],
            rows: [
              buildImportRow({
                kumiaiin_code: 'KFDIGI1',
                email: 'kflagdigital@example.com',
                dokusya_busu: 1,
                hanbaiten_code: '9999999999',
                kanri_shiten_code: 'KS002',
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const err = (res.body.errors ?? []).find(
        (e: { field: string }) => e.field === 'kanri_shiten_code',
      );
      expect(err?.message).toBe(
        '管理支店「KS002」は電子版を取り扱っていないため指定できません。',
      );
    });
  },
);
