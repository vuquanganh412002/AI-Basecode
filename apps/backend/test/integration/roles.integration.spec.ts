// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock.
// Exercises SessionAuthGuard, the role-direct admin check, GlobalExceptionFilter,
// ValidationPipe, and the real TypeORM queries over m_roles / m_permissions /
// m_roles_permissions.
//
// `Role`, `Permission`, `RolePermission` are already in ALL_ENTITIES at
// test/utils/create-integration-app.ts — no helper edits needed.

import type { Server } from 'http';
import request from 'supertest';

import { RolesModule } from '@/modules/roles/roles.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('ACSMS-SCR-027 integration — roles + permissions endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [RolesModule],
      seedSql: [
        // Seed the 5 canonical roles per docs/database/seeder.md §3.
        `INSERT INTO m_roles (role_code, role_name, description, created_at, created_by, updated_at, updated_by)
         VALUES
           ('NICHINO_ADMIN',   '日農（管理者）', '日本農業新聞 管理者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('NICHINO_STAFF',   '日農（担当者）', '日本農業新聞 担当者アカウント', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('CHUOKAI',         '中央会',         '中央会アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_HONTEN',       'JA本店',         'JA本店アカウント',             NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('JA_KANRI_SHITEN', 'JA管理支店',     'JA管理支店アカウント',         NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // Seed a handful of permissions (excerpt from seeder.md §2).
        `INSERT INTO m_permissions (permission_code, permission_name, description, created_at, created_by, updated_at, updated_by)
         VALUES
           ('dokusya.create', '購読者登録',     '購読者情報の新規登録', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('dokusya.view',   '購読者参照',     '購読者明細検索・一覧表示', NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           ('account.create', 'アカウント登録', 'アカウントの新規作成', NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
        // Seed initial role-permission allocations for CHUOKAI (role_id=3 → permissions 1,2).
        `INSERT INTO m_roles_permissions (role_id, permission_id, created_at, created_by, updated_at, updated_by)
         VALUES
           (3, 1, NOW(), 'SYSTEM', NOW(), 'SYSTEM'),
           (3, 2, NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
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
      ja_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function asChuokai() {
    const sid = await ctx.seedSession({
      account_id: 10,
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/roles — API-027-001
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/roles', () => {
    it('should return all 5 seeded roles ordered by role_id ASC when NICHINO_ADMIN calls', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('roles')).set('Cookie', cookie).expect(200);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.data.map((r: any) => r.role_code)).toEqual([
        'NICHINO_ADMIN',
        'NICHINO_STAFF',
        'CHUOKAI',
        'JA_HONTEN',
        'JA_KANRI_SHITEN',
      ]);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      const res = await http().get(apiUrl('roles')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http().get(apiUrl('roles')).set('Cookie', cookie).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/roles/:role_id — API-027-002
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/roles/:role_id', () => {
    it('should return role detail + permission_ids ASC when role exists', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('roles/3')).set('Cookie', cookie).expect(200);

      expect(res.body.data.role_id).toBe(3);
      expect(res.body.data.role_code).toBe('CHUOKAI');
      expect(res.body.data.permission_ids).toEqual([1, 2]);
    });

    it('should return 404 NOT_FOUND when role_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('roles/999')).set('Cookie', cookie).expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('指定されたロール');
    });

    it('should return 400 BAD_REQUEST when role_id is not numeric', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('roles/abc')).set('Cookie', cookie).expect(400);
      expect(res.body.error_code).toBe('BAD_REQUEST');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http().get(apiUrl('roles/3')).expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http().get(apiUrl('roles/3')).set('Cookie', cookie).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PUT /api/v1/roles/:role_id — API-027-003
  // ═══════════════════════════════════════════════════════════════════
  describe('PUT /api/v1/roles/:role_id', () => {
    it('should update role + replace permission allocations atomically', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({
          role_name: '中央会（更新後）',
          description: '中央会アカウント（更新）',
          permission_ids: [1, 3], // drop perm 2, add perm 3
        })
        .expect(200);

      expect(res.body.data.role_id).toBe(3);
      expect(res.body.data.role_name).toBe('中央会（更新後）');
      expect(res.body.data.permission_ids).toEqual([1, 3]);

      // Confirm DB state — old (3,2) row should be soft-deleted, new (3,3) inserted.
      const rows = await ctx.dataSource.query(
        `SELECT permission_id FROM m_roles_permissions
          WHERE role_id = 3 AND deleted_at IS NULL
          ORDER BY permission_id ASC`,
      );
      expect(rows.map((r: any) => Number(r.permission_id))).toEqual([1, 3]);
    });

    it('should accept empty permission_ids array (全権限解除)', async () => {
      const cookie = await asAdmin();
      await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({
          role_name: '中央会',
          description: '',
          permission_ids: [],
        })
        .expect(200);

      const rows = await ctx.dataSource.query(
        `SELECT 1 FROM m_roles_permissions WHERE role_id = 3 AND deleted_at IS NULL`,
      );
      expect(rows).toHaveLength(0);
    });

    it('should return 400 VALIDATION_ERROR when permission_ids includes a non-existent id', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({
          role_name: '中央会',
          description: '',
          permission_ids: [1, 9999],
        })
        .expect(400);

      expect(res.body.error_code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 400 VALIDATION_ERROR when role_name is missing', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({ description: '', permission_ids: [1] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when role_name exceeds 20 chars', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({ role_name: 'あ'.repeat(21), description: '', permission_ids: [1] })
        .expect(400);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 NOT_FOUND when role_id does not exist', async () => {
      const cookie = await asAdmin();
      const res = await http()
        .put(apiUrl('roles/999'))
        .set('Cookie', cookie)
        .send({ role_name: 'x', description: '', permission_ids: [] })
        .expect(404);
      expect(res.body.error_code).toBe('NOT_FOUND');
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await http()
        .put(apiUrl('roles/3'))
        .send({ role_name: 'x', description: '', permission_ids: [] })
        .expect(401);
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({ role_name: 'x', description: '', permission_ids: [] })
        .expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    it('should write an audit log row (t_log) for the UPDATE operation', async () => {
      const cookie = await asAdmin();
      await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({ role_name: '中央会', description: '', permission_ids: [1] })
        .expect(200);

      const logs = await ctx.dataSource.query(
        `SELECT operation, result_status, target_table
           FROM t_log
          WHERE target_table = 'm_roles' AND target_id = 3 AND result_status = 1
          ORDER BY log_id DESC LIMIT 1`,
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('UPDATE');
    });

    it('should rollback role UPDATE when permission_ids validation fails — m_roles unchanged', async () => {
      const cookie = await asAdmin();
      const before = await ctx.dataSource.query(
        `SELECT role_name FROM m_roles WHERE role_id = 3`,
      );

      await http()
        .put(apiUrl('roles/3'))
        .set('Cookie', cookie)
        .send({
          role_name: '改名されてはいけない',
          description: '',
          permission_ids: [1, 9999],
        })
        .expect(400);

      const after = await ctx.dataSource.query(
        `SELECT role_name FROM m_roles WHERE role_id = 3`,
      );
      expect(after[0].role_name).toBe(before[0].role_name);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/permissions — API-027-004
  // ═══════════════════════════════════════════════════════════════════
  describe('GET /api/v1/permissions', () => {
    it('should return all seeded permissions ordered by permission_id ASC', async () => {
      const cookie = await asAdmin();
      const res = await http().get(apiUrl('permissions')).set('Cookie', cookie).expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.map((p: any) => p.permission_code)).toEqual([
        'dokusya.create',
        'dokusya.view',
        'account.create',
      ]);
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      const res = await http().get(apiUrl('permissions')).expect(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when caller is NOT NICHINO_ADMIN', async () => {
      const cookie = await asChuokai();
      const res = await http().get(apiUrl('permissions')).set('Cookie', cookie).expect(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });
  });
});
