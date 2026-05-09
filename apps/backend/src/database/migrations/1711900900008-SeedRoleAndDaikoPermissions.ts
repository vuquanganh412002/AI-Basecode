import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoleAndDaikoPermissions1711900900008 implements MigrationInterface {
  name = 'SeedRoleAndDaikoPermissions1711900900008';

  // Adds 2 permissions that were missing from the original seed:
  //   - role.view              → role_id=1 NICHINO_ADMIN
  //   - hanbaiten.daiko_input  → role_id=2 NICHINO_STAFF
  //
  // Sources: docs/requirement/account_concept.md ※2 (販売店代行入力 = NICHINO_STAFF
  // only) and docs/design/ACSMS-SCR-010/screen-design.md §3.2 which explicitly
  // names "HANBAITEN_PROXY_INPUT権限" for that menu. role.view backs the
  // ロール管理 sidebar entry — admin-only, no spec row in the matrix yet.
  //
  // permission_id values are SERIAL → resolved via SELECT WHERE permission_code
  // so the migration stays correct regardless of insertion order in dev DBs.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_permissions (permission_code, permission_name, description, created_at, created_by, updated_at, updated_by) VALUES
      ('role.view', 'ロール参照', 'ロール・権限マスタの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.daiko_input', '販売店代行入力', '日農担当者によるJAの販売店代行入力', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM')
    `);

    // INSERT…SELECT…UNION ALL needs explicit ::timestamptz casts on the date
    // literals — Postgres won't infer through the union the way it does for
    // plain INSERT…VALUES (which the original seed migration uses).
    await queryRunner.query(`
      INSERT INTO m_roles_permissions (role_id, permission_id, created_at, created_by, updated_at, updated_by)
      SELECT 1, permission_id, '2026-01-01'::timestamptz, 'SYSTEM', '2026-01-01'::timestamptz, 'SYSTEM'
      FROM m_permissions WHERE permission_code = 'role.view'
      UNION ALL
      SELECT 2, permission_id, '2026-01-01'::timestamptz, 'SYSTEM', '2026-01-01'::timestamptz, 'SYSTEM'
      FROM m_permissions WHERE permission_code = 'hanbaiten.daiko_input'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM m_roles_permissions
      WHERE permission_id IN (
        SELECT permission_id FROM m_permissions
        WHERE permission_code IN ('role.view', 'hanbaiten.daiko_input')
      )
    `);
    await queryRunner.query(`
      DELETE FROM m_permissions
      WHERE permission_code IN ('role.view', 'hanbaiten.daiko_input')
    `);
  }
}
