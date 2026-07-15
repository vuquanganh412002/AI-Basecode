import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_account')
@Index('UQ_m_account_login_id', ['loginId'], { unique: true })
@Index('IX_m_account_shiten_id', ['shitenId'])
export class Account {
  @PrimaryGeneratedColumn({ name: 'account_id', type: 'bigint' })
  accountId: number;

  @Column({ name: 'login_id', type: 'varchar', length: 20 })
  loginId: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 256 })
  passwordHash: string;

  @Column({ name: 'account_name', type: 'varchar', length: 50 })
  accountName: string;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'kanri_shiten_id', type: 'bigint', nullable: true })
  kanriShitenId: number | null;

  // 所属支店（顧客要件 2026-07）。JA管理支店アカウントに設定すると、その支店の
  // 読者しか参照・編集・追加できず（DataScope 3層目）、帳票5画面も使用不可になる。
  // NULL は従来どおり（管理支店単位のスコープのみ）。
  @Column({ name: 'shiten_id', type: 'bigint', nullable: true })
  shitenId: number | null;

  @Column({ name: 'todofuken_code', type: 'varchar', length: 2, nullable: true })
  todofukenCode: string | null;

  @Column({ name: 'paper_flg', type: 'boolean', default: false })
  paperFlg: boolean;

  @Column({ name: 'denshi_flg', type: 'boolean', default: false })
  denshiFlg: boolean;

  @Column({ name: 'email', type: 'varchar', length: 100, default: '' })
  email: string;

  @Column({ name: 'sub_email_1', type: 'varchar', length: 100, default: '' })
  subEmail1: string;

  @Column({ name: 'sub_email_2', type: 'varchar', length: 100, default: '' })
  subEmail2: string;

  @Column({ name: 'sub_email_3', type: 'varchar', length: 100, default: '' })
  subEmail3: string;

  @Column({ name: 'password_updated_at', type: 'timestamptz', nullable: true })
  passwordUpdatedAt: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'login_failure_count', type: 'int', default: 0 })
  loginFailureCount: number;

  @Column({ name: 'account_lock_flg', type: 'boolean', default: false })
  accountLockFlg: boolean;

  @Column({ name: 'account_lock_at', type: 'timestamptz', nullable: true })
  accountLockAt: Date | null;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

  @Column({ name: 'mfa_enable_flg', type: 'boolean', default: false })
  mfaEnableFlg: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 50 })
  updatedBy: string;
}
