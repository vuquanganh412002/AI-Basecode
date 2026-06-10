import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * シード: m_roles（ロールマスタ）
 *
 * 5 つのロール（NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI /
 * JA_HONTEN / JA_KANRI_SHITEN）を投入する。
 * role_id は SERIAL の連番で 1〜5 が採番される。
 * docs/database/seeder.md §1 を参照。
 */
export class SeedMRoles1711900900001 implements MigrationInterface {
  name = 'SeedMRoles1711900900001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_roles (role_code, role_name, description, created_at, created_by, updated_at, updated_by) VALUES
      ('NICHINO_ADMIN', '日農（管理者）', '日本農業新聞 管理者アカウント', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('NICHINO_STAFF', '日農（担当者）', '日本農業新聞 担当者アカウント', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('CHUOKAI', '中央会', '中央会アカウント', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('JA_HONTEN', 'JA本店', 'JA本店アカウント', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('JA_KANRI_SHITEN', 'JA管理支店', 'JA管理支店アカウント', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE m_roles RESTART IDENTITY CASCADE`);
  }
}
