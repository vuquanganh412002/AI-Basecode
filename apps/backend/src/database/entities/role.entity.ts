import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'role_id', type: 'bigint' })
  roleId: number;

  @Column({ name: 'role_code', type: 'varchar', length: 50 })
  roleCode: string;

  @Column({ name: 'role_name', type: 'varchar', length: 100 })
  roleName: string;

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
