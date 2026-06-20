import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

import { Oshirase } from '@/database/entities/oshirase.entity';
import {
  AuditOperation, OshiraseStatus, OshiraseType, PublishLocation } from '@/common/enums';
import {
  BadRequestException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
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
  toOshiraseDetail,
  toOshiraseListItem,
  type OshiraseDetail,
  type OshiraseListItem,
} from './oshirase.mapper';
import {
  dateOnlyIsoJst,
  formatDateTimeMinutesJst,
  parseDatetimeMinutesJst,
} from '@/common/utils/datetime';

const SCREEN_NAME = 'お知らせ一覧画面 (ACSMS-SCR-031)';
const TABLE_NAME = 't_oshirase';

// OSHIRASE_TYPE was promoted from Group B → Group A: value 4
// (`OshiraseType.DEADLINE`) drives mandatory business branching in 3
// places (location pairing, system-wide uniqueness, delete-not-allowed),
// so it now lives in `@/common/enums` with its BE/FE mirror enforced
// by the enum-sync integration test. The local
// `const OshiraseType.DEADLINE = 4` previously declared here was
// retired in favor of `OshiraseType.DEADLINE`.

/**
 * Epoch ms at the start of the current minute (JST or whatever the
 * container TZ is — production fixes both ECS task and Postgres session
 * to Asia/Tokyo via Dockerfile + TypeORM options). Past-date validation
 * for publish_start_date uses minute precision because the form input
 * is `YYYY/MM/DD HH:mm` (no seconds).
 */
function nowMinuteFloor(): number {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.getTime();
}

/**
 * Builds the canonical VALIDATION_ERROR shape so the FE's
 * `applyServerErrors` maps `publish_start_date` to a field-level error.
 * Used when the BE rejects a past start date.
 */
function publishStartPastException(): ValidationException {
  return new ValidationException([
    { field: 'publish_start_date', message: '過去日は選択できません。' },
  ]);
}

/**
 * Builds the canonical VALIDATION_ERROR shape (ACSMS-MSG-031-008) for the
 * publish-period correlation check: 表示終了日時 must not precede 表示開始日時
 * (screen-design.md §画面項目定義 No.5「開始<=終了の相関チェック」). Equal
 * instants are allowed; only `end < start` is rejected. NULL end =
 * 無期限 → no check. Used by both create() and update().
 */
function publishEndBeforeStartException(): ValidationException {
  return new ValidationException([
    { field: 'publish_end_date', message: '終了日は開始日より後にしてください。' },
  ]);
}

/**
 * Enforce the bidirectional pairing between 締め切り時間 (oshirase_type=4)
 * and MENU_DEADLINE (publish_location=3):
 *   - type=4 MUST be at publish_location=3
 *   - publish_location=3 MUST carry type=4
 * Returns a VALIDATION_ERROR shape so FE's applyServerErrors maps it.
 * Used by both create() and update().
 */
function assertDeadlineLocationPairing(
  oshiraseType: number,
  publishLocation: number,
): void {
  const isDeadlineType = oshiraseType === OshiraseType.DEADLINE;
  const isDeadlineLocation = publishLocation === PublishLocation.MENU_DEADLINE;
  if (isDeadlineType === isDeadlineLocation) return;
  const errors: { field: string; message: string }[] = [];
  if (isDeadlineType && !isDeadlineLocation) {
    errors.push({
      field: 'publish_location',
      message:
        '締め切り時間のお知らせは「メニュー画面（締め切り時間）」のみ選択できます。',
    });
  } else {
    errors.push({
      field: 'oshirase_type',
      message:
        '「メニュー画面（締め切り時間）」は締め切り時間のお知らせ専用です。',
    });
  }
  throw new ValidationException(errors);
}

/**
 * Item shape returned by SCR-010's `GET /api/v1/oshirase/menu`.
 *
 * [no-labels-policy] Authenticated endpoint — no `oshirase_type_label`.
 * FE resolves via `useCodesStore().label('OSHIRASE_TYPE', value)`.
 * (Public SCR-001 `findLogin` still serializes the label because the
 * unauthenticated login screen has no m_code cache.)
 */
export interface MenuOshiraseItem {
  oshirase_id: number;
  title: string;
  content: string;
  oshirase_type: number;
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
    const limit = Math.min(query.limit ?? 20, 20);
    // `now` is the current absolute instant. publish_start_date /
    // publish_end_date are TIMESTAMPTZ (absolute instants too), so the
    // window comparison below is timezone-agnostic — comparing two
    // moments, not wall-clock dates. The container runs TZ=Asia/Tokyo
    // (project timestamp policy), so this instant equals "now in JST".
    const now = new Date();

    const rows = await this.repo
      .createQueryBuilder('o')
      .where('o.publish_location = :publishLocation', {
        publishLocation: PublishLocation.LOGIN,
      })
      .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
      // Login banner shows only the three general-purpose types
      // (システム / 重要 / 一般). Type 4 (締め切り時間) lives on the menu
      // screen (publish_location=3) and is excluded here.
      .andWhere('o.oshirase_type IN (:...types)', {
        types: [
          OshiraseType.SYSTEM,
          OshiraseType.IMPORTANT,
          OshiraseType.GENERAL,
        ],
      })
      .andWhere('o.publish_start_date <= :now', { now })
      .andWhere('(o.publish_end_date IS NULL OR o.publish_end_date >= :now)', { now })
      .andWhere('o.ja_id IS NULL')
      .andWhere({ deletedAt: IsNull() })
      // Newest-updated first; COALESCE falls back to created_at when
      // updated_at is absent (NOT NULL today — defensive against future
      // schema/seed paths that bypass @UpdateDateColumn).
      .orderBy('COALESCE(o.updated_at, o.created_at)', 'DESC')
      .take(limit)
      .getMany();

    return rows.map((r) => ({
      oshirase_id: Number(r.oshiraseId),
      oshirase_type: r.oshiraseType,
      oshirase_type_label: this.codeService.getLabel('OSHIRASE_TYPE', r.oshiraseType),
      title: r.title,
      // JST calendar date — NOT toISOString().slice(0,10) (UTC, off-by-one
      // for instants before 09:00 JST).
      publish_start_date: dateOnlyIsoJst(r.publishStartDate),
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
    const limit = Math.min(Math.max(limitInput ?? 20, 1), 20);
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const userJaId = session.ja_id;
    // target_kanri_kubun stores a comma-separated list of 管理者区分 codes
    // (= role_id 1〜5); empty string = 全選択 (targets every role). The
    // notice is shown when it targets everyone OR the viewer's role_id is
    // in the list. The comma-bracket trick (",3,4," LIKE "%,3,%") matches
    // whole tokens only — so role 3 never matches "13" or "30" — and works
    // on every SQL dialect (incl. pg-mem) without array functions.
    const kanriNeedle = `%,${session.role_id},%`;

    // Common filter: publish_location IN (MENU=2, MENU_DEADLINE=3),
    // status=公開, deleted_at IS NULL, within publish window,
    // ja_id NULL OR ja_id = user.ja_id, and target_kanri_kubun matches the
    // viewer's role. The two locations cover the two header slots — regular
    // menu notices (type≠4) live at MENU, the singleton 締め切り時間
    // (type=4) at MENU_DEADLINE.
    const baseQb = () => {
      const qb = this.repo
        .createQueryBuilder('o')
        .where('o.publish_location IN (:...publishLocations)', {
          publishLocations: [
            PublishLocation.MENU,
            PublishLocation.MENU_DEADLINE,
          ],
        })
        .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
        .andWhere('o.publish_start_date <= :now', { now })
        .andWhere(
          '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
          { now },
        )
        .andWhere(
          "(o.target_kanri_kubun = '' OR (',' || o.target_kanri_kubun || ',') LIKE :kanriNeedle)",
          { kanriNeedle },
        )
        .andWhere({ deletedAt: IsNull() });
      if (userJaId == null) {
        qb.andWhere('o.ja_id IS NULL');
      } else {
        qb.andWhere('(o.ja_id IS NULL OR o.ja_id = :userJaId)', { userJaId });
      }
      return qb;
    };

    // Newest-updated first; COALESCE falls back to created_at when
    // updated_at is absent (defensive — updated_at is NOT NULL today).
    const ORDER_EXPR = 'COALESCE(o.updated_at, o.created_at)';
    const [rows, deadlineRow] = await Promise.all([
      baseQb()
        .andWhere('o.oshirase_type != :deadlineType', {
          deadlineType: OshiraseType.DEADLINE,
        })
        .orderBy(ORDER_EXPR, 'DESC')
        .take(limit)
        .getMany(),
      baseQb()
        .andWhere('o.oshirase_type = :deadlineType', {
          deadlineType: OshiraseType.DEADLINE,
        })
        .orderBy(ORDER_EXPR, 'DESC')
        .take(1)
        .getOne(),
    ]);

    const toMenuItem = (r: Oshirase): MenuOshiraseItem => {
      // NEW badge: within 7 days of the last update; fall back to created_at
      // when updated_at is absent (NOT NULL today — defensive).
      const freshnessBasis = r.updatedAt ?? r.createdAt;
      return {
        oshirase_id: Number(r.oshiraseId),
        title: r.title,
        content: r.content,
        oshirase_type: r.oshiraseType,
        publish_start_date: formatDateTimeMinutesJst(r.publishStartDate),
        publish_end_date: r.publishEndDate
          ? formatDateTimeMinutesJst(r.publishEndDate)
          : null,
        is_new: now.getTime() - freshnessBasis.getTime() <= sevenDaysMs,
        ja_id: r.jaId === null ? null : Number(r.jaId),
      };
    };

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
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Default ordering (no explicit sort_by): COALESCE(updated_at, created_at)
    // DESC — most-recently-touched first, so a freshly CREATED *or* UPDATED
    // notice surfaces directly below the pinned 締め切り時間. An explicit,
    // whitelisted sort_by overrides the column (the deadline stays pinned).
    const explicitSort =
      query.sort_by !== undefined &&
      OSHIRASE_SEARCH_SORT_BY.includes(query.sort_by);
    const sortColumn = explicitSort
      ? `o.${query.sort_by}`
      : 'COALESCE(o.updated_at, o.created_at)';

    // Pin the 締め切り時間 row at the top of every page, regardless of
    // the requested sort. The boolean expression evaluates to TRUE for
    // the deadline notice → DESC puts it first. Postgres accepts the
    // bare boolean in ORDER BY. ORDER BY does NOT take TypeORM params
    // by name, so we inline `OshiraseType.DEADLINE` via a template
    // literal — typed as a number constant so the embedded value is
    // safe (no user input).
    const qb = this.repo
      .createQueryBuilder('o')
      .where({ deletedAt: IsNull() })
      .orderBy(`(o.oshirase_type = ${OshiraseType.DEADLINE})`, 'DESC')
      .addOrderBy(sortColumn, sortOrder)
      .take(perPage)
      .skip((page - 1) * perPage);

    const [rows, total] = await qb.getManyAndCount();

    // [ja-name-batch] Resolve ja_name in ONE extra query keyed by the
    // page's distinct ja_ids — avoids the N+1 a per-row lookup would
    // cause and sidesteps TypeORM 0.3.x's expression-ORDER-BY parser
    // failure with .getRawAndEntities()+leftJoin (it tried to alias
    // the literal "(o" prefix of the boolean expression above).
    const jaIds = Array.from(
      new Set(rows.map((r) => r.jaId).filter((id): id is number => id !== null)),
    );
    const jaNameById = new Map<number, string>();
    if (jaIds.length > 0) {
      const jaRows = await this.repo.manager
        .createQueryBuilder()
        .select(['j.ja_id AS ja_id', 'j.ja_name AS ja_name'])
        .from('m_ja', 'j')
        .where('j.ja_id IN (:...ids)', { ids: jaIds })
        .andWhere('j.deleted_at IS NULL')
        .getRawMany<{ ja_id: number | string; ja_name: string }>();
      for (const j of jaRows) jaNameById.set(Number(j.ja_id), j.ja_name);
    }

    const items = rows.map((row) =>
      toOshiraseListItem(
        row,
        row.jaId === null ? null : (jaNameById.get(Number(row.jaId)) ?? null),
      ),
    );
    return paginate(items, total, page, perPage);
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
    this.assertScrAdminDeps();

    // [deadline-pairing] type=4 ⇔ publish_location=3 (MENU_DEADLINE) は
    // 1:1 で対応する。FE は type=4 選択時に publish_location=3 へロック
    // するため通常到達しないが、API 直接呼び出し対策で BE 側でも検査。
    assertDeadlineLocationPairing(dto.oshirase_type, dto.publish_location);

    // [uniqueness-check] 締め切り時間 重複チェック
    // System-wide rule (顧客確認 2026-05): only ONE 締め切り時間 record
    // may exist at a time regardless of publish_location. The earlier
    // narrower form (`publish_location = MENU AND type = 4`) let users
    // create a 2nd type=4 row on a different publish_location and slip
    // through. oshirase_type is Group B (no TS enum); the constant
    // `OshiraseType.DEADLINE` documents the 締め切り時間 m_code value.
    if (dto.oshirase_type === OshiraseType.DEADLINE) {
      const exists = await this.repo.count({
        where: {
          oshiraseType: OshiraseType.DEADLINE,
          deletedAt: IsNull(),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const startDate = parseDatetimeMinutesJst(dto.publish_start_date);
    const endDate = dto.publish_end_date
      ? parseDatetimeMinutesJst(dto.publish_end_date)
      : null;
    if (!startDate) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !endDate) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    // [period-correlation-check] 表示終了日時は表示開始日時以降であること
    // （ACSMS-MSG-031-008、screen-design「開始<=終了の相関チェック」）。
    // 終了日時 NULL = 無期限 → チェック対象外。FE でも検査するが、API
    // 直接呼び出し対策で BE 側でも防御線を張る。
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw publishEndBeforeStartException();
    }

    // [past-start-check] 新規作成時は publish_start_date が現在分以降で
    // あること（顧客確認 2026-05、分精度）。FE は disabled-date /
    // disabled-time + validateForm で防御するが、BE 側でも防御線を張る。
    if (startDate.getTime() < nowMinuteFloor()) {
      throw publishStartPastException();
    }

    let saved: Oshirase | null = null;
    try {
      saved = await this.dataSource!.transaction(async (manager) => {
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
      await this.auditLog!.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(saved),
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
    this.assertScrAdminDeps();

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    // [deadline-pairing] type=4 ⇔ publish_location=3 (MENU_DEADLINE).
    // Same rule as create — applied to the incoming DTO so any change
    // also satisfies the 1:1 mapping (and API-direct callers can't slip
    // an inconsistent body through past the FE form).
    assertDeadlineLocationPairing(dto.oshirase_type, dto.publish_location);

    // 締め切り時間 重複チェック. Same system-wide uniqueness rule as
    // create — but exclude the row being edited so saving the existing
    // 締め切り時間 itself doesn't trip the check.
    if (dto.oshirase_type === OshiraseType.DEADLINE) {
      const exists = await this.repo.count({
        where: {
          oshiraseType: OshiraseType.DEADLINE,
          deletedAt: IsNull(),
          oshiraseId: Not(oshiraseId),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const newStart = parseDatetimeMinutesJst(dto.publish_start_date);
    const newEnd = dto.publish_end_date
      ? parseDatetimeMinutesJst(dto.publish_end_date)
      : null;
    if (!newStart) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !newEnd) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    // [period-correlation-check] 編集時も表示終了日時は表示開始日時以降で
    // あること（ACSMS-MSG-031-008）。終了日時 NULL = 無期限 → 対象外。
    if (newEnd && newEnd.getTime() < newStart.getTime()) {
      throw publishEndBeforeStartException();
    }

    // [past-start-check] 編集時の publish_start_date ルール（顧客確認 2026-05、分精度）:
    //   - 保存済み開始日=過去 + 値変更なし → 通す（read-only 維持）
    //   - 保存済み開始日=過去 + 値変更あり → 拒否（過去日の編集不可）
    //   - 保存済み開始日=未来 + 新値<現在 → 拒否（過去日への変更不可）
    //   - 保存済み開始日=未来 + 新値>=現在 → 通す
    //
    // [minute-precision] Form input is YYYY/MM/DD HH:mm (no seconds);
    // parseDatetimeMinutesJst always returns a Date with seconds=0.
    // The DB row, however, keeps the full timestamp from INSERT (e.g.
    // 15:44:55.303). Strict-equal `getTime()` would tag every PATCH —
    // even one that doesn't touch the field — as a change. Compare at
    // minute precision so "submit unchanged" passes through.
    const truncateToMinute = (d: Date): number => {
      const x = new Date(d);
      x.setSeconds(0, 0);
      return x.getTime();
    };
    const startChanged =
      truncateToMinute(newStart) !== truncateToMinute(existing.publishStartDate);
    const existingWasPast =
      existing.publishStartDate.getTime() < nowMinuteFloor();
    if (startChanged) {
      // 1) 保存済み開始日が過去のレコードは開始日を変更できない
      //    （FE は read-only にする。攻撃者の改竄もここで遮断）。
      // 2) 保存済み開始日が未来でも、新値が過去ならば不可。
      if (existingWasPast || newStart.getTime() < nowMinuteFloor()) {
        throw publishStartPastException();
      }
    }

    let updated: Oshirase | null = null;
    try {
      updated = await this.dataSource!.transaction(async (manager) => {
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
      await this.auditLog!.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, oshiraseId),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(updated),
      message: '更新しました。',
    };
  }

  // API-031-005 — DELETE /api/v1/oshirase/:id
  async remove(
    oshiraseId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    this.assertScrAdminDeps();

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    // [deadline-not-deletable] 締め切り時間（oshirase_type=4）は削除不可
    // （顧客確認 2026-05、1件のみ運用される締め切り時間データの取り違え／
    // 消失防止）。FE は削除リンクを無効化するが、BE 側でも遮断する。
    if (existing.oshiraseType === OshiraseType.DEADLINE) {
      throw new BadRequestException('締め切り時間のお知らせは削除できません。');
    }

    try {
      await this.dataSource!.transaction(async (manager) => {
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
      await this.auditLog!.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, oshiraseId),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }

    return { message: '削除しました。' };
  }

  /**
   * [scr031-deps-guard] Centralised runtime check for create / update /
   * remove — the 3 admin endpoints SCR-031 added on top of the SCR-001
   * public-notice service. Both `dataSource` and `auditLog` are
   * `@Optional()` so the SCR-001 unit specs can construct the service
   * with only `(repo, codeService)`; production DI always wires both.
   *
   * Returns void rather than narrowing via `asserts this is …` because
   * the latter collapses to `never` when TS tries to intersect this
   * class (private auditLog) with a public-typed override. Call this
   * at the top of every admin method; downstream sites use the `!`
   * non-null assertion to read the now-checked deps.
   */
  private assertScrAdminDeps(): void {
    if (!this.dataSource || !this.auditLog) {
      throw new Error(
        'OshiraseService.dataSource/auditLog undefined — SCR-031 endpoints require both.',
      );
    }
  }
}
