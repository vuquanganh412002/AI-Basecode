import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_log（操作ログテーブル）
 *
 * CRUD 操作・システムイベント・エラー・ファイル取込の操作ログを
 * 一元的に保持する。log_type で種別を、result_status で
 * 成功／失敗／警告を区別する。
 *
 * 本処理（CREATE/UPDATE/DELETE）の DML と t_log への INSERT は
 * 単一トランザクション内で実行することがコード規約。
 * エラー発生時の log_type=3（エラー）はトランザクション外で別途記録。
 *
 * docs/database/database-design.md §t_log を参照。
 */
export class CreateTLog1711900800018 implements MigrationInterface {
  name = 'CreateTLog1711900800018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_log (
        log_id BIGSERIAL PRIMARY KEY,                                       -- ログID（IDENTITY）
        log_type INTEGER NOT NULL,                                          -- ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード）
        log_datetime TIMESTAMPTZ NOT NULL,                                  -- ログ日時
        account_id BIGINT,                                                  -- アカウントID
        ja_id BIGINT,                                                       -- JA ID
        gamen_name VARCHAR(100) NOT NULL DEFAULT '',                        -- 画面名※空文字許容
        operation VARCHAR(100) NOT NULL DEFAULT '',                         -- 操作内容（CREATE/UPDATE/DELETE等）※空文字許容
        result_status INTEGER NOT NULL,                                     -- 結果ステータス（1:成功, 2:失敗, 3:警告）
        target_id BIGINT,                                                   -- 操作対象ID
        target_table VARCHAR(50) NOT NULL DEFAULT '',                       -- 操作対象テーブル※空文字許容
        before_value TEXT NOT NULL DEFAULT '',                              -- 変更前値（JSON）※空文字許容
        after_value TEXT NOT NULL DEFAULT '',                               -- 変更後値（JSON）※空文字許容
        ip_address VARCHAR(50) NOT NULL DEFAULT '',                         -- IPアドレス※空文字許容
        user_agent VARCHAR(500) NOT NULL DEFAULT '',                        -- ユーザーエージェント※空文字許容
        error_message TEXT NOT NULL DEFAULT '',                             -- エラーメッセージ※空文字許容
        stack_trace TEXT NOT NULL DEFAULT '',                               -- スタックトレース※空文字許容
        CONSTRAINT FK_t_log_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id),
        CONSTRAINT FK_t_log_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_log_type_datetime ON t_log (log_type, log_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_log_account_id ON t_log (ja_id, result_status)`);
    await queryRunner.query(`CREATE INDEX IX_t_log_ja_id ON t_log (ja_id)`);

    await queryRunner.query(`COMMENT ON TABLE t_log IS '操作ログテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.log_id IS 'ログID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.log_type IS 'ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.log_datetime IS 'ログ日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.account_id IS 'アカウントID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.ja_id IS 'JA ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.gamen_name IS '画面名※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.operation IS '操作内容（CREATE/UPDATE/DELETE等）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.result_status IS '結果ステータス（1:成功, 2:失敗, 3:警告）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.target_id IS '操作対象ID'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.target_table IS '操作対象テーブル※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.before_value IS '変更前値（JSON）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.after_value IS '変更後値（JSON）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.ip_address IS 'IPアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.user_agent IS 'ユーザーエージェント※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.error_message IS 'エラーメッセージ※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_log.stack_trace IS 'スタックトレース※空文字許容'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_log`);
  }
}
