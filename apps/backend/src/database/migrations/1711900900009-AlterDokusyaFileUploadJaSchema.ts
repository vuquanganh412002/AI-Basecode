import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema sync — applies the customer-confirmed design changes documented
 * in `docs/database/database-design.md`:
 *
 *  1. m_ja.chuokai_flg DEFAULT true → false
 *     (大多数のJAは単協なのでデフォルトを単協=falseに揃える)
 *  2. t_dokusya: drop bank_code / bank_name
 *     (引落口座は支店レベル以下で管理。bank_branch_* に名称を統一済み)
 *  3. t_dokusya_rireki: drop bank_code / bank_name (同上)
 *  4. t_file_upload: add scheduled_delete_date TIMESTAMPTZ NULL
 *     (ファイル自動削除予定日。NULL = 未設定/期限なし)
 *
 * Existing migrations 1711900800006/16/17/14 are immutable per
 * `.claude/rules/nestjs.md` — schema drift is corrected with this
 * forward-only ALTER.
 */
export class AlterDokusyaFileUploadJaSchema1711900900009
  implements MigrationInterface
{
  name = 'AlterDokusyaFileUploadJaSchema1711900900009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. m_ja.chuokai_flg default → false
    await queryRunner.query(
      `ALTER TABLE m_ja ALTER COLUMN chuokai_flg SET DEFAULT false`,
    );

    // 2. t_dokusya — drop bank_code / bank_name
    await queryRunner.query(`ALTER TABLE t_dokusya DROP COLUMN bank_code`);
    await queryRunner.query(`ALTER TABLE t_dokusya DROP COLUMN bank_name`);

    // 3. t_dokusya_rireki — drop bank_code / bank_name
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki DROP COLUMN bank_code`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki DROP COLUMN bank_name`,
    );

    // 4. t_file_upload — add scheduled_delete_date
    await queryRunner.query(
      `ALTER TABLE t_file_upload ADD COLUMN scheduled_delete_date TIMESTAMPTZ DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 4. revert
    await queryRunner.query(
      `ALTER TABLE t_file_upload DROP COLUMN IF EXISTS scheduled_delete_date`,
    );

    // 3. revert (NOT NULL DEFAULT '' to match the original CreateTDokusyaRireki)
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ADD COLUMN bank_name VARCHAR(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya_rireki ADD COLUMN bank_code VARCHAR(4) NOT NULL DEFAULT ''`,
    );

    // 2. revert
    await queryRunner.query(
      `ALTER TABLE t_dokusya ADD COLUMN bank_name VARCHAR(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE t_dokusya ADD COLUMN bank_code VARCHAR(4) NOT NULL DEFAULT ''`,
    );

    // 1. revert
    await queryRunner.query(
      `ALTER TABLE m_ja ALTER COLUMN chuokai_flg SET DEFAULT true`,
    );
  }
}
