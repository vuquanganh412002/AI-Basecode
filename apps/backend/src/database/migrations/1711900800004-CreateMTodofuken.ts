import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_todofuken（都道府県マスタ）
 *
 * 都道府県コード（01〜47）と名称を保持する固定マスタ。
 * docs/database/database-design.md §m_todofuken を参照。
 * 各種マスタ／業務テーブルから FK 参照される。
 */
export class CreateMTodofuken1711900800004 implements MigrationInterface {
  name = 'CreateMTodofuken1711900800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_todofuken (
        todofuken_code VARCHAR(2) PRIMARY KEY,                              -- 都道府県コード（01〜47）
        todofuken_name VARCHAR(10) NOT NULL,                                -- 都道府県名
        todofuken_name_kana VARCHAR(20) NOT NULL                            -- 都道府県名（カナ）
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE m_todofuken IS '都道府県マスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_todofuken.todofuken_code IS '都道府県コード（01〜47）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_todofuken.todofuken_name IS '都道府県名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_todofuken.todofuken_name_kana IS '都道府県名（カナ）'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_todofuken`);
  }
}
