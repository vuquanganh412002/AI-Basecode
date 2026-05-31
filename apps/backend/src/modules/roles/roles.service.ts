import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { NotFoundException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { Permission } from '@/database/entities/permission.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  toPermissionListItem,
  toRoleDetailResponse,
  toRoleListItem,
  type PermissionListItem,
  type RoleDetailResponse,
  type RoleListItem,
} from './roles.mapper';
import { UpdateRoleDto } from './dto/update-role.dto';

const SCREEN_NAME = 'ロール管理画面 (ACSMS-SCR-027)';
const TABLE_NAME = 'm_roles';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── ACSMS-API-027-001 — GET /api/v1/roles ──────────────────────────
  async findAll(): Promise<{ data: RoleListItem[] }> {
    const rows = await this.roleRepo.find({
      where: { deletedAt: IsNull() },
      order: { roleId: 'ASC' },
    });
    return { data: rows.map(toRoleListItem) };
  }

  // ─── ACSMS-API-COMMON-002 — GET /api/v1/roles/dropdown ──────────────
  // Slim list for screens that need only the 3 fields (role_id /
  // role_code / role_name). Authenticated-only — no role gate.
  async listRolesDropdown(): Promise<{
    data: Array<{ role_id: number; role_code: string; role_name: string }>;
  }> {
    const rows = await this.roleRepo.find({
      where: { deletedAt: IsNull() },
      order: { roleId: 'ASC' },
    });
    return {
      data: rows.map((r) => ({
        role_id: Number(r.roleId),
        role_code: r.roleCode,
        role_name: r.roleName,
      })),
    };
  }

  // ─── ACSMS-API-027-002 — GET /api/v1/roles/:role_id ─────────────────
  async findOne(roleId: number): Promise<{ data: RoleDetailResponse }> {
    const role = await this.roleRepo.findOne({
      where: { roleId, deletedAt: IsNull() },
    });
    if (!role) {
      throw new NotFoundException('ロール');
    }
    const [permissionIds, lockedPermissionIds] = await Promise.all([
      this.findActivePermissionIds(roleId),
      this.findLockedPermissionIds(roleId),
    ]);
    return {
      data: toRoleDetailResponse(role, permissionIds, lockedPermissionIds),
    };
  }

  // ─── ACSMS-API-027-003 — PUT /api/v1/roles/:role_id ─────────────────
  async update(
    roleId: number,
    dto: UpdateRoleDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: RoleDetailResponse; message: string }> {
    // [fetch-target] — confirm the role exists BEFORE the validation hop (so a
    // bogus role_id with a bad permission list still returns 404, not
    // 400). Also captured for before_value in the audit log.
    const before = await this.roleRepo.findOne({
      where: { roleId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('ロール');
    }

    // [code-master-check] — every permission_id in the body must exist in m_permissions.
    // Reject as VALIDATION_ERROR so the FE useApiForm composable maps the
    // error to the permission_ids field (BAD_REQUEST would just toast).
    if (dto.permission_ids.length > 0) {
      const validCount = await this.permissionRepo.count({
        where: { permissionId: In(dto.permission_ids), deletedAt: IsNull() },
      });
      if (validCount !== dto.permission_ids.length) {
        throw new HttpException(
          {
            code: 'VALIDATION_ERROR',
            error_code: 'VALIDATION_ERROR',
            message:
              '入力値が不正です。詳細はerrorsフィールドを確認してください。',
            errors: [
              {
                field: 'permission_ids',
                message: '指定された権限が見つかりません',
              },
            ],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // [single-snapshot] One find() gives us BOTH the before-snapshot for
    // the audit log AND the locked map for the guard below — saves a
    // duplicate query and keeps spec mocking simple.
    const currentAllocations = await this.rolePermissionRepo.find({
      where: { roleId, deletedAt: IsNull() },
      order: { permissionId: 'ASC' },
    });
    const beforePermissionIds = currentAllocations
      .map((r) => Number(r.permissionId))
      .sort((a, b) => a - b);

    // [locked-guard] — snapshot which currently-active rows are locked
    // (= seeded baseline; see migration 1711900900012). Rejection
    // happens BEFORE the transaction so the audit log never records a
    // half-attempt. Preservation map gets reused below when re-
    // inserting so the locked flag survives the soft-delete + insert
    // cycle (would otherwise reset to default FALSE on every PATCH).
    const lockedByPermId = new Map<number, boolean>(
      currentAllocations.map((r) => [Number(r.permissionId), r.locked]),
    );
    const requestedSet = new Set(dto.permission_ids);
    const droppedLocked = [...lockedByPermId.entries()]
      .filter(([pid, isLocked]) => isLocked && !requestedSet.has(pid))
      .map(([pid]) => pid);
    if (droppedLocked.length > 0) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          error_code: 'VALIDATION_ERROR',
          message: 'システム必須権限のため、解除できません。',
          errors: [
            {
              field: 'permission_ids',
              message: `次の権限はシステム必須のため解除できません: ${droppedLocked.join(
                ', ',
              )}`,
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        // [partial-update] — update role basic info.
        await manager.update(
          Role,
          { roleId },
          {
            roleName: dto.role_name,
            description: dto.description ?? null,
            updatedBy: session.login_id,
          },
        );

        // [soft-delete] — soft-delete every existing allocation for this role.
        await manager.update(
          RolePermission,
          { roleId, deletedAt: IsNull() },
          { deletedAt: new Date(), updatedBy: session.login_id },
        );

        // [business-insert] — INSERT new allocations (only when array is non-empty).
        // Preserve `locked` from the snapshot above; freshly-added
        // permission_ids that weren't in the current set default to
        // FALSE (admin-added permissions are never locked).
        if (dto.permission_ids.length > 0) {
          const newRows = dto.permission_ids.map((permissionId) =>
            manager.create(RolePermission, {
              roleId,
              permissionId,
              locked: lockedByPermId.get(permissionId) ?? false,
              createdBy: session.login_id,
              updatedBy: session.login_id,
            }),
          );
          await manager.save(RolePermission, newRows);
        }

        // [reread-after-write] — RETURNING * equivalent — re-read the row inside the tx.
        const refreshed = await manager.findOne(Role, {
          where: { roleId, deletedAt: IsNull() },
        });
        if (!refreshed) {
          // Defensive: row was deleted concurrently between [fetch-target] and now.
          throw new NotFoundException('ロール');
        }

        // [audit-log-in-tx] — INSIDE the transaction so business write +
        // audit row commit together or rollback together.
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, roleId),
          {
            role_id: before.roleId,
            role_code: before.roleCode,
            role_name: before.roleName,
            description: before.description,
            permission_ids: beforePermissionIds,
          },
          {
            role_id: refreshed.roleId,
            role_code: refreshed.roleCode,
            role_name: refreshed.roleName,
            description: refreshed.description,
            permission_ids: dto.permission_ids,
          },
          manager,
        );

        return refreshed;
      });

      // After the transaction commits, the active allocations equal the
      // input dto.permission_ids (we soft-deleted everything and inserted
      // the new set). Returning the dto directly avoids an extra round
      // trip to the DB and keeps unit-spec mocks deterministic — the
      // active list is sorted ASC to match api.md §3 example ordering.
      // Locked subset comes from the pre-tx snapshot (lockedByPermId)
      // intersected with the now-active set.
      const refreshedPermissionIds = [...dto.permission_ids].sort(
        (a, b) => a - b,
      );
      const refreshedLockedIds = dto.permission_ids
        .filter((pid) => lockedByPermId.get(pid) === true)
        .sort((a, b) => a - b);
      return {
        data: toRoleDetailResponse(
          result,
          refreshedPermissionIds,
          refreshedLockedIds,
        ),
        message: '更新しました。',
      };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back transaction so the failure
      // trace survives. Do NOT pass manager here.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, roleId),
        'UPDATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-027-004 — GET /api/v1/permissions ────────────────────
  async findAllPermissions(): Promise<{ data: PermissionListItem[] }> {
    const rows = await this.permissionRepo.find({
      where: { deletedAt: IsNull() },
      order: { permissionId: 'ASC' },
    });
    return { data: rows.map(toPermissionListItem) };
  }

  // ─── helpers ────────────────────────────────────────────────────────
  private async findActivePermissionIds(roleId: number): Promise<number[]> {
    const rows = await this.rolePermissionRepo.find({
      where: { roleId, deletedAt: IsNull() },
      order: { permissionId: 'ASC' },
    });
    // Sort explicitly — TypeORM applies `order:` at the DB layer; unit
    // tests that mock `repo.find` ignore that option, so a defensive
    // in-memory sort keeps both paths consistent.
    return rows
      .map((r) => Number(r.permissionId))
      .sort((a, b) => a - b);
  }

  /**
   * Subset of active permission_ids whose row has `locked = true`
   * (seeded baseline). FE disables matching checkboxes; BE rejects
   * PATCH that drops any of them. See migration
   * 1711900900012-AlterMRolesPermissionsAddLocked.
   */
  private async findLockedPermissionIds(roleId: number): Promise<number[]> {
    const rows = await this.rolePermissionRepo.find({
      where: { roleId, deletedAt: IsNull(), locked: true },
      order: { permissionId: 'ASC' },
    });
    return rows
      .map((r) => Number(r.permissionId))
      .sort((a, b) => a - b);
  }
}
