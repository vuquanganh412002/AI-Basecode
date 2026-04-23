import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMShiten1711900800008 implements MigrationInterface {
  name = 'CreateMShiten1711900800008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_shiten (
        shiten_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        shiten_code VARCHAR(10) NOT NULL,
        shiten_name VARCHAR(100) NOT NULL,
        shiten_name_kana VARCHAR(100) NOT NULL,
        kinyu_shiten_flg BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        kanri_shiten_id BIGINT NOT NULL,
        CONSTRAINT FK_m_shiten_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_shiten_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_shiten_ja_code ON m_shiten (ja_id, shiten_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_ja_id ON m_shiten (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_kanri_shiten_id ON m_shiten (kanri_shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_shiten_deleted_at ON m_shiten (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_shiten`);
  }
}
