// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM / raw SQL queries for the two
// SCR-016 endpoints appended to DokusyaController:
//   GET  /api/v1/dokusya/import/template (API-016-001)
//   POST /api/v1/dokusya/import          (API-016-002)
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
// (reconciled SCR-015 seed): m_ja WITHOUT bank_code, m_kanri_shiten WITH
// todofuken_code, m_tanka with kingaku_zeikomi/kingaku_zeinuki/tax_rate,
// m_code with explicit code_id, m_roles/m_permissions WITHOUT biko — plus
// the extra m_code categories the import validates and the dokusya.import
// permission.

import type { Server } from 'node:http';
import request from 'supertest';
import * as ExcelJS from 'exceljs';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  createRealPgIntegrationApp,
  describeRealPg,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import { buildImportBody, buildImportRow } from '@test/fixtures/dokusya.factory';
import { todayIsoJst } from '@/common/utils/datetime';

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
      tel, fax, biko,
      created_at, created_by, updated_at, updated_by)
   VALUES
     (101, 1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
      '1000001', '13', '東京都千代田区', '', '', '',
      NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
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
  return { asNichinoAdmin, asJaHonten, asNoFlag };
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
  // API-016-001 — GET /api/v1/dokusya/import/template
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
      // 顧客要件 2026-08: 読者情報変更適用日 / 購読中止日 も画面の入力欄へ移し
      // Excel 列から撤去（48 → 46 列）。画面と列の二重入力源を作らないため。
      // それ以前: 購読種別を画面ラジオへ（49 → 48）、販売店適用日を廃止し joho に統一。
      expect(header).toHaveLength(46);
      expect(header).not.toContain('購読種別'); // 撤去（画面ラジオで一括指定）
      expect(header).not.toContain('手続種類'); // 削除（取込で解約は扱わない）
      expect(header).toContain('購読者情報と同じ');
      expect(header).not.toContain('販売店適用日'); // 廃止（joho に統一）
      expect(header).not.toContain('読者情報変更適用日'); // 撤去（画面の入力欄へ）
      expect(header).not.toContain('購読中止日'); // 撤去（画面の入力欄＝一括中止）
      expect(String(sample[header.indexOf('備考')])).toContain('書き換えて');
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

    it.skip('should return 400 ROW_LIMIT_EXCEEDED when rows exceed 30000 (skipped — 30001-row payload impractical for the in-memory suite)', async () => {
      // COVERS: §4.1 — ROW_LIMIT_EXCEEDED. Building 30001 rows is too heavy
      // for the in-memory integration run; the unit + controller specs
      // already cover the threshold. Re-enable selectively in nightly CI.
      const sid = await asJaHonten(1);
      const rows = Array.from({ length: 30001 }, (_v, i) =>
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
    const { asJaHonten } = makeImportHelpers(() => ctx);

    beforeEach(async () => {
      ctx = await createRealPgIntegrationApp({
        modules: [DokusyaModule],
        seedSql: SCR016_SEED_SQL,
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

      // 1st UPDATE → a 2nd rireki row.
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ kumiaiin_code: 'KUPD1', dokusya_busu: 5 })],
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
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ kumiaiin_code: 'KUPD1', dokusya_busu: 9 })],
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

    it('should return 400 IMPORT_VALIDATION_ERROR (joho < 購読開始日) on UPDATE import (顧客要件 2026-07)', async () => {
      // §4.1 適用日整合性 — 読者情報変更適用日 >= 購読開始日(before)。
      const sid = await asJaHonten(1);
      const cookie = [buildSessionCookie(ctx.app, sid)];
      await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', cookie)
        .send(buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'KDATE1' })] }))
        .expect(200);
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
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            rows: [buildImportRow({ kumiaiin_code: 'KDATE1', dokusya_busu: 5 })],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('joho_henko_tekiyo_date');
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
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
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
            selected_columns: ['kumiaiin_code', 'hanbaiten_code'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
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
            selected_columns: ['kumiaiin_code', 'yubin_no'],
            joho_henko_tekiyo_date: todayIsoJst(),
            rows: [
              buildImportRow({
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
            selected_columns: ['kumiaiin_code', 'dokusya_busu'],
            joho_henko_tekiyo_date: '2026-09-01',
            rows: [
              buildImportRow({
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
  },
);
