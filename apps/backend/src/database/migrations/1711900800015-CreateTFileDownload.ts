import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_file_download（ファイルダウンロードテーブル）
 *
 * 口座振替データ／増減連絡票／増減通知書／購読者名簿などの
 * ダウンロード履歴を保持する。download_type で出力種別を区別する。
 * docs/database/database-design.md §t_file_download を参照。
 *
 * 2026-08-04: consolidated patches AlterTFileDownloadJaIdNullable1711900900010
 *             / AlterTFileDownloadAddColumns1711900900021 — see git history
 *             for the split versions. `ja_id` is created NULL 許容 and
 *             scheduled_delete_date / nichino_download_allowed_flg /
 *             deleted_at are declared inline below.
 */
export class CreateTFileDownload1711900800015 implements MigrationInterface {
  name = 'CreateTFileDownload1711900800015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_file_download (
        file_download_id BIGSERIAL PRIMARY KEY,                             -- ファイルダウンロードID（IDENTITY）
        ja_id BIGINT,                                                       -- JA ID（FK:m_ja）。NICHINO_* が全JA向けファイルをダウンロードした場合は NULL
        download_datetime TIMESTAMPTZ NOT NULL,                             -- ダウンロード日時
        download_type INTEGER NOT NULL,                                     -- ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）
        scheduled_delete_date TIMESTAMPTZ,                                  -- 削除予定日
        nichino_download_allowed_flg BOOLEAN NOT NULL DEFAULT FALSE,        -- 日農ダウンロード許可フラグ（TRUE:許可する, FALSE:許可しない、DEFAULT FALSE、NOT NULL）
        file_name VARCHAR(255) NOT NULL,                                    -- ファイル名
        file_path VARCHAR(500) NOT NULL,                                    -- ファイルパス
        file_size INTEGER NOT NULL,                                         -- ファイルサイズ（バイト）
        record_count INTEGER NOT NULL,                                      -- レコード件数
        target_month VARCHAR(6) DEFAULT '',                                 -- 対象年月（YYYYMM）※空文字許容・NULL許容（月次でない出力は NULL）
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ DEFAULT NOW(),                               -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        CONSTRAINT FK_t_file_download_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_file_download_ja_datetime ON t_file_download (ja_id, download_datetime)`);

    await queryRunner.query(`COMMENT ON TABLE t_file_download IS 'ファイルダウンロードテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.file_download_id IS 'ファイルダウンロードID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.ja_id IS 'JA ID（FK:m_ja）。NICHINO_* が全JA向けファイルをダウンロードした場合は NULL'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.download_datetime IS 'ダウンロード日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.download_type IS 'ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.scheduled_delete_date IS '削除予定日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.nichino_download_allowed_flg IS '日農ダウンロード許可フラグ（TRUE:許可する, FALSE:許可しない、DEFAULT FALSE、NOT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.file_name IS 'ファイル名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.file_path IS 'ファイルパス'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.file_size IS 'ファイルサイズ（バイト）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.record_count IS 'レコード件数'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.target_month IS '対象年月（YYYYMM）※空文字許容・NULL許容（月次でない出力は NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_file_download.created_by IS '作成者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_file_download`);
  }
}
