import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTKozaFurikae1711900800020 implements MigrationInterface {
  name = 'CreateTKozaFurikae1711900800020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_koza_furikae (
        koza_furikae_id BIGSERIAL PRIMARY KEY,
        ja_id BIGINT NOT NULL,
        dokusya_id BIGINT NOT NULL,
        target_month VARCHAR(6) NOT NULL,
        furikae_date DATE,
        furikae_kingaku NUMERIC(10, 0),
        koza_no VARCHAR(10) NOT NULL,
        koza_meigi VARCHAR(50) NOT NULL,
        yokin_shubetsu INTEGER,
        bank_code VARCHAR(4) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_branch_code VARCHAR(3) NOT NULL,
        bank_branch_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_t_koza_furikae_dokusya_month ON t_koza_furikae (dokusya_id, target_month)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_ja_id ON t_koza_furikae (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_dokusya_id ON t_koza_furikae (dokusya_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_target_month ON t_koza_furikae (target_month)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_dokusya_month ON t_koza_furikae (dokusya_id, target_month)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_koza_furikae`);
  }
}
