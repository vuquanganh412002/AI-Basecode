// Screen: ACSMS-SCR-019 — 販売店Excelデータ取込画面
//
// Integration tests for the Excel import flow over a real Nest + pg-mem
// stack — exercise guards, ValidationPipe, m_code + m_tanka FK lookups,
// duplicate-code detection, DataScope (each JA's caller sees only its
// own rows after import), 2-mode behaviour (NEW / UPDATE), and audit log
// atomicity (one t_log row per row + IMPORT_NEW / IMPORT_UPDATE_PARTIAL tag
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
import * as ExcelJS from 'exceljs';

import { HanbaitenModule } from '@/modules/hanbaiten/hanbaiten.module';
import { IMPORT_TEMPLATE_PHYSICAL_COLUMNS } from '@/modules/hanbaiten/dto/import-template.constants';
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

  // NICHINO_STAFF after the 2026-06 revoke (migration 1711900900017):
  // holds hanbaiten.view but NOT hanbaiten.import → import must 403.
  async function nichinoStaffCookie() {
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_STAFF',
      ja_id: null,
      permissions: ['hanbaiten.view'],
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

    it('should ship a sample data row (row 2) in the template that imports successfully — round-trip', async () => {
      const cookie = await jaHontenCookie(1);
      // Download the real xlsx bytes.
      const dl = await http()
        .get(apiUrl('hanbaiten/import/template'))
        .set('Cookie', cookie)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);

      // Parse it and pull the sample row (row 2; row 1 = headers).
      const wb = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supertest types dl.body as Buffer<ArrayBufferLike>; ExcelJS wants Buffer<ArrayBuffer>. Same bytes at runtime.
      await wb.xlsx.load(dl.body as any);
      const cells = (wb.worksheets[0].getRow(2).values as unknown[]).slice(1);
      expect(cells[0]).toBe('SAMPLE001'); // hanbaiten_code present in the template

      // Map positional cells → request fields and import them as-is.
      const row: Record<string, unknown> = {};
      IMPORT_TEMPLATE_PHYSICAL_COLUMNS.forEach((col, i) => {
        const v = cells[i];
        if (v !== undefined && v !== null && v !== '') row[col] = v;
      });
      const importRes = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send({
          import_mode: 'NEW',
          selected_columns: [...IMPORT_TEMPLATE_PHYSICAL_COLUMNS],
          rows: [row],
        })
        .expect(200);
      expect(importRes.body.data.created_count).toBe(1);
      expect(await findHanbaiten(1, 'SAMPLE001')).not.toBeNull();
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

    it('should return 403 FORBIDDEN when NICHINO_STAFF attempts import (#5 — no hanbaiten.import, revoked 2026-06)', async () => {
      const cookie = await nichinoStaffCookie();
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

    it('should surface a nested row format error with its Excel row + leaf field (Fix #2 — detailed, not a generic "rows" entry)', async () => {
      const cookie = await jaHontenCookie();
      const body = buildImportRequestNEW({
        rows: [
          buildImportRow({ hanbaiten_code: 'OK01' }),
          // index 1 → Excel row 3. Half-width katakana + a Latin char →
          // fails the DTO @Matches at the row level.
          buildImportRow({ hanbaiten_code: 'BAD2', hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝA' }),
        ],
      });
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      const errs = (res.body.errors ?? []) as Array<{ row?: number; field?: string }>;
      // Detailed: leaf field name + Excel row (header = row 1, so the
      // second data row is index 1 → row 3) — NOT collapsed to { field: 'rows' }.
      expect(errs.some((e) => e.field === 'hanbaiten_name_kana' && e.row === 3)).toBe(true);
      expect(errs.every((e) => e.field !== 'rows')).toBe(true);
    });

    it('should accept Excel numeric cells in VARCHAR columns instead of 400-ing the row (Fix #1)', async () => {
      const cookie = await jaHontenCookie(1);
      const body = buildImportRequestNEW({
        rows: [buildImportRow({ hanbaiten_code: 'NUM01' })],
      });
      // Excel stores numeric-looking cells (郵便番号 / 金融機関コード) as JS
      // numbers; sheet_to_json forwards them as `number`. The DTO transform
      // must coerce number → string so @IsString does not reject the row.
      const row0 = (body as { rows: Record<string, unknown>[] }).rows[0];
      row0.yubin_no = 1000012;
      row0.bank_code = 4445;
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(body)
        .expect(200);
      expect(res.body.data.created_count).toBe(1);
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

    it('should store the column default (not the Excel cell) for columns NOT in selected_columns when NEW', async () => {
      // §4.4.1 — 未選択列は NEW モードではデフォルト値。End-to-end proof
      // the 取込列 toggle now has a real server effect: tel is present in
      // the row but excluded from selected_columns → persisted as ''.
      const cookie = await jaHontenCookie(1);
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(
          buildImportRequestNEW({
            selected_columns: ['hanbaiten_code', 'hanbaiten_name'],
            rows: [
              buildImportRow({
                hanbaiten_code: 'H001',
                hanbaiten_name: '販売店A',
                tel: '0312345678',
              }),
            ],
          }),
        )
        .expect(200);
      expect(res.body.data.created_count).toBe(1);

      const h001 = await findHanbaiten(1, 'H001');
      expect(h001.hanbaiten_name).toBe('販売店A'); // selected → kept
      expect(h001.tel).toBe(''); // unselected → default empty string
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

  describe('POST /api/v1/hanbaiten/import — UPDATE mode — all columns selected', () => {
    it('should overwrite ALL fields of an existing row and emit IMPORT_UPDATE_PARTIAL audit log', async () => {
      const cookie = await jaHontenCookie(1);
      // Pre-seed via NEW import so we have an existing row to update.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestNEW({ rows: [buildImportRow({ hanbaiten_code: 'H001', tel: '0300000000' })] }))
        .expect(200);

      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestUpdateAll())
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          import_mode: 'UPDATE',
          updated_count: 1,
        }),
      );

      const after = await findHanbaiten(1, 'H001');
      expect(after.hanbaiten_name).toBe('販売店A改定');

      // 「1取込=監査ログ1行」。IMPORT_UPDATE_PARTIAL がちょうど1行で、重複の
      // 素の UPDATE 行が無いことを検証（NEW/UPDATE 両モードの重複回帰防止）。
      const logs = await ctx.dataSource.query(
        `SELECT operation FROM t_log WHERE target_table = 'm_hanbaiten'`,
      );
      const importUpdateAll = logs.filter(
        (l: { operation: string }) => l.operation === 'IMPORT_UPDATE_PARTIAL',
      );
      const plainUpdate = logs.filter(
        (l: { operation: string }) => l.operation === 'UPDATE',
      );
      expect(importUpdateAll.length).toBe(1);
      expect(plainUpdate.length).toBe(0);
    });
  });

  describe('POST /api/v1/hanbaiten/import — UPDATE mode — subset', () => {
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
                tel: '0300000000',
                address: '元の住所',
              }),
            ],
          }),
        )
        .expect(200);

      // UPDATE overwriting only hanbaiten_name + tel.
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(buildImportRequestUpdatePartial())
        .expect(200);

      expect(res.body.data.import_mode).toBe('UPDATE');

      const after = await findHanbaiten(1, 'H001');
      expect(after.hanbaiten_name).toBe('販売店A_新名');
      expect(after.tel).toBe('0399990000');
      // address NOT in selected_columns → preserved.
      expect(after.address).toBe('元の住所');
    });
  });

  describe('POST /api/v1/hanbaiten/import — conditional-required (振込)', () => {
    it('should return 400 IMPORT_VALIDATION_ERROR when NEW row has itaku_kubun=1 but blank bank fields', async () => {
      // #3 — api.md §4.1: itaku_kubun=1（振込）→ 6 bank fields required.
      const cookie = await jaHontenCookie(1);
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(
          buildImportRequestNEW({
            rows: [
              buildImportRow({
                hanbaiten_code: 'H001',
                itaku_kubun: 1,
                bank_code: '',
                bank_name: '',
                bank_branch_code: '',
                bank_branch_name: '',
                yokin_shubetsu: '',
                koza_no: '',
              }),
            ],
          }),
        )
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: any) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining(['bank_code', 'yokin_shubetsu', 'koza_no']),
      );
      expect(await countHanbaiten(1)).toBe(0); // nothing committed
    });

    it('should return 400 when UPDATE changes itaku_kubun to 1 while existing bank fields are blank + unselected (TC-019-040)', async () => {
      const cookie = await jaHontenCookie(1);
      // Seed H001 as 日農委託 (itaku_kubun=2) with blank bank — allowed.
      await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send(
          buildImportRequestNEW({
            rows: [
              buildImportRow({
                hanbaiten_code: 'H001',
                itaku_kubun: 2,
                bank_code: '',
                bank_name: '',
                bank_branch_code: '',
                bank_branch_name: '',
                yokin_shubetsu: '',
                koza_no: '',
              }),
            ],
          }),
        )
        .expect(200);

      // Flip to 振込 (itaku_kubun=1) without supplying bank columns.
      const res = await http()
        .post(apiUrl('hanbaiten/import'))
        .set('Cookie', cookie)
        .send({
          import_mode: 'UPDATE',
          selected_columns: ['hanbaiten_code', 'itaku_kubun'],
          rows: [{ hanbaiten_code: 'H001', itaku_kubun: 1 }],
        })
        .expect(400);
      expect(res.body.error_code).toBe('IMPORT_VALIDATION_ERROR');
      const fields = (res.body.errors ?? []).map((e: any) => e.field);
      expect(fields).toContain('bank_code');
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

      // 取込は「1回の取込=監査ログ1行」。IMPORT_NEW がちょうど1行で、重複の
      // CREATE 行が無いことを検証する（以前は logCreate も併発し CREATE +
      // IMPORT_NEW の2行が書かれていた回帰の防止）。
      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status FROM t_log
           WHERE target_table = 'm_hanbaiten'`,
      );
      const importNew = logs.filter(
        (l: { operation: string }) => l.operation === 'IMPORT_NEW',
      );
      const create = logs.filter(
        (l: { operation: string }) => l.operation === 'CREATE',
      );
      expect(importNew.length).toBe(1);
      expect(importNew[0].result_status).toBe(1);
      expect(create.length).toBe(0);
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
