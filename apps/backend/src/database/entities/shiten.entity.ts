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
 * `m_shiten`（支店マスタ）エンティティ。
 * `docs/database/database-design.md §m_shiten` に準拠。
 * タイムスタンプ列は全て TIMESTAMPTZ（JST 運用 — `.claude/rules/nestjs.md
 * §Timestamp policy`）。
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
  // database-design.md §m_shiten 行7-10。論理順は kinyu_shiten_flg（行6）と
  // kanri_shiten_id（現・行11）の間。Postgres 上は物理的に末尾追加だが、
  // 設計仕様が正本。
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
   * 親の管理支店。TypeORM リレーションとして宣言し、SCR-006 一覧の
   * QueryBuilder が `leftJoin('m.kanriShiten', 'ks')` して結合列で ORDER BY
   * できるようにする（`take()`/`skip()` は DISTINCT サブクエリでラップされ、
   * ORDER BY 対象の解決にエンティティメタデータが要るため）。eager ではない
   * — 一覧は名前を別途バッチ取得し、フォーム／編集画面では読み込まない。
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
