import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_file_download.ja_id` を NULL 許容に変更する。
 *
 * 当初の `CreateTFileDownload` マイグレーション（1711900800015）は
 * NOT NULL で作成したが、SCR-022 §4.5 footnote と SCR-022 api.md は
 * NICHINO_ADMIN / NICHINO_STAFF が全 JA 向けファイル
 * （`t_file_upload.ja_id IS NULL`）をダウンロードした際は
 * `t_file_download.ja_id = NULL` を許容する仕様になっている。
 * ダウンロード機能の 500 を解消するため、列の NOT NULL 制約を外す。
 *
 * 既存の FK 制約（FK_t_file_download_m_ja → m_ja）は維持。
 */
export class AlterTFileDownloadJaIdNullable1711900900010
  implements MigrationInterface
{
  name = 'AlterTFileDownloadJaIdNullable1711900900010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_file_download ALTER COLUMN ja_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_download.ja_id IS 'JA ID（FK:m_ja）。NICHINO_* が全JA向けファイルをダウンロードした場合は NULL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore NOT NULL — only safe when no NULL rows exist.
    await queryRunner.query(
      `ALTER TABLE t_file_download ALTER COLUMN ja_id SET NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_download.ja_id IS 'JA ID（FK:m_ja）'`,
    );
  }
}
