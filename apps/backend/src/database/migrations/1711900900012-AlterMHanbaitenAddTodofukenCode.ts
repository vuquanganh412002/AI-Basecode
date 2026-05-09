import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema sync — m_hanbaiten: add `todofuken_code` VARCHAR(2)
 * 都道府県コード。既存行が存在し得るので NULLable で追加し、
 * 後続の販売店マスタ登録／編集画面で必須化する。FK + index も追加。
 *
 * Existing migration `1711900800010-CreateMHanbaiten` is immutable per
 * `.claude/rules/nestjs.md` — schema drift is corrected with this
 * forward-only ALTER.
 */
export class AlterMHanbaitenAddTodofukenCode1711900900012
  implements MigrationInterface
{
  name = 'AlterMHanbaitenAddTodofukenCode1711900900012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten ADD COLUMN todofuken_code VARCHAR(2)`,
    );
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten ADD CONSTRAINT FK_m_hanbaiten_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)`,
    );
    await queryRunner.query(
      `CREATE INDEX IX_m_hanbaiten_todofuken_code ON m_hanbaiten (todofuken_code)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS IX_m_hanbaiten_todofuken_code`,
    );
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten DROP CONSTRAINT IF EXISTS FK_m_hanbaiten_m_todofuken`,
    );
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten DROP COLUMN IF EXISTS todofuken_code`,
    );
  }
}
