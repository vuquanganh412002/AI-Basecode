import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('t_log')
@Index('IX_t_log_type_datetime', ['logType', 'logDatetime'])
@Index('IX_t_log_ja_id', ['jaId'])
export class Log {
  @PrimaryGeneratedColumn({ name: 'log_id', type: 'bigint' })
  logId: number;

  @Column({ name: 'log_type', type: 'int' })
  logType: number;

  @Column({ name: 'log_datetime', type: 'timestamptz' })
  logDatetime: Date;

  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId: number | null;

  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'gamen_name', type: 'varchar', length: 100, default: '' })
  gamenName: string;

  @Column({ name: 'operation', type: 'varchar', length: 100, default: '' })
  operation: string;

  @Column({ name: 'result_status', type: 'int' })
  resultStatus: number;

  @Column({ name: 'target_id', type: 'bigint', nullable: true })
  targetId: number | null;

  @Column({ name: 'target_table', type: 'varchar', length: 50, default: '' })
  targetTable: string;

  @Column({ name: 'before_value', type: 'text', default: '' })
  beforeValue: string;

  @Column({ name: 'after_value', type: 'text', default: '' })
  afterValue: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, default: '' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, default: '' })
  userAgent: string;

  @Column({ name: 'error_message', type: 'text', default: '' })
  errorMessage: string;

  @Column({ name: 'stack_trace', type: 'text', default: '' })
  stackTrace: string;
}
