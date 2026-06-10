import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('t_mfa_otp')
@Index('IX_t_mfa_otp_account_id', ['accountId'])
export class MfaOtp {
  @PrimaryGeneratedColumn({ name: 'otp_id', type: 'bigint' })
  otpId: number;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: number;

  @Column({ name: 'otp_code_hash', type: 'varchar', length: 256 })
  otpCodeHash: string;

  @Column({ name: 'otp_type', type: 'int' })
  otpType: number;

  @Column({ name: 'expired_at', type: 'timestamptz' })
  expiredAt: Date;

  @Column({ name: 'verify_attempt_count', type: 'int', default: 0 })
  verifyAttemptCount: number;

  @Column({ name: 'resend_count', type: 'int', default: 0 })
  resendCount: number;

  @Column({ name: 'used_flg', type: 'boolean', default: false })
  usedFlg: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
