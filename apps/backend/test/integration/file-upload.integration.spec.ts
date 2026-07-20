// Screen: ACSMS-SCR-022 — ファイルダウンロード画面 (integration)
//
// Full HTTP-flow tests with pg-mem + ioredis-mock + real guards/filters
// via createIntegrationTestApp(). Adds the new entities (FileUpload,
// FileDownload) to the helper's ALL_ENTITIES list during /gen-code-backend.
//
// Rate-limit (429 TOO_MANY_REQUESTS) is application-level (global
// ThrottlerGuard) and proven end-to-end in auth.throttle.integration.spec.ts;
// not re-asserted per endpoint here.

import request from 'supertest';

import { FileUploadModule } from '@/modules/file-upload/file-upload.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

/**
 * Seed a session for the given role and return the Cookie header string.
 * Wraps the helper's two-step seed-then-sign into a one-shot call so
 * the per-test setup reads cleanly.
 */
/**
 * Default permission set for every role this suite exercises. Mirrors
 * `docs/database/seeder.md §3 m_roles_permissions` for the file.*
 * subset — every role with `file.view` / `file.download` / `file.upload`
 * in the production matrix. Callers can still override `permissions:`
 * to narrow the set for "forbidden" / "data-scope" cases.
 *
 * The shared `seedSession()` defaults `permissions: []` so without this
 * mapping every endpoint guarded by `@Permissions('file.download')` or
 * `@Permissions('file.upload')` would return 403 here.
 */
// Per seeder.md §3 matrix, every role gets both `file.upload` and
// `file.download` (all ○○○○○). DataScope narrows what each role can
// actually act on — the permission gate is the same.
const FILE_PERMS_BY_ROLE: Record<string, string[]> = {
  NICHINO_ADMIN: ['file.view', 'file.download', 'file.upload'],
  NICHINO_STAFF: ['file.view', 'file.download', 'file.upload'],
  CHUOKAI: ['file.view', 'file.download', 'file.upload'],
  JA_HONTEN: ['file.view', 'file.download', 'file.upload'],
  JA_KANRI_SHITEN: ['file.view', 'file.download', 'file.upload'],
};

async function loginAs(
  ctx: IntegrationTestContext,
  overrides: Partial<Parameters<IntegrationTestContext['seedSession']>[0]> = {},
): Promise<string> {
  const roleCode = overrides.role_code ?? 'NICHINO_ADMIN';
  const merged = {
    role_code: roleCode,
    permissions: FILE_PERMS_BY_ROLE[roleCode] ?? [],
    ...overrides, // explicit overrides still win — lets the test narrow perms
  };
  const sessionId = await ctx.seedSession(merged);
  return buildSessionCookie(ctx.app, sessionId);
}

describe('SCR-022 — file download integration', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationTestApp({
      modules: [FileUploadModule],
      seedSql: [
        // seed m_account, m_ja, m_account-role mappings, etc. The helper
        // already provides admin / staff / chuokai / honten / kanri rows
        // via its default seedRoles; we add file-upload-specific rows.
        `INSERT INTO t_file_upload
           (file_upload_id, ja_id, upload_datetime, file_name, file_path, file_size, record_count, status, created_at, created_by)
         VALUES
           (101, 1,    NOW(), 'zougen_tsuchi_202604.pdf',    'ja-1/2026/05/zougen_tsuchi_202604.pdf',     524288, 250, 2, NOW(), 'admin01'),
           (102, NULL, NOW(), 'kouza_furikae_20260506.csv',  'global/2026/05/kouza_furikae_20260506.csv', 102400,  80, 2, NOW(), 'staff01'),
           (103, 2,    NOW(), 'other_ja_file.pdf',           'ja-2/2026/05/other_ja_file.pdf',            204800,  50, 2, NOW(), 'admin01')`,
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  // ──────────────────────────────────────────────────────────────
  // API-022-001 — GET /api/v1/file-upload (list)
  // ──────────────────────────────────────────────────────────────
  describe('GET /api/v1/file-upload', () => {
    it('should return 401 when no session cookie is sent', async () => {
      const res = await request(ctx.app.getHttpServer()).get(apiUrl('file-upload'));
      expect(res.status).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 200 with all 3 rows when NICHINO_ADMIN lists files', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .get(apiUrl('file-upload'))
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should expose notified_at field on every row (null until worker stamps it)', async () => {
      // COVERS: SCR-023 §6.5 — `notified_at` column added by migration
      // 1711900900011 and surfaced by the response DTO. The seed fixtures
      // don't pre-populate the column, so every row reports null. After
      // the worker processes a job in production, only rows that have
      // gone through the notification pipeline get a non-null timestamp.
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .get(apiUrl('file-upload'))
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      for (const row of res.body.data) {
        // Use `in` rather than truthy-check — null is a valid value
        // that MUST appear under the key so FE doesn't get an
        // `undefined` it has to special-case.
        expect(row).toHaveProperty('notified_at');
        expect([null, 'string']).toContain(
          row.notified_at == null ? null : typeof row.notified_at,
        );
      }
    });

    it('should return only own-JA + global rows when JA_HONTEN (ja_id=1) lists files', async () => {
      const cookie = await loginAs(ctx, {
        role_code: 'JA_HONTEN',
        ja_id: 1,
      });
      const res = await request(ctx.app.getHttpServer())
        .get(apiUrl('file-upload'))
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      // Should see file 101 (own JA) + 102 (global). NOT 103 (other JA).
      const ids = res.body.data.map((r: any) => r.file_upload_id);
      expect(ids).toContain(101);
      expect(ids).toContain(102);
      expect(ids).not.toContain(103);
    });

    it('should return 400 VALIDATION_ERROR when sort_by is not in the whitelist', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .get(apiUrl('file-upload'))
        .query({ sort_by: 'evil_column' })
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should still return a soft-deleted row with deleted_at populated (削除日 column)', async () => {
      // screen-design No.17/18 — the list includes deleted rows so the
      // 削除日 shows the date and the 削除 button is disabled for them.
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      await ctx.dataSource.query(
        `UPDATE t_file_upload SET deleted_at = NOW() WHERE file_upload_id = 103`,
      );
      try {
        const res = await request(ctx.app.getHttpServer())
          .get(apiUrl('file-upload'))
          .set('Cookie', cookie)
          .expect(200);
        const deleted = res.body.data.find(
          (r: { file_upload_id: number }) => r.file_upload_id === 103,
        );
        expect(deleted).toBeDefined(); // deleted row still listed
        expect(deleted.deleted_at).not.toBeNull(); // 削除日 populated
        const active = res.body.data.find(
          (r: { file_upload_id: number }) => r.file_upload_id === 101,
        );
        expect(active.deleted_at).toBeNull(); // active → null → '-'
      } finally {
        // Restore so later preview/download/scope tests see the original row.
        await ctx.dataSource.query(
          `UPDATE t_file_upload SET deleted_at = NULL WHERE file_upload_id = 103`,
        );
      }
    });
  });

});

// ══════════════════════════════════════════════════════════════════════
// SCR-023 — ファイルアップロード画面 (POST + DELETE) integration
// ══════════════════════════════════════════════════════════════════════

describe('SCR-023 — file upload integration (POST + DELETE)', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationTestApp({
      modules: [FileUploadModule],
      seedSql: [
        // Pre-existing JA rows for scope checks. pg-mem doesn't honor
        // PostgreSQL `DEFAULT ''` / `DEFAULT false` / `DEFAULT NOW()`
        // for NOT NULL columns on INSERT — we list every NOT NULL
        // column explicitly even when production migrations attach a
        // DEFAULT. Mirrors the canonical fixture in
        // `hanbaiten.integration.spec.ts`. Two rows because the
        // DELETE existence-hiding case asserts JA_HONTEN(1) gets 404
        // when targeting a file under ja_id=2.
        `INSERT INTO m_ja (
           ja_id, ja_code, ja_name, ja_name_kana, todofuken_code,
           yubin_no, address, tel, fax, email,
           tanto_busho, tanto_name, zei_kubun, biko, chuokai_flg,
           created_by, updated_by, deleted_at
         ) VALUES
           (1, '00001', 'JA農業中央', 'ジェイエーノウギョウチュウオウ', '13',
            '1000001', '東京都千代田区千代田1-1-1', '0312345678', '', '',
            '', '', 1, '', false, 'SEED', 'SEED', NULL),
           (2, '00002', 'JA東京', 'ジェイエートウキョウ', '13',
            '1000002', '東京都千代田区千代田1-1-2', '0312345670', '', '',
            '', '', 1, '', false, 'SEED', 'SEED', NULL)
         ON CONFLICT (ja_id) DO NOTHING`,
        // DELETE-flow file rows. file_upload_id 101 (ja_id=1, in scope
        // of NICHINO_ADMIN / JA_HONTEN-of-1), 102 (global, ja_id NULL),
        // 103 (ja_id=2, OUT of JA_HONTEN(1)'s scope).
        `INSERT INTO t_file_upload
           (file_upload_id, ja_id, upload_datetime, file_name, file_path,
            file_size, record_count, status, created_at, created_by)
         VALUES
           (101, 1,    NOW(), 'zougen_tsuchi_202604.pdf',
            'ja-1/2026/05/zougen_tsuchi_202604.pdf',    524288, 250, 2, NOW(), 'admin01'),
           (102, NULL, NOW(), 'kouza_furikae_20260506.csv',
            'global/2026/05/kouza_furikae_20260506.csv', 102400,  80, 2, NOW(), 'staff01'),
           (103, 2,    NOW(), 'other_ja_file.pdf',
            'ja-2/2026/05/other_ja_file.pdf',            204800,  50, 2, NOW(), 'admin01')
         ON CONFLICT (file_upload_id) DO NOTHING`,
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  // ──────────────────────────────────────────────────────────────
  // API-023-002 — POST /api/v1/file-upload (multipart)
  // ──────────────────────────────────────────────────────────────
  describe('POST /api/v1/file-upload', () => {
    it('should return 401 when no session cookie is sent', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .field('ja_ids[]', '1')
        .attach('files', Buffer.from('csv'), 'list.csv');
      expect(res.status).toBe(401);
    });

    it('should return 202 with the registered file rows when NICHINO_ADMIN uploads 1 file for 1 JA', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const before = await ctx.dataSource.query(
        `SELECT COUNT(*) AS c FROM t_file_upload`,
      );
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .field('ja_ids[]', '1')
        .attach('files', Buffer.from('login_id,name\n1,A\n'), 'list.csv');
      expect(res.status).toBe(202);
      expect(res.body.data).toBeDefined();
      const after = await ctx.dataSource.query(
        `SELECT COUNT(*) AS c FROM t_file_upload`,
      );
      expect(Number(after[0].c)).toBe(Number(before[0].c) + 1);
      // [ja-code-folder] file_path embeds ja_id + ja_code resolved from m_ja
      // (ja_id=1 → ja_code='00001').
      expect(res.body.data[0].file_path).toMatch(
        /^ja-1-00001\/files\/[a-f0-9-]+-list\.csv$/,
      );
    });

    it('should persist the user-selected 削除予定日 (not NOW()+180days)', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .field('ja_ids[]', '1')
        .field('scheduled_delete_date', '2099/12/31')
        .attach('files', Buffer.from('login_id,name\n1,A\n'), 'list.csv');
      expect(res.status).toBe(202);
      // Pure calendar date — 2099-12-31 everywhere, no TZ shift. Far-future
      // fixed date so the `本日以降` guard never trips as real time advances.
      expect(res.body.data[0].scheduled_delete_date).toBe('2099-12-31');

      const row = await ctx.dataSource.query(
        `SELECT scheduled_delete_date FROM t_file_upload
          WHERE ja_id = 1 AND file_name = 'list.csv'
          ORDER BY file_upload_id DESC LIMIT 1`,
      );
      // pg-mem may hand back a Date or a 'YYYY-MM-DD' string for a date col.
      const stored = row[0].scheduled_delete_date;
      const storedDate =
        typeof stored === 'string'
          ? stored.slice(0, 10)
          : new Date(stored).toISOString().slice(0, 10);
      expect(storedDate).toBe('2099-12-31');
    });

    it('should return 400 VALIDATION_ERROR when 削除予定日 is a past date', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .field('ja_ids[]', '1')
        .field('scheduled_delete_date', '2020/01/01')
        .attach('files', Buffer.from('csv\n'), 'list.csv');
      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 TARGET_JA_REQUIRED when ja_ids is empty', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .attach('files', Buffer.from('csv'), 'list.csv');
      expect(res.status).toBe(400);
      expect(res.body.error_code).toMatch(/TARGET_JA_REQUIRED|VALIDATION_ERROR/);
    });

    it('should return 400 FILE_FORMAT_ERROR when filename has a disallowed extension', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .field('ja_ids[]', '1')
        .attach('files', Buffer.from('binary'), 'malware.exe');
      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('FILE_FORMAT_ERROR');
    });

    it('should INSERT a t_log row (log_type=4, operation=CREATE) when upload succeeds', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      await request(ctx.app.getHttpServer())
        .post(apiUrl('file-upload'))
        .set('Cookie', cookie)
        .field('ja_ids[]', '1')
        .attach('files', Buffer.from('csv-bytes'), 'audit-check.csv');
      const logs = await ctx.dataSource.query(
        `SELECT log_type, operation FROM t_log
          WHERE log_type = 4 AND operation = 'CREATE'
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // API-023-004 — DELETE /api/v1/file-upload/:id
  // ──────────────────────────────────────────────────────────────
  describe('DELETE /api/v1/file-upload/:id', () => {
    it('should return 401 when no session cookie is sent', async () => {
      const res = await request(ctx.app.getHttpServer()).delete(
        apiUrl('file-upload/101'),
      );
      expect(res.status).toBe(401);
    });

    it('should return 200 with message="削除しました。" when NICHINO_ADMIN deletes an existing file', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .delete(apiUrl('file-upload/101'))
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('削除しました。');
    });

    it('should soft-delete the row (deleted_at becomes non-null)', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      // Use file row 102 (global) so subsequent reads don't conflict
      // with earlier tests that may have softDeleted file 101.
      await request(ctx.app.getHttpServer())
        .delete(apiUrl('file-upload/102'))
        .set('Cookie', cookie);
      const row = await ctx.dataSource.query(
        `SELECT deleted_at FROM t_file_upload WHERE file_upload_id = 102`,
      );
      expect(row[0]?.deleted_at).not.toBeNull();
    });

    it('should return 404 NOT_FOUND when deleting a non-existent file', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      const res = await request(ctx.app.getHttpServer())
        .delete(apiUrl('file-upload/9999'))
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should INSERT a t_log row (log_type=4, operation=DELETE) when delete succeeds', async () => {
      const cookie = await loginAs(ctx, { role_code: 'NICHINO_ADMIN' });
      await request(ctx.app.getHttpServer())
        .delete(apiUrl('file-upload/103'))
        .set('Cookie', cookie);
      const logs = await ctx.dataSource.query(
        `SELECT log_type, operation FROM t_log
          WHERE log_type = 4 AND operation = 'DELETE'
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
    });

    it('should return 404 (existence-hiding) when JA_HONTEN deletes another JAs file', async () => {
      const cookie = await loginAs(ctx, { role_code: 'JA_HONTEN', ja_id: 1 });
      // File 103 in the seed belongs to ja_id=2 — outside JA_HONTEN(1) scope.
      const res = await request(ctx.app.getHttpServer())
        .delete(apiUrl('file-upload/103'))
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });
});
