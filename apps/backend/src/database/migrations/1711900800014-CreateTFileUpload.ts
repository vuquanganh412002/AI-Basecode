import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTFileUpload1711900800014 implements MigrationInterface {
  name = 'CreateTFileUpload1711900800014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_file_upload (
        file_upload_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT,
        upload_datetime TIMESTAMPTZ NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        record_count INTEGER,
        success_count INTEGER,
        error_count INTEGER,
        status INTEGER NOT NULL,
        error_file_path VARCHAR(500) NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_t_file_upload_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_file_upload_ja_datetime ON t_file_upload (ja_id, upload_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_file_upload_upload_datetime ON t_file_upload (upload_datetime)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_file_upload`);
  }
}
