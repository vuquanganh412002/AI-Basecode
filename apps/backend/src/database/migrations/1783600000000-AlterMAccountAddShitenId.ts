import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `m_account` に所属支店 `shiten_id` を追加する（顧客要件 2026-07・DB設計書 v1.12）。
 *
 * JA管理支店アカウント（管理支店コード=本店）を各支店分作成して読者管理を支店
 * 単位に制限するための3層目のスコープ列。NULL は従来どおり（管理支店単位のみ）。
 * 設定時はその支店の読者しか参照・編集・追加できず、帳票5画面も使用不可になる。
 *
 * - shiten_id: NULL 許容・FK → m_shiten(shiten_id)（RESTRICT）。
 * - IX_m_account_shiten_id: 支店単位のアカウント検索・スコープ用インデックス。
 *
 * 注: typeorm migration:generate は既存DBのFK名ドリフトを大量に検知して巨大な
 * 差分を出すため、本マイグレーションは必要な変更のみを手書きする。
 */
export class AlterMAccountAddShitenId1783600000000
  implements MigrationInterface
{
  name = 'AlterMAccountAddShitenId1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_account ADD COLUMN shiten_id bigint NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN m_account.shiten_id IS '所属支店ID（FK: m_shiten）。設定時はその支店の読者のみ参照・編集・追加可、帳票5画面は使用不可。NULL は従来どおり（顧客要件 2026-07）'`,
    );
    await queryRunner.query(
      `ALTER TABLE m_account
         ADD CONSTRAINT fk_m_account_shiten
         FOREIGN KEY (shiten_id) REFERENCES m_shiten(shiten_id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_m_account_shiten_id" ON m_account (shiten_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_m_account_shiten_id"`);
    await queryRunner.query(
      `ALTER TABLE m_account DROP CONSTRAINT IF EXISTS fk_m_account_shiten`,
    );
    await queryRunner.query(`ALTER TABLE m_account DROP COLUMN shiten_id`);
  }
}
