import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMHanbaiten1711900800010 implements MigrationInterface {
  name = 'CreateMHanbaiten1711900800010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_hanbaiten (
        hanbaiten_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        hanbaiten_code VARCHAR(10) NOT NULL,
        hanbaiten_name VARCHAR(100) NOT NULL,
        hanbaiten_name_kana VARCHAR(100) NOT NULL DEFAULT '',
        torihikisaki_no VARCHAR(20) NOT NULL DEFAULT '',
        yubin_no VARCHAR(7) NOT NULL DEFAULT '',
        address VARCHAR(200) NOT NULL DEFAULT '',
        tel VARCHAR(15) NOT NULL DEFAULT '',
        fax VARCHAR(15) NOT NULL DEFAULT '',
        shocho_name VARCHAR(50) NOT NULL DEFAULT '',
        itaku_kubun INTEGER,
        haitatsuryo_tanka_id BIGINT,
        haitatsuryo_shiharai_cycle INTEGER,
        tesuryo_kubun INTEGER,
        tesuryo_amount NUMERIC(10, 0),
        bank_code VARCHAR(4) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_branch_code VARCHAR(3) NOT NULL,
        bank_branch_name VARCHAR(100) NOT NULL,
        yokin_shubetsu INTEGER,
        koza_no VARCHAR(10) NOT NULL DEFAULT '',
        koza_meigi VARCHAR(50) NOT NULL DEFAULT '',
        biko TEXT NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_m_hanbaiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_hanbaiten_m_tanka FOREIGN KEY (haitatsuryo_tanka_id) REFERENCES m_tanka (tanka_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_hanbaiten_ja_code ON m_hanbaiten (ja_id, hanbaiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_ja_id ON m_hanbaiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_haitatsuryo_tanka_id ON m_hanbaiten (haitatsuryo_tanka_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_hanbaiten_deleted_at ON m_hanbaiten (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_hanbaiten`);
  }
}
