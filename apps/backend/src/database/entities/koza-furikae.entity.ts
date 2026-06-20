import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * t_koza_furikae — 口座振替データテーブル (ACSMS-SCR-020).
 *
 * 1 購読者 × 対象年月 で 1 件のスナップショット（口座引落データ）。同月再生成は
 * (dokusya_id, target_month) の一意制約で UPSERT する。口座情報は購読者の引落口座。
 * 配達手数料(販売店向け)とは別系統 — 本テーブルは購読料の口座振替専用。
 */
@Entity('t_koza_furikae')
@Index('IX_t_koza_furikae_ja_id', ['jaId'])
@Index('IX_t_koza_furikae_dokusya_id', ['dokusyaId'])
@Index('IX_t_koza_furikae_target_month', ['targetMonth'])
@Index('UQ_t_koza_furikae_dokusya_month', ['dokusyaId', 'targetMonth'], {
  unique: true,
})
export class KozaFurikae {
  @PrimaryGeneratedColumn({ name: 'koza_furikae_id', type: 'bigint' })
  kozaFurikaeId: string;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: string;

  @Column({ name: 'dokusya_id', type: 'bigint' })
  dokusyaId: string;

  @Column({ name: 'target_month', type: 'varchar', length: 6 })
  targetMonth: string;

  @Column({ name: 'furikae_date', type: 'date', nullable: true })
  furikaeDate: string | null;

  @Column({ name: 'furikae_kingaku', type: 'numeric', precision: 10, scale: 0, nullable: true })
  furikaeKingaku: string | null;

  @Column({ name: 'koza_no', type: 'varchar', length: 10 })
  kozaNo: string;

  @Column({ name: 'koza_meigi', type: 'varchar', length: 50 })
  kozaMeigi: string;

  @Column({ name: 'yokin_shubetsu', type: 'int', nullable: true })
  yokinShubetsu: number | null;

  @Column({ name: 'bank_code', type: 'varchar', length: 4 })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({ name: 'bank_branch_code', type: 'varchar', length: 3 })
  bankBranchCode: string;

  @Column({ name: 'bank_branch_name', type: 'varchar', length: 100 })
  bankBranchName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 50 })
  updatedBy: string;
}
