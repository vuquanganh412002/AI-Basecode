import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_dokusya（購読者テーブル）
 *
 * 新聞購読者の最新情報を保持するメインの業務テーブル。
 * 履歴は t_dokusya_rireki に保持され、rireki_no で最新履歴と紐付く。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §t_dokusya に従う。
 * 引落口座は支店レベル以下で管理するため、bank_code / bank_name は持たず
 * bank_branch_code / bank_branch_name のみ保持する。
 */
export class CreateTDokusya1711900800016 implements MigrationInterface {
  name = 'CreateTDokusya1711900800016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_dokusya (
        dokusya_id BIGSERIAL PRIMARY KEY,                                   -- 購読者ID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（外部キー）
        kanri_shiten_id BIGINT,                                             -- 管理支店ID（外部キー）
        shiten_id BIGINT,                                                   -- 支店ID（外部キー）
        kumiaiin_code VARCHAR(20) NOT NULL DEFAULT '',                      -- 組合員コード※空文字許容
        dokusya_shubetsu INTEGER NOT NULL,                                  -- 購読種別（1:紙版, 2:電子版, 3:併読）
        tetsuzuki_shurui INTEGER NOT NULL,                                  -- 手続種類（0:解約, 1:新規）
        denshi_dokusya_shubetsu INTEGER,                                    -- 電子版読者種別（0:無料, 1:有料）
        shimei_sei VARCHAR(50) NOT NULL,                                    -- 氏名（姓）
        shimei_mei VARCHAR(50) NOT NULL,                                    -- 氏名（名）
        shimei_kana_sei VARCHAR(100) NOT NULL,                              -- 氏名かな（姓）
        shimei_kana_mei VARCHAR(100) NOT NULL,                              -- 氏名かな（名）
        dokusya_busu INTEGER NOT NULL,                                      -- 購読部数
        yubin_no VARCHAR(7) NOT NULL,                                       -- 郵便番号
        todofuken_code VARCHAR(2) NOT NULL,                                 -- 都道府県コード
        shikuchoson VARCHAR(100) NOT NULL,                                  -- 市町村郡
        chome_banchi VARCHAR(100) NOT NULL,                                 -- 丁目番地
        tatemono_mei VARCHAR(100) NOT NULL DEFAULT '',                      -- マンション名等※空文字許容
        renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',                      -- 連絡先１※空文字許容
        renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',                      -- 連絡先２※空文字許容
        email VARCHAR(100) NOT NULL DEFAULT '',                             -- メールアドレス※空文字許容
        mail_magazine_flg INTEGER NOT NULL,                                 -- メールマガジン（0:配信しない, 1:配信する）
        birth_year INTEGER,                                                 -- 生年（西暦）
        gender INTEGER,                                                     -- 性別（1:男性, 2:女性, 9:回答しない）
        haitatsu_same_flg BOOLEAN NOT NULL DEFAULT false,                   -- 配達先情報指定（TRUE:購読者と同じ）
        haitatsu_yubin_no VARCHAR(7) NOT NULL DEFAULT '',                   -- 配達先郵便番号※空文字許容
        haitatsu_todofuken_code VARCHAR(2) NOT NULL DEFAULT '',             -- 配達先都道府県コード※空文字許容
        haitatsu_shikuchoson VARCHAR(100) NOT NULL DEFAULT '',              -- 配達先市町村郡※空文字許容
        haitatsu_chome_banchi VARCHAR(100) NOT NULL DEFAULT '',             -- 配達先丁目番地※空文字許容
        haitatsu_tatemono_mei VARCHAR(100) NOT NULL DEFAULT '',             -- 配達先建物名※空文字許容
        haitatsu_renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',             -- 配達先連絡先１※空文字許容
        haitatsu_renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',             -- 配達先連絡先２※空文字許容
        haitatsu_shimei_sei VARCHAR(50) NOT NULL DEFAULT '',                -- 配達先氏名（姓・漢字）※空文字許容
        haitatsu_shimei_mei VARCHAR(50) NOT NULL DEFAULT '',                -- 配達先氏名（名・漢字）※空文字許容
        haitatsu_shimei_kana_sei VARCHAR(100) NOT NULL DEFAULT '',          -- 配達先氏名かな（姓）※空文字許容
        haitatsu_shimei_kana_mei VARCHAR(100) NOT NULL DEFAULT '',          -- 配達先氏名かな（名）※空文字許容
        hanbaiten_id BIGINT NOT NULL,                                       -- 販売店ID（外部キー）
        tanka_id BIGINT NOT NULL,                                           -- 単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1）
        yubin_kubun VARCHAR(1) NOT NULL DEFAULT '0',                        -- 郵送区分（0:空, 1:郵送）DEFAULT 0
        shiharai_hoho INTEGER NOT NULL,                                     -- 支払方法（1:口座引落, 2:現金集金, ...）
        dokusyaryo_shiharai_cycle INTEGER,                                  -- 購読料支払サイクル（月数）
        bank_branch_code VARCHAR(3) NOT NULL DEFAULT '',                    -- 引落口座支店コード
        bank_branch_name VARCHAR(100) NOT NULL DEFAULT '',                  -- 引落口座支店名
        hikiotoshi_yokin_shubetsu INTEGER,                                  -- 引落口座貯金種目（1:普通, 2:当座）
        hikiotoshi_koza_no VARCHAR(10) NOT NULL DEFAULT '',                 -- 引落口座番号※空文字許容
        hikiotoshi_koza_meigi VARCHAR(50) NOT NULL DEFAULT '',              -- 引落口座名義※空文字許容
        dokusyaso_bunrui VARCHAR(50) NOT NULL DEFAULT '',                   -- 購読者層分類（複数カンマ区切り）※空文字許容
        nogyosya_bunrui VARCHAR(50) NOT NULL DEFAULT '',                    -- 農業者分類（複数カンマ区切り）※空文字許容
        shoki_dokusya_kaishi_date DATE NOT NULL,                            -- 初回購読開始日（変更時も保持）
        dokusya_kaishi_date DATE NOT NULL,                                  -- 購読開始日
        dokusya_chushi_date DATE,                                           -- 購読中止日
        joho_henko_tekiyo_date DATE,                                        -- 読者情報変更適用日
        seikyu_kaishi_month VARCHAR(6) NOT NULL DEFAULT '',                 -- 請求開始月（YYYYMM）※空文字許容
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        rireki_no INTEGER NOT NULL,                                         -- 履歴No（最新の履歴番号）。DEFAULT 1 は 1711900900014-AlterTDokusyaRirekiNoDefault で後付け。新規作成時は DB DEFAULT 1, 更新時は service が MAX(rireki_no)+1 で明示セット
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        denshi_shonin_status INTEGER,                                       -- 電子申込承認ステータス
        CONSTRAINT FK_t_dokusya_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_t_dokusya_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id),
        CONSTRAINT FK_t_dokusya_m_shiten FOREIGN KEY (shiten_id) REFERENCES m_shiten (shiten_id),
        CONSTRAINT FK_t_dokusya_m_hanbaiten FOREIGN KEY (hanbaiten_id) REFERENCES m_hanbaiten (hanbaiten_id),
        CONSTRAINT FK_t_dokusya_m_tanka FOREIGN KEY (tanka_id) REFERENCES m_tanka (tanka_id),
        CONSTRAINT FK_t_dokusya_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_ja_id ON t_dokusya (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_kanri_shiten_id ON t_dokusya (kanri_shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_shiten_id ON t_dokusya (shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_kumiaiin_code ON t_dokusya (kumiaiin_code)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_hanbaiten_id ON t_dokusya (hanbaiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_ja_kumiaiin ON t_dokusya (ja_id, kumiaiin_code)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_hierarchy ON t_dokusya (ja_id, kanri_shiten_id, shiten_id)`);

    await queryRunner.query(`COMMENT ON TABLE t_dokusya IS '購読者テーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusya_id IS '購読者ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.ja_id IS 'JA ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.kanri_shiten_id IS '管理支店ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shiten_id IS '支店ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.kumiaiin_code IS '組合員コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusya_shubetsu IS '購読種別（1:紙版, 2:電子版, 3:併読）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.tetsuzuki_shurui IS '手続種類（0:解約, 1:新規）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.denshi_dokusya_shubetsu IS '電子版読者種別（0:無料, 1:有料）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shimei_sei IS '氏名（姓）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shimei_mei IS '氏名（名）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shimei_kana_sei IS '氏名かな（姓）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shimei_kana_mei IS '氏名かな（名）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusya_busu IS '購読部数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.yubin_no IS '郵便番号'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.todofuken_code IS '都道府県コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shikuchoson IS '市町村郡'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.chome_banchi IS '丁目番地'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.tatemono_mei IS 'マンション名等※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.renrakusaki_1 IS '連絡先１※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.renrakusaki_2 IS '連絡先２※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.email IS 'メールアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.mail_magazine_flg IS 'メールマガジン（0:配信しない, 1:配信する）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.birth_year IS '生年（西暦）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.gender IS '性別（1:男性, 2:女性, 9:回答しない）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_same_flg IS '配達先情報指定（TRUE:購読者と同じ）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_yubin_no IS '配達先郵便番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_todofuken_code IS '配達先都道府県コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_shikuchoson IS '配達先市町村郡※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_chome_banchi IS '配達先丁目番地※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_tatemono_mei IS '配達先建物名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_renrakusaki_1 IS '配達先連絡先１※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_renrakusaki_2 IS '配達先連絡先２※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_shimei_sei IS '配達先氏名（姓・漢字）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_shimei_mei IS '配達先氏名（名・漢字）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_shimei_kana_sei IS '配達先氏名かな（姓）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.haitatsu_shimei_kana_mei IS '配達先氏名かな（名）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.hanbaiten_id IS '販売店ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.tanka_id IS '単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.yubin_kubun IS '郵送区分（0:空, 1:郵送）DEFAULT 0'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shiharai_hoho IS '支払方法（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusyaryo_shiharai_cycle IS '購読料支払サイクル（月数）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.bank_branch_code IS '引落口座支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.bank_branch_name IS '引落口座支店名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.hikiotoshi_yokin_shubetsu IS '引落口座貯金種目（1:普通, 2:当座）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.hikiotoshi_koza_no IS '引落口座番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.hikiotoshi_koza_meigi IS '引落口座名義※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusyaso_bunrui IS '購読者層分類（複数カンマ区切り）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.nogyosya_bunrui IS '農業者分類（複数カンマ区切り）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.shoki_dokusya_kaishi_date IS '初回購読開始日（変更時も保持）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusya_kaishi_date IS '購読開始日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.dokusya_chushi_date IS '購読中止日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.joho_henko_tekiyo_date IS '読者情報変更適用日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.seikyu_kaishi_month IS '請求開始月（YYYYMM）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.rireki_no IS '履歴No（最新の履歴番号）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.updated_by IS '更新者'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya.denshi_shonin_status IS '電子申込承認ステータス'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_dokusya`);
  }
}
