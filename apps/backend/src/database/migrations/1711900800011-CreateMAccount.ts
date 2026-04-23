import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMAccount1711900800011 implements MigrationInterface {
  name = 'CreateMAccount1711900800011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_account (
        account_id BIGSERIAL PRIMARY KEY,
        login_id VARCHAR(20) NOT NULL,
        password_hash VARCHAR(256) NOT NULL,
        account_name VARCHAR(50) NOT NULL,
        role_id INTEGER NOT NULL,
        ja_id BIGINT,
        kanri_shiten_id BIGINT,
        todofuken_code VARCHAR(2),
        paper_flg BOOLEAN NOT NULL DEFAULT false,
        denshi_flg BOOLEAN NOT NULL DEFAULT false,
        email VARCHAR(100) NOT NULL DEFAULT '',
        password_updated_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        login_failure_count INTEGER NOT NULL DEFAULT 0,
        account_lock_flg BOOLEAN NOT NULL DEFAULT false,
        account_lock_at TIMESTAMPTZ,
        biko TEXT NOT NULL DEFAULT '',
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(50) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(50) NOT NULL,
        mfa_enable_flg BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT FK_m_account_m_roles FOREIGN KEY (role_id) REFERENCES m_roles (role_id),
        CONSTRAINT FK_m_account_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_account_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id),
        CONSTRAINT FK_m_account_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_account_login_id ON m_account (login_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_ja_id ON m_account (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_kanri_shiten_id ON m_account (kanri_shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_todofuken_code ON m_account (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_role_id ON m_account (role_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_account`);
  }
}
