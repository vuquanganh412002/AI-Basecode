import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya_rireki` に本紙購読フラグ `honshi_kodoku_flg` を追加する（顧客要件）。
 *
 * `t_dokusya.honshi_kodoku_flg`（AddTDokusyaHonshiKodokuFlg1783800000000）の
 * 履歴側スナップショット。電子版読者管理システムの `users.subscribe_flg`
 * （0:未購読, 1:購読）を連携するフラグ（0→FALSE, 1→TRUE）で、履歴行にも
 * t_dokusya と同じ値を保持する。BOOLEAN NOT NULL DEFAULT FALSE のため既存行は
 * FALSE で埋まり、`honshi_kodoku_flg` を省略する既存 INSERT もそのまま動作する。
 *
 * DokusyaRireki エンティティ・DBスキーマ設計書（database-design[-vi].md）にも
 * 同期済み。`hasColumn` ガードで、まだ列が無い環境では追加、既にある環境
 * （DR / 統合テスト用 DB 等）では no-op にする（冪等）。
 */
export class AddTDokusyaRirekiHonshiKodokuFlg1783800000001
  implements MigrationInterface
{
  name = 'AddTDokusyaRirekiHonshiKodokuFlg1783800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn('t_dokusya_rireki', 'honshi_kodoku_flg'))
    ) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya_rireki ADD COLUMN honshi_kodoku_flg BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya_rireki.honshi_kodoku_flg IS '本紙購読フラグ（t_dokusya.honshi_kodoku_flg の履歴スナップショット。電子版読者管理システムの users.subscribe_flg を連携。0→FALSE, 1→TRUE。DEFAULT FALSE）'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki DROP COLUMN honshi_kodoku_flg`,
    );
  }
}
