import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMRolesPermissions1711900800003 implements MigrationInterface {
  name = 'CreateMRolesPermissions1711900800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_roles_permissions (
        role_permission_id BIGSERIAL PRIMARY KEY,
        role_id BIGINT NOT NULL,
        permission_id BIGINT NOT NULL,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_m_roles_permissions_m_roles FOREIGN KEY (role_id) REFERENCES m_roles (role_id),
        CONSTRAINT FK_m_roles_permissions_m_permissions FOREIGN KEY (permission_id) REFERENCES m_permissions (permission_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_roles_permissions ON m_roles_permissions (role_id, permission_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_role_id ON m_roles_permissions (role_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_permission_id ON m_roles_permissions (permission_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_deleted_at ON m_roles_permissions (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_roles_permissions`);
  }
}
