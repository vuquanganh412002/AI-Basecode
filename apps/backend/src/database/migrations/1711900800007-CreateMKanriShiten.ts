import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_kanri_shiten（管理支店マスタ）
 *
 * JA の管理支店を保持するマスタ。JA → 管理支店 → 支店 という
 * 組織階層の中間レベル。JA_KANRI_SHITEN ロールはこの単位で
 * データスコープが制限される。
 * docs/database/database-design.md §m_kanri_shiten を参照。
 */
export class CreateMKanriShiten1711900800007 implements MigrationInterface {
  name = 'CreateMKanriShiten1711900800007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_kanri_shiten (
        kanri_shiten_id BIGSERIAL PRIMARY KEY,                              -- 管理支店ID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（外部キー）
        kanri_shiten_code VARCHAR(15) NOT NULL,                             -- 管理支店コード
        kanri_shiten_name VARCHAR(100) NOT NULL,                            -- 管理支店名
        kanri_shiten_name_kana VARCHAR(100) NOT NULL,                       -- 管理支店名（カナ）
        yubin_no VARCHAR(7) NOT NULL,                                       -- 郵便番号
        todofuken_code VARCHAR(2) NOT NULL,                                 -- 都道府県コード
        address VARCHAR(200) NOT NULL,                                      -- 住所
        tel VARCHAR(15) NOT NULL,                                           -- 電話番号
        fax VARCHAR(15) NOT NULL,                                           -- FAX番号
        paper_flg BOOLEAN NOT NULL DEFAULT false,                           -- 紙版取扱フラグ（DEFAULT false）
        denshi_flg BOOLEAN NOT NULL DEFAULT false,                          -- 電子版取扱フラグ（DEFAULT false）
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_kanri_shiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_kanri_shiten_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_kanri_shiten_code ON m_kanri_shiten (kanri_shiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_ja_id ON m_kanri_shiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_todofuken_code ON m_kanri_shiten (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_deleted_at ON m_kanri_shiten (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_kanri_shiten IS '管理支店マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.kanri_shiten_id IS '管理支店ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.ja_id IS 'JA ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.kanri_shiten_code IS '管理支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.kanri_shiten_name IS '管理支店名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.kanri_shiten_name_kana IS '管理支店名（カナ）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.yubin_no IS '郵便番号'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.todofuken_code IS '都道府県コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.address IS '住所'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.tel IS '電話番号'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.fax IS 'FAX番号'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.paper_flg IS '紙版取扱フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.denshi_flg IS '電子版取扱フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_kanri_shiten.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_kanri_shiten`);
  }
}
