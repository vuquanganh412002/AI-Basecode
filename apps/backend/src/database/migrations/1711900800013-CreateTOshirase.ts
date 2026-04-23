import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTOshirase1711900800013 implements MigrationInterface {
  name = 'CreateTOshirase1711900800013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_oshirase (
        oshirase_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT,
        oshirase_type INTEGER NOT NULL,
        publish_location INTEGER NOT NULL,
        status INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        publish_start_date TIMESTAMPTZ NOT NULL,
        publish_end_date TIMESTAMPTZ,
        target_kanri_kubun VARCHAR(20) NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        CONSTRAINT FK_t_oshirase_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_publish ON t_oshirase (status, publish_location, publish_start_date)`);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_ja_status ON t_oshirase (ja_id, status)`);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_deleted_at ON t_oshirase (deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_oshirase`);
  }
}
