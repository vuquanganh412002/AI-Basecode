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
 * `m_tanka`（単価マスタ）エンティティ。JA ごとの購読料・配達手数料単価。
 * `docs/database/database-design.md §m_tanka` に準拠。
 *
 * `tanka_type`（m_code カテゴリ `TANKA_TYPE`）: 1=購読料, 2=配達手数料。
 * `active_flg` はオペレータ手動フラグ。FALSE で新規割当を止めつつ既存契約は維持。
 * 適用期間内でも任意に FALSE にでき、期間内でも自動的に TRUE にはならない。
 * さらに夜間 tanka-expire バッチが `tekiyo_end_date` 経過後に TRUE→FALSE へ
 * 一方向に反転（失効→FALSE のみ、FALSE→TRUE はしない）させ、失効単価が
 * 「有効」のまま残らないようにする。`src/modules/batch/tanka-expire/` 参照。
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

  // database-design.md §m_tanka の NUMERIC(10)（金額は整数円）。本番は通常の
  // numeric 保存。pg-mem が precision のみの形を扱えないため precision/scale を
  // 省略。マイグレーション DDL は本番表に NUMERIC(10) を出力する。
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
