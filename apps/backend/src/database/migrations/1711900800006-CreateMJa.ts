import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_ja（JAマスタ）
 *
 * JA（農業協同組合）の基本情報を保持するマスタテーブル。
 * 全データのデータスコープを決定する最上位の組織単位。
 * 中央会／JA本店／JA管理支店／JA支店／販売店／購読者の
 * 全ての親レコード。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §m_ja に従う。
 * chuokai_flg は「単協=false」が多数派のため DEFAULT false。
 *
 * 2026-05-20: consolidated patches AlterMJaForCustomerSpec1779172467000 +
 *             DropExtraJastemColsFromMJa1779172468000 — see git history for
 *             the split versions. Net changes vs the original split shape:
 *               - bank_code / bank_name columns removed (moved to販売店側).
 *               - jastem_itakusha_code / _name / jastem_ja_code / _name are
 *                 NOT NULL DEFAULT '' (※空文字許容).
 *               - 4 store-level JASTEM columns
 *                 (jastem_toriatsukai_tenpo_code / jastem_tenpo_name /
 *                 jastem_tyokin_shubetsu / jastem_koza_no) removed from
 *                 m_ja — those live on m_shiten now (see CreateMShiten).
 */
export class CreateMJa1711900800006 implements MigrationInterface {
  name = 'CreateMJa1711900800006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_ja (
        ja_id BIGSERIAL PRIMARY KEY,                                        -- JA ID（IDENTITY）
        ja_code VARCHAR(10) NOT NULL,                                       -- JAコード
        ja_name VARCHAR(200) NOT NULL,                                      -- JA名称
        ja_name_kana VARCHAR(200) NOT NULL,                                 -- JA名称（カナ）
        todofuken_code VARCHAR(2) NOT NULL,                                 -- 都道府県コード
        yubin_no VARCHAR(7) NOT NULL,                                       -- 郵便番号
        address VARCHAR(200) NOT NULL,                                      -- 住所
        tel VARCHAR(15) NOT NULL,                                           -- 電話番号
        fax VARCHAR(15) NOT NULL DEFAULT '',                                -- FAX番号※空文字許容
        email VARCHAR(100) NOT NULL DEFAULT '',                             -- メールアドレス※空文字許容
        tanto_busho VARCHAR(100) NOT NULL DEFAULT '',                       -- 担当部署名※空文字許容
        tanto_name VARCHAR(50) NOT NULL DEFAULT '',                         -- 担当者名※空文字許容
        jastem_itakusha_code VARCHAR(10) NOT NULL DEFAULT '',               -- JASTEM_委託者コード※空文字許容
        jastem_itakusha_name VARCHAR(40) NOT NULL DEFAULT '',               -- JASTEM_委託者名※空文字許容
        jastem_ja_code VARCHAR(4) NOT NULL DEFAULT '',                      -- JASTEM_農協番号※空文字許容
        jastem_ja_name VARCHAR(15) NOT NULL DEFAULT '',                     -- JASTEM_農協名※空文字許容
        chuokai_flg BOOLEAN NOT NULL DEFAULT false,                         -- 1=中央会, 0=単協（DEFAULT 0）
        zei_kubun INTEGER NOT NULL,                                         -- 税区分（1:内税, 2:外税）
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_ja_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    // インデックス: PK は BIGSERIAL PRIMARY KEY で自動生成。
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_ja_code ON m_ja (ja_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_ja_todofuken_code ON m_ja (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_ja_deleted_at ON m_ja (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_ja IS 'JAマスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.ja_id IS 'JA ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.ja_code IS 'JAコード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.ja_name IS 'JA名称'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.ja_name_kana IS 'JA名称（カナ）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.todofuken_code IS '都道府県コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.yubin_no IS '郵便番号'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.address IS '住所'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.tel IS '電話番号'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.fax IS 'FAX番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.email IS 'メールアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.tanto_busho IS '担当部署名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.tanto_name IS '担当者名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.jastem_itakusha_code IS 'JASTEM_委託者コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.jastem_itakusha_name IS 'JASTEM_委託者名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.jastem_ja_code IS 'JASTEM_農協番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.jastem_ja_name IS 'JASTEM_農協名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.chuokai_flg IS '1=中央会, 0=単協（DEFAULT 0）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.zei_kubun IS '税区分（1:内税, 2:外税）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.biko IS '備考'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_ja.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_ja`);
  }
}
