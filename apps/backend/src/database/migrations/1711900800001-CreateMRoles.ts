import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMRoles1711900800001 implements MigrationInterface {
  name = 'CreateMRoles1711900800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_roles (
        role_id BIGSERIAL PRIMARY KEY,
        role_code VARCHAR(50) NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        description TEXT,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_roles_role_code ON m_roles (role_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_deleted_at ON m_roles (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_roles`);
  }
}
