import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMJa1711900800006 implements MigrationInterface {
  name = 'CreateMJa1711900800006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_ja (
        ja_id BIGSERIAL PRIMARY KEY,
        ja_code VARCHAR(10) NOT NULL,
        ja_name VARCHAR(200) NOT NULL,
        ja_name_kana VARCHAR(200) NOT NULL,
        todofuken_code VARCHAR(2) NOT NULL,
        yubin_no VARCHAR(7) NOT NULL,
        address VARCHAR(200) NOT NULL,
        tel VARCHAR(15) NOT NULL,
        fax VARCHAR(15) NOT NULL DEFAULT '',
        email VARCHAR(100) NOT NULL DEFAULT '',
        tanto_busho VARCHAR(100) NOT NULL DEFAULT '',
        tanto_name VARCHAR(50) NOT NULL DEFAULT '',
        bank_code VARCHAR(4) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        jastem_itakusha_code VARCHAR(10),
        jastem_itakusha_name VARCHAR(40),
        jastem_ja_code VARCHAR(4),
        jastem_ja_name VARCHAR(15),
        jastem_toriatsukai_tenpo_code VARCHAR(3),
        jastem_tenpo_name VARCHAR(15),
        jastem_tyokin_shubetsu VARCHAR(1),
        jastem_koza_no VARCHAR(7),
        chuokai_flg BOOLEAN NOT NULL DEFAULT true,
        zei_kubun INTEGER NOT NULL,
        biko TEXT NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_m_ja_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_ja_code ON m_ja (ja_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_ja_todofuken_code ON m_ja (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_ja_deleted_at ON m_ja (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_ja`);
  }
}
