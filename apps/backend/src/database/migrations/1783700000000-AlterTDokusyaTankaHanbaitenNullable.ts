import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` / `t_dokusya_rireki` の `tanka_id` と `hanbaiten_id` を NULL 許容へ。
 *
 * 電子版読者管理システム（denshiban）からの連携（初期/差分同期）で作成される
 * 購読者は、次の理由で両 FK が未設定になり得る：
 *   - `tanka_id`  : 連動時は NULL。単価は承認時に購読者情報登録画面で登録する
 *                   （電子版かつ支払方法=JA集金 の場合は必須）。
 *   - `hanbaiten_id`: 電子版単独はダミー販売店が用意されるまで NULL、併読のみ
 *                     ShopCd から解決した販売店を設定する。
 *
 * FK 制約自体は維持（NULL は FK チェック対象外）。UI からの購読者登録は DTO で
 * 引き続き必須なので、この緩和は連携経路のためだけに効く。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して巨大な
 * 差分を出すため、本マイグレーションは必要な4変更のみを手書きする。
 */
export class AlterTDokusyaTankaHanbaitenNullable1783700000000
  implements MigrationInterface
{
  name = 'AlterTDokusyaTankaHanbaitenNullable1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN tanka_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN hanbaiten_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN tanka_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN hanbaiten_id DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NULL 値が残っていると NOT NULL 復帰は失敗する。ロールバック時は事前に
    // NULL を除去/補完（ダミー販売店・単価の割当）してから実行すること。
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN hanbaiten_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ALTER COLUMN tanka_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN hanbaiten_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN tanka_id SET NOT NULL`,
    );
  }
}
