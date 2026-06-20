import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `t_dokusya` に `denshi_kaiin_id`（電子版会員ID）を追加する。
 *
 * 外部（電子版読者管理）システムの会員IDを購読者に紐付けるための列。
 * 本システムでは直接入力せず、後続で開発する外部連携機能が設定する。
 * BIGINT・NULL許容で、全レコードで一意（外部会員IDと 1:1）。NULL と
 * 削除済み行は対象外とする部分 UNIQUE 制約で担保する。
 *
 * `CreateTDokusya` 本体も denshi_kaiin_id 列と UQ_t_dokusya_denshi_kaiin_id
 * を含むよう更新済みのため、新規 DB（migration を頭から流す環境 / DR /
 * 統合テスト DB）は本 ALTER 無しで正しい状態になる。本マイグレーションは
 * 既にデプロイ済（1711900800016 適用済）の環境向けに列とインデックスを
 * 追加するためのもの。hasColumn でガードして冪等化する。
 */
export class AlterTDokusyaAddDenshiKaiinId1711900900019
  implements MigrationInterface
{
  name = 'AlterTDokusyaAddDenshiKaiinId1711900900019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('t_dokusya', 'denshi_kaiin_id'))) {
      await queryRunner.query(
        `ALTER TABLE t_dokusya ADD COLUMN denshi_kaiin_id BIGINT`,
      );
    }
    await queryRunner.query(
      `COMMENT ON COLUMN t_dokusya.denshi_kaiin_id IS '電子版会員ID（外部システムの会員ID, NULL許容, 全体一意）'`,
    );
    // 全レコードで一意の部分 UNIQUE（NULL・削除済みは除外）。IF NOT EXISTS で冪等化。
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS UQ_t_dokusya_denshi_kaiin_id ON t_dokusya (denshi_kaiin_id) WHERE denshi_kaiin_id IS NOT NULL AND deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS UQ_t_dokusya_denshi_kaiin_id`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya DROP COLUMN denshi_kaiin_id`,
    );
  }
}
