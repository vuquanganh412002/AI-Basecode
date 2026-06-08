import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_file_upload.notified_at` 列を追加する。
 *
 * SCR-023 §6.5 では「全アドレス送信成功：notification_status = 3:完了、
 * notified_at を記録」と定義されているが、初版 CreateTFileUpload
 * （1711900800014）には該当列が無かったため、通知メールの非同期化
 * （バックグラウンドワーカー導入）に合わせて追加する。
 *
 * - 値は worker が `notification_status` を `3:完了` または `4:一部失敗`
 *   に更新する際に `NOW()` を書き込む。
 * - 既存行は NULL のまま（過去アップロードは notified_at 未記録）。
 *
 * spec §6.5 にあった `failed_ja_ids` JSONB は本マイグレーションでは
 * 追加しない（1行 = 1 file × 1 JA という N×M 設計に矛盾し、エラー詳細は
 * t_log.log_type=3 で参照可能なため）。
 */
export class AlterTFileUploadAddNotifiedAt1711900900011
  implements MigrationInterface
{
  name = 'AlterTFileUploadAddNotifiedAt1711900900011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_file_upload ADD COLUMN notified_at TIMESTAMPTZ NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_file_upload.notified_at IS '通知メール送信完了日時。worker が notification_status を 3:完了 または 4:一部失敗 に更新する際に記録する'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_file_upload DROP COLUMN notified_at`,
    );
  }
}
