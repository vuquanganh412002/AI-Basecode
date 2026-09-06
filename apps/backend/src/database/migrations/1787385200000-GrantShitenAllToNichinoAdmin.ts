import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 顧客CR 2026-08-24 — 支店マスタの権限を「日農管理者」(NICHINO_ADMIN, role_id=1) に
 * 与える。以前は意図的に未付与だった（2026-08 の別バグ修正コミット参照 — shiten.view
 * を持たない前提で listDropdown() に role_code 直接判定の特例を実装していたが、
 * 本CRでその特例は不要になり shiten.service.ts から削除済み）。
 *
 * role_id=1 に shiten.create/view/update/delete（permission_id 20-23、
 * 1711900900002-SeedMPermissions.ts 参照）を付与する。
 *
 * `locked = TRUE` — 1711900900003-SeedMRolesPermissions.ts の
 * `UPDATE m_roles_permissions SET locked = TRUE` と同じ扱い。この付与は
 * 顧客要件によるベースラインであり、ロール管理画面（ACSMS-SCR-027）の
 * PATCH（roles.service.ts update()）が行う soft-delete + 再INSERT では
 * `locked=false` の権限しか外せない（[locked-guard]）。`locked` を立てないと、
 * 誰かが後で NICHINO_ADMIN のロール編集を保存した瞬間にこの4権限が
 * 静かに解除されてしまう。
 *
 * 未デプロイのためシンプルな単発 INSERT（1711900900003 の VALUES と同じ
 * スタイル）。permission_id は 1711900900002-SeedMPermissions.ts の
 * INSERT 順で固定の 20-23。
 */
export class GrantShitenAllToNichinoAdmin1787385200000
  implements MigrationInterface
{
  name = 'GrantShitenAllToNichinoAdmin1787385200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_roles_permissions
        (role_id, permission_id, locked, created_at, created_by, updated_at, updated_by)
      VALUES
        (1, 20, TRUE, NOW(), 'SYSTEM_MIGRATION', NOW(), 'SYSTEM_MIGRATION'),
        (1, 21, TRUE, NOW(), 'SYSTEM_MIGRATION', NOW(), 'SYSTEM_MIGRATION'),
        (1, 22, TRUE, NOW(), 'SYSTEM_MIGRATION', NOW(), 'SYSTEM_MIGRATION'),
        (1, 23, TRUE, NOW(), 'SYSTEM_MIGRATION', NOW(), 'SYSTEM_MIGRATION')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM m_roles_permissions
      WHERE role_id = 1
        AND permission_id IN (
          SELECT permission_id FROM m_permissions
          WHERE permission_code IN (
            'shiten.create', 'shiten.view', 'shiten.update', 'shiten.delete'
          )
        )
    `);
  }
}
