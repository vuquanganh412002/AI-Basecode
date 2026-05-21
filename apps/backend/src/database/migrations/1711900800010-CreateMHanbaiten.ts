import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_hanbaiten（販売店マスタ）
 *
 * JA 配下の新聞販売店マスタ。購読者ごとに 1 件の販売店を割り当てる。
 * 各販売店は 1 つの JA に属し、配達手数料単価 (haitatsuryo_tanka_id) と
 * 引落口座情報を保持する。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §m_hanbaiten に従う。
 * todofuken_code は都道府県マスタ参照の FK + 検索用インデックスを併設する。
 */
export class CreateMHanbaiten1711900800010 implements MigrationInterface {
  name = 'CreateMHanbaiten1711900800010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_hanbaiten (
        hanbaiten_id BIGSERIAL PRIMARY KEY,                                 -- 販売店ID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（外部キー）
        hanbaiten_code VARCHAR(10) NOT NULL,                                -- 販売店コード
        hanbaiten_name VARCHAR(100) NOT NULL,                               -- 販売店名
        hanbaiten_name_kana VARCHAR(100) NOT NULL DEFAULT '',               -- 販売店名（カナ）※空文字許容
        torihikisaki_no VARCHAR(20) NOT NULL DEFAULT '',                    -- 適格請求書発行事業者番号※空文字許容
        todofuken_code VARCHAR(2) NOT NULL,                                 -- 都道府県コード
        yubin_no VARCHAR(7) NOT NULL DEFAULT '',                            -- 郵便番号※空文字許容
        address VARCHAR(200) NOT NULL DEFAULT '',                           -- 住所※空文字許容
        tel VARCHAR(15) NOT NULL DEFAULT '',                                -- 電話番号※空文字許容
        fax VARCHAR(15) NOT NULL DEFAULT '',                                -- FAX番号※空文字許容
        shocho_name VARCHAR(50) NOT NULL DEFAULT '',                        -- 所長名※空文字許容
        itaku_kubun INTEGER,                                                -- 委託区分（1:振込, 2:日農委託, 9:その他）
        haitatsuryo_tanka_id BIGINT,                                        -- 配達手数料単価ID（FK:m_tanka）
        haitatsuryo_shiharai_cycle INTEGER,                                 -- 配達手数料支払サイクル（月数）
        tesuryo_kubun INTEGER,                                              -- 手数料区分（1:JA, 2:販売店）
        tesuryo_amount NUMERIC(10, 0),                                      -- 手数料金額
        bank_code VARCHAR(4) NOT NULL,                                      -- 金融機関コード
        bank_name VARCHAR(100) NOT NULL,                                    -- 金融機関名
        bank_branch_code VARCHAR(3) NOT NULL,                               -- 引落口座支店コード
        bank_branch_name VARCHAR(100) NOT NULL,                             -- 引落口座支店名
        yokin_shubetsu INTEGER,                                             -- 預金種別（1:普通, 2:当座）
        koza_no VARCHAR(10) NOT NULL DEFAULT '',                            -- 口座番号※空文字許容
        koza_meigi VARCHAR(50) NOT NULL DEFAULT '',                         -- 口座名義※空文字許容
        haiten_flg BOOLEAN NOT NULL DEFAULT false,                          -- 廃店フラグ（DEFAULT false）
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_hanbaiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_hanbaiten_m_tanka FOREIGN KEY (haitatsuryo_tanka_id) REFERENCES m_tanka (tanka_id),
        CONSTRAINT FK_m_hanbaiten_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_hanbaiten_ja_code ON m_hanbaiten (ja_id, hanbaiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_ja_id ON m_hanbaiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_haitatsuryo_tanka_id ON m_hanbaiten (haitatsuryo_tanka_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_todofuken_code ON m_hanbaiten (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_deleted_at ON m_hanbaiten (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE m_hanbaiten IS '販売店マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.hanbaiten_id IS '販売店ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.ja_id IS 'JA ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.hanbaiten_code IS '販売店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.hanbaiten_name IS '販売店名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.hanbaiten_name_kana IS '販売店名（カナ）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.torihikisaki_no IS '適格請求書発行事業者番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.todofuken_code IS '都道府県コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.yubin_no IS '郵便番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.address IS '住所※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.tel IS '電話番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.fax IS 'FAX番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.shocho_name IS '所長名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.itaku_kubun IS '委託区分（1:振込, 2:日農委託, 9:その他）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.haitatsuryo_tanka_id IS '配達手数料単価ID（FK:m_tanka）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.haitatsuryo_shiharai_cycle IS '配達手数料支払サイクル（月数）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.tesuryo_kubun IS '手数料区分（1:JA, 2:販売店）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.tesuryo_amount IS '手数料金額'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.bank_code IS '金融機関コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.bank_name IS '金融機関名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.bank_branch_code IS '引落口座支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.bank_branch_name IS '引落口座支店名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.yokin_shubetsu IS '預金種別（1:普通, 2:当座）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.koza_no IS '口座番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.koza_meigi IS '口座名義※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.haiten_flg IS '廃店フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_hanbaiten.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_hanbaiten`);
  }
}
