import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * t_file_download に3項目を追加する（顧客DB設計更新）:
 *   - scheduled_delete_date        TIMESTAMPTZ / NULL許容（削除予定日）
 *   - nichino_download_allowed_flg BOOLEAN NOT NULL DEFAULT FALSE
 *                                  （日農ダウンロード許可フラグ）
 *   - deleted_at                   TIMESTAMPTZ / NULL許容（論理削除・DEFAULT NULL）
 *
 * docs/database/database-design.md §t_file_download を参照。既存列は不変。
 * ADD COLUMN は末尾に追加されるが、列の物理順序は非依存（列名で参照する）。
 */
export class AlterTFileDownloadAddColumns1711900900021
  implements MigrationInterface
{
  name = 'AlterTFileDownloadAddColumns1711900900021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE t_file_download
        ADD COLUMN scheduled_delete_date TIMESTAMPTZ,
        ADD COLUMN nichino_download_allowed_flg BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL
    `);

    await queryRunner.query(
      `COMMENT ON COLUMN t_file_download.scheduled_delete_date IS '削除予定日'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_download.nichino_download_allowed_flg IS '日農ダウンロード許可フラグ（TRUE:許可する, FALSE:許可しない、DEFAULT FALSE、NOT NULL）'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_download.deleted_at IS '削除フラグ（DEFAULT NULL）'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE t_file_download
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS nichino_download_allowed_flg,
        DROP COLUMN IF EXISTS scheduled_delete_date
    `);
  }
}
