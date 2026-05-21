import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_roles（ロールマスタ）
 *
 * システムのロール（管理者区分）を保持するマスタ。
 * NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN /
 * JA_KANRI_SHITEN / HANBAITEN の6種類。
 * docs/database/database-design.md §m_roles を参照。
 */
export class CreateMRoles1711900800001 implements MigrationInterface {
  name = 'CreateMRoles1711900800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_roles (
        role_id BIGSERIAL PRIMARY KEY,                                      -- ロールID（IDENTITY）
        role_code VARCHAR(50) NOT NULL,                                     -- ロールコード（例：NICHINO_ADMIN）
        role_name VARCHAR(100) NOT NULL,                                    -- ロール名（例：日農）
        description TEXT,                                                   -- 説明
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL                                     -- 更新者
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_roles_role_code ON m_roles (role_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_roles_deleted_at ON m_roles (deleted_at)`);

    // COMMENT ON ... IS '...' — pg_description に登録され
    // pgAdmin / DataGrip の Comment 列に表示される。
    await queryRunner.query(`COMMENT ON TABLE m_roles IS 'ロールマスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.role_id IS 'ロールID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.role_code IS 'ロールコード（例：NICHINO_ADMIN）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.role_name IS 'ロール名（例：日農）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.description IS '説明'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_roles.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_roles`);
  }
}
