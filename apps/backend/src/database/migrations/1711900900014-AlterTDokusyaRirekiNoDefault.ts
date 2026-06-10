import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya.rireki_no` に DEFAULT 1 を付与する。
 *
 * 当初の `CreateTDokusya` マイグレーション（1711900800016）は
 * `rireki_no INTEGER NOT NULL` で作成しており DEFAULT が無かった。
 * SCR-011 購読者登録の service (`DokusyaService.create`) は新規作成時に
 * `rireki_no` を INSERT payload に含めず Postgres 側の DEFAULT 補完に
 * 委ねる方針（不変値=常に1, `created_at DEFAULT NOW()` と同じ扱い）の
 * ため, DEFAULT 1 が無いと NOT NULL 違反で INSERT が失敗する。
 *
 * 既にデプロイ済の環境（1711900800016 適用済）では元 migration の
 * インライン編集だけでは ALTER が走らないため, このマイグレーションを
 * 追加で投入することで DEFAULT 1 を反映する。
 *
 * UPDATE / 承認 / 却下 フローでは service が
 * `SELECT COALESCE(MAX(rireki_no), 0) + 1` を使って明示的に次の番号を
 * セットするため, DEFAULT 1 は CREATE 時のみ作用する。
 */
export class AlterTDokusyaRirekiNoDefault1711900900014
  implements MigrationInterface
{
  name = 'AlterTDokusyaRirekiNoDefault1711900900014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN rireki_no SET DEFAULT 1`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya.rireki_no IS '履歴No（最新の履歴番号）。新規作成時は DEFAULT 1, 更新時は service が MAX(rireki_no)+1 で明示セット'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DEFAULT を外す。既存行は影響を受けない（既に値が入っているため）。
    await queryRunner.query(
      `ALTER TABLE t_dokusya ALTER COLUMN rireki_no DROP DEFAULT`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya.rireki_no IS '履歴No（最新の履歴番号）'`,
    );
  }
}
