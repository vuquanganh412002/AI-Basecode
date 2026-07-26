import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya_rireki` から販売店適用日 `hanbaiten_tekiyo_date` を削除する（顧客要件
 * 2026-07）。
 *
 * 当該列は「販売店を変更した履歴行では joho_henko_tekiyo_date と同値、それ以外は
 * NULL」であり、読者情報変更適用日 (joho_henko_tekiyo_date) と重複していた。適用日を
 * joho に一本化するため専用列を撤去する。UI編集・Excel取込・一括置換(SCR-015) の
 * すべてが joho を適用日として使う（一括置換 API の request 項目も
 * hanbaiten_tekiyo_date → joho_henko_tekiyo_date へ改名）。
 *
 * `hasColumn` ガードで、まだ列がある環境では削除、既に無い環境（新規 DB / DR /
 * 統合テスト用 DB 等）では no-op にする（冪等）。down は VARCHAR(10) NULL で復元。
 */
export class DropTDokusyaRirekiHanbaitenTekiyoDate1783900000000
  implements MigrationInterface
{
  name = 'DropTDokusyaRirekiHanbaitenTekiyoDate1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      await queryRunner.hasColumn('t_dokusya_rireki', 'hanbaiten_tekiyo_date')
    ) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya_rireki DROP COLUMN hanbaiten_tekiyo_date`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn(
        't_dokusya_rireki',
        'hanbaiten_tekiyo_date',
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya_rireki ADD COLUMN hanbaiten_tekiyo_date VARCHAR(10)`,
      );
    }
  }
}
