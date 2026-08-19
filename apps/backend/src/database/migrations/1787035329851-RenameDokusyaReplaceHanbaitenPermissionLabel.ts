import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 顧客要件2026-08：画面名を「購読者販売店一括置換画面」から「統廃合販売店読者移行画面」
 * （ACSMS-SCR-015）へ改称したことに伴い、対応する m_permissions の日本語ラベルを更新する。
 * permission_code (`dokusya.replace_hanbaiten`) は内部識別子のため変更しない。
 * docs/database/seeder.md §2 参照。
 */
export class RenameDokusyaReplaceHanbaitenPermissionLabel1787035329851
  implements MigrationInterface
{
  name = 'RenameDokusyaReplaceHanbaitenPermissionLabel1787035329851';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE m_permissions
          SET permission_name = '統廃合販売店読者移行',
              description = '販売店統廃合に伴う購読者の販売店一括置換'
        WHERE permission_code = 'dokusya.replace_hanbaiten'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE m_permissions
          SET permission_name = '購読者販売店一括置換',
              description = '購読者の販売店を一括置換'
        WHERE permission_code = 'dokusya.replace_hanbaiten'`,
    );
  }
}
