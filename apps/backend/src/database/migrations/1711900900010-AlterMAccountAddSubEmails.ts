import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema sync — m_account: add `sub_email_1`, `sub_email_2`, `sub_email_3`
 * VARCHAR(100) NOT NULL DEFAULT '' (※空文字許容).
 *
 * 通知先サブメールアドレス。アカウントマスタに3つの予備メール宛先を持つ。
 *
 * Existing migration `1711900800011-CreateMAccount` is immutable per
 * `.claude/rules/nestjs.md` — schema drift is corrected with this
 * forward-only ALTER.
 */
export class AlterMAccountAddSubEmails1711900900010
  implements MigrationInterface
{
  name = 'AlterMAccountAddSubEmails1711900900010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_account ADD COLUMN sub_email_1 VARCHAR(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE m_account ADD COLUMN sub_email_2 VARCHAR(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE m_account ADD COLUMN sub_email_3 VARCHAR(100) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_account DROP COLUMN IF EXISTS sub_email_3`,
    );
    await queryRunner.query(
      `ALTER TABLE m_account DROP COLUMN IF EXISTS sub_email_2`,
    );
    await queryRunner.query(
      `ALTER TABLE m_account DROP COLUMN IF EXISTS sub_email_1`,
    );
  }
}
