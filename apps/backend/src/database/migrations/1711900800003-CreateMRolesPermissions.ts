import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_roles_permissions（ロール権限紐付けテーブル）
 *
 * m_roles と m_permissions の N:M 中間テーブル。
 * 同一ロール×権限ペアは UNIQUE 制約で重複防止。
 * docs/database/database-design.md §m_roles_permissions を参照。
 *
 * 2026-05-20: consolidated patch RolesPermissionsPartialUniqueIndex1715990400000
 *             — see git history for the split version. The partial UNIQUE
 *             index (WHERE deleted_at IS NULL) is now declared inline below.
 */
export class CreateMRolesPermissions1711900800003 implements MigrationInterface {
  name = 'CreateMRolesPermissions1711900800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_roles_permissions (
        role_permission_id BIGSERIAL PRIMARY KEY,                           -- ロール権限ID（IDENTITY）
        role_id BIGINT NOT NULL,                                            -- ロールID（FK:m_roles）
        permission_id BIGINT NOT NULL,                                      -- 権限ID（FK:m_permissions）
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除日時（soft delete）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_roles_permissions_m_roles FOREIGN KEY (role_id) REFERENCES m_roles (role_id),
        CONSTRAINT FK_m_roles_permissions_m_permissions FOREIGN KEY (permission_id) REFERENCES m_permissions (permission_id)
      )
    `);
    // Partial unique — only active (non-soft-deleted) rows. SCR-027's
    // role update flow soft-deletes the existing allocation set and then
    // INSERTs the new one in the same transaction; without the
    // `WHERE deleted_at IS NULL` predicate the new INSERT collides with
    // the soft-deleted rows for the same (role_id, permission_id) pair.
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_roles_permissions ON m_roles_permissions (role_id, permission_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_role_id ON m_roles_permissions (role_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_permission_id ON m_roles_permissions (permission_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_permissions_deleted_at ON m_roles_permissions (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_roles_permissions IS 'ロール権限紐付けテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.role_permission_id IS 'ロール権限ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.role_id IS 'ロールID（FK:m_roles）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.permission_id IS '権限ID（FK:m_permissions）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.deleted_at IS '削除日時（soft delete）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles_permissions.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_roles_permissions`);
  }
}
