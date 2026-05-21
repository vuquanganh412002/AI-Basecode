import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

import { Oshirase } from '@/database/entities/oshirase.entity';
import { OshiraseStatus, PublishLocation } from '@/common/enums';
import { NotFoundException } from '@/common/exceptions/common.exceptions';
import { BadRequestException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  LoginOshiraseItemDto,
  LoginOshiraseQueryDto,
} from './dto/login-oshirase-query.dto';
import type { CreateOshiraseDto } from './dto/create-oshirase.dto';
import type { UpdateOshiraseDto } from './dto/update-oshirase.dto';
import {
  OSHIRASE_SEARCH_SORT_BY,
  type SearchOshiraseDto,
} from './dto/search-oshirase.dto';
import { DeadlineNoticeDuplicateException } from './exceptions/deadline-notice-duplicate.exception';
import {
  formatJstDateTimeMinutes,
  parseJstDateTimeMinutes,
  toOshiraseDetail,
  toOshiraseListItem,
  type OshiraseDetail,
  type OshiraseListItem,
} from './oshirase.mapper';

const SCREEN_NAME = 'お知らせ一覧画面 (ACSMS-SCR-031)';
const TABLE_NAME = 't_oshirase';

/** Item shape returned by SCR-010's `GET /api/v1/oshirase/menu`. */
export interface MenuOshiraseItem {
  oshirase_id: number;
  title: string;
  content: string;
  oshirase_type: number;
  oshirase_type_label: string;
  publish_start_date: string;
  publish_end_date: string | null;
  is_new: boolean;
  ja_id: number | null;
}

@Injectable()
export class OshiraseService {
  constructor(
    @InjectRepository(Oshirase) private readonly repo: Repository<Oshirase>,
    // OSHIRASE_TYPE is a Group B m_code category (extensible at runtime).
    // Public endpoints MUST serialize the label here because anonymous
    // callers (login screen) don't carry the FE m_code cache. See
    // `.claude/rules/nestjs.md §Response serialization` for the rule.
    private readonly codeService: CodeService,
    // SCR-031 admin endpoints need audit log + transactions. Marked
    // @Optional() so SCR-001 specs that construct the service with only
    // (repo, codeService) keep type-checking. Production DI always supplies
    // both — see oshirase.module.ts imports.
    @Optional() private readonly auditLog?: AuditLogService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // SCR-001 — Login screen list (no auth)
  // ═══════════════════════════════════════════════════════════════════
  async findLogin(query: LoginOshiraseQueryDto): Promise<LoginOshiraseItemDto[]> {
    const limit = Math.min(query.limit ?? 10, 10);
    const now = new Date();

    const rows = await this.repo
      .createQueryBuilder('o')
      .where('o.publish_location = :publishLocation', {
        publishLocation: PublishLocation.LOGIN,
      })
      .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
      .andWhere('o.publish_start_date <= :now', { now })
      .andWhere('(o.publish_end_date IS NULL OR o.publish_end_date >= :now)', { now })
      .andWhere('o.ja_id IS NULL')
      .andWhere({ deletedAt: IsNull() })
      .orderBy('o.publish_start_date', 'DESC')
      .take(limit)
      .getMany();

    return rows.map((r) => ({
      oshirase_id: Number(r.oshiraseId),
      oshirase_type: r.oshiraseType,
      oshirase_type_label: this.codeService.getLabel('OSHIRASE_TYPE', r.oshiraseType),
      title: r.title,
      publish_start_date: r.publishStartDate.toISOString().slice(0, 10),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCR-010 — Menu screen list (authenticated, any role)
  // ═══════════════════════════════════════════════════════════════════

  // API-010-001 — GET /api/v1/oshirase/menu?limit=20
  async getMenuList(
    session: SessionPayload,
    limitInput?: number,
  ): Promise<{
    data: {
      oshirase_list: MenuOshiraseItem[];
      deadline_notice: MenuOshiraseItem | null;
    };
  }> {
    const limit = Math.min(Math.max(limitInput ?? 20, 1), 100);
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const userJaId = session.ja_id;

    // Common filter: publish_location=2, status=公開, deleted_at IS NULL,
    // within publish window, ja_id NULL OR ja_id = user.ja_id.
    const baseQb = () => {
      const qb = this.repo
        .createQueryBuilder('o')
        .where('o.publish_location = :publishLocation', {
          publishLocation: PublishLocation.MENU,
        })
        .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
        .andWhere('o.publish_start_date <= :now', { now })
        .andWhere(
          '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
          { now },
        )
        .andWhere({ deletedAt: IsNull() });
      if (userJaId == null) {
        qb.andWhere('o.ja_id IS NULL');
      } else {
        qb.andWhere('(o.ja_id IS NULL OR o.ja_id = :userJaId)', { userJaId });
      }
      return qb;
    };

    const [rows, deadlineRow] = await Promise.all([
      baseQb()
        .andWhere('o.oshirase_type != 4')
        .orderBy('o.publish_start_date', 'DESC')
        .take(limit)
        .getMany(),
      baseQb()
        .andWhere('o.oshirase_type = 4')
        .orderBy('o.publish_start_date', 'DESC')
        .take(1)
        .getOne(),
    ]);

    const toMenuItem = (r: Oshirase): MenuOshiraseItem => ({
      oshirase_id: Number(r.oshiraseId),
      title: r.title,
      content: r.content,
      oshirase_type: r.oshiraseType,
      oshirase_type_label: this.codeService.getLabel(
        'OSHIRASE_TYPE',
        r.oshiraseType,
      ),
      publish_start_date: formatJstDateTimeMinutes(r.publishStartDate),
      publish_end_date: r.publishEndDate
        ? formatJstDateTimeMinutes(r.publishEndDate)
        : null,
      is_new: now.getTime() - r.publishStartDate.getTime() <= sevenDaysMs,
      ja_id: r.jaId === null ? null : Number(r.jaId),
    });

    return {
      data: {
        oshirase_list: rows.map(toMenuItem),
        deadline_notice: deadlineRow ? toMenuItem(deadlineRow) : null,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCR-031 — Admin list / detail / CRUD
  // ═══════════════════════════════════════════════════════════════════

  // API-031-001 — GET /api/v1/oshirase
  async getList(
    query: SearchOshiraseDto,
  ): Promise<PaginatedResponse<OshiraseListItem>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sortBy = query.sort_by ?? 'created_at';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortColumn = OSHIRASE_SEARCH_SORT_BY.includes(sortBy)
      ? `o.${sortBy}`
      : 'o.created_at';

    // Pin the 締め切り時間 row (oshirase_type=4) at the top of every page,
    // regardless of the requested sort. The boolean expression evaluates
    // to TRUE for the deadline notice → DESC puts it first. Postgres
    // accepts the bare boolean in ORDER BY.
    const qb = this.repo
      .createQueryBuilder('o')
      .where({ deletedAt: IsNull() })
      .orderBy('(o.oshirase_type = 4)', 'DESC')
      .addOrderBy(sortColumn, sortOrder)
      .take(perPage)
      .skip((page - 1) * perPage);

    const [rows, total] = await qb.getManyAndCount();
    return paginate(rows.map(toOshiraseListItem), total, page, perPage);
  }

  // API-031-002 — GET /api/v1/oshirase/:id
  async getDetail(oshiraseId: number): Promise<{ data: OshiraseDetail }> {
    const row = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('お知らせ');
    return { data: toOshiraseDetail(row) };
  }

  // API-031-003 — POST /api/v1/oshirase
  async create(
    dto: CreateOshiraseDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: OshiraseDetail; message: string }> {
    if (!this.dataSource || !this.auditLog) {
      throw new Error(
        'OshiraseService.dataSource/auditLog undefined — SCR-031 endpoints require both.',
      );
    }

    // [uniqueness-check] 締め切り時間重複チェック (publish_location=2 + oshirase_type=4)
    if (dto.publish_location === 2 && dto.oshirase_type === 4) {
      const exists = await this.repo.count({
        where: {
          publishLocation: 2,
          oshiraseType: 4,
          deletedAt: IsNull(),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const startDate = parseJstDateTimeMinutes(dto.publish_start_date);
    const endDate = dto.publish_end_date
      ? parseJstDateTimeMinutes(dto.publish_end_date)
      : null;
    if (!startDate) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !endDate) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    let saved: Oshirase | null = null;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const payload = manager.create(Oshirase, {
          jaId: dto.ja_id ?? null,
          oshiraseType: dto.oshirase_type,
          publishLocation: dto.publish_location,
          status: dto.status,
          title: dto.title,
          content: dto.content,
          publishStartDate: startDate,
          publishEndDate: endDate,
          targetKanriKubun: dto.target_kanri_kubun ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(Oshirase, payload);
        await this.auditLog!.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, Number(created.oshiraseId)),
          created,
          manager,
        );
        return created;
      });
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        'CREATE',
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(saved!),
      message: '登録しました。',
    };
  }

  // API-031-004 — PATCH /api/v1/oshirase/:id
  async update(
    oshiraseId: number,
    dto: UpdateOshiraseDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: OshiraseDetail; message: string }> {
    if (!this.dataSource || !this.auditLog) {
      throw new Error(
        'OshiraseService.dataSource/auditLog undefined — SCR-031 endpoints require both.',
      );
    }

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    // 締め切り時間重複チェック (publish_location=2 + oshirase_type=4).
    // Same rule as create — but exclude the row being edited so saving
    // the existing deadline notice itself doesn't trip the check.
    if (dto.publish_location === 2 && dto.oshirase_type === 4) {
      const exists = await this.repo.count({
        where: {
          publishLocation: 2,
          oshiraseType: 4,
          deletedAt: IsNull(),
          oshiraseId: Not(oshiraseId),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const newStart = parseJstDateTimeMinutes(dto.publish_start_date);
    const newEnd = dto.publish_end_date
      ? parseJstDateTimeMinutes(dto.publish_end_date)
      : null;
    if (!newStart) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !newEnd) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    // [input-validation] 過去日チェック: 既存の publish_start_date が過去日の場合、
    // リクエストで変更されているとバリデーションエラーとして扱う。
    const now = Date.now();
    if (
      existing.publishStartDate.getTime() < now &&
      newStart.getTime() !== existing.publishStartDate.getTime()
    ) {
      throw new BadRequestException(
        '過去日の表示開始日時は変更できません。',
      );
    }

    let updated: Oshirase | null = null;
    try {
      updated = await this.dataSource.transaction(async (manager) => {
        const before = await manager.findOne(Oshirase, {
          where: { oshiraseId, deletedAt: IsNull() },
        });
        if (!before) throw new NotFoundException('お知らせ');

        const merged = manager.create(Oshirase, {
          ...before,
          jaId: dto.ja_id ?? null,
          oshiraseType: dto.oshirase_type,
          publishLocation: dto.publish_location,
          status: dto.status,
          title: dto.title,
          content: dto.content,
          publishStartDate: newStart,
          publishEndDate: newEnd,
          targetKanriKubun: dto.target_kanri_kubun ?? '',
          updatedBy: String(session.account_id),
        });
        const saved = await manager.save(Oshirase, merged);

        await this.auditLog!.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, Number(saved.oshiraseId)),
          before,
          saved,
          manager,
        );
        return saved;
      });
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, oshiraseId),
        'UPDATE',
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(updated!),
      message: '更新しました。',
    };
  }

  // API-031-005 — DELETE /api/v1/oshirase/:id
  async remove(
    oshiraseId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    if (!this.dataSource || !this.auditLog) {
      throw new Error(
        'OshiraseService.dataSource/auditLog undefined — SCR-031 endpoints require both.',
      );
    }

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    try {
      await this.dataSource.transaction(async (manager) => {
        const before = await manager.findOne(Oshirase, {
          where: { oshiraseId, deletedAt: IsNull() },
        });
        if (!before) throw new NotFoundException('お知らせ');

        await manager.softDelete(Oshirase, oshiraseId);
        await this.auditLog!.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, oshiraseId),
          before,
          manager,
        );
      });
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, oshiraseId),
        'DELETE',
        err as Error,
      );
      throw err;
    }

    return { message: '削除しました。' };
  }
}
