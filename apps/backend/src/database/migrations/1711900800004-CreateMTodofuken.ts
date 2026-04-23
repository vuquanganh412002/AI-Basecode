import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMTodofuken1711900800004 implements MigrationInterface {
  name = 'CreateMTodofuken1711900800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_todofuken (
        todofuken_code VARCHAR(2) PRIMARY KEY,
        todofuken_name VARCHAR(10) NOT NULL,
        todofuken_name_kana VARCHAR(20) NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_todofuken`);
  }
}
