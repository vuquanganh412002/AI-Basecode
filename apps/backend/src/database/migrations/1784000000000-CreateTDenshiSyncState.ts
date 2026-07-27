import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 電子版 → クラウド版 同期バッチのチェックポイント（watermark）テーブルを作成する。
 *
 * `dokusya-sync` バッチが差分取込の起点を記録する。1バッチ=1行。`batch_name` を
 * 主キーにし、初期行（`dokusya-sync`）を watermark 未設定（NULL）で投入する。
 * IF NOT EXISTS / ON CONFLICT で冪等化。
 * See docs/dokusya-sync-implementation-plan.md §2.
 */
export class CreateTDenshiSyncState1784000000000 implements MigrationInterface {
  name = 'CreateTDenshiSyncState1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS t_denshi_sync_state (
        batch_name              VARCHAR(50)  NOT NULL,
        last_source_id          BIGINT       NULL,
        last_source_updated_at  TIMESTAMPTZ  NULL,
        last_run_at             TIMESTAMPTZ  NULL,
        updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT PK_t_denshi_sync_state PRIMARY KEY (batch_name)
      )
    `);
    await queryRunner.query(
      `COMMENT ON TABLE t_denshi_sync_state IS '電子版→クラウド版 同期バッチのチェックポイント（1バッチ=1行）'`,
    );
    // 初期行（watermark 未設定＝初回は全件取込）。
    await queryRunner.query(
      `INSERT INTO t_denshi_sync_state (batch_name) VALUES ('dokusya-sync')
         ON CONFLICT (batch_name) DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_denshi_sync_state`);
  }
}
