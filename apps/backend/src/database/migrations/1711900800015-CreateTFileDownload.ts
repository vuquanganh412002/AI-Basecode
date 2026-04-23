import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTFileDownload1711900800015 implements MigrationInterface {
  name = 'CreateTFileDownload1711900800015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_file_download (
        file_download_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        download_datetime TIMESTAMPTZ NOT NULL,
        download_type INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        record_count INTEGER NOT NULL,
        target_month VARCHAR(6) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_t_file_download_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_file_download_ja_datetime ON t_file_download (ja_id, download_datetime)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_file_download`);
  }
}
