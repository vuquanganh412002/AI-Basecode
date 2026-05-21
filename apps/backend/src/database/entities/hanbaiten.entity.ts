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
 * TypeORM entity for `m_hanbaiten` (販売店マスタ).
 *
 * Mirrors `docs/database/database-design.md §m_hanbaiten`. All timestamp
 * columns are TIMESTAMPTZ per project policy (JST operation — see
 * `.claude/rules/nestjs.md §Timestamp policy`).
 *
 * The 5 INTEGER / NUMERIC columns marked NULL許容=〇 in the schema
 * (itaku_kubun, haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
 * tesuryo_kubun, tesuryo_amount, yokin_shubetsu) declare `nullable: true`
 * so the API response keeps the storage contract intact (see
 * `.claude/rules/nestjs.md §Nullable field serialization`).
 */
@Entity('m_hanbaiten')
@Index('UQ_m_hanbaiten_ja_code', ['jaId', 'hanbaitenCode'], { unique: true })
@Index('IX_m_hanbaiten_ja_id', ['jaId'])
@Index('IX_m_hanbaiten_haitatsuryo_tanka_id', ['haitatsuryoTankaId'])
@Index('IX_m_hanbaiten_todofuken_code', ['todofukenCode'])
@Index('IX_m_hanbaiten_deleted_at', ['deletedAt'])
export class Hanbaiten {
  @PrimaryGeneratedColumn({ name: 'hanbaiten_id', type: 'bigint' })
  hanbaitenId: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'hanbaiten_code', type: 'varchar', length: 10 })
  hanbaitenCode: string;

  @Column({ name: 'hanbaiten_name', type: 'varchar', length: 100 })
  hanbaitenName: string;

  @Column({ name: 'hanbaiten_name_kana', type: 'varchar', length: 100, default: '' })
  hanbaitenNameKana: string;

  @Column({ name: 'torihikisaki_no', type: 'varchar', length: 20, default: '' })
  torihikisakiNo: string;

  @Column({ name: 'todofuken_code', type: 'varchar', length: 2 })
  todofukenCode: string;

  @Column({ name: 'yubin_no', type: 'varchar', length: 7, default: '' })
  yubinNo: string;

  @Column({ name: 'address', type: 'varchar', length: 200, default: '' })
  address: string;

  @Column({ name: 'tel', type: 'varchar', length: 15, default: '' })
  tel: string;

  @Column({ name: 'fax', type: 'varchar', length: 15, default: '' })
  fax: string;

  @Column({ name: 'shocho_name', type: 'varchar', length: 50, default: '' })
  shochoName: string;

  @Column({ name: 'itaku_kubun', type: 'int', nullable: true })
  itakuKubun: number | null;

  @Column({ name: 'haitatsuryo_tanka_id', type: 'bigint', nullable: true })
  haitatsuryoTankaId: number | null;

  @Column({ name: 'haitatsuryo_shiharai_cycle', type: 'int', nullable: true })
  haitatsuryoShiharaiCycle: number | null;

  @Column({ name: 'tesuryo_kubun', type: 'int', nullable: true })
  tesuryoKubun: number | null;

  // NUMERIC(10) per database-design.md §m_hanbaiten — amounts are integer
  // yen. Stored as a plain numeric in production; pg-mem doesn't handle
  // the precision-only form gracefully so we omit precision/scale here.
  // The migration's DDL still emits `NUMERIC(10)` for the production
  // table.
  @Column({ name: 'tesuryo_amount', type: 'numeric', nullable: true })
  tesuryoAmount: number | null;

  @Column({ name: 'bank_code', type: 'varchar', length: 4, default: '' })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, default: '' })
  bankName: string;

  @Column({ name: 'bank_branch_code', type: 'varchar', length: 3, default: '' })
  bankBranchCode: string;

  @Column({ name: 'bank_branch_name', type: 'varchar', length: 100, default: '' })
  bankBranchName: string;

  @Column({ name: 'yokin_shubetsu', type: 'int', nullable: true })
  yokinShubetsu: number | null;

  @Column({ name: 'koza_no', type: 'varchar', length: 10, default: '' })
  kozaNo: string;

  @Column({ name: 'koza_meigi', type: 'varchar', length: 50, default: '' })
  kozaMeigi: string;

  @Column({ name: 'haiten_flg', type: 'boolean', default: false })
  haitenFlg: boolean;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  updatedBy: string;
}
