import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_mfa_otp（MFAワンタイムパスワード）
 *
 * ログイン MFA およびパスワードリセット用の OTP を保持する。
 * otp_code_hash は bcrypt ハッシュで保存し平文は持たない。
 * otp_type=1: ログイン用、2: パスワードリセット用。
 * docs/database/database-design.md §t_mfa_otp を参照。
 */
export class CreateTMfaOtp1711900800012 implements MigrationInterface {
  name = 'CreateTMfaOtp1711900800012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_mfa_otp (
        otp_id BIGSERIAL PRIMARY KEY,                                       -- OTP ID（IDENTITY）
        account_id BIGINT NOT NULL,                                         -- アカウントID（FK:m_account）
        otp_code_hash VARCHAR(256) NOT NULL,                                -- OTPコードハッシュ（平文は保存しない）
        otp_type INTEGER NOT NULL,                                          -- OTP種別（1:ログイン, 2:パスワードリセット）
        expired_at TIMESTAMPTZ NOT NULL,                                    -- OTP有効期限
        verify_attempt_count INTEGER DEFAULT 0,                             -- OTP入力試行回数（DEFAULT 0）
        resend_count INTEGER DEFAULT 0,                                     -- OTP再送回数（DEFAULT 0）
        used_flg BOOLEAN DEFAULT false,                                     -- 使用済フラグ（DEFAULT false）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        CONSTRAINT FK_t_mfa_otp_m_account FOREIGN KEY (account_id) REFERENCES m_account (account_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_account_id ON t_mfa_otp (account_id)`);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_active ON t_mfa_otp (account_id, used_flg, expired_at)`);
    await queryRunner.query(`CREATE INDEX IX_t_mfa_otp_expired_at ON t_mfa_otp (expired_at)`);

    await queryRunner.query(`COMMENT ON TABLE t_mfa_otp IS 'MFAワンタイムパスワード'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.otp_id IS 'OTP ID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.account_id IS 'アカウントID（FK:m_account）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.otp_code_hash IS 'OTPコードハッシュ（平文は保存しない）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.otp_type IS 'OTP種別（1:ログイン, 2:パスワードリセット）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.expired_at IS 'OTP有効期限'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.verify_attempt_count IS 'OTP入力試行回数（DEFAULT 0）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.resend_count IS 'OTP再送回数（DEFAULT 0）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.used_flg IS '使用済フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_mfa_otp.created_at IS '作成日時'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_mfa_otp`);
  }
}
