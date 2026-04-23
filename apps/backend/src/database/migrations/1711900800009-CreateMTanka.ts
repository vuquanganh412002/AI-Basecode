import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMTanka1711900800009 implements MigrationInterface {
  name = 'CreateMTanka1711900800009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_tanka (
        tanka_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        tanka_code VARCHAR(10) NOT NULL,
        tanka_type INTEGER NOT NULL,
        tanka_name VARCHAR(100) NOT NULL,
        kingaku_zeikomi NUMERIC(10, 0) NOT NULL,
        kingaku_zeinuki NUMERIC(10, 0) NOT NULL,
        tax_rate NUMERIC(5, 2) NOT NULL,
        tekiyo_start_date DATE NOT NULL,
        tekiyo_end_date DATE,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_m_tanka_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_tanka_ja_code ON m_tanka (ja_id, tanka_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_ja_id ON m_tanka (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_type_name ON m_tanka (tanka_type, tanka_name)`);
    await queryRunner.query(`CREATE INDEX IX_m_tanka_deleted_at ON m_tanka (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_tanka`);
  }
}
