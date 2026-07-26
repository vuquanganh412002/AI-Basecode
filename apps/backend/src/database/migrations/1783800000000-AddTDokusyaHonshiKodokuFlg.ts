import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` に本紙購読フラグ `honshi_kodoku_flg` を追加する（顧客要件）。
 *
 * 電子版読者管理システムの `users.subscribe_flg`（0:未購読, 1:購読）を連携する
 * フラグ（0→FALSE, 1→TRUE）。購読種別=電子版のときのみ画面に「紙版購読状況
 * 有り」と表示する。BOOLEAN NOT NULL DEFAULT FALSE のため既存行は FALSE で
 * 埋まり、`honshi_kodoku_flg` を省略する既存 INSERT もそのまま動作する。
 *
 * Dokusya エンティティ・DBスキーマ設計書（database-design[-vi].md）にも同期済み。
 * `hasColumn` ガードで、まだ列が無い環境では追加、既にある環境（DR / 統合テスト
 * 用 DB 等）では no-op にする（冪等）。
 */
export class AddTDokusyaHonshiKodokuFlg1783800000000
  implements MigrationInterface
{
  name = 'AddTDokusyaHonshiKodokuFlg1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('t_dokusya', 'honshi_kodoku_flg'))) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya ADD COLUMN honshi_kodoku_flg BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya.honshi_kodoku_flg IS '本紙購読フラグ（電子版読者管理システムの users.subscribe_flg を連携。0→FALSE, 1→TRUE。DEFAULT FALSE）'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya DROP COLUMN honshi_kodoku_flg`,
    );
  }
}
