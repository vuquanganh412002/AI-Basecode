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
 * `m_kanri_shiten`（管理支店マスタ）エンティティ。
 * `docs/database/database-design.md §m_kanri_shiten` に準拠。
 * タイムスタンプ列は全て TIMESTAMPTZ（JST 運用 — `.claude/rules/nestjs.md
 * §Timestamp policy`）。
 */
@Entity('m_kanri_shiten')
@Index('UQ_m_kanri_shiten_code', ['kanriShitenCode'], { unique: true })
@Index('IX_m_kanri_shiten_ja_id', ['jaId'])
@Index('IX_m_kanri_shiten_todofuken_code', ['todofukenCode'])
@Index('IX_m_kanri_shiten_deleted_at', ['deletedAt'])
export class KanriShiten {
  @PrimaryGeneratedColumn({ name: 'kanri_shiten_id', type: 'bigint' })
  kanriShitenId: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'kanri_shiten_code', type: 'varchar', length: 15 })
  kanriShitenCode: string;

  @Column({ name: 'kanri_shiten_name', type: 'varchar', length: 100 })
  kanriShitenName: string;

  @Column({ name: 'kanri_shiten_name_kana', type: 'varchar', length: 100, default: '' })
  kanriShitenNameKana: string;

  @Column({ name: 'yubin_no', type: 'varchar', length: 7, default: '' })
  yubinNo: string;

  @Column({ name: 'todofuken_code', type: 'varchar', length: 2 })
  todofukenCode: string;

  @Column({ name: 'address', type: 'varchar', length: 200, default: '' })
  address: string;

  @Column({ name: 'tel', type: 'varchar', length: 15, default: '' })
  tel: string;

  @Column({ name: 'fax', type: 'varchar', length: 15, default: '' })
  fax: string;

  @Column({ name: 'paper_flg', type: 'boolean', default: false })
  paperFlg: boolean;

  @Column({ name: 'denshi_flg', type: 'boolean', default: false })
  denshiFlg: boolean;

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
