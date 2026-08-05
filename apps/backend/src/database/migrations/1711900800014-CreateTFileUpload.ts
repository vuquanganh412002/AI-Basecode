import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_file_upload（ファイルアップロードテーブル）
 *
 * 購読者 Excel 取込／販売店 Excel 取込などのアップロード履歴を保持する。
 * ja_id=NULL の場合は全 JA 向けデータ（日農管理者によるアップロード）。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §t_file_upload に従う。
 * scheduled_delete_date は自動削除予定日（NULL=未設定/期限なし）。
 *
 * 2026-05-20: consolidated patch AddNotificationStatusToTFileUpload1779172466000
 *             — see git history for the split version. notification_status
 *             column is now declared inline below; m_code 'NOTIFICATION_STATUS'
 *             rows are seeded by SeedMCode1711900900005.
 * 2026-08-04: consolidated patches AlterTFileUploadAddNotifiedAt1711900900011
 *             / AlterTFileUploadScheduledDeleteDateToDate1711900900018 — see
 *             git history for the split versions. `notified_at` is declared
 *             inline below and `scheduled_delete_date` is created as DATE
 *             （カレンダー日付。TIMESTAMPTZ だと +07:00 のクライアントで
 *             1日前に見える off-by-one が出ていた）。
 */
export class CreateTFileUpload1711900800014 implements MigrationInterface {
  name = 'CreateTFileUpload1711900800014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_file_upload (
        file_upload_id BIGSERIAL PRIMARY KEY,                               -- ファイルアップロードID（IDENTITY）
        ja_id BIGINT,                                                       -- JA ID（FK:m_ja）※全JA向けの場合はNULL
        upload_datetime TIMESTAMPTZ NOT NULL,                               -- アップロード日時
        scheduled_delete_date DATE DEFAULT NULL,                            -- 削除予定日（カレンダー日付。NULL=未設定/期限なし）
        file_name VARCHAR(255) NOT NULL,                                    -- ファイル名
        file_path VARCHAR(500) NOT NULL,                                    -- ファイルパス
        file_size INTEGER,                                                  -- ファイルサイズ（バイト）
        record_count INTEGER,                                               -- レコード件数
        success_count INTEGER,                                              -- 成功件数
        error_count INTEGER,                                                -- エラー件数
        status INTEGER NOT NULL,                                            -- 処理ステータス（1:処理中, 2:完了, 3:エラー）
        error_file_path VARCHAR(500) NOT NULL DEFAULT '',                   -- エラーファイルパス※空文字許容
        notification_status INTEGER NOT NULL DEFAULT 1,                     -- 通知ステータス（1:未送信, 2:送信中, 3:完了, 4:一部失敗）※m_code.code_category='NOTIFICATION_STATUS' を参照
        notified_at TIMESTAMPTZ NULL,                                       -- 通知メール送信完了日時（worker が notification_status を 3/4 に更新する際に記録）
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        CONSTRAINT FK_t_file_upload_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_file_upload_ja_datetime ON t_file_upload (ja_id, upload_datetime)`);
    await queryRunner.query(`CREATE INDEX IX_t_file_upload_upload_datetime ON t_file_upload (upload_datetime)`);

    await queryRunner.query(`COMMENT ON TABLE t_file_upload IS 'ファイルアップロードテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.file_upload_id IS 'ファイルアップロードID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.ja_id IS 'JA ID（FK:m_ja）※全JA向けの場合はNULL'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.upload_datetime IS 'アップロード日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.scheduled_delete_date IS '削除予定日（カレンダー日付。NULL=未設定/期限なし）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.file_name IS 'ファイル名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.file_path IS 'ファイルパス'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.file_size IS 'ファイルサイズ（バイト）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.record_count IS 'レコード件数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.success_count IS '成功件数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.error_count IS 'エラー件数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.status IS '処理ステータス（1:処理中, 2:完了, 3:エラー）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.error_file_path IS 'エラーファイルパス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.notification_status IS '通知ステータス（1:未送信, 2:送信中, 3:完了, 4:一部失敗）※m_code.code_category=''NOTIFICATION_STATUS'' を参照'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.notified_at IS '通知メール送信完了日時。worker が notification_status を 3:完了 または 4:一部失敗 に更新する際に記録する'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_upload.created_by IS '作成者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_file_upload`);
  }
}
