import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema sync — m_tanka: add `biko` TEXT NOT NULL DEFAULT '' (備考※空文字許容).
 *
 * Existing migration `1711900800009-CreateMTanka` is immutable per
 * `.claude/rules/nestjs.md` — schema drift is corrected with this
 * forward-only ALTER.
 */
export class AlterMTankaAddBiko1711900900011 implements MigrationInterface {
  name = 'AlterMTankaAddBiko1711900900011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_tanka ADD COLUMN biko TEXT NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_tanka DROP COLUMN IF EXISTS biko`);
  }
}
