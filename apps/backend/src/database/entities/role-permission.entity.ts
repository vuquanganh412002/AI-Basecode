import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_roles_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn({ name: 'role_permission_id', type: 'bigint' })
  rolePermissionId: number;

  @Column({ name: 'role_id', type: 'bigint' })
  roleId: number;

  @Column({ name: 'permission_id', type: 'bigint' })
  permissionId: number;

  /**
   * ロール基準権限としてシードされた行で TRUE
   * （`1711900900003-SeedMRolesPermissions.ts`）。FE はチェックボックスを
   * `disabled` 表示し、BE はこの行を外す PATCH を拒否する。
   * ACSMS-SCR-027 管理 UI で後から追加された行は FALSE。
   */
  @Column({ name: 'locked', type: 'boolean', default: false })
  locked: boolean;

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
