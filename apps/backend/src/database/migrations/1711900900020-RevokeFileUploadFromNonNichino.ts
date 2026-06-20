import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CHUOKAI（role_id=3）／JA_HONTEN（role_id=4）／JA_KANRI_SHITEN（role_id=5）から
 * file.upload（permission_code='file.upload'）を剥奪する。
 *
 * 仕様変更（2026-06）: ファイルアップロード画面（ACSMS-SCR-023, /file-upload）は
 * 日農（NICHINO_ADMIN / NICHINO_STAFF）のみが利用できる。サイドバー／
 * ダッシュボードの「ファイルアップロード」メニューと /file-upload ルートは
 * `file.upload` 権限フィルタにより、剥奪された3ロールでは自動的に非表示
 * ／ガードでダッシュボードへバウンスされる（useMenu() / router guard）。
 *
 * file.download（ファイルダウンロード画面 /file-download）は全ロールで保持する
 * — 今回の変更対象外。
 *
 * SeedMRolesPermissions1711900900003 の `(3,36) (4,36) (5,36)` 付与行は
 * immutable（適用済み）のため編集せず、本マイグレーションで DELETE する。
 * 新規 DB は 003 で一旦付与 → 020 で剥奪、の順で正しい最終状態になる。
 *
 * docs/database/seeder.md §3 + docs/requirement/account_concept.md を同期更新済み。
 */
export class RevokeFileUploadFromNonNichino1711900900020
  implements MigrationInterface
{
  name = 'RevokeFileUploadFromNonNichino1711900900020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM m_roles_permissions
        WHERE role_id IN (3, 4, 5)
          AND permission_id = (
            SELECT permission_id FROM m_permissions
             WHERE permission_code = 'file.upload'
          )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO m_roles_permissions
         (role_id, permission_id, created_at, created_by, updated_at, updated_by)
       SELECT r.role_id, p.permission_id, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'
         FROM (VALUES (3), (4), (5)) AS r(role_id)
        CROSS JOIN m_permissions p
        WHERE p.permission_code = 'file.upload'
       ON CONFLICT DO NOTHING`,
    );
  }
}
