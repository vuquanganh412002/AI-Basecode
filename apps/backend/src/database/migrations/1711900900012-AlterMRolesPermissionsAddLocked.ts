import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `locked` flag to `m_roles_permissions` so SCR-027 (ロール管理画面)
 * can disable the checkbox for permissions seeded from
 * `1711900900003-SeedMRolesPermissions.ts`.
 *
 * Semantics:
 *   - `locked = TRUE`  → permission is part of the role's seeded baseline.
 *                        FE renders checkbox `checked + disabled`. BE
 *                        rejects any PATCH that drops the row.
 *   - `locked = FALSE` → permission was added later via admin UI. FE
 *                        editable. BE accepts drop.
 *
 * Bootstrap rule: this ALTER runs strictly AFTER the seed migration
 * (003) thanks to timestamp ordering, so every row that exists in the
 * table at apply-time MUST be a seeded baseline → blanket-update them
 * to `locked = TRUE`. The DEFAULT FALSE on the column governs future
 * INSERTs from the admin UI.
 */
export class AlterMRolesPermissionsAddLocked1711900900012
  implements MigrationInterface
{
  name = 'AlterMRolesPermissionsAddLocked1711900900012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_roles_permissions
       ADD COLUMN locked BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    // Mark all currently-present rows as locked — they all came from
    // the seed migration. New rows from admin UI default to FALSE.
    await queryRunner.query(
      `UPDATE m_roles_permissions SET locked = TRUE WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_roles_permissions DROP COLUMN locked`,
    );
  }
}
