// Screen: __SCREEN_ID__ — __SCREEN__
// Table: __TABLE__
//
// Placeholders:
//   __ENTITY__     = entity class (e.g. "Tanka")
//   __TABLE__      = DB table name (e.g. "m_tanka")
//   __PK__         = primary key column (e.g. "tanka_id")
//
// Nullability MUST match docs/database/database-design.md:
//   NULL許容 = 〇  →  `nullable: true` + type `T | null`
//   NULL許容 = -  →  NOT NULL + default (use `''` for text columns)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('__TABLE__')
@Index(['jaId'])
export class __ENTITY__ {
  @PrimaryGeneratedColumn({ name: '__PK__', type: 'int' })
  __PK_CAMEL__: number;

  @Column({ name: 'ja_id', type: 'int' })
  jaId: number;

  // TODO(/gen-code-backend): replace below with real columns parsed from
  //   docs/database/database-design.md — one @Column per row in the table.
  //   Respect NULL許容: `nullable: true` iff 〇.

  // @Column({ name: 'xxx_code', type: 'varchar', length: 20 })
  // xxxCode: string;

  // @Column({ name: 'biko', type: 'text', default: '' })
  // biko: string;

  // @Column({ name: 'optional_field', type: 'varchar', length: 10, nullable: true })
  // optionalField: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
