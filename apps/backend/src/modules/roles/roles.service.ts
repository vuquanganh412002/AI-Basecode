import { Injectable } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { SuccessMessage } from '@/common/constants/success-message.constant';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import {
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
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
  // 3項目(role_id/role_code/role_name)のみ要る画面向けスリム版。認証のみ、role gate なし。
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
    // [fetch-target] — 検証前に存在確認（不正 role_id + 不正 permission でも 400 でなく
    // 404 を返す）。audit の before_value にも使用。
    const before = await this.roleRepo.findOne({
      where: { roleId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('ロール');
    }

    // [code-master-check] — body の全 permission_id は m_permissions に存在必須。
    // VALIDATION_ERROR で返し FE useApiForm が permission_ids に紐付ける（BAD_REQUEST は toast のみ）。
    if (dto.permission_ids.length > 0) {
      const validCount = await this.permissionRepo.count({
        where: { permissionId: In(dto.permission_ids), deletedAt: IsNull() },
      });
      if (validCount !== dto.permission_ids.length) {
        throw new ValidationException([
          { field: 'permission_ids', message: '指定された権限が見つかりません' },
        ]);
      }
    }

    // [single-snapshot] 1回の find() で audit の before スナップショットと下の guard 用
    // locked マップ両方を得る — 重複クエリ回避、spec mock も簡潔。
    const currentAllocations = await this.rolePermissionRepo.find({
      where: { roleId, deletedAt: IsNull() },
      order: { permissionId: 'ASC' },
    });
    const beforePermissionIds = currentAllocations
      .map((r) => Number(r.permissionId))
      .sort((a, b) => a - b);

    // [locked-guard] — 現在有効な行のうち locked を取得（seed ベースライン,
    // migration 1711900900012）。tx 前に拒否し audit に中途半端を残さない。
    // このマップは下の再 INSERT で再利用し soft-delete+insert で locked を維持
    // （さもないと PATCH 毎に既定 FALSE に戻る）。
    const lockedByPermId = new Map<number, boolean>(
      currentAllocations.map((r) => [Number(r.permissionId), r.locked]),
    );
    const requestedSet = new Set(dto.permission_ids);
    const droppedLocked = [...lockedByPermId.entries()]
      .filter(([pid, isLocked]) => isLocked && !requestedSet.has(pid))
      .map(([pid]) => pid);
    if (droppedLocked.length > 0) {
      throw new ValidationException(
        [
          {
            field: 'permission_ids',
            message: `次の権限はシステム必須のため解除できません: ${droppedLocked.join(
              ', ',
            )}`,
          },
        ],
        'システム必須権限のため、解除できません。',
      );
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        // [partial-update] — ロール基本情報を更新。
        await manager.update(
          Role,
          { roleId },
          {
            roleName: dto.role_name,
            description: dto.description ?? null,
            updatedBy: String(session.account_id),
          },
        );

        // [soft-delete] — このロールの既存割当を全て論理削除。
        await manager.update(
          RolePermission,
          { roleId, deletedAt: IsNull() },
          { deletedAt: new Date(), updatedBy: String(session.account_id) },
        );

        // [business-insert] — 新規割当を INSERT（配列が空でない時のみ）。上の
        // スナップショットの locked を維持。現集合になかった新規 permission_id は
        // FALSE 既定（admin 追加権限は locked にならない）。
        if (dto.permission_ids.length > 0) {
          const newRows = dto.permission_ids.map((permissionId) =>
            manager.create(RolePermission, {
              roleId,
              permissionId,
              locked: lockedByPermId.get(permissionId) ?? false,
              createdBy: String(session.account_id),
              updatedBy: String(session.account_id),
            }),
          );
          await manager.save(RolePermission, newRows);
        }

        // [reread-after-write] — RETURNING * 相当 — tx 内で行を再読込。
        const refreshed = await manager.findOne(Role, {
          where: { roleId, deletedAt: IsNull() },
        });
        if (!refreshed) {
          // 防御的: [fetch-target] 以降に行が並行削除された場合。
          throw new NotFoundException('ロール');
        }

        // [audit-log-in-tx] — tx 内で業務書込 + 監査行を一括 commit/rollback。
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_027, TABLE_NAME, roleId),
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

      // commit 後、有効割当は入力 dto.permission_ids と一致（全削除+新集合 INSERT）。
      // dto を直接返し DB 往復を省き unit-spec mock も決定的に。有効一覧は api.md §3 の
      // 例順に合わせ ASC ソート。locked 部分集合は tx 前スナップショット(lockedByPermId)と
      // 現有効集合の積。
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
        message: SuccessMessage.UPDATED,
      };
    } catch (err) {
      // [audit-error-log] — ロールバック済み tx の外で失敗トレースを残す。ここで
      // manager は渡さない。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_027, TABLE_NAME, roleId),
        AuditOperation.UPDATE,
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
    // 明示ソート — TypeORM の `order:` は DB 層適用で、repo.find を mock する unit test
    // は無視するため、防御的にメモリ内ソートし両経路を一致させる。
    return rows
      .map((r) => Number(r.permissionId))
      .sort((a, b) => a - b);
  }

  /**
   * 有効 permission_ids のうち行が locked=true（seed ベースライン）の部分集合。FE は
   * 該当チェックボックスを disabled にし、BE はこれを外す PATCH を拒否。
   * 列定義は migration 1711900800003-CreateMRolesPermissions、TRUE の付与は
   * 1711900900003-SeedMRolesPermissions 末尾の UPDATE を参照。
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
