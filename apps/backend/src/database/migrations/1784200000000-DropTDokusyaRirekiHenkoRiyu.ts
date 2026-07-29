import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya_rireki` から変更理由 `henko_riyu` を削除する。
 *
 * 当該列は「変更理由」ではなく実際には操作種別ラベル（'取消' / '電子版承認' /
 * '電子版否認'、UI編集・Excel取込は空文字）しか入っておらず、同じ情報が
 * 履歴行のフラグ（torikeshi_flg / kaiyaku_flg / shinki_flg）と
 * denshi_shonin_status から判別できるため冗長だった。利用者に見せる本来の
 * 理由テキストは備考 `biko` に入る（取消理由も同様・顧客要件）ので、
 * 情報は失われない。
 *
 * `hasColumn` ガードで、まだ列がある環境では削除、既に無い環境（新規 DB / DR /
 * 統合テスト用 DB 等）では no-op にする（冪等）。down は TEXT NOT NULL DEFAULT ''
 * で復元する（元定義と同じ）。値は復元できないため空文字で戻る。
 */
export class DropTDokusyaRirekiHenkoRiyu1784200000000
  implements MigrationInterface
{
  name = 'DropTDokusyaRirekiHenkoRiyu1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('t_dokusya_rireki', 'henko_riyu')) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya_rireki DROP COLUMN henko_riyu`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('t_dokusya_rireki', 'henko_riyu'))) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya_rireki ADD COLUMN henko_riyu TEXT NOT NULL DEFAULT ''`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN t_dokusya_rireki.henko_riyu IS '変更理由※空文字許容'`,
      );
    }
  }
}
