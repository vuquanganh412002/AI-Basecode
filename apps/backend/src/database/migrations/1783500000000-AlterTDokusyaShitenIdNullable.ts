import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` / `t_dokusya_rireki` の `shiten_id` を NULL 許容へ変更する。
 *
 * 顧客要件 2026-07：購読者情報登録/編集画面の「支店」を必須から任意へ変更。
 * 未選択の購読者を許容するため、両テーブルの FK 列 `shiten_id` の NOT NULL
 * 制約を解除する（FK 制約自体は維持 — NULL は FK チェック対象外）。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して巨大な
 * 差分を出すため、本マイグレーションは必要な2変更のみを手書きする。
 */
export class AlterTDokusyaShitenIdNullable1783500000000
  implements MigrationInterface
{
  name = 'AlterTDokusyaShitenIdNullable1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN shiten_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN shiten_id DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NULL 値が残っていると NOT NULL 復帰は失敗する。ロールバック時は
    // 事前に NULL を除去/補完してから実行すること。
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN shiten_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN shiten_id SET NOT NULL`,
    );
  }
}
