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

import type { Server } from 'http';
import request from 'supertest';
import * as ExcelJS from 'exceljs';

import { DokusyaModule } from '@/modules/dokusya/dokusya.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import { buildImportBody, buildImportRow } from '@test/fixtures/dokusya.factory';

describe('ACSMS-SCR-016 integration — dokusya Excel import (template + bulk import)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [DokusyaModule],
      seedSql: [
        // ─── m_ja (2 rows for cross-scope tests; NO bank_code column) ──────
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
        // ─── m_kanri_shiten (WITH todofuken_code) — 101 = caller JA=1 ──────
        `INSERT INTO m_kanri_shiten
           (kanri_shiten_id, ja_id, kanri_shiten_code, kanri_shiten_name,
            kanri_shiten_name_kana, yubin_no, todofuken_code, address,
            tel, fax, biko,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (101, 1, 'KS001', '千代田管理支店', 'ﾁﾖﾀﾞ',
            '1000001', '13', '東京都千代田区', '', '', '',
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_shiten — 1001 under kanri_shiten 101 / JA=1 ─────────────────
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
        // ─── m_hanbaiten — H001 (id 5) JA=1, HX (id 6) JA=2 (cross-tenant) ─
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
           (6, 2, 'H999', '大阪販売店', 'ｵｵｻｶ',
            '', '27', '5300001', '大阪府大阪市1-1', '', '',
            '', '', '', '', '', '', '', '',
            NULL, false,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // ─── m_tanka — T001 (id 1) JA=1 tanka_type=1 (購読料) ──────────────
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
        // ─── m_code — every category the import validates (explicit code_id) ─
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
        // ─── Roles + permissions (NO biko column). dokusya.import held by
        //      CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN; NICHINO_ADMIN does NOT ─
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
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // NICHINO_ADMIN does NOT hold dokusya.import.
  function asNichinoAdmin() {
    return ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      permissions: ['dokusya.view'],
    });
  }

  function asJaHonten(jaId = 1) {
    return ctx.seedSession({
      account_id: 11,
      role_code: 'JA_HONTEN',
      role_id: 4,
      ja_id: jaId,
      permissions: ['dokusya.view', 'dokusya.import'],
    });
  }

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
      expect(header.length).toBe(49);
      // Sample demonstrates a valid 紙版 / 新規 format example.
      expect(Number(sample[header.indexOf('購読種別')])).toBe(1);
      expect(Number(sample[header.indexOf('手続種類')])).toBe(1);
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
    it.skip('should return 200 + persist a new dokusya scoped to caller JA when import_mode=NEW (requires real postgres — ANY / RETURNING / dynamic SET)', async () => {
      // COVERS: §4.4/§4.6 happy path. pg-mem cannot run the INSERT …
      // RETURNING + ANY(:codes) lookups the import issues, so this stays
      // skipped — which is exactly why the NEW INSERT once omitted most
      // NOT NULL columns (shimei_kana_sei, tanka_id, hanbaiten_id, dates, …)
      // and 500-ed on real Postgres while the suite stayed green.
      // applyImportRow now writes the full column set + resolves
      // tanka_code→tanka_id / hanbaiten_code→hanbaiten_id, and the rireki
      // INSERT snapshots every shared column. Verified manually against the
      // dev Postgres (POST /api/v1/dokusya/import → 200, row + rireki
      // persisted) on 2026-06-10. Keep the t_dokusya / t_dokusya_rireki
      // INSERT column lists in sync with the NOT NULL schema.
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
                kanri_shiten_id: undefined,
                tanka_code: undefined,
                hanbaiten_code: undefined,
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: { field: string }) => e.field);
      expect(fields).toContain('kanri_shiten_id');
      expect(fields).toContain('tanka_code');
      expect(fields).toContain('hanbaiten_code');
    });

    it.skip('should return 400 IMPORT_VALIDATION_ERROR when a row is 3:併読 (requires real postgres — ANY lookups precede the row check)', async () => {
      // COVERS: §4.1 — 3:併読 はExcel取込み対象外
      const sid = await asJaHonten(1);
      const res = await http()
        .post(apiUrl('dokusya/import'))
        .set('Cookie', [buildSessionCookie(ctx.app, sid)])
        .send(buildImportBody({ rows: [buildImportRow({ dokusya_shubetsu: 3 })] }))
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
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
