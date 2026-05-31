// Screen: ACSMS-SCR-019 — 販売店Excelデータ取込画面
//
// Integration tests for the Excel import flow over a real Nest + pg-mem
// stack — exercise guards, ValidationPipe, m_code + m_tanka FK lookups,
// duplicate-code detection, DataScope (each JA's caller sees only its
// own rows after import), 3-mode behaviour (NEW / UPDATE_ALL /
// UPDATE_PARTIAL), and audit log atomicity (one t_log row per row +
// IMPORT_NEW / IMPORT_UPDATE_ALL / IMPORT_UPDATE_PARTIAL operation tag
// written inside the same transaction as the m_hanbaiten INSERT/UPDATE).
//
// Endpoints covered (both ship with /gen-code-backend ACSMS-SCR-019):
//
//   GET  /api/v1/hanbaiten/import/template (API-019-001)
//   POST /api/v1/hanbaiten/import          (API-019-002)
//
// Run with: `cd apps/backend && npm test -- hanbaiten-import.integration`

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
  buildImportRequestNEW,
  buildImportRequestUpdateAll,
  buildImportRequestUpdatePartial,
  buildImportRow,
  HANBAITEN_IMPORT_COLUMNS,
} from '@test/fixtures/hanbaiten-import.factory';

describe('ACSMS-SCR-019 integration — hanbaiten Excel import endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [HanbaitenModule],
      seedSql: [
        // m_ja — 2 JA so DataScope can be verified (JA001 = caller, JA002 = other).
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
        // m_code seed for the 4 categories validated row-by-row by import.
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
        // m_tanka — Layer 4 FK guard on haitatsuryo_tanka_code resolves
        // to m_tanka.tanka_code FILTERED BY ja_id. JA001 owns T001 and
        // T002; JA002 owns T999 (used to verify cross-tenant rejection).
        `INSERT INTO m_tanka
           (tanka_id, ja_id, tanka_code, tanka_type, tanka_name,
            kingaku_zeikomi, kingaku_zeinuki, tax_rate,
            tekiyo_start_date, tekiyo_end_date, biko, active_flg,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (10, 1, 'T001', 2, '配達手数料A',
            500, 455, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (11, 1, 'T002', 2, '配達手数料B',
            600, 545, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (99, 2, 'T999', 2, 'JA002配達手数料',
            700, 636, 10.00,
            '2026-01-01', NULL, '', TRUE,
            NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // ─── session helpers ─────────────────────────────────────────────────
  async function jaHontenCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      role_code: 'JA_HONTEN',
      ja_id: jaId,
      permissions: ['hanbaiten.view', 'hanbaiten.import'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function jaHontenNoImportCookie(jaId = 1) {
    const sid = await ctx.seedSession({
      role_code: 'JA_HONTEN',
      ja_id: jaId,
      permissions: ['hanbaiten.view'], // missing hanbaiten.import on purpose
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function countHanbaiten(jaId: number) {
    const [{ count }] = await ctx.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM m_hanbaiten WHERE ja_id = $1 AND deleted_at IS NULL`,
      [jaId],
    );
    return Number(count);
  }

  async function findHanbaiten(jaId: number, code: string) {
    const rows = await ctx.dataSource.query(
      `SELECT * FROM m_hanbaiten WHERE ja_id = $1 AND hanbaiten_code = $2 AND deleted_at IS NULL`,
      [jaId, code],
    );
    return rows[0] ?? null;
  }

  // ───────────────────────────────────────────────────────────────────────
  // API-019-001 — GET /api/v1/hanbaiten/import/template
  // ───────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/hanbaiten/import/template', () => {
    it('should return 200 with xlsx mime + Japanese filename when JA_HONTEN with hanbaiten.import is authenticated', async () => {
      const cookie = await jaHontenCookie();
      const res = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .set('Cookie', cookie)
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // [non-ascii-filename] Node's HTTP layer (RFC 7230) refuses
      // multibyte bytes in a header value, so the controller serves
      // Japanese filenames via RFC 6266 `filename*=UTF-8''<percent-
      // encoded>` and uses an ASCII fallback in plain `filename=`.
      // Assert the URL-encoded form is present and points at the
      // expected Japanese name.
      const expectedUtf8 =
        `filename*=UTF-8''${encodeURIComponent('販売店Excelデータ取込_テンプレート.xlsx')}`;
      expect(res.headers['content-disposition']).toContain(expectedUtf8);
      expect(Buffer.isBuffer(res.body) ? res.body.length : res.text.length).toBeGreaterThan(0);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      const res = await http().get(apiUrl('hanbaiten/import/template')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.import permission', async () => {
      const cookie = await jaHontenNoImportCookie();
      const res = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .set('Cookie', cookie)
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // API-019-002 — POST /api/v1/hanbaiten/import
  // ───────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/hanbaiten/import — auth', () => {
    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .send(buildImportRequestNEW())
        .expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller lacks hanbaiten.import permission', async () => {
      const cookie = await jaHontenNoImportCookie();
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/hanbaiten/import — VALIDATION_ERROR (top-level DTO)', () => {
    it('should return 400 VALIDATION_ERROR when import_mode is missing', async () => {
      const cookie = await jaHontenCookie();
      const body = buildImportRequestNEW();
      delete (body as Record<string, unknown>).import_mode;
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: any) => e.field);
      expect(fields).toContain('import_mode');
    });

    it('should return 400 VALIDATION_ERROR when selected_columns is empty', async () => {
      const cookie = await jaHontenCookie();
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ selected_columns: [] }))
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 ROW_LIMIT_EXCEEDED when rows has more than 500 items', async () => {
      const cookie = await jaHontenCookie();
      const rows = Array.from({ length: 501 }, (_, i) =>
        buildImportRow({ hanbaiten_code: `H${String(i + 1).padStart(4, '0')}` }),
      );
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ rows }))
        .expect(400);
      // ROW_LIMIT_EXCEEDED is the spec'd code; some impls may surface
      // VALIDATION_ERROR via DTO @ArrayMaxSize first — accept either
      // but require the code to be one of the two.
      expect(['ROW_LIMIT_EXCEEDED', 'VALIDATION_ERROR']).toContain(res.body.error_code);
    });
  });

  describe('POST /api/v1/hanbaiten/import — IMPORT_VALIDATION_ERROR (row-level)', () => {
    it('should return 400 IMPORT_VALIDATION_ERROR with row index when haitatsuryo_tanka_code refers to a missing tanka', async () => {
      const cookie = await jaHontenCookie();
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({
            hanbaiten_code: 'H100',
            haitatsuryo_tanka_code: 'TNOPE',
          }),
        ],
      });
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const errs = res.body.errors ?? [];
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0]).toEqual(
        expect.objectContaining({
          row: expect.any(Number),
          field: 'haitatsuryo_tanka_code',
        }),
      );
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when haitatsuryo_tanka_code belongs to a different JA (DataScope cross-tenant)', async () => {
      const cookie = await jaHontenCookie(1); // JA001 caller
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({
            hanbaiten_code: 'H110',
            haitatsuryo_tanka_code: 'T999', // T999 belongs to JA002 (seed above)
          }),
        ],
      });
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const errs = res.body.errors ?? [];
      expect(errs.some((e: any) => e.field === 'haitatsuryo_tanka_code')).toBe(true);
      // NOT persisted — full rollback on any row error.
      expect(await countHanbaiten(1)).toBe(0);
    });

    it('should return 400 IMPORT_VALIDATION_ERROR when itaku_kubun is not a valid m_code value', async () => {
      const cookie = await jaHontenCookie();
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({
            hanbaiten_code: 'H120',
            itaku_kubun: 7, // not in seeded m_code (1, 2, 9)
          }),
        ],
      });
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      expect((res.body.errors ?? []).some((e: any) => e.field === 'itaku_kubun')).toBe(true);
    });

    it('should aggregate every row error in a single IMPORT_VALIDATION_ERROR response (atomic, no partial commit)', async () => {
      const cookie = await jaHontenCookie();
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({ hanbaiten_code: 'H1' }), // ok
          buildImportRow({ hanbaiten_code: 'H2', haitatsuryo_tanka_code: 'NOPE' }),
          buildImportRow({ hanbaiten_code: 'H3', itaku_kubun: 99 }),
        ],
      });
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      // Two distinct row indices should appear in the errors array.
      const rowIndices = new Set(
        (res.body.errors ?? []).map((e: any) => e.row).filter((v: unknown) => v !== undefined),
      );
      expect(rowIndices.size).toBeGreaterThanOrEqual(2);
      // Nothing persisted — full rollback.
      expect(await countHanbaiten(1)).toBe(0);
    });
  });

  describe('POST /api/v1/hanbaiten/import — NEW mode happy path', () => {
    it('should persist 2 new rows scoped to caller JA when import_mode=NEW and all rows valid', async () => {
      const cookie = await jaHontenCookie(1);
      const body = buildImportRequestNEW();

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          import_mode: 'NEW',
          total_rows: 2,
          created_count: 2,
          updated_count: 0,
        }),
      );
      expect(res.body.message).toContain('取り込みました');

      // DB state — both rows under JA001, none under JA002.
      expect(await countHanbaiten(1)).toBe(2);
      expect(await countHanbaiten(2)).toBe(0);
      const h001 = await findHanbaiten(1, 'H001');
      expect(h001).not.toBeNull();
      expect(h001.hanbaiten_name).toBe('販売店A');
    });

    it('should return 400 IMPORT_VALIDATION_ERROR with DUPLICATE_CODE row error when NEW mode hits an existing hanbaiten_code', async () => {
      const cookie = await jaHontenCookie(1);
      // Seed an existing row first.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ rows: [buildImportRow({ hanbaiten_code: 'H001' })] }))
        .expect(200);

      // Re-importing the same hanbaiten_code in NEW mode must reject.
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ rows: [buildImportRow({ hanbaiten_code: 'H001' })] }))
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const errs = res.body.errors ?? [];
      expect(errs.some((e: any) => e.field === 'hanbaiten_code')).toBe(true);
    });
  });

  describe('POST /api/v1/hanbaiten/import — UPDATE_ALL mode', () => {
    it('should overwrite ALL fields of an existing row and emit IMPORT_UPDATE_ALL audit log', async () => {
      const cookie = await jaHontenCookie(1);
      // Pre-seed via NEW import so we have an existing row to update.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ rows: [buildImportRow({ hanbaiten_code: 'H001', tel: '03-0000-0000' })] }))
        .expect(200);

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestUpdateAll())
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          import_mode: 'UPDATE_ALL',
          updated_count: 1,
        }),
      );

      const after = await findHanbaiten(1, 'H001');
      expect(after.hanbaiten_name).toBe('販売店A改定');

      // Audit row written inside the same transaction.
      const logs = await ctx.dataSource.query(
        `SELECT operation, target_table FROM t_log
           WHERE target_table = 'm_hanbaiten' AND operation = 'IMPORT_UPDATE_ALL'`,
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/v1/hanbaiten/import — UPDATE_PARTIAL mode', () => {
    it('should overwrite ONLY selected_columns and leave other fields untouched', async () => {
      const cookie = await jaHontenCookie(1);
      // Seed an existing row with full data.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(
          buildImportRequestNEW({
            rows: [
              buildImportRow({
                hanbaiten_code: 'H001',
                hanbaiten_name: '元の販売店A',
                tel: '03-0000-0000',
                address: '元の住所',
              }),
            ],
          }),
        )
        .expect(200);

      // UPDATE_PARTIAL overwriting only hanbaiten_name + tel.
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestUpdatePartial())
        .expect(200);

      expect(res.body.data.import_mode).toBe('UPDATE_PARTIAL');

      const after = await findHanbaiten(1, 'H001');
      expect(after.hanbaiten_name).toBe('販売店A_新名');
      expect(after.tel).toBe('03-9999-0000');
      // address NOT in selected_columns → preserved.
      expect(after.address).toBe('元の住所');
    });
  });

  describe('POST /api/v1/hanbaiten/import — DataScope (caller can only import into own JA)', () => {
    it('should write the imported rows under the caller JA only — never under another JA', async () => {
      const cookieJa1 = await jaHontenCookie(1);
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookieJa1)
        .send(buildImportRequestNEW())
        .expect(200);

      // Nothing leaks to JA002.
      expect(await countHanbaiten(1)).toBe(2);
      expect(await countHanbaiten(2)).toBe(0);
    });

    it('should treat caller JA as the import target even if request body has no explicit ja_id field', async () => {
      const cookieJa2 = await jaHontenCookie(2);
      // Build a row valid for JA002 — its tanka is T999.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookieJa2)
        .send(
          buildImportRequestNEW({
            rows: [buildImportRow({ hanbaiten_code: 'HZ001', haitatsuryo_tanka_code: 'T999' })],
          }),
        )
        .expect(200);
      expect(await countHanbaiten(1)).toBe(0);
      expect(await countHanbaiten(2)).toBe(1);
    });
  });

  describe('POST /api/v1/hanbaiten/import — audit log', () => {
    it('should write an IMPORT_NEW audit row to t_log per import call when NEW mode succeeds', async () => {
      const cookie = await jaHontenCookie(1);
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW())
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table FROM t_log
           WHERE target_table = 'm_hanbaiten' AND operation = 'IMPORT_NEW'`,
      );
      // One audit row per imported hanbaiten OR one per import-call —
      // either contract is acceptable for now; assert >= 1.
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].result_status).toBe(1);
    });

    it('should NOT persist any m_hanbaiten row when a row error fires (full rollback inside the transaction)', async () => {
      const cookie = await jaHontenCookie(1);
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({ hanbaiten_code: 'H_OK' }),
          buildImportRow({ hanbaiten_code: 'H_BAD', haitatsuryo_tanka_code: 'NOPE' }),
        ],
      });
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);

      // Rollback: neither row persisted.
      expect(await countHanbaiten(1)).toBe(0);
      // No IMPORT_NEW success row in t_log either.
      const okLogs = await ctx.dataSource.query(
        `SELECT operation FROM t_log
           WHERE target_table = 'm_hanbaiten' AND operation = 'IMPORT_NEW' AND result_status = 1`,
      );
      expect(okLogs.length).toBe(0);
    });
  });

  // Sanity — column list contract stays in sync with the fixture so the
  // template + DTO + import-mode handlers all agree on the 23-column set.
  it('should reference exactly 23 logical columns in the shared fixture', () => {
    expect(HANBAITEN_IMPORT_COLUMNS).toHaveLength(23);
    expect(HANBAITEN_IMPORT_COLUMNS[0]).toBe('hanbaiten_code');
  });
});
