import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { KanriShiten } from './kanri-shiten.entity';

/**
 * TypeORM entity for `m_shiten` (支店マスタ).
 *
 * Mirrors `docs/database/database-design.md §m_shiten`. All timestamp
 * columns are TIMESTAMPTZ per project policy (JST operation — see
 * `.claude/rules/nestjs.md §Timestamp policy`).
 */
@Entity('m_shiten')
@Index('UQ_m_shiten_ja_code', ['jaId', 'shitenCode'], { unique: true })
@Index('IX_m_shiten_ja_id', ['jaId'])
@Index('IX_m_shiten_kanri_shiten_id', ['kanriShitenId'])
@Index('IX_m_shiten_deleted_at', ['deletedAt'])
export class Shiten {
  @PrimaryGeneratedColumn({ name: 'shiten_id', type: 'bigint' })
  shitenId: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'shiten_code', type: 'varchar', length: 10 })
  shitenCode: string;

  @Column({ name: 'shiten_name', type: 'varchar', length: 100 })
  shitenName: string;

  @Column({ name: 'shiten_name_kana', type: 'varchar', length: 100, default: '' })
  shitenNameKana: string;

  @Column({ name: 'kinyu_shiten_flg', type: 'boolean', default: false })
  kinyuShitenFlg: boolean;

  // ─── JASTEM 店舗単位 4 カラム（※空文字許容、NOT NULL DEFAULT ''）─────
  // database-design.md §m_shiten rows 7-10. Logical order sits between
  // kinyu_shiten_flg (row 6) and kanri_shiten_id (now row 11) — Postgres
  // physically appended them but the design spec is the source of truth.
  @Column({
    name: 'jastem_toriatsukai_tenpo_code',
    type: 'varchar',
    length: 3,
    default: '',
  })
  jastemToriatsukaiTenpoCode: string;

  @Column({ name: 'jastem_tenpo_name', type: 'varchar', length: 15, default: '' })
  jastemTenpoName: string;

  @Column({ name: 'jastem_tyokin_shubetsu', type: 'varchar', length: 1, default: '' })
  jastemTyokinShubetsu: string;

  @Column({ name: 'jastem_koza_no', type: 'varchar', length: 7, default: '' })
  jastemKozaNo: string;

  @Column({ name: 'kanri_shiten_id', type: 'bigint' })
  kanriShitenId: number;

  /**
   * Parent 管理支店. Declared as a TypeORM relation so the
   * SCR-006 list QueryBuilder can `leftJoin('m.kanriShiten', 'ks')` and
   * ORDER BY the joined column even under `take()`/`skip()` (which
   * wraps the query in a DISTINCT subquery — the wrapper needs entity
   * metadata to resolve the ORDER BY target). Not eager — list still
   * batch-fetches the name explicitly; the form / edit views don't
   * load it.
   */
  @ManyToOne(() => KanriShiten)
  @JoinColumn({ name: 'kanri_shiten_id' })
  kanriShiten?: KanriShiten;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

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
