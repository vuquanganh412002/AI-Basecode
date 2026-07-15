import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` / `t_dokusya_rireki` の `mail_magazine_flg` を NULL 許容へ変更する。
 *
 * 顧客要件 2026-07：メールマガジンは電子版用項目のため、購読種別=紙版(1)指定時は
 * 未選択とし DB へ NULL 保存する。DEFAULT 0 は維持（未指定 INSERT は従来どおり 0）。
 * 明示的な NULL のみ NULL で保存される。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して巨大な
 * 差分を出すため、本マイグレーションは必要な2変更のみを手書きする。
 */
export class AlterTDokusyaMailMagazineNullable1783500000001
  implements MigrationInterface
{
  name = 'AlterTDokusyaMailMagazineNullable1783500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN mail_magazine_flg DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN mail_magazine_flg DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NULL 値が残っていると NOT NULL 復帰は失敗する。ロールバック時は
    // 事前に NULL を 0 等へ補完してから実行すること。
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN mail_magazine_flg SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN mail_magazine_flg SET NOT NULL`,
    );
  }
}
