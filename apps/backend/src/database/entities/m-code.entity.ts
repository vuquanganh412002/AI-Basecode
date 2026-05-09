import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_code')
@Index('UQ_m_code_category_value', ['codeCategory', 'codeValue'], { unique: true })
@Index('IX_m_code_sort_order', ['sortOrder'])
@Index('IX_m_code_deleted_at', ['deletedAt'])
export class MCode {
  @PrimaryGeneratedColumn({ name: 'code_id', type: 'bigint' })
  codeId: number;

  @Column({ name: 'code_category', type: 'varchar', length: 50 })
  codeCategory: string;

  @Column({ name: 'code_value', type: 'varchar', length: 20 })
  codeValue: string;

  @Column({ name: 'code_name', type: 'varchar', length: 100 })
  codeName: string;

  @Column({ name: 'code_name_short', type: 'varchar', length: 50, default: '' })
  codeNameShort: string;

  @Column({ name: 'sort_order', type: 'int', nullable: true })
  sortOrder: number | null;

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
