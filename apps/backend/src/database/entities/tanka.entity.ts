import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * m_tanka — 単価マスタ. Per-JA pricing for subscriptions and delivery.
 *
 * `tanka_type` (m_code category `TANKA_TYPE`): 1=購読料, 2=配達手数料.
 * `active_flg` is an operator-controlled manual override INDEPENDENT of
 * the effective period (tekiyo_start_date / tekiyo_end_date). FALSE
 * blocks new subscriber assignments but keeps existing contracts.
 *
 * Schema source: `docs/database/database-design.md §m_tanka`.
 */
@Entity('m_tanka')
@Index('UQ_m_tanka_ja_code', ['jaId', 'tankaCode'], { unique: true })
@Index('IX_m_tanka_ja_id', ['jaId'])
@Index('IX_m_tanka_type_name', ['tankaType', 'tankaName'])
@Index('IX_m_tanka_deleted_at', ['deletedAt'])
export class Tanka {
  @PrimaryGeneratedColumn({ name: 'tanka_id', type: 'bigint' })
  tankaId: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'tanka_code', type: 'varchar', length: 10 })
  tankaCode: string;

  @Column({ name: 'tanka_type', type: 'int' })
  tankaType: number;

  @Column({ name: 'tanka_name', type: 'varchar', length: 100 })
  tankaName: string;

  // NUMERIC(10) per database-design.md §m_tanka — amounts are integer yen.
  // Stored as a plain numeric in production; pg-mem doesn't handle the
  // precision-only form gracefully so we omit precision/scale here. The
  // migration's DDL still emits `NUMERIC(10)` for the production table.
  @Column({ name: 'kingaku_zeikomi', type: 'numeric' })
  kingakuZeikomi: number;

  @Column({ name: 'kingaku_zeinuki', type: 'numeric' })
  kingakuZeinuki: number;

  @Column({ name: 'tax_rate', type: 'numeric' })
  taxRate: number;

  @Column({ name: 'tekiyo_start_date', type: 'date' })
  tekiyoStartDate: string;

  @Column({ name: 'tekiyo_end_date', type: 'date', nullable: true })
  tekiyoEndDate: string | null;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

  @Column({ name: 'active_flg', type: 'boolean', default: true })
  activeFlg: boolean;

  // キャンペーンフラグ（TRUE: 有効, FALSE: 無効）。active_flg と同じ運用フラグ
  // パターンだが、既定値は FALSE（キャンペーン非対象が通常）。
  @Column({ name: 'campaign_flg', type: 'boolean', default: false })
  campaignFlg: boolean;

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
