import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTDokusyaRireki1711900800017 implements MigrationInterface {
  name = 'CreateTDokusyaRireki1711900800017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_dokusya_rireki (
        dokusya_rireki_id BIGSERIAL PRIMARY KEY,
        dokusya_id BIGINT NOT NULL,
        rireki_no INTEGER NOT NULL,
        ja_id BIGINT NOT NULL,
        kanri_shiten_id BIGINT,
        shiten_id BIGINT,
        kumiaiin_code VARCHAR(20) NOT NULL DEFAULT '',
        dokusya_shubetsu INTEGER NOT NULL,
        tetsuzuki_shurui INTEGER NOT NULL,
        denshi_dokusya_shubetsu INTEGER,
        shimei_sei VARCHAR(50) NOT NULL,
        shimei_mei VARCHAR(50) NOT NULL,
        shimei_kana_sei VARCHAR(100) NOT NULL,
        shimei_kana_mei VARCHAR(100) NOT NULL,
        dokusya_busu INTEGER NOT NULL,
        yubin_no VARCHAR(7) NOT NULL,
        todofuken_code VARCHAR(2) NOT NULL,
        shikuchoson VARCHAR(100) NOT NULL,
        chome_banchi VARCHAR(100) NOT NULL,
        tatemono_mei VARCHAR(100) NOT NULL DEFAULT '',
        renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',
        renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',
        email VARCHAR(100) NOT NULL DEFAULT '',
        mail_magazine_flg INTEGER NOT NULL,
        birth_year INTEGER,
        gender INTEGER,
        haitatsu_same_flg BOOLEAN NOT NULL DEFAULT false,
        haitatsu_yubin_no VARCHAR(7) NOT NULL DEFAULT '',
        haitatsu_todofuken_code VARCHAR(2) NOT NULL DEFAULT '',
        haitatsu_shikuchoson VARCHAR(100) NOT NULL DEFAULT '',
        haitatsu_chome_banchi VARCHAR(100) NOT NULL DEFAULT '',
        haitatsu_tatemono_mei VARCHAR(100) NOT NULL DEFAULT '',
        haitatsu_renrakusaki_1 VARCHAR(15) NOT NULL DEFAULT '',
        haitatsu_renrakusaki_2 VARCHAR(15) NOT NULL DEFAULT '',
        haitatsu_shimei_sei VARCHAR(50) NOT NULL DEFAULT '',
        haitatsu_shimei_mei VARCHAR(50) NOT NULL DEFAULT '',
        haitatsu_shimei_kana_sei VARCHAR(100) NOT NULL DEFAULT '',
        haitatsu_shimei_kana_mei VARCHAR(100) NOT NULL DEFAULT '',
        hanbaiten_id BIGINT NOT NULL,
        tanka_id BIGINT NOT NULL,
        yubin_kubun VARCHAR(1) NOT NULL DEFAULT '0',
        shiharai_hoho INTEGER NOT NULL,
        dokusyaryo_shiharai_cycle INTEGER,
        bank_code VARCHAR(4) NOT NULL DEFAULT '',
        bank_name VARCHAR(100) NOT NULL DEFAULT '',
        bank_branch_code VARCHAR(3) NOT NULL DEFAULT '',
        bank_branch_name VARCHAR(100) NOT NULL DEFAULT '',
        hikiotoshi_yokin_shubetsu INTEGER,
        hikiotoshi_koza_no VARCHAR(10) NOT NULL DEFAULT '',
        hikiotoshi_koza_meigi VARCHAR(50) NOT NULL DEFAULT '',
        dokusyaso_bunrui VARCHAR(50) NOT NULL DEFAULT '',
        nogyosya_bunrui VARCHAR(50) NOT NULL DEFAULT '',
        shoki_dokusya_kaishi_date DATE NOT NULL,
        dokusya_kaishi_date DATE NOT NULL,
        dokusya_chushi_date DATE,
        joho_henko_tekiyo_date DATE,
        seikyu_kaishi_month VARCHAR(6) NOT NULL DEFAULT '',
        biko TEXT NOT NULL DEFAULT '',
        henko_riyu TEXT NOT NULL DEFAULT '',
        saishin_data_flg BOOLEAN NOT NULL DEFAULT false,
        zougen_hokoku_flg BOOLEAN NOT NULL DEFAULT false,
        shinki_flg BOOLEAN NOT NULL DEFAULT false,
        kaiyaku_flg BOOLEAN NOT NULL DEFAULT false,
        zenkai_hanbaiten_id BIGINT,
        zenkai_dokusya_busu INTEGER,
        zenkai_yubin_no VARCHAR(7),
        zenkai_todofuken_code VARCHAR(2),
        zenkai_shikuchoson VARCHAR(100),
        zenkai_chome_banchi VARCHAR(100),
        zenkai_tatemono_mei VARCHAR(100),
        denshi_shonin_status INTEGER,
        hanbaiten_tekiyo_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_dokusya_rireki`);
  }
}
