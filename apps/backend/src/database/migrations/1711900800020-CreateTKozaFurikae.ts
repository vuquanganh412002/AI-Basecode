import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_koza_furikae（口座振替データテーブル）
 *
 * 口座振替（自動引落）データを月次で保持する。
 * 出力時点のスナップショットなので口座番号・銀行情報も持つ。
 * dokusya_id × target_month で一意制約（月次重複防止）。
 * docs/database/database-design.md §t_koza_furikae を参照。
 */
export class CreateTKozaFurikae1711900800020 implements MigrationInterface {
  name = 'CreateTKozaFurikae1711900800020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_koza_furikae (
        koza_furikae_id BIGSERIAL PRIMARY KEY,                              -- 口座振替データID（IDENTITY）
        ja_id BIGINT NOT NULL,                                              -- JA ID（FK:m_ja）
        dokusya_id BIGINT NOT NULL,                                         -- 購読者ID（FK:t_dokusya）
        target_month VARCHAR(6) NOT NULL,                                   -- 対象年月（YYYYMM）
        furikae_date DATE,                                                  -- 振替日
        furikae_kingaku NUMERIC(10, 0),                                     -- 振替金額
        koza_no VARCHAR(10) NOT NULL,                                       -- 口座番号
        koza_meigi VARCHAR(50) NOT NULL,                                    -- 口座名義
        yokin_shubetsu INTEGER,                                             -- 預金種別（1:普通, 2:当座）※出力時点のスナップショット
        bank_code VARCHAR(4) NOT NULL,                                      -- 銀行コード
        bank_name VARCHAR(100) NOT NULL,                                    -- 銀行名
        bank_branch_code VARCHAR(3) NOT NULL,                               -- 支店コード
        bank_branch_name VARCHAR(100) NOT NULL,                             -- 支店名
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL                                     -- 更新者
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_t_koza_furikae_dokusya_month ON t_koza_furikae (dokusya_id, target_month)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_ja_id ON t_koza_furikae (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_dokusya_id ON t_koza_furikae (dokusya_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_target_month ON t_koza_furikae (target_month)`);
    await queryRunner.query(`CREATE INDEX IX_t_koza_furikae_dokusya_month ON t_koza_furikae (dokusya_id, target_month)`);

    await queryRunner.query(`COMMENT ON TABLE t_koza_furikae IS '口座振替データテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.koza_furikae_id IS '口座振替データID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.ja_id IS 'JA ID（FK:m_ja）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.dokusya_id IS '購読者ID（FK:t_dokusya）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.target_month IS '対象年月（YYYYMM）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.furikae_date IS '振替日'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.furikae_kingaku IS '振替金額'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.koza_no IS '口座番号'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.koza_meigi IS '口座名義'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.yokin_shubetsu IS '預金種別（1:普通, 2:当座）※出力時点のスナップショット'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.bank_code IS '銀行コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.bank_name IS '銀行名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.bank_branch_code IS '支店コード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.bank_branch_name IS '支店名'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_koza_furikae.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_koza_furikae`);
  }
}
