// Screen: __SCREEN_ID__ — __SCREEN__
//
// Business logic for __MODULE__. Must satisfy assertions in:
//   apps/backend/src/modules/__MODULE__/__MODULE__.service.spec.ts
//   apps/backend/test/integration/__MODULE__.integration.spec.ts
//
// Contract:
// - DataScope filter applied here (NEVER in controller)
// - Field-level restriction applied via filterAllowedFields()
// - Mutating methods wrap main DML + audit log inside dataSource.transaction()
// - Error log (log_type=3) emitted OUTSIDE the tx in catch branch
// - audit_log.operation uses bare verbs: 'CREATE' / 'UPDATE' / 'DELETE'

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { __ENTITY__ } from '@/database/entities/__MODULE__.entity';
import { Create__ENTITY__Dto } from './dto/create-__MODULE__.dto';
import { Update__ENTITY__Dto } from './dto/update-__MODULE__.dto';
import { Search__ENTITY__Dto } from './dto/search-__MODULE__.dto';
import { __ENTITY__NotFoundException } from './exceptions/__MODULE__-not-found.exception';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CodeService } from '../code/code.service';
import { DataScopeViolationException } from '../../common/exceptions/data-scope-violation.exception';
import type { SessionPayload } from '../auth/session.service';

// Field-level restriction — copy from .claude/rules/security.md §Layer 3 for
// the models this screen edits. '*' means all fields allowed.
const FIELD_RESTRICTIONS: Record<string, Record<string, string[]>> = {
  __MODEL_KEY__: {
    NICHINO_ADMIN: ['*'],
    // TODO(/gen-code-backend): fill per security.md §Layer 3 if role restricted
  },
};

function filterAllowedFields<T extends Record<string, any>>(
  dto: T,
  model: string,
  roleCode: string,
): Partial<T> {
  const allowed = FIELD_RESTRICTIONS[model]?.[roleCode];
  if (!allowed) return {};
  if (allowed.includes('*')) return dto;
  return Object.fromEntries(
    Object.entries(dto).filter(([key]) => allowed.includes(key)),
  ) as Partial<T>;
}

@Injectable()
export class __SERVICE__ {
  private readonly logger = new Logger(__SERVICE__.name);

  constructor(
    @InjectRepository(__ENTITY__)
    private readonly repo: Repository<__ENTITY__>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,   // drop if no m_code columns on this entity
  ) {}

  /**
   * Validate every request-body field that references m_code against the cached
   * CodeService. Called at the top of create() / update() before DB writes.
   * Raises VALIDATION_ERROR with a per-field errors array on any miss.
   *
   * Replace the example below with the real (category, field) pairs parsed
   * from api.md §2 (look for '※m_code.code_category=').
   */
  private assertCodeValues(dto: Record<string, unknown>): void {
    const errors: { field: string; message: string }[] = [];
    // Example:
    // if (dto.tanka_type !== undefined && !this.codeService.has('TANKA_TYPE', dto.tanka_type as number)) {
    //   errors.push({ field: 'tanka_type', message: '単価種類の値が不正です' });
    // }
    if (errors.length > 0) {
      throw new BadRequestException({
        error_code: 'VALIDATION_ERROR',
        message: '入力値が不正です',
        errors,
      });
    }
  }

  // ─── List / Search ──────────────────────────────────────────────────────
  async findAll(query: Search__ENTITY__Dto, session: SessionPayload) {
    const qb = this.repo.createQueryBuilder('e').where('e.deleted_at IS NULL');

    // DataScope filter (see security.md §Layer 2)
    switch (session.role_code) {
      case 'CHUOKAI':
      case 'JA_HONTEN':
        qb.andWhere('e.ja_id = :jaId', { jaId: session.ja_id });
        break;
      case 'JA_KANRI_SHITEN':
        qb.andWhere('e.ja_id = :jaId', { jaId: session.ja_id });
        // TODO: add kanri_shiten_id filter if table has that column
        break;
    }

    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by = query.sort_by ?? 'created_at';
    const sort_order = query.sort_order ?? 'desc';

    const [data, total] = await qb
      .take(per_page)
      .skip((page - 1) * per_page)
      .orderBy(`e.${sort_by}`, sort_order.toUpperCase() as 'ASC' | 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  // ─── Find by ID ─────────────────────────────────────────────────────────
  async findById(id: number, session: SessionPayload): Promise<__ENTITY__> {
    const entity = await this.repo.findOne({
      where: { __PK_CAMEL__: id, deletedAt: IsNull() } as any,
    });
    if (!entity) throw new __ENTITY__NotFoundException(id);

    if (
      session.ja_id != null &&
      (entity as any).jaId != null &&
      (entity as any).jaId !== session.ja_id &&
      session.role_code !== 'NICHINO_ADMIN' &&
      session.role_code !== 'NICHINO_STAFF'
    ) {
      throw new DataScopeViolationException();
    }
    return entity;
  }

  // ─── Create ─────────────────────────────────────────────────────────────
  async create(
    dto: Create__ENTITY__Dto,
    session: SessionPayload,
    req: Request,
  ): Promise<__ENTITY__> {
    this.assertCodeValues(dto as unknown as Record<string, unknown>);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const filtered = filterAllowedFields(dto as any, '__MODEL_KEY__', session.role_code);
        const entity = manager.create(__ENTITY__, {
          ...filtered,
          jaId: session.ja_id,
          createdBy: session.account_id,
        } as any);
        const saved = await manager.save(entity);

        await this.auditLog.logOperation(
          {
            logType: 1,
            accountId: session.account_id,
            jaId: session.ja_id ?? 0,
            gamenName: '__SCREEN__',
            operation: 'CREATE',
            resultStatus: 1,
            targetId: (saved as any).__PK_CAMEL__,
            targetTable: '__TABLE__',
            afterValue: saved,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          manager,
        );
        return saved as __ENTITY__;
      });
    } catch (err) {
      await this.auditLog.logOperation({
        logType: 3,
        accountId: session.account_id,
        jaId: session.ja_id ?? 0,
        gamenName: '__SCREEN__',
        operation: 'CREATE',
        resultStatus: 2,
        targetTable: '__TABLE__',
        errorMessage: (err as Error).message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw err;
    }
  }

  // ─── Update ─────────────────────────────────────────────────────────────
  async update(
    id: number,
    dto: Update__ENTITY__Dto,
    session: SessionPayload,
    req: Request,
  ): Promise<__ENTITY__> {
    this.assertCodeValues(dto as unknown as Record<string, unknown>);
    const before = await this.findById(id, session);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const filtered = filterAllowedFields(dto as any, '__MODEL_KEY__', session.role_code);
        Object.assign(before, filtered, { updatedBy: session.account_id });
        const saved = await manager.save(before);

        await this.auditLog.logOperation(
          {
            logType: 1,
            accountId: session.account_id,
            jaId: session.ja_id ?? 0,
            gamenName: '__SCREEN__',
            operation: 'UPDATE',
            resultStatus: 1,
            targetId: (saved as any).__PK_CAMEL__,
            targetTable: '__TABLE__',
            beforeValue: before,
            afterValue: saved,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          manager,
        );
        return saved as __ENTITY__;
      });
    } catch (err) {
      await this.auditLog.logOperation({
        logType: 3,
        accountId: session.account_id,
        jaId: session.ja_id ?? 0,
        gamenName: '__SCREEN__',
        operation: 'UPDATE',
        resultStatus: 2,
        targetId: id,
        targetTable: '__TABLE__',
        errorMessage: (err as Error).message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw err;
    }
  }

  // ─── Delete (soft) ──────────────────────────────────────────────────────
  async remove(id: number, session: SessionPayload, req: Request): Promise<void> {
    const before = await this.findById(id, session);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.softRemove(before);
        await this.auditLog.logOperation(
          {
            logType: 1,
            accountId: session.account_id,
            jaId: session.ja_id ?? 0,
            gamenName: '__SCREEN__',
            operation: 'DELETE',
            resultStatus: 1,
            targetId: id,
            targetTable: '__TABLE__',
            beforeValue: before,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          manager,
        );
      });
    } catch (err) {
      await this.auditLog.logOperation({
        logType: 3,
        accountId: session.account_id,
        jaId: session.ja_id ?? 0,
        gamenName: '__SCREEN__',
        operation: 'DELETE',
        resultStatus: 2,
        targetId: id,
        targetTable: '__TABLE__',
        errorMessage: (err as Error).message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw err;
    }
  }
}
