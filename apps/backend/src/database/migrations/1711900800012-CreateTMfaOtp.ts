import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTMfaOtp1711900800012 implements MigrationInterface {
  name = 'CreateTMfaOtp1711900800012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_mfa_otp (
        otp_id BIGSERIAL PRIMARY KEY,
        account_id BIGINT NOT NULL,
        otp_code_hash VARCHAR(256) NOT NULL,
        otp_type INTEGER NOT NULL,
        expired_at TIMESTAMPTZ NOT NULL,
        verify_attempt_count INTEGER DEFAULT 0,
        resend_count INTEGER DEFAULT 0,
        used_flg BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT FK_t_mfa_otp_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_account_id ON t_mfa_otp (account_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_active ON t_mfa_otp (account_id, used_flg, expired_at)`);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_expired_at ON t_mfa_otp (expired_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_mfa_otp`);
  }
}
