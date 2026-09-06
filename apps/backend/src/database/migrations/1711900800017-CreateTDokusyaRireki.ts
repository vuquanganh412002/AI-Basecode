import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_dokusya_rireki（購読者履歴テーブル）
 *
 * t_dokusya の各変更を時系列に保持する履歴テーブル。
 * 1 件の dokusya_id に対し rireki_no で連番が振られ、
 * saishin_data_flg=TRUE の行が最新履歴。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §t_dokusya_rireki に従う。
 * 引落口座は支店レベル以下で管理するため、bank_code / bank_name は持たず
 * bank_branch_code / bank_branch_name のみ保持する。
 *
 * ※ 2026-07 追記: `dokusyaso_bunrui` / `nogyosya_bunrui` の COMMENT 文言のみ、
 *   電子版と同じコード値を保存する仕様（顧客要件 2026-07）に合わせて後から更新した。
 *   適用済み DB には別マイグレーションで反映済み（そのマイグレーションは適用完了後に
 *   削除）。本ファイルの更新は新規構築 DB の COMMENT を実態に揃えるためのもので、
 *   DDL（型・制約）は初版から変更していない。
 *
 * 2026-08-04: consolidated patches — see git history for the split versions.
 *   - AddTorikeshiFlg1783347569751                       torikeshi_flg + IX_..._chain
 *   - AlterTDokusyaShitenIdNullable1783500000000         shiten_id NULL 許容
 *   - AlterTDokusyaMailMagazineNullable1783500000001     mail_magazine_flg NULL 許容
 *   - AlterTDokusyaHanbaitenTankaNullable1783700000000   hanbaiten_id / tanka_id NULL 許容
 *   - AddTDokusyaRirekiHonshiKodokuFlg1783800000001      honshi_kodoku_flg 追加
 *   - DropTDokusyaRirekiHanbaitenTekiyoDate1783900000000 hanbaiten_tekiyo_date 削除
 *   - DropTDokusyaRirekiHenkoRiyu1784200000000           henko_riyu 削除
 *   - AddDokusyaKaiyakuBatchIndexes1784300000000         ix_t_dokusya_rireki_shinki
 */
export class CreateTDokusyaRireki1711900800017 implements MigrationInterface {
  name = 'CreateTDokusyaRireki1711900800017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_dokusya_rireki (
        dokusya_rireki_id BIGSERIAL PRIMARY KEY,                            -- 購読者履歴ID（IDENTITY）
        dokusya_id BIGINT NOT NULL,                                         -- 購読者ID（外部キー）
        rireki_no INTEGER NOT NULL,                                         -- 履歴No（dokusya_id内の連番）
        ja_id BIGINT NOT NULL,                                              -- JA ID
        kanri_shiten_id BIGINT,                                             -- 管理支店ID
        shiten_id BIGINT,                                                   -- 支店ID
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
        renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',                      -- TEL1※空文字許容
        renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',                      -- TEL2※空文字許容
        email VARCHAR(100) NOT NULL DEFAULT '',                             -- メールアドレス※空文字許容
        mail_magazine_flg INTEGER,                                          -- メールマガジン（0:配信しない, 1:配信する）※紙版のみ指定時は NULL
        birth_year INTEGER,                                                 -- 生年（西暦）
        gender INTEGER,                                                     -- 性別（1:男性, 2:女性, 9:回答しない）
        haitatsu_same_flg BOOLEAN NOT NULL DEFAULT false,                   -- 配達先情報指定（TRUE:購読者と同じ）
        haitatsu_yubin_no VARCHAR(7) NOT NULL DEFAULT '',                   -- 配達先郵便番号※空文字許容
        haitatsu_todofuken_code VARCHAR(2) NOT NULL DEFAULT '',             -- 配達先都道府県コード※空文字許容
        haitatsu_shikuchoson VARCHAR(100) NOT NULL DEFAULT '',              -- 配達先市町村郡※空文字許容
        haitatsu_chome_banchi VARCHAR(100) NOT NULL DEFAULT '',             -- 配達先丁目番地※空文字許容
        haitatsu_tatemono_mei VARCHAR(100) NOT NULL DEFAULT '',             -- 配達先建物名※空文字許容
        haitatsu_renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',             -- 配達先TEL1※空文字許容
        haitatsu_renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',             -- 配達先TEL2※空文字許容
        haitatsu_shimei_sei VARCHAR(50) NOT NULL DEFAULT '',                -- 配達先氏名（姓・漢字）※空文字許容
        haitatsu_shimei_mei VARCHAR(50) NOT NULL DEFAULT '',                -- 配達先氏名（名・漢字）※空文字許容
        haitatsu_shimei_kana_sei VARCHAR(100) NOT NULL DEFAULT '',          -- 配達先氏名かな（姓）※空文字許容
        haitatsu_shimei_kana_mei VARCHAR(100) NOT NULL DEFAULT '',          -- 配達先氏名かな（名）※空文字許容
        hanbaiten_id BIGINT,                                                -- 販売店ID※未設定は NULL
        tanka_id BIGINT,                                                    -- 単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1）。未設定は NULL
        yubin_kubun VARCHAR(1) NOT NULL DEFAULT '0',                        -- 郵送区分（0:空, 1:郵送）DEFAULT 0
        shiharai_hoho INTEGER NOT NULL,                                     -- 支払方法（1:口座引落, 2:現金集金, ...）
        dokusyaryo_shiharai_cycle INTEGER,                                  -- 購読料支払サイクル（月数）
        bank_branch_code VARCHAR(3) NOT NULL DEFAULT '',                    -- 引落口座支店コード
        bank_branch_name VARCHAR(100) NOT NULL DEFAULT '',                  -- 引落口座支店名
        hikiotoshi_yokin_shubetsu INTEGER,                                  -- 引落口座貯金種目（1:普通, 2:当座）
        hikiotoshi_koza_no VARCHAR(10) NOT NULL DEFAULT '',                 -- 引落口座番号※空文字許容
        hikiotoshi_koza_meigi VARCHAR(50) NOT NULL DEFAULT '',              -- 引落口座名義※空文字許容
        dokusyaso_bunrui VARCHAR(50) NOT NULL DEFAULT '',                   -- 購読者層分類（単一選択。0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。m_code.code_category=DOKUSYASO_BUNRUI）※空文字許容
        ja_yakushokuin_flg BOOLEAN NOT NULL DEFAULT false,                  -- かつJAグループ役職員フラグ（DEFAULT FALSE）。購読者層分類（dokusyaso_bunrui）＝農業者の場合のみ TRUE を設定可。電子版読者管理システムの users.profession_and_ja（0:チェック無し, 1:チェックあり）を連携。0→FALSE, 1→TRUE
        nogyo_kankei_flg BOOLEAN NOT NULL DEFAULT false,                    -- 農業関係フラグ（DEFAULT FALSE）。購読者層分類（dokusyaso_bunrui）＝企業・団体の場合のみ TRUE を設定可。電子版読者管理システムの users.profession_and_agri（0:チェック無し, 1:チェックあり）を連携。0→FALSE, 1→TRUE
        dokusyaso_bunrui_sonota VARCHAR(255) NOT NULL DEFAULT '',           -- 購読者層分類その他（自由記述）※空文字許容。購読者層分類（dokusyaso_bunrui）＝その他の場合のみ入力可。電子版読者管理システムの users.others_profession（255文字以下）を連携
        nogyosya_bunrui VARCHAR(50) NOT NULL DEFAULT '',                    -- 農業者分類（複数カンマ区切り。0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。m_code.code_category=NOGYOSYA_BUNRUI）※空文字許容
        nogyosya_bunrui_sonota VARCHAR(255) NOT NULL DEFAULT '',            -- 農業者分類その他（自由記述）※空文字許容。農業者分類（nogyosya_bunrui）に「その他」を含む場合のみ入力可。電子版読者管理システムの users.others_products（255文字以下）を連携
        shoki_dokusya_kaishi_date DATE NOT NULL,                            -- 初回購読開始日（変更時も保持）
        dokusya_kaishi_date DATE NOT NULL,                                  -- 購読開始日
        dokusya_chushi_date DATE,                                           -- 購読中止日
        joho_henko_tekiyo_date DATE,                                        -- 読者情報変更適用日
        seikyu_kaishi_month VARCHAR(6) NOT NULL DEFAULT '',                 -- 請求開始月（YYYYMM）※空文字許容
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        saishin_data_flg BOOLEAN NOT NULL DEFAULT false,                    -- 最新データフラグ（DEFAULT false, TRUE=最新レコード）
        zougen_hokoku_flg BOOLEAN NOT NULL DEFAULT false,                   -- 増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更）
        shinki_flg BOOLEAN NOT NULL DEFAULT false,                          -- 新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読）
        kaiyaku_flg BOOLEAN NOT NULL DEFAULT false,                         -- 解約フラグ（DEFAULT false, TRUE=購読→解約）
        zenkai_hanbaiten_id BIGINT,                                         -- 前回販売店ID（初回履歴はNULL）
        zenkai_dokusya_busu INTEGER,                                        -- 前回購読部数（初回履歴はNULL）
        zenkai_yubin_no VARCHAR(7),                                         -- 前回郵便番号（初回履歴はNULL）
        zenkai_todofuken_code VARCHAR(2),                                   -- 前回都道府県コード（初回履歴はNULL）
        zenkai_shikuchoson VARCHAR(100),                                    -- 前回市町村郡（初回履歴はNULL）
        zenkai_chome_banchi VARCHAR(100),                                   -- 前回丁目番地（初回履歴はNULL）
        zenkai_tatemono_mei VARCHAR(100),                                   -- 前回建物名（初回履歴はNULL）
        denshi_shonin_status INTEGER,                                       -- 電子申込承認ステータス
        torikeshi_flg BOOLEAN NOT NULL DEFAULT false,                       -- 取消フラグ（赤伝）。TRUE=取消レコード。帳票・検索・現在状態から除外、再計算対象外（凍結）。物理削除しない
        honshi_kodoku_flg BOOLEAN NOT NULL DEFAULT FALSE,                   -- 本紙購読フラグ（t_dokusya.honshi_kodoku_flg の履歴スナップショット）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時（履歴登録日時）
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者（履歴登録者）
        CONSTRAINT FK_t_dokusya_rireki_t_dokusya FOREIGN KEY (dokusya_id) REFERENCES t_dokusya (dokusya_id),
        CONSTRAINT FK_t_dokusya_rireki_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_t_dokusya_rireki_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id),
        CONSTRAINT FK_t_dokusya_rireki_m_shiten FOREIGN KEY (shiten_id) REFERENCES m_shiten (shiten_id),
        CONSTRAINT FK_t_dokusya_rireki_m_hanbaiten FOREIGN KEY (hanbaiten_id) REFERENCES m_hanbaiten (hanbaiten_id),
        CONSTRAINT FK_t_dokusya_rireki_m_tanka FOREIGN KEY (tanka_id) REFERENCES m_tanka (tanka_id),
        CONSTRAINT FK_t_dokusya_rireki_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_t_dokusya_rireki ON t_dokusya_rireki (dokusya_id, rireki_no)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_dokusya_id ON t_dokusya_rireki (dokusya_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_latest ON t_dokusya_rireki (dokusya_id, saishin_data_flg)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_ja_id ON t_dokusya_rireki (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_kanri_shiten_id ON t_dokusya_rireki (kanri_shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_shiten_id ON t_dokusya_rireki (shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_dokusya_rireki_hanbaiten_id ON t_dokusya_rireki (hanbaiten_id)`);
    // 双時制チェーン探索用（findBefore / findNext / loadHienHanh）。引用符付き — 大文字のまま作られる。
    await queryRunner.query(`CREATE INDEX "IX_t_dokusya_rireki_chain" ON t_dokusya_rireki (dokusya_id, joho_henko_tekiyo_date, rireki_no)`);
    // 現ライフサイクル起点（最新の新規/再購読行）の探索用。新規行は購読者あたり 1〜2 行しか
    // 無いので部分インデックスは極小。述語 2 条件はクエリ側でもリテラルなのでそのまま一致する。
    await queryRunner.query(`
      CREATE INDEX ix_t_dokusya_rireki_shinki
          ON t_dokusya_rireki (dokusya_id, joho_henko_tekiyo_date DESC, rireki_no DESC)
       WHERE shinki_flg = true AND torikeshi_flg = false
    `);
    await queryRunner.query(
      `COMMENT ON INDEX ix_t_dokusya_rireki_shinki IS '現ライフサイクル起点（最新の新規/再購読行）の探索用'`,
    );

    await queryRunner.query(`COMMENT ON TABLE t_dokusya_rireki IS '購読者履歴テーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_rireki_id IS '購読者履歴ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_id IS '購読者ID（外部キー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.rireki_no IS '履歴No（dokusya_id内の連番）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.ja_id IS 'JA ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.kanri_shiten_id IS '管理支店ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shiten_id IS '支店ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.kumiaiin_code IS '組合員コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_shubetsu IS '購読種別（1:紙版, 2:電子版, 3:併読）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.tetsuzuki_shurui IS '手続種類（0:解約, 1:新規）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.denshi_dokusya_shubetsu IS '電子版読者種別（0:無料, 1:有料）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shimei_sei IS '氏名（姓）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shimei_mei IS '氏名（名）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shimei_kana_sei IS '氏名かな（姓）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shimei_kana_mei IS '氏名かな（名）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_busu IS '購読部数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.yubin_no IS '郵便番号'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.todofuken_code IS '都道府県コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shikuchoson IS '市町村郡'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.chome_banchi IS '丁目番地'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.tatemono_mei IS 'マンション名等※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.renrakusaki_1 IS 'TEL1※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.renrakusaki_2 IS 'TEL2※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.email IS 'メールアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.mail_magazine_flg IS 'メールマガジン（0:配信しない, 1:配信する）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.birth_year IS '生年（西暦）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.gender IS '性別（1:男性, 2:女性, 9:回答しない）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_same_flg IS '配達先情報指定（TRUE:購読者と同じ）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_yubin_no IS '配達先郵便番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_todofuken_code IS '配達先都道府県コード※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_shikuchoson IS '配達先市町村郡※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_chome_banchi IS '配達先丁目番地※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_tatemono_mei IS '配達先建物名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_renrakusaki_1 IS '配達先TEL1※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_renrakusaki_2 IS '配達先TEL2※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_shimei_sei IS '配達先氏名（姓・漢字）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_shimei_mei IS '配達先氏名（名・漢字）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_shimei_kana_sei IS '配達先氏名かな（姓）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.haitatsu_shimei_kana_mei IS '配達先氏名かな（名）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.hanbaiten_id IS '販売店ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.tanka_id IS '単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.yubin_kubun IS '郵送区分（0:空, 1:郵送）DEFAULT 0'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shiharai_hoho IS '支払方法（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusyaryo_shiharai_cycle IS '購読料支払サイクル（月数）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.bank_branch_code IS '引落口座支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.bank_branch_name IS '引落口座支店名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.hikiotoshi_yokin_shubetsu IS '引落口座貯金種目（1:普通, 2:当座）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.hikiotoshi_koza_no IS '引落口座番号※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.hikiotoshi_koza_meigi IS '引落口座名義※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusyaso_bunrui IS '購読者層分類（単一選択。0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。m_code.code_category=DOKUSYASO_BUNRUI）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.ja_yakushokuin_flg IS 'かつJAグループ役職員フラグ（DEFAULT FALSE）。購読者層分類（dokusyaso_bunrui）＝農業者の場合のみ TRUE を設定可。電子版読者管理システムの users.profession_and_ja（0:チェック無し, 1:チェックあり）を連携。0→FALSE, 1→TRUE'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.nogyo_kankei_flg IS '農業関係フラグ（DEFAULT FALSE）。購読者層分類（dokusyaso_bunrui）＝企業・団体の場合のみ TRUE を設定可。電子版読者管理システムの users.profession_and_agri（0:チェック無し, 1:チェックあり）を連携。0→FALSE, 1→TRUE'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusyaso_bunrui_sonota IS '購読者層分類その他（自由記述）※空文字許容。購読者層分類（dokusyaso_bunrui）＝その他の場合のみ入力可。電子版読者管理システムの users.others_profession（255文字以下）を連携'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.nogyosya_bunrui IS '農業者分類（複数カンマ区切り。0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。m_code.code_category=NOGYOSYA_BUNRUI）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.nogyosya_bunrui_sonota IS '農業者分類その他（自由記述）※空文字許容。農業者分類（nogyosya_bunrui）に「その他」を含む場合のみ入力可。電子版読者管理システムの users.others_products（255文字以下）を連携'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shoki_dokusya_kaishi_date IS '初回購読開始日（変更時も保持）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_kaishi_date IS '購読開始日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.dokusya_chushi_date IS '購読中止日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.joho_henko_tekiyo_date IS '読者情報変更適用日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.seikyu_kaishi_month IS '請求開始月（YYYYMM）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.saishin_data_flg IS '最新データフラグ（DEFAULT false, TRUE=最新レコード）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zougen_hokoku_flg IS '増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.shinki_flg IS '新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.kaiyaku_flg IS '解約フラグ（DEFAULT false, TRUE=購読→解約）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_hanbaiten_id IS '前回販売店ID（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_dokusya_busu IS '前回購読部数（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_yubin_no IS '前回郵便番号（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_todofuken_code IS '前回都道府県コード（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_shikuchoson IS '前回市町村郡（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_chome_banchi IS '前回丁目番地（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.zenkai_tatemono_mei IS '前回建物名（初回履歴はNULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.denshi_shonin_status IS '電子申込承認ステータス'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.torikeshi_flg IS '取消フラグ（赤伝）。TRUE=取消レコード。帳票・検索・現在状態から除外、再計算対象外（凍結）。物理削除しない'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.honshi_kodoku_flg IS '本紙購読フラグ（t_dokusya.honshi_kodoku_flg の履歴スナップショット。電子版読者管理システムの users.subscribe_flg を連携。0→FALSE, 1→TRUE。DEFAULT FALSE）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.created_at IS '作成日時（履歴登録日時）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_dokusya_rireki.created_by IS '作成者（履歴登録者）'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_dokusya_rireki`);
  }
}
