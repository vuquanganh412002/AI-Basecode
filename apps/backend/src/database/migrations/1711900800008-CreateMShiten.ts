import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_shiten（支店マスタ）
 *
 * 管理支店配下の支店マスタ。組織階層の最下位レベル。
 * kinyu_shiten_flg=true の支店は金融機関支店として扱う。
 * docs/database/database-design.md §m_shiten を参照。
 *
 * カラム順序は database-design.md に従う：
 * shiten_id → ja_id → shiten_code → shiten_name → shiten_name_kana →
 * kinyu_shiten_flg → jastem_toriatsukai_tenpo_code → jastem_tenpo_name →
 * jastem_tyokin_shubetsu → jastem_koza_no → kanri_shiten_id → biko →
 * deleted_at → 監査列。
 *
 * 2026-05-20: consolidated patch AddJastemColsToMShiten1779172469000 — see
 *             git history for the split version. The 4 store-level JASTEM
 *             columns (jastem_toriatsukai_tenpo_code / jastem_tenpo_name /
 *             jastem_tyokin_shubetsu / jastem_koza_no, all NOT NULL
 *             DEFAULT '' ※空文字許容) are now declared inline between
 *             kinyu_shiten_flg and kanri_shiten_id.
 */
export class CreateMShiten1711900800008 implements MigrationInterface {
  name = 'CreateMShiten1711900800008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_shiten (
        shiten_id BIGSERIAL PRIMARY KEY,                                    -- 支店ID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（外部キー）
        shiten_code VARCHAR(10) NOT NULL,                                   -- 支店コード
        shiten_name VARCHAR(100) NOT NULL,                                  -- 支店名称
        shiten_name_kana VARCHAR(100) NOT NULL,                             -- 支店名称（カナ）
        kinyu_shiten_flg BOOLEAN NOT NULL DEFAULT false,                    -- 金融機関支店フラグ（DEFAULT false）
        jastem_toriatsukai_tenpo_code VARCHAR(3) NOT NULL DEFAULT '',       -- JASTEM_データ送信取扱店舗コード※空文字許容
        jastem_tenpo_name VARCHAR(15) NOT NULL DEFAULT '',                  -- JASTEM_店舗名※空文字許容
        jastem_tyokin_shubetsu VARCHAR(1) NOT NULL DEFAULT '',              -- JASTEM_貯金種別※空文字許容
        jastem_koza_no VARCHAR(7) NOT NULL DEFAULT '',                      -- JASTEM_口座番号※空文字許容
        kanri_shiten_id BIGINT NOT NULL,                                    -- 管理支店ID（FK:m_kanri_shiten）
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_shiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_shiten_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_shiten_ja_code ON m_shiten (ja_id, shiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_ja_id ON m_shiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_kanri_shiten_id ON m_shiten (kanri_shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_deleted_at ON m_shiten (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_shiten IS '支店マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.shiten_id IS '支店ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.ja_id IS 'JA ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.shiten_code IS '支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.shiten_name IS '支店名称'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.shiten_name_kana IS '支店名称（カナ）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.kinyu_shiten_flg IS '金融機関支店フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.jastem_toriatsukai_tenpo_code IS 'JASTEM_データ送信取扱店舗コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.jastem_tenpo_name IS 'JASTEM_店舗名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.jastem_tyokin_shubetsu IS 'JASTEM_貯金種別※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.jastem_koza_no IS 'JASTEM_口座番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.kanri_shiten_id IS '管理支店ID（FK:m_kanri_shiten）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_shiten.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_shiten`);
  }
}
