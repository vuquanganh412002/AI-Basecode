import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya_rireki` に取消フラグ `torikeshi_flg` 列と、双時制チェーン
 * 探索用の複合インデックスを追加する。
 *
 * - torikeshi_flg: 取消処理（赤伝）で無効化されたレコードを表す。誤レコードと
 *   打ち消しレコードの両方に立て、帳票・検索・現在状態表示から除外する。
 *   物理削除はしない。DEFAULT false。
 * - IX_t_dokusya_rireki_chain: findBefore / findNext / loadHienHanh が
 *   (joho_henko_tekiyo_date, rireki_no) 順で有効レコードを探すためのインデックス。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して
 * 巨大な差分を出すため、本マイグレーションは必要な2変更のみを手書きする。
 */
export class AddTorikeshiFlg1783347569751 implements MigrationInterface {
  name = 'AddTorikeshiFlg1783347569751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ADD COLUMN torikeshi_flg boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya_rireki.torikeshi_flg IS '取消フラグ（赤伝）。TRUE=取消レコード。帳票・検索・現在状態から除外、再計算対象外（凍結）。物理削除しない'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_t_dokusya_rireki_chain" ON t_dokusya_rireki (dokusya_id, joho_henko_tekiyo_date, rireki_no)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IX_t_dokusya_rireki_chain"`);
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki DROP COLUMN torikeshi_flg`,
    );
  }
}
