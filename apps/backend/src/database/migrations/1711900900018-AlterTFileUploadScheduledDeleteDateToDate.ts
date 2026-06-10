import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_file_upload.scheduled_delete_date` を TIMESTAMPTZ → DATE に変更する。
 *
 * 削除予定日は本来「カレンダー日付（yyyymmdd、時刻・タイムゾーンなし）」
 * （screen-design 画面項目定義 No.7）。TIMESTAMPTZ で JST 00:00 を保存して
 * いたため、+07:00 のDBクライアントでは 1日前（例: 2026-06-29）に表示され
 * る off-by-one が発生していた。DATE 型にすることで、どのクライアント／TZ
 * でも 2026-06-30 が一意に読める。
 *
 * 既存値の変換は JST 基準（AT TIME ZONE 'Asia/Tokyo'）で日付部分を取り出す。
 */
export class AlterTFileUploadScheduledDeleteDateToDate1711900900018
  implements MigrationInterface
{
  name = 'AlterTFileUploadScheduledDeleteDateToDate1711900900018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_file_upload
         ALTER COLUMN scheduled_delete_date TYPE DATE
         USING (scheduled_delete_date AT TIME ZONE 'Asia/Tokyo')::date`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_upload.scheduled_delete_date IS '削除予定日（カレンダー日付。NULL=未設定/期限なし）'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore TIMESTAMPTZ, interpreting the date as 00:00 JST.
    await queryRunner.query(
      `ALTER TABLE t_file_upload
         ALTER COLUMN scheduled_delete_date TYPE TIMESTAMPTZ
         USING (scheduled_delete_date::timestamp AT TIME ZONE 'Asia/Tokyo')`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_upload.scheduled_delete_date IS '削除予定日（NULL=未設定/期限なし）'`,
    );
  }
}
