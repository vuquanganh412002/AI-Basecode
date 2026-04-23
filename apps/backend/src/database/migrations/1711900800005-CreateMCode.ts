import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMCode1711900800005 implements MigrationInterface {
  name = 'CreateMCode1711900800005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_code (
        code_id BIGSERIAL PRIMARY KEY,
        code_category VARCHAR(50) NOT NULL,
        code_value VARCHAR(20) NOT NULL,
        code_name VARCHAR(100) NOT NULL,
        code_name_short VARCHAR(50) NOT NULL DEFAULT '',
        sort_order INTEGER,
        biko TEXT NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_code_category_value ON m_code (code_category, code_value)`);
    await queryRunner.query(`CREATE INDEX IX_m_code_sort_order ON m_code (sort_order)`);
    await queryRunner.query(`CREATE INDEX IX_m_code_deleted_at ON m_code (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_code`);
  }
}
