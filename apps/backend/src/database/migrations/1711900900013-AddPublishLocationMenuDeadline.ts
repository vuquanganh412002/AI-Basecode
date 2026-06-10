import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the third PUBLISH_LOCATION m_code value used exclusively by the
 * 締め切り時間 (oshirase_type=4) singleton notice, and re-point the
 * existing seed row to it.
 *
 * Background (顧客確認 2026-05): under SCR-031 the 締め切り時間 record
 * is renderered in a dedicated slot in the MENU screen header — distinct
 * from regular メニュー画面 notices (publish_location=2). Splitting the
 * dimension into a separate code makes the query (`getMenuList` deadline
 * subquery) explicit, lets the FE picker route the user-selectable
 * publish_location options independently from the system-reserved
 * deadline slot, and keeps the constraint "1 row per (publish_location=3
 * × oshirase_type=4)" trivially expressible as "1 row per publish_location=3".
 *
 *  - m_code: insert PUBLISH_LOCATION = '3' / メニュー画面（締め切り時間）.
 *  - t_oshirase: UPDATE every oshirase_type=4 row to publish_location=3
 *    (currently the singleton row seeded by SeedTOshirase1711900900007).
 *
 * Down: revert both — UPDATE back to 2, DELETE the m_code row.
 */
export class AddPublishLocationMenuDeadline1711900900013
  implements MigrationInterface
{
  name = 'AddPublishLocationMenuDeadline1711900900013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_code (
        code_category, code_value, code_name, code_name_short, sort_order,
        biko, deleted_at, created_at, created_by, updated_at, updated_by
      ) VALUES (
        'PUBLISH_LOCATION', '3',
        'メニュー画面（締め切り時間）', '締切時間', 3,
        'お知らせ種別=4 (締め切り時間) 専用枠。1件のみ運用される。',
        NULL,
        NOW(), 'SYSTEM', NOW(), 'SYSTEM'
      )
    `);
    await queryRunner.query(`
      UPDATE t_oshirase
      SET publish_location = 3,
          updated_at = NOW(),
          updated_by = 'SYSTEM'
      WHERE oshirase_type = 4
        AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE t_oshirase
      SET publish_location = 2,
          updated_at = NOW(),
          updated_by = 'SYSTEM'
      WHERE oshirase_type = 4
        AND deleted_at IS NULL
    `);
    await queryRunner.query(`
      DELETE FROM m_code
      WHERE code_category = 'PUBLISH_LOCATION'
        AND code_value = '3'
    `);
  }
}
