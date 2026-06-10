import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NICHINO_STAFF（role_id=2）から hanbaiten.import（permission_id=11）を剥奪する。
 *
 * 仕様変更（2026-06）: 日農担当者は販売店を「代行入力」モードでのみ操作し、
 * Excel一括取込の権限は持たない。サイドバー／ダッシュボードの
 * 「販売店Excelデータ取込」メニューは権限フィルタにより自動的に非表示になる
 * （useMenu()）。販売店情報登録／販売店明細検索は staff 向けに
 * 「（代行）」サフィックス付きで表示される。
 *
 * `hanbaiten.daiko_input`（permission_id 等）は保持する — HanbaitenFormView /
 * HanbaitenListView が staff の代行フロー（JA ピッカー）判定に使用するため。
 *
 * SeedMRolesPermissions1711900900003 の `(2, 11)` 付与行は immutable
 * （適用済み）のため編集せず、本マイグレーションで DELETE する。新規 DB は
 * 003 で一旦付与 → 017 で剥奪、の順で正しい最終状態になる。
 *
 * docs/database/seeder.md §3 + docs/requirement/account_concept.md を同期更新済み。
 */
export class RevokeHanbaitenImportFromStaff1711900900017
  implements MigrationInterface
{
  name = 'RevokeHanbaitenImportFromStaff1711900900017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM m_roles_permissions
        WHERE role_id = 2
          AND permission_id = (
            SELECT permission_id FROM m_permissions
             WHERE permission_code = 'hanbaiten.import'
          )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO m_roles_permissions
         (role_id, permission_id, created_at, created_by, updated_at, updated_by)
       SELECT 2, permission_id, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'
         FROM m_permissions
        WHERE permission_code = 'hanbaiten.import'
       ON CONFLICT DO NOTHING`,
    );
  }
}
