import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('t_login_log')
@Index('IX_t_login_log_datetime', ['loginDatetime'])
@Index('IX_t_login_log_account_id', ['accountId'])
export class LoginLog {
  @PrimaryGeneratedColumn({ name: 'login_log_id', type: 'bigint' })
  loginLogId: number;

  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId: number | null;

  @Column({ name: 'login_id', type: 'varchar', length: 100 })
  loginId: string;

  @Column({ name: 'login_datetime', type: 'timestamptz' })
  loginDatetime: Date;

  @Column({ name: 'login_result', type: 'int' })
  loginResult: number;

  @Column({ name: 'failure_reason', type: 'varchar', length: 200, default: '' })
  failureReason: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, default: '' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, default: '' })
  userAgent: string;
}
