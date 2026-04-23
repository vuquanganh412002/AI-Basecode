import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMPermissions1711900800002 implements MigrationInterface {
  name = 'CreateMPermissions1711900800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_permissions (
        permission_id BIGSERIAL PRIMARY KEY,
        permission_code VARCHAR(50) NOT NULL,
        permission_name VARCHAR(100) NOT NULL,
        description TEXT,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_permissions_code ON m_permissions (permission_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_permissions_deleted_at ON m_permissions (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_permissions`);
  }
}
