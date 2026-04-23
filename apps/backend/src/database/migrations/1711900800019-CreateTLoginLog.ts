import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTLoginLog1711900800019 implements MigrationInterface {
  name = 'CreateTLoginLog1711900800019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_login_log (
        login_log_id BIGSERIAL PRIMARY KEY,
        login_datetime TIMESTAMPTZ NOT NULL,
        account_id BIGINT,
        login_id VARCHAR(20) NOT NULL,
        login_result INTEGER NOT NULL,
        failure_reason VARCHAR(100) NOT NULL DEFAULT '',
        ip_address VARCHAR(50) NOT NULL DEFAULT '',
        user_agent VARCHAR(500) NOT NULL DEFAULT '',
        CONSTRAINT FK_t_login_log_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_login_log_datetime ON t_login_log (login_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_login_log_account_id ON t_login_log (account_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_login_log`);
  }
}
