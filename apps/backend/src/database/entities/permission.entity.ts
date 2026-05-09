import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_permissions')
export class Permission {
  @PrimaryGeneratedColumn({ name: 'permission_id', type: 'bigint' })
  permissionId: number;

  @Column({ name: 'permission_code', type: 'varchar', length: 50 })
  permissionCode: string;

  @Column({ name: 'permission_name', type: 'varchar', length: 100 })
  permissionName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

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
