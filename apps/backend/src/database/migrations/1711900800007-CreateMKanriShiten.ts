import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMKanriShiten1711900800007 implements MigrationInterface {
  name = 'CreateMKanriShiten1711900800007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_kanri_shiten (
        kanri_shiten_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        kanri_shiten_code VARCHAR(15) NOT NULL,
        kanri_shiten_name VARCHAR(100) NOT NULL,
        kanri_shiten_name_kana VARCHAR(100) NOT NULL,
        yubin_no VARCHAR(7) NOT NULL,
        todofuken_code VARCHAR(2) NOT NULL,
        address VARCHAR(200) NOT NULL,
        tel VARCHAR(15) NOT NULL,
        fax VARCHAR(15) NOT NULL,
        paper_flg BOOLEAN NOT NULL DEFAULT false,
        denshi_flg BOOLEAN NOT NULL DEFAULT false,
        biko TEXT NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_m_kanri_shiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_kanri_shiten_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_kanri_shiten_code ON m_kanri_shiten (kanri_shiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_ja_id ON m_kanri_shiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_todofuken_code ON m_kanri_shiten (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_kanri_shiten_deleted_at ON m_kanri_shiten (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_kanri_shiten`);
  }
}
