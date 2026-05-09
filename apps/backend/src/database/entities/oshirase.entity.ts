import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('t_oshirase')
export class Oshirase {
  @PrimaryGeneratedColumn({ name: 'oshirase_id', type: 'bigint' })
  oshiraseId: number;

  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'oshirase_type', type: 'int' })
  oshiraseType: number;

  @Column({ name: 'publish_location', type: 'int' })
  publishLocation: number;

  @Column({ name: 'status', type: 'int' })
  status: number;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'publish_start_date', type: 'timestamptz' })
  publishStartDate: Date;

  @Column({ name: 'publish_end_date', type: 'timestamptz', nullable: true })
  publishEndDate: Date | null;

  @Column({ name: 'target_kanri_kubun', type: 'varchar', length: 20, default: '' })
  targetKanriKubun: string;

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
