import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTLog1711900800018 implements MigrationInterface {
  name = 'CreateTLog1711900800018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_log (
        log_id BIGSERIAL PRIMARY KEY,
        log_type INTEGER NOT NULL,
        log_datetime TIMESTAMPTZ NOT NULL,
        account_id BIGINT,
        ja_id BIGINT,
        gamen_name VARCHAR(100) NOT NULL DEFAULT '',
        operation VARCHAR(100) NOT NULL DEFAULT '',
        result_status INTEGER NOT NULL,
        target_id BIGINT,
        target_table VARCHAR(50) NOT NULL DEFAULT '',
        before_value TEXT NOT NULL DEFAULT '',
        after_value TEXT NOT NULL DEFAULT '',
        ip_address VARCHAR(50) NOT NULL DEFAULT '',
        user_agent VARCHAR(500) NOT NULL DEFAULT '',
        error_message TEXT NOT NULL DEFAULT '',
        stack_trace TEXT NOT NULL DEFAULT '',
        CONSTRAINT FK_t_log_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id),
        CONSTRAINT FK_t_log_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_log_type_datetime ON t_log (log_type, log_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_log_account_id ON t_log (ja_id, result_status)`);
    await queryRunner.query(`CREATE INDEX IX_t_log_ja_id ON t_log (ja_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_log`);
  }
}
