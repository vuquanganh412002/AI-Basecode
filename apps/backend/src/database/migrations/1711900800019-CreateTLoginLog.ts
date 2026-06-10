import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_login_log（ログインログテーブル）
 *
 * ログイン試行（成功・失敗いずれも）を全件記録する。
 * login_result=1:成功, 2:失敗。失敗理由は failure_reason に保存する。
 * docs/database/database-design.md §t_login_log を参照。
 */
export class CreateTLoginLog1711900800019 implements MigrationInterface {
  name = 'CreateTLoginLog1711900800019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_login_log (
        login_log_id BIGSERIAL PRIMARY KEY,                                 -- ログインログID（IDENTITY）
        login_datetime TIMESTAMPTZ NOT NULL,                                -- ログイン日時
        account_id BIGINT,                                                  -- アカウントID（FK:m_account）
        login_id VARCHAR(20) NOT NULL,                                      -- 入力されたログインID
        login_result INTEGER NOT NULL,                                      -- ログイン結果（1:成功, 2:失敗）
        failure_reason VARCHAR(100) NOT NULL DEFAULT '',                    -- 失敗理由※空文字許容
        ip_address VARCHAR(50) NOT NULL DEFAULT '',                         -- IPアドレス※空文字許容
        user_agent VARCHAR(500) NOT NULL DEFAULT '',                        -- ユーザーエージェント※空文字許容
        CONSTRAINT FK_t_login_log_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_login_log_datetime ON t_login_log (login_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_login_log_account_id ON t_login_log (account_id)`);

    await queryRunner.query(`COMMENT ON TABLE t_login_log IS 'ログインログテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.login_log_id IS 'ログインログID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.login_datetime IS 'ログイン日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.account_id IS 'アカウントID（FK:m_account）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.login_id IS '入力されたログインID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.login_result IS 'ログイン結果（1:成功, 2:失敗）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.failure_reason IS '失敗理由※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.ip_address IS 'IPアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_login_log.user_agent IS 'ユーザーエージェント※空文字許容'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_login_log`);
  }
}
