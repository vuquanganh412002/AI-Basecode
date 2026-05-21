import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * シード: m_roles_permissions（ロール権限紐付け）
 *
 * 各ロールに割り当てる permission_id を一括投入する。
 * permission_id は SeedMPermissions の INSERT 順に対応する
 * SERIAL の連番（1〜45）。
 *
 * docs/database/seeder.md §3 ロール×権限マトリクス を参照。
 *
 * 2026-05-20: consolidated patch GrantKanriShitenViewUpdateToJaRoles1779172470000
 *             — see git history for the split version. The 6
 *             (role_id, permission_id) grants of kanri_shiten.view (25) and
 *             kanri_shiten.update (26) to roles 3 / 4 / 5 are now declared
 *             inline at the end of each role's block below.
 */
export class SeedMRolesPermissions1711900900003 implements MigrationInterface {
  name = 'SeedMRolesPermissions1711900900003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // role_id=1 NICHINO_ADMIN — 20 permissions（role.view 含む）
    // role_id=2 NICHINO_STAFF — 8 permissions（hanbaiten.daiko_input 含む）
    // role_id=3 CHUOKAI — 31 permissions（+ kanri_shiten.view/update — 2026-05-20）
    // role_id=4 JA_HONTEN — 31 permissions（+ kanri_shiten.view/update — 2026-05-20）
    // role_id=5 JA_KANRI_SHITEN — 29 permissions（+ kanri_shiten.view/update — 2026-05-20）
    await queryRunner.query(`
      INSERT INTO m_roles_permissions (role_id, permission_id, created_at, created_by, updated_at, updated_by) VALUES
      (1, 16, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 17, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 18, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 19, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 24, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 25, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 26, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 27, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 28, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 29, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 30, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 31, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 32, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 33, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 34, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 35, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 36, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 37, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 38, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 7, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 8, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 9, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 11, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 36, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 37, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 38, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 5, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 6, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 7, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 8, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 9, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 10, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 11, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 12, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 13, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 14, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 15, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 17, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 18, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 20, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 21, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 22, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 23, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 36, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 37, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 38, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 39, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 40, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 41, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 42, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 43, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 25, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (3, 26, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 5, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 6, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 7, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 8, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 9, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 10, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 11, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 12, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 13, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 14, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 15, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 17, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 18, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 20, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 21, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 22, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 23, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 36, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 37, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 38, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 39, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 40, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 41, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 42, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 43, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 25, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (4, 26, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 5, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 6, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 7, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 8, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 9, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 10, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 11, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 12, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 13, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 14, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 15, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 20, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 21, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 22, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 23, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 36, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 37, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 38, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 39, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 40, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 41, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 42, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 43, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 25, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (5, 26, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (1, 44, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      (2, 45, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE m_roles_permissions RESTART IDENTITY CASCADE`);
  }
}
