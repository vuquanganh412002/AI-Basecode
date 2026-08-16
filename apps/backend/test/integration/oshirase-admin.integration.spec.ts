// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard + PermissionsGuard + GlobalExceptionFilter +
// ValidationPipe + real TypeORM queries against t_oshirase.
//
// `Oshirase` entity already lives in ALL_ENTITIES at
// test/utils/create-integration-app.ts — no helper edits needed.

import type { Server } from 'http';
import request from 'supertest';

import { OshiraseModule } from '@/modules/oshirase/oshirase.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';
import {
  buildCreateOshiraseBody,
  buildUpdateOshiraseBody,
  futureDateString,
} from '@test/fixtures/oshirase.factory';

describe('ACSMS-SCR-031 integration — oshirase admin endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [OshiraseModule],
      seedSql: [
        // Roles
        `INSERT INTO m_roles (role_code, role_name, description, created_at, created_by, updated_at, updated_by)
         VALUES
           ('NICHINO_ADMIN',   '日農（管理者）', '', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('CHUOKAI',         '中央会',         '', NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // 3 seeded oshirase: 1 published メニュー画面 / 1 draft ログイン画面 /
        // 1 published メニュー画面（締め切り時間）= publish_location=3 (to drive
        // DEADLINE_NOTICE_DUPLICATE per the type=4 ⇔ location=3 pairing).
        `INSERT INTO t_oshirase
           (ja_id, oshirase_type, publish_location, status, title, content,
            publish_start_date, publish_end_date, target_kanri_kubun,
            created_at, created_by, updated_at, updated_by)
         VALUES
           (NULL, 1, 2, 2, 'システムメンテナンスのお知らせ',
            'システムメンテナンス本文。',
            '2026-04-01 09:00:00+09:00', '2026-04-30 23:59:00+09:00', '1,2,3',
            NOW(), '1', NOW(), '1'),
           (1,    3, 1, 1, '新機能リリースのお知らせ',
            '新機能リリース本文。',
            '2026-04-15 00:00:00+09:00', NULL, '',
            NOW(), '1', NOW(), '1'),
           (NULL, 4, 3, 2, '締め切り時間のお知らせ',
            '集金締め切り時間本文。',
            '2026-04-10 00:00:00+09:00', NULL, '',
            NOW(), '1', NOW(), '1')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  async function asAdmin() {
    const sid = await ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      kanri_shiten_id: null,
      permissions: ['oshirase.view', 'oshirase.create', 'oshirase.update', 'oshirase.delete'],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function asChuokai() {
    const sid = await ctx.seedSession({
      account_id: 2,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: 1,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/oshirase — ACSMS-API-031-001
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/oshirase', () => {
    it('should return all 3 seeded oshirase paginated when NICHINO_ADMIN calls', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('oshirase')).set('Cookie', cookie).expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toMatchObject({ page: 1, per_page: 20 });
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http().get(apiUrl('oshirase')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http().get(apiUrl('oshirase')).set('Cookie', cookie).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should pin 締め切り時間 (type=4) first and bubble an updated notice to position 2', async () => {
      const cookie = await asAdmin();
      // Seed ids: 1=type1(loc2), 2=type3(loc1 draft), 3=type4(loc3 deadline).
      // Give 1 and 2 distinct OLD timestamps; 2 newer than 1.
      await ctx.dataSource.query(
        `UPDATE t_oshirase SET created_at='2026-01-01 00:00:00+09:00', updated_at='2026-01-01 00:00:00+09:00' WHERE oshirase_id = 1`,
      );
      await ctx.dataSource.query(
        `UPDATE t_oshirase SET created_at='2026-02-01 00:00:00+09:00', updated_at='2026-02-01 00:00:00+09:00' WHERE oshirase_id = 2`,
      );

      // Before: [3 (type4 pinned), 2 (updated 02-01), 1 (updated 01-01)].
      let res = await http()
        .get(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .expect(200);
      let ids = res.body.data.map((r: { oshirase_id: number }) => r.oshirase_id);
      expect(ids[0]).toBe(3);
      expect(ids.indexOf(2)).toBeLessThan(ids.indexOf(1));

      // Update id=1 → updated_at bumps to now → must jump to position 2.
      const start = await ctx.dataSource.query(
        `SELECT publish_start_date FROM t_oshirase WHERE oshirase_id = 1`,
      );
      const startStr = formatJstYYYYMMDDHHmm(
        new Date(start[0].publish_start_date),
      );
      await http()
        .patch(apiUrl('oshirase/1'))
        .set('Cookie', cookie)
        .send(
          buildUpdateOshiraseBody({
            publish_location: 2,
            oshirase_type: 1,
            status: 2,
            publish_start_date: startStr,
            publish_end_date: futureDateString(365),
            title: '更新済み',
            content: '本文',
          }),
        )
        .expect(200);

      // After: [3 (type4 still first), 1 (just updated), 2].
      res = await http()
        .get(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .expect(200);
      ids = res.body.data.map((r: { oshirase_id: number }) => r.oshirase_id);
      expect(ids[0]).toBe(3);
      expect(ids[1]).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/oshirase/:id — ACSMS-API-031-002
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/oshirase/:id', () => {
    it('should return the detail when oshirase_id exists', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('oshirase/1')).set('Cookie', cookie).expect(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          title: 'システムメンテナンスのお知らせ',
          content: expect.any(String),
        }),
      );
    });

    it('should return 404 NOT_FOUND when oshirase_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('oshirase/9999')).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/oshirase — ACSMS-API-031-003
  // ═══════════════════════════════════════════════════════════════════
  describe('POST /api/v1/oshirase', () => {
    it('should INSERT the new oshirase and return 201 when body is valid', async () => {
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody({ publish_location: 1, oshirase_type: 1 });

      const res = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(201);

      expect(res.body.data.title).toBe(body.title);
      expect(res.body.message).toBe('登録しました。');
    });

    it('should return 400 DEADLINE_NOTICE_DUPLICATE when an oshirase_type=4 (publish_location=3) already exists', async () => {
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody({
        publish_location: 3,
        oshirase_type: 4,
        title: '別の締め切り時間お知らせ',
      });

      const res = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('DEADLINE_NOTICE_DUPLICATE');
    });

    it('should return 400 VALIDATION_ERROR when title is missing', async () => {
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).title;

      const res = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR (publish_end_date) when end is before start', async () => {
      // ACSMS-MSG-031-008: 開始<=終了の相関チェック — bug screenshot
      // reproduction (publish_end_date < publish_start_date).
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody({
        publish_location: 1,
        oshirase_type: 1,
        publish_start_date: futureDateString(10),
        publish_end_date: futureDateString(5),
      });

      const res = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'publish_end_date',
            message: '終了日は開始日より後にしてください。',
          }),
        ]),
      );
    });

    it('should INSERT when publish_end_date is null (無期限) — no correlation error', async () => {
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody({
        publish_location: 1,
        oshirase_type: 1,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      });

      await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(201);
    });

    it('should write an audit log row (t_log) with bare CREATE operation when create succeeds', async () => {
      const cookie = await asAdmin();
      const body = buildCreateOshiraseBody({ publish_location: 1, oshirase_type: 1 });

      const createRes = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(body)
        .expect(201);

      const newId = createRes.body.data.oshirase_id;
      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, target_id
           FROM t_log
          WHERE target_table = 't_oshirase' AND target_id = $1 AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
        [newId],
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('CREATE');
      expect(logs[0].operation).not.toMatch(/OSHIRASE_/);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.create', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .post(apiUrl('oshirase'))
        .set('Cookie', cookie)
        .send(buildCreateOshiraseBody())
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/oshirase/:id — ACSMS-API-031-004
  // ═══════════════════════════════════════════════════════════════════
  describe('PATCH /api/v1/oshirase/:id', () => {
    it('should UPDATE the existing oshirase and return 200 when body is valid', async () => {
      const cookie = await asAdmin();
      // Pick the draft row (id=2) — its publish_start_date is in the past
      // so we keep the same value, only change title/content.
      const before = await ctx.dataSource.query(
        `SELECT publish_start_date FROM t_oshirase WHERE oshirase_id = 2`,
      );
      const startIso = before[0].publish_start_date;
      const startStr = formatJstYYYYMMDDHHmm(new Date(startIso));

      const body = buildUpdateOshiraseBody({
        publish_location: 1,
        oshirase_type: 3,
        status: 1,
        publish_start_date: startStr,
        publish_end_date: futureDateString(30),
        title: '更新後タイトル',
        content: '更新後本文',
      });

      const res = await http()
        .patch(apiUrl('oshirase/2'))
        .set('Cookie', cookie)
        .send(body)
        .expect(200);

      expect(res.body.data.title).toBe('更新後タイトル');
      expect(res.body.message).toBe('更新しました。');

      // Verify DB write.
      const rows = await ctx.dataSource.query(
        `SELECT title FROM t_oshirase WHERE oshirase_id = 2`,
      );
      expect(rows[0].title).toBe('更新後タイトル');
    });

    it('should bump updated_at on update (drives the menu NEW badge)', async () => {
      const cookie = await asAdmin();
      // Force an old updated_at so the bump is detectable.
      await ctx.dataSource.query(
        `UPDATE t_oshirase SET updated_at = '2026-01-01 00:00:00+09:00' WHERE oshirase_id = 2`,
      );
      const before = await ctx.dataSource.query(
        `SELECT publish_start_date FROM t_oshirase WHERE oshirase_id = 2`,
      );
      const startStr = formatJstYYYYMMDDHHmm(
        new Date(before[0].publish_start_date),
      );

      await http()
        .patch(apiUrl('oshirase/2'))
        .set('Cookie', cookie)
        .send(
          buildUpdateOshiraseBody({
            publish_location: 1,
            oshirase_type: 3,
            status: 1,
            publish_start_date: startStr,
            title: '更新後タイトル',
            content: '更新後本文',
          }),
        )
        .expect(200);

      const after = await ctx.dataSource.query(
        `SELECT updated_at FROM t_oshirase WHERE oshirase_id = 2`,
      );
      // If updated_at still equals the forced 2026-01-01 value, the NEW
      // badge (computed from updated_at) would never light up after an edit.
      expect(new Date(after[0].updated_at).getTime()).toBeGreaterThan(
        new Date('2026-02-01T00:00:00Z').getTime(),
      );
    });

    it('should return 404 NOT_FOUND when oshirase_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .patch(apiUrl('oshirase/9999'))
        .set('Cookie', cookie)
        .send(buildUpdateOshiraseBody())
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should write an audit log row (t_log) with bare UPDATE operation when update succeeds', async () => {
      const cookie = await asAdmin();
      const before = await ctx.dataSource.query(
        `SELECT publish_start_date FROM t_oshirase WHERE oshirase_id = 2`,
      );
      const startStr = formatJstYYYYMMDDHHmm(new Date(before[0].publish_start_date));

      await http()
        .patch(apiUrl('oshirase/2'))
        .set('Cookie', cookie)
        .send(
          buildUpdateOshiraseBody({
            publish_location: 1,
            oshirase_type: 3,
            status: 1,
            publish_start_date: startStr,
            publish_end_date: futureDateString(30),
            title: '更新後',
            content: '更新',
          }),
        )
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status FROM t_log
          WHERE target_table = 't_oshirase' AND target_id = 2 AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs[0].operation).toBe('UPDATE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /api/v1/oshirase/:id — ACSMS-API-031-005
  // ═══════════════════════════════════════════════════════════════════
  describe('DELETE /api/v1/oshirase/:id', () => {
    it('should soft-delete the oshirase and return 200 when oshirase_id exists', async () => {
      const cookie = await asAdmin();
      const res = await http().delete(apiUrl('oshirase/1')).set('Cookie', cookie).expect(200);
      expect(res.body).toMatchObject({ message: '削除しました。' });

      const rows = await ctx.dataSource.query(
        `SELECT deleted_at FROM t_oshirase WHERE oshirase_id = 1`,
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('should return 404 NOT_FOUND when oshirase_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http().delete(apiUrl('oshirase/9999')).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when target is already soft-deleted', async () => {
      const cookie = await asAdmin();
      await http().delete(apiUrl('oshirase/1')).set('Cookie', cookie).expect(200);
      const res = await http().delete(apiUrl('oshirase/1')).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should write an audit log row (t_log) with bare DELETE operation when delete succeeds', async () => {
      const cookie = await asAdmin();
      await http().delete(apiUrl('oshirase/1')).set('Cookie', cookie).expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table, target_id
           FROM t_log
          WHERE target_table = 't_oshirase' AND target_id = 1 AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('DELETE');
      expect(logs[0].operation).not.toMatch(/OSHIRASE_/);
    });

    it('should return 403 FORBIDDEN when caller does not hold oshirase.delete', async () => {
      const cookie = await asChuokai();
      const res = await http().delete(apiUrl('oshirase/1')).set('Cookie', cookie).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });
});

// Helper — format JST Date to YYYY/MM/DD HH:mm without timezone shenanigans.
function formatJstYYYYMMDDHHmm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
