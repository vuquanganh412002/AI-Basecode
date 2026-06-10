import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_permissions（権限マスタ）
 *
 * 個別の権限を保持するマスタ。permission_code は `model.action`
 * 形式（例: dokusya.view, dokusya.create）。
 * docs/database/database-design.md §m_permissions を参照。
 */
export class CreateMPermissions1711900800002 implements MigrationInterface {
  name = 'CreateMPermissions1711900800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_permissions (
        permission_id BIGSERIAL PRIMARY KEY,                                -- 権限ID（IDENTITY）
        permission_code VARCHAR(50) NOT NULL,                               -- 権限コード（例：SUBSCRIBER_SEARCH）
        permission_name VARCHAR(100) NOT NULL,                              -- 権限名（例：購読者明細検索）
        description TEXT,                                                   -- 説明
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL                                     -- 更新者
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_permissions_code ON m_permissions (permission_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_permissions_deleted_at ON m_permissions (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_permissions IS '権限マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.permission_id IS '権限ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.permission_code IS '権限コード（例：SUBSCRIBER_SEARCH）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.permission_name IS '権限名（例：購読者明細検索）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.description IS '説明'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_permissions.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_permissions`);
  }
}
