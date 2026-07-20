import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` / `t_dokusya_rireki` の `hanbaiten_id` / `tanka_id` を
 * NULL 許容へ変更する。
 *
 * 未設定（販売店・単価なし）の購読者/履歴行を許容するため、両テーブルの
 * FK 列 `hanbaiten_id` / `tanka_id` の NOT NULL 制約を解除する
 * （FK 制約自体は維持 — NULL は FK チェック対象外）。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して巨大な
 * 差分を出すため、本マイグレーションは必要な4変更のみを手書きする
 * （AlterTDokusyaShitenIdNullable と同方針）。
 */
export class AlterTDokusyaHanbaitenTankaNullable1783700000000
  implements MigrationInterface
{
  name = 'AlterTDokusyaHanbaitenTankaNullable1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN hanbaiten_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN tanka_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN hanbaiten_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN tanka_id DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NULL 値が残っていると NOT NULL 復帰は失敗する。ロールバック時は
    // 事前に NULL を除去/補完してから実行すること。
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN tanka_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN hanbaiten_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN tanka_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN hanbaiten_id SET NOT NULL`,
    );
  }
}
