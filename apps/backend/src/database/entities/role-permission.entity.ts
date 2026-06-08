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
   * TRUE when this row was seeded as part of the role's baseline
   * (`1711900900003-SeedMRolesPermissions.ts`). FE renders the
   * checkbox `disabled`; BE rejects PATCH that drops the row.
   * FALSE for any row added later via the SCR-027 admin UI.
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
