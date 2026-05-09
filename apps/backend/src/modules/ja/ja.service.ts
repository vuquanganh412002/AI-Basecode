import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { CreateJaDto } from './dto/create-ja.dto';
import { UpdateJaDto } from './dto/update-ja.dto';
import { JaResponseDto } from './dto/ja-response.dto';
import { SearchJaDto, type JaSearchSortBy } from './dto/search-ja.dto';
import {
  AuditLogService,
  type AuditOperationContext,
} from '../audit-log/audit-log.service';
import { CodeService } from '../code/code.service';
import {
  ConflictException,
  DuplicateCodeException,
} from '../../common/exceptions/common.exceptions';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '../../common/utils/field-restrictions';
import { extractAuditContext } from '../../common/utils/audit-context';
import { assertJaScope, applyJaScope } from '../../common/utils/data-scope';
import type { SessionPayload } from '../auth/session.service';

/** Per-screen audit-context label for SCR-004 (list / delete). */
const SCREEN_NAME_SCR004 = 'JAマスタ明細検索画面 (ACSMS-SCR-004)';

/**
 * Whitelist mapping `sort_by` → fully-qualified QueryBuilder column.
 * `@IsIn(JA_SEARCH_SORT_BY)` already rejects keys outside this map, but
 * keeping the lookup dynamic prevents SQL injection if the DTO drifts.
 * `todofuken_name` is mapped to `mj.todofuken_code` because we don't
 * carry the m_todofuken JOIN in the QB — sorting by code groups same-
 * prefecture rows reasonably.
 */
const SORT_COLUMN_MAP: Record<JaSearchSortBy, string> = {
  ja_code: 'mj.ja_code',
  ja_name: 'mj.ja_name',
  yubin_no: 'mj.yubin_no',
  todofuken_name: 'mj.todofuken_code',
  tel: 'mj.tel',
  address: 'mj.address',
  fax: 'mj.fax',
  // Default sort key — newest write (CREATE or UPDATE auto-stamps
  // updated_at) bubbles to row 1 so users see what they just changed.
  updated_at: 'mj.updated_at',
};

/**
 * Tables whose existence of a row referencing the JA blocks a delete.
 * Mirrors `docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md §4.4`.
 *
 * Some of these tables aren't yet TypeORM entities (later screens own
 * them) — using raw `dataSource.query` with a parameterised `:ja_id`
 * keeps this service self-contained until those modules ship.
 */
const RELATED_TABLES: readonly string[] = [
  'm_kanri_shiten',
  'm_shiten',
  'm_hanbaiten',
  'm_tanka',
  't_dokusya',
  'm_account',
];

/**
 * Build a NestJS `NotFoundException` whose response body carries both
 * the internal `code` (read by GlobalExceptionFilter) and the public
 * `error_code` (consumed by HTTP clients + tests). Using @nestjs/common's
 * NotFoundException keeps `instanceof` assertions in specs working.
 */
function jaNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'NOT_FOUND',
    error_code: 'NOT_FOUND',
    message: '指定されたJAが見つかりません。',
  });
}

/**
 * Field-level restriction table per `.claude/rules/security.md` §Layer 3.
 * Only roles that CAN edit a given column are listed with the allowed field set.
 * `*` means "all fields allowed". The generic filter implementation lives in
 * `common/utils/field-restrictions.ts`.
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  ja: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'biko',
    ],
    JA_HONTEN: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'biko',
    ],
  },
};

const SCREEN_NAME = 'JAマスタ登録画面 (ACSMS-SCR-005)';
const TABLE_NAME = 'm_ja';

/**
 * Build the per-request audit context for this module. Centralizes
 * SCREEN_NAME / TABLE_NAME / IP / UA so every audit call site reads
 * as one line.
 */
function buildAuditCtx(
  session: SessionPayload,
  req: Request,
  targetId: number | null,
): AuditOperationContext {
  return {
    accountId: session.account_id,
    jaId: session.ja_id,
    screen: SCREEN_NAME,
    table: TABLE_NAME,
    targetId,
    ...extractAuditContext(req),
  };
}

@Injectable()
export class JaService {
  private readonly logger = new Logger(JaService.name);

  constructor(
    @InjectRepository(Ja)
    private readonly repo: Repository<Ja>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ─── API-005-001 — GET /api/v1/ja/:ja_id ─────────────────────────────
  async findById(jaId: number, session: SessionPayload): Promise<JaResponseDto> {
    const ja = await this.repo.findOne({ where: { jaId, deletedAt: IsNull() } });
    if (!ja) throw jaNotFound();

    // §4.3 DataScope — masks out-of-scope rows as 404.
    assertJaScope(ja.jaId, session, 'JA');

    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: ja.todofukenCode },
    });

    return this.toResponse(ja, td?.todofukenName ?? '');
  }

  // ─── API-005-002 — POST /api/v1/ja ────────────────────────────────────
  async create(
    dto: CreateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    this.assertCodeValues(dto);

    // §4.3 — 都道府県コード 存在検証
    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: dto.todofuken_code },
    });
    if (!td) {
      throw new BadRequestException('都道府県コードが存在しません。');
    }

    // §4.4 — JAコード 一意性チェック
    const existing = await this.repo.findOne({
      where: { jaCode: dto.ja_code, deletedAt: IsNull() },
    });
    if (existing) {
      throw new DuplicateCodeException('JAコード', dto.ja_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const entity = manager.create(Ja, {
          jaCode: dto.ja_code,
          jaName: dto.ja_name,
          jaNameKana: dto.ja_name_kana ?? '',
          todofukenCode: dto.todofuken_code,
          chuokaiFlg: dto.chuokai_flg,
          bankCode: dto.bank_code,
          bankName: dto.bank_name,
          yubinNo: dto.yubin_no ?? '',
          address: dto.address ?? '',
          tel: dto.tel ?? '',
          fax: dto.fax ?? '',
          email: dto.email ?? '',
          tantoBusho: dto.tanto_busho ?? '',
          tantoName: dto.tanto_name ?? '',
          zeiKubun: dto.zei_kubun,
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = (await manager.save(entity)) as Ja;

        await this.auditLog.logCreate(
          buildAuditCtx(session, req, created.jaId),
          created,
        );

        return created;
      });

      const tdForResponse = await this.todofukenRepo.findOne({
        where: { todofukenCode: saved.todofukenCode },
      });
      return {
        ...this.toResponse(saved, tdForResponse?.todofukenName ?? ''),
        message: 'JAを登録しました。',
      };
    } catch (err) {
      // §4.8 — error log OUTSIDE the (rolled-back) transaction.
      await this.auditLog.logError(
        buildAuditCtx(session, req, null),
        'CREATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-005-003 — PUT /api/v1/ja/:ja_id ──────────────────────────────
  async update(
    jaId: number,
    dto: UpdateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    this.assertCodeValues(dto);

    // §4.3 — existence + DataScope check
    const before = await this.repo.findOne({
      where: { jaId, deletedAt: IsNull() },
    });
    if (!before) throw jaNotFound();
    assertJaScope(before.jaId, session, 'JA');

    // §4.4 — per-role allow-list
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'ja',
      session.role_code,
      FIELD_RESTRICTIONS,
    );

    // §4.5 — todofuken_code 存在検証 (NICHINO_ADMIN only; the allow-list
    // above drops this field for CHUOKAI/JA_HONTEN)
    if ('todofuken_code' in filtered) {
      const td = await this.todofukenRepo.findOne({
        where: { todofukenCode: filtered.todofuken_code as string },
      });
      if (!td) {
        throw new BadRequestException('都道府県コードが存在しません。');
      }
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const next = manager.create(Ja, {
          ...before,
          jaName: this.pickString(filtered, 'ja_name', before.jaName),
          jaNameKana: this.pickString(filtered, 'ja_name_kana', before.jaNameKana),
          todofukenCode: this.pickString(filtered, 'todofuken_code', before.todofukenCode),
          chuokaiFlg: this.pickBool(filtered, 'chuokai_flg', before.chuokaiFlg),
          bankCode: this.pickString(filtered, 'bank_code', before.bankCode),
          bankName: this.pickString(filtered, 'bank_name', before.bankName),
          yubinNo: this.pickString(filtered, 'yubin_no', before.yubinNo),
          address: this.pickString(filtered, 'address', before.address),
          tel: this.pickString(filtered, 'tel', before.tel),
          fax: this.pickString(filtered, 'fax', before.fax),
          email: this.pickString(filtered, 'email', before.email),
          tantoBusho: this.pickString(filtered, 'tanto_busho', before.tantoBusho),
          tantoName: this.pickString(filtered, 'tanto_name', before.tantoName),
          zeiKubun: this.pickNumber(filtered, 'zei_kubun', before.zeiKubun),
          biko: this.pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
        });
        const updated = (await manager.save(next)) as Ja;

        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, updated.jaId),
          before,
          updated,
        );

        return updated;
      });

      const tdForResponse = await this.todofukenRepo.findOne({
        where: { todofukenCode: saved.todofukenCode },
      });
      return {
        ...this.toResponse(saved, tdForResponse?.todofukenName ?? ''),
        message: 'JAを更新しました。',
      };
    } catch (err) {
      // §4.9 — error log outside the (rolled-back) transaction.
      await this.auditLog.logError(
        buildAuditCtx(session, req, jaId),
        'UPDATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-004-001 — GET /api/v1/ja ─────────────────────────────────────
  /**
   * Paginated search across `m_ja`. Applies §4.3 DataScope (NICHINO_*
   * unrestricted, CHUOKAI / JA_HONTEN see only own ja_id). `todofuken_name`
   * is hydrated from `m_todofuken` after the query rather than via JOIN to
   * keep the QueryBuilder simple — see comment on `SORT_COLUMN_MAP`.
   *
   * Read-only: does NOT write to t_log.
   */
  async findAll(
    query: SearchJaDto,
    session: SessionPayload,
  ): Promise<{
    data: Array<Pick<JaResponseDto,
      | 'ja_id' | 'ja_code' | 'ja_name' | 'yubin_no' | 'todofuken_code'
      | 'todofuken_name' | 'tel' | 'address' | 'fax' | 'chuokai_flg'>>;
    meta: { total: number; page: number; per_page: number; total_pages: number };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: JaSearchSortBy =
      (query.sort_by as JaSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('mj');

    // §4.3 base: exclude soft-deleted rows.
    qb.where('mj.deleted_at IS NULL');

    // §4.3 DataScope — restricted roles see only their own JA.
    applyJaScope(qb, 'mj', 'jaId', session);

    // §4.3 partial-match filters.
    if (query.ja_code) {
      qb.andWhere('mj.ja_code ILIKE :ja_code', { ja_code: `%${query.ja_code}%` });
    }
    if (query.ja_name) {
      qb.andWhere('mj.ja_name ILIKE :ja_name', { ja_name: `%${query.ja_name}%` });
    }

    // §4.5 sort + paginate.
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Hydrate todofuken_name in one batch lookup. m_todofuken is a small
    // reference table (47 rows) so a single find() is cheaper than a JOIN.
    const codes = Array.from(new Set(rows.map((r) => r.todofukenCode).filter(Boolean)));
    const tdRows = codes.length > 0 ? await this.todofukenRepo.find() : [];
    const tdMap = new Map(tdRows.map((t) => [t.todofukenCode, t.todofukenName]));

    const data = rows.map((mj) => ({
      ja_id: Number(mj.jaId),
      ja_code: mj.jaCode,
      ja_name: mj.jaName,
      yubin_no: mj.yubinNo,
      todofuken_code: mj.todofukenCode,
      todofuken_name: tdMap.get(mj.todofukenCode) ?? '',
      tel: mj.tel,
      address: mj.address,
      fax: mj.fax,
      chuokai_flg: mj.chuokaiFlg,
    }));

    return {
      data,
      meta: {
        total,
        page,
        per_page,
        total_pages: per_page > 0 ? Math.ceil(total / per_page) : 0,
      },
    };
  }

  // ─── API-004-002 — DELETE /api/v1/ja/:ja_id ───────────────────────────
  /**
   * Logical delete. §4.4 enforces a 6-table conflict check before
   * committing; §4.5 sets `deleted_at = NOW()`; §4.6 writes a t_log row
   * (operation='DELETE') in the same transaction; §4.8 emits an error
   * log (log_type=3) OUTSIDE the rolled-back transaction on failure.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // §4.3 — fetch the target row (also serves as the snapshot for
    // before_value in the audit log).
    const before = await this.repo.findOne({
      where: { jaId: id, deletedAt: IsNull() },
    });
    if (!before) throw jaNotFound();

    // §4.4 — block when any related table still has rows for this JA.
    await this.assertNoRelatedRows(id);

    const ctxBuilder = (): AuditOperationContext => ({
      accountId: session.account_id,
      jaId: session.ja_id,
      screen: SCREEN_NAME_SCR004,
      table: TABLE_NAME,
      targetId: id,
      ...extractAuditContext(req),
    });

    try {
      await this.dataSource.transaction(async (manager) => {
        // §4.5 logical delete — UPDATE m_ja SET deleted_at=NOW(), updated_by=:account_id
        await manager.update(
          Ja,
          { jaId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // §4.6 audit log inside the same tx so atomicity holds.
        await this.auditLog.logDelete(ctxBuilder(), before);
      });

      return { message: '正常に削除しました。' };
    } catch (err) {
      // §4.8 — error log lives OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded.
      await this.auditLog.logError(ctxBuilder(), 'DELETE', err as Error);
      throw err;
    }
  }

  /**
   * Run the §4.4 conflict checks. Raises ConflictException at the first
   * non-zero count so operators see a single, actionable message.
   * pg-mem returns counts as numeric strings — coerce defensively.
   */
  private async assertNoRelatedRows(jaId: number): Promise<void> {
    for (const table of RELATED_TABLES) {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM ${table} WHERE ja_id = $1 AND deleted_at IS NULL`,
        [jaId],
      );
      const count = Number(rows?.[0]?.count ?? 0);
      if (count > 0) {
        throw new ConflictException();
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Validate every m_code-referenced field against the cached CodeService.
   * Currently only `zei_kubun` applies (ZEI_KUBUN category).
   */
  private assertCodeValues(dto: Partial<CreateJaDto>): void {
    const errors: { field: string; message: string }[] = [];
    if (dto.zei_kubun !== undefined && !this.codeService.has('ZEI_KUBUN', dto.zei_kubun)) {
      errors.push({ field: 'zei_kubun', message: '税区分の値が不正です。' });
    }
    if (errors.length > 0) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toResponse(ja: Ja, todofukenName: string): JaResponseDto {
    return {
      ja_id: Number(ja.jaId),
      ja_code: ja.jaCode,
      ja_name: ja.jaName,
      ja_name_kana: ja.jaNameKana,
      todofuken_code: ja.todofukenCode,
      todofuken_name: todofukenName,
      chuokai_flg: ja.chuokaiFlg,
      bank_code: ja.bankCode,
      bank_name: ja.bankName,
      yubin_no: ja.yubinNo,
      address: ja.address,
      tel: ja.tel,
      fax: ja.fax,
      email: ja.email,
      tanto_busho: ja.tantoBusho,
      tanto_name: ja.tantoName,
      zei_kubun: ja.zeiKubun,
      biko: ja.biko,
      created_at: ja.createdAt ? ja.createdAt.toISOString() : '',
      updated_at: ja.updatedAt ? ja.updatedAt.toISOString() : null,
    };
  }

  private pickString(obj: Record<string, unknown>, key: string, fallback: string): string {
    return typeof obj[key] === 'string' ? (obj[key] as string) : fallback;
  }

  private pickBool(obj: Record<string, unknown>, key: string, fallback: boolean): boolean {
    return typeof obj[key] === 'boolean' ? (obj[key] as boolean) : fallback;
  }

  private pickNumber(obj: Record<string, unknown>, key: string, fallback: number): number {
    return typeof obj[key] === 'number' ? (obj[key] as number) : fallback;
  }
}
