import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * t_dokusya_rireki に 販売店統廃合フラグ(hanbaiten_tohaigo_flg) を追加する。
 *
 * 販売店統廃合フラグ（DEFAULT false, TRUE=販売店統廃合に伴う販売店変更）。
 * 購読者販売店一括置換画面での変更=TRUE、購読者情報登録画面での変更=FALSE。
 * TRUEの履歴は増減連絡票（販売店）の出力対象外とする。増減通知（日本農業新聞）は
 * 仕様変更なし（全件反映）。docs/database/database-design.md Ver1.16 参照。
 */
export class AddTDokusyaRirekiHanbaitenTohaigoFlg1787032454621
  implements MigrationInterface
{
  name = 'AddTDokusyaRirekiHanbaitenTohaigoFlg1787032454621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ADD COLUMN hanbaiten_tohaigo_flg BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya_rireki.hanbaiten_tohaigo_flg IS '販売店統廃合フラグ（DEFAULT false, TRUE=販売店統廃合に伴う販売店変更）。購読者販売店一括置換画面での変更=TRUE、購読者情報登録画面での変更=FALSE。TRUEの履歴は増減連絡票（販売店）の出力対象外とする。'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki DROP COLUMN hanbaiten_tohaigo_flg`,
    );
  }
}
