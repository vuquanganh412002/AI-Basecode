import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_code（コードマスタ）
 *
 * システム全体で使用する区分値（性別／支払方法／単価種類など）を
 * code_category × code_value で管理する。21 カテゴリを保持する。
 * docs/database/database-design.md §m_code および
 * docs/database/seeder.md §5 を参照。
 *
 * 顧客が DB から code_name を編集することで FE 表示ラベルを
 * リアルタイムに変更できる（FE は useCodesStore でキャッシュ）。
 */
export class CreateMCode1711900800005 implements MigrationInterface {
  name = 'CreateMCode1711900800005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_code (
        code_id BIGSERIAL PRIMARY KEY,                                      -- コードID（IDENTITY）
        code_category VARCHAR(50) NOT NULL,                                 -- コード分類
        code_value VARCHAR(20) NOT NULL,                                    -- コード値
        code_name VARCHAR(100) NOT NULL,                                    -- コード名称
        code_name_short VARCHAR(50) NOT NULL DEFAULT '',                    -- コード名称（略称）※空文字許容
        sort_order INTEGER,                                                 -- 表示順
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL                                     -- 更新者
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_code_category_value ON m_code (code_category, code_value)`);
    await queryRunner.query(`CREATE INDEX IX_m_code_sort_order ON m_code (sort_order)`);
    await queryRunner.query(`CREATE INDEX IX_m_code_deleted_at ON m_code (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_code IS 'コードマスタ（区分値）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.code_id IS 'コードID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.code_category IS 'コード分類'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.code_value IS 'コード値'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.code_name IS 'コード名称'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.code_name_short IS 'コード名称（略称）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.sort_order IS '表示順'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_code.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_code`);
  }
}
