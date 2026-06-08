import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_tanka（単価マスタ）
 *
 * 購読料単価および配達手数料単価を JA 単位で管理する。
 * tanka_type=1 は購読料、tanka_type=2 は配達手数料。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §m_tanka に従う。
 *
 * active_flg は「運用上の有効フラグ」で、tekiyo_start_date /
 * tekiyo_end_date による期間判定とは独立に運用者が手動で
 * 単価を「使用停止」にできる。FALSE 行は少数派なので
 * 部分インデックス IX_m_tanka_active_flg_false で
 * 停止中レコードの抽出を高速化する。
 */
export class CreateMTanka1711900800009 implements MigrationInterface {
  name = 'CreateMTanka1711900800009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_tanka (
        tanka_id BIGSERIAL PRIMARY KEY,                                     -- 単価ID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（外部キー）
        tanka_code VARCHAR(10) NOT NULL,                                    -- 単価コード
        tanka_type INTEGER NOT NULL,                                        -- 単価種類（1:購読料, 2:配達手数料）
        tanka_name VARCHAR(100) NOT NULL,                                   -- 単価名称
        kingaku_zeikomi NUMERIC(10, 0) NOT NULL,                            -- 金額（税込）
        kingaku_zeinuki NUMERIC(10, 0) NOT NULL,                            -- 金額（税抜）
        tax_rate NUMERIC(5, 2) NOT NULL,                                    -- 税率（%）例:10.00
        tekiyo_start_date DATE NOT NULL,                                    -- 適用開始日
        tekiyo_end_date DATE,                                               -- 適用終了日
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        active_flg BOOLEAN NOT NULL DEFAULT TRUE,                           -- 運用上の有効フラグ（DEFAULT TRUE）
        campaign_flg BOOLEAN NOT NULL DEFAULT FALSE,                        -- キャンペーンフラグ（DEFAULT FALSE）
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_tanka_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_tanka_ja_code ON m_tanka (ja_id, tanka_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_ja_id ON m_tanka (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_type_name ON m_tanka (tanka_type, tanka_name)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_deleted_at ON m_tanka (deleted_at)`);
    // 停止中レコード抽出用の部分インデックス（少数派の active_flg=FALSE のみ）。
    await queryRunner.query(
      `CREATE INDEX IX_m_tanka_active_flg_false ON m_tanka (active_flg) WHERE active_flg = FALSE`,
    );

    await queryRunner.query(`COMMENT ON TABLE m_tanka IS '単価マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tanka_id IS '単価ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.ja_id IS 'JA ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tanka_code IS '単価コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tanka_type IS '単価種類（1:購読料, 2:配達手数料）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tanka_name IS '単価名称'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.kingaku_zeikomi IS '金額（税込）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.kingaku_zeinuki IS '金額（税抜）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tax_rate IS '税率（%）例:10.00'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tekiyo_start_date IS '適用開始日'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.tekiyo_end_date IS '適用終了日'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.active_flg IS '運用上の有効フラグ（DEFAULT TRUE）'`);
    await queryRunner.query(
      `COMMENT ON COLUMN m_tanka.campaign_flg IS 'キャンペーンフラグ（TRUE: 有効, FALSE: 無効）'`,
    );
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_tanka.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_tanka`);
  }
}
