import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import {
  AuditOperation, LogType, ResultStatus } from '@/common/enums';
import { Log } from '@/database/entities/log.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx, extractAuditContext } from '@/common/utils/audit-context';
import { applyBranchScopeWithJoinAlias } from '@/common/utils/data-scope';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  formatDateTimeJst,
  parseDatetimeJst,
  timestampForFilenameJst,
} from '@/common/utils/datetime';

import type { SearchLogDto } from './dto/search-log.dto';
import type { ExportLogDto } from './dto/export-log.dto';
import { DateRangeInvalidException } from './exceptions/date-range-invalid.exception';
import { DateRangeTooLongException } from './exceptions/date-range-too-long.exception';

const SCREEN_NAME = 'ログ参照画面 (ACSMS-SCR-030)';
const TABLE_NAME = 't_log';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const CSV_HEADER = [
  'ログID',
  'ログ種別',
  '日時',
  'ユーザーID',
  'JA ID',
  '画面名',
  '操作内容',
  '結果',
  '対象ID',
  '対象テーブル',
  'IPアドレス',
];

/** Numeric column coming from pg as number-or-string, nullable. */
type NumOrStringNull = number | string | null;

// [no-labels-policy] Authenticated endpoint — `log_type_label` /
// `result_status_label` removed per `.claude/rules/nestjs.md
// §Response serialization`. FE resolves via
// `useCodesStore().label('LOG_TYPE', value)`.
export interface LogListItem {
  log_id: number;
  log_type: number;
  log_datetime: string;
  account_id: number | null;
  login_id: string | null;
  account_name: string | null;
  ja_id: number | null;
  gamen_name: string;
  operation: string;
  result_status: number;
  target_id: number | null;
  target_table: string;
  after_value: string;
  ip_address: string;
}

interface LogRawRow {
  log_id: number | string;
  log_type: number;
  log_datetime: Date | string;
  account_id: NumOrStringNull;
  login_id: string | null;
  account_name: string | null;
  ja_id: NumOrStringNull;
  gamen_name: string | null;
  operation: string | null;
  result_status: number;
  target_id: NumOrStringNull;
  target_table: string | null;
  after_value: string | null;
  ip_address: string | null;
}

interface CsvRawRow {
  log_id: number | string;
  log_type: number;
  log_datetime: Date | string;
  login_id: string | null;
  ja_id: NumOrStringNull;
  gamen_name: string | null;
  operation: string | null;
  result_status: number;
  target_id: NumOrStringNull;
  target_table: string | null;
  ip_address: string | null;
}

export interface ExportLogResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    private readonly auditLog: AuditLogService,
    @InjectDataSource() private readonly dataSource: DataSource,
    // CodeService is @Global, used here for CSV export label resolution
    // (LOG_TYPE / RESULT_STATUS). The list response itself drops *_label
    // fields per the project rule; FE resolves via useCodesStore().
    private readonly codeService: CodeService,
  ) {}

  // ─── ACSMS-API-030-001 — GET /api/v1/log ─────────────────────────
  async getLogList(
    query: SearchLogDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<LogListItem>> {
    this.assertDateRange(query.date_from, query.date_to);

    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sortBy = query.sort_by ?? 'log_datetime';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoin('m_account', 'a', 'a.account_id = l.account_id AND a.deleted_at IS NULL')
      .select([
        'l.log_id AS log_id',
        'l.log_type AS log_type',
        'l.log_datetime AS log_datetime',
        'l.account_id AS account_id',
        'a.login_id AS login_id',
        'a.account_name AS account_name',
        'l.ja_id AS ja_id',
        'l.gamen_name AS gamen_name',
        'l.operation AS operation',
        'l.result_status AS result_status',
        'l.target_id AS target_id',
        'l.target_table AS target_table',
        'l.after_value AS after_value',
        'l.ip_address AS ip_address',
      ])
      .where('1 = 1');

    this.applyScope(qb, session);
    this.applyFilters(qb, query);

    // limit/offset (NOT take/skip): take/skip only paginate getMany() entity
    // results — they are IGNORED by getRawMany(), so the page query returned
    // EVERY matching log row. countQb.getCount() is unaffected (separate
    // COUNT query), so the meta totals stay correct.
    qb.orderBy(`l.${sortBy}`, sortOrder)
      .limit(perPage)
      .offset((page - 1) * perPage);

    const countQb = this.logRepo
      .createQueryBuilder('l')
      .leftJoin('m_account', 'a', 'a.account_id = l.account_id AND a.deleted_at IS NULL')
      .where('1 = 1');
    this.applyScope(countQb, session);
    this.applyFilters(countQb, query);

    const rawRows = await qb.getRawMany<LogRawRow>();
    const total = await countQb.getCount();

    const items = rawRows.map((row) => this.mapListRow(row));
    return paginate(items, total, page, perPage);
  }

  // ─── ACSMS-API-030-002 — GET /api/v1/log/export ──────────────────
  async exportLogCsv(
    query: SearchLogDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportLogResult> {
    this.assertDateRange(query.date_from, query.date_to);

    // Export ONLY the records on the current screen page — same filters,
    // sort, page and per_page as the list query. The CSV mirrors exactly
    // what the user sees (customer request 2026-06), NOT the whole filtered
    // dataset. A page is bounded by per_page (≤100), so no export hard-cap
    // is needed.
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sortBy = query.sort_by ?? 'log_datetime';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    try {
      const qb = this.logRepo
        .createQueryBuilder('l')
        .leftJoin('m_account', 'a', 'a.account_id = l.account_id AND a.deleted_at IS NULL')
        .select([
          'l.log_id AS log_id',
          'l.log_type AS log_type',
          'l.log_datetime AS log_datetime',
          'a.login_id AS login_id',
          'l.ja_id AS ja_id',
          'l.gamen_name AS gamen_name',
          'l.operation AS operation',
          'l.result_status AS result_status',
          'l.target_id AS target_id',
          'l.target_table AS target_table',
          'l.ip_address AS ip_address',
        ])
        .where('1 = 1');
      this.applyScope(qb, session);
      this.applyFilters(qb, query);
      // limit/offset (NOT take/skip — ignored by getRawMany) → current page.
      qb.orderBy(`l.${sortBy}`, sortOrder)
        .limit(perPage)
        .offset((page - 1) * perPage);

      const rawRows = await qb.getRawMany<CsvRawRow>();
      const buffer = this.buildCsvBuffer(rawRows);
      const filename = `log_export_${timestampForFilenameJst()}.csv`;

      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: session.account_id,
        jaId: session.ja_id,
        gamenName: SCREEN_NAME,
        operation: AuditOperation.EXPORT_CSV,
        resultStatus: ResultStatus.SUCCESS,
        targetId: null,
        targetTable: TABLE_NAME,
        afterValue: JSON.stringify({
          date_from: query.date_from ?? null,
          date_to: query.date_to ?? null,
          log_type: query.log_type ?? null,
          account_id: query.account_id ?? null,
          page,
          per_page: perPage,
          record_count: rawRows.length,
        }),
        ...extractAuditContext(req),
      });

      return { buffer, filename };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.EXPORT_CSV,
        err as Error,
      );
      throw err;
    }
  }

  // ─── private helpers ─────────────────────────────────────────────

  private assertDateRange(from?: string, to?: string): void {
    if (!from || !to) return;
    const fromDate = parseDatetimeJst(from);
    const toDate = parseDatetimeJst(to);
    if (!fromDate || !toDate) return; // DTO validator already rejected malformed values
    if (fromDate.getTime() > toDate.getTime()) {
      throw new DateRangeInvalidException();
    }
    if (toDate.getTime() - fromDate.getTime() > ONE_YEAR_MS) {
      throw new DateRangeTooLongException();
    }
  }

  /**
   * DataScope for the SCR-030 ログ参照画面 list/export.
   *
   * `t_log.ja_id` (alias `l`) and `m_account.kanri_shiten_id` (alias
   * `a`, joined from `t_log.account_id`) sit on different tables — the
   * cross-alias case the generic `applyBranchScope()` doesn't cover.
   * Delegate to `applyBranchScopeWithJoinAlias()` so the role/field
   * matrix stays consistent with every other DataScope call site.
   */
  private applyScope(
    qb: SelectQueryBuilder<Log>,
    session: SessionPayload,
  ): void {
    applyBranchScopeWithJoinAlias(
      qb,
      {
        ja: { alias: 'l', field: 'ja_id' },
        kanriShiten: { alias: 'a', field: 'kanri_shiten_id' },
      },
      session,
    );
  }

  private applyFilters(
    qb: SelectQueryBuilder<Log>,
    query: SearchLogDto | ExportLogDto,
  ): void {
    if (query.date_from) {
      qb.andWhere('l.log_datetime >= :date_from', {
        date_from: parseDatetimeJst(query.date_from),
      });
    }
    if (query.date_to) {
      qb.andWhere('l.log_datetime <= :date_to', {
        date_to: parseDatetimeJst(query.date_to),
      });
    }
    if (query.log_type != null) {
      qb.andWhere('l.log_type = :log_type', { log_type: query.log_type });
    }
    if (query.account_id != null) {
      qb.andWhere('l.account_id = :account_id', { account_id: query.account_id });
    }
  }

  private mapListRow(row: LogRawRow): LogListItem {
    return {
      log_id: Number(row.log_id),
      log_type: row.log_type,
      log_datetime: formatDateTimeJst(row.log_datetime),
      account_id: row.account_id == null ? null : Number(row.account_id),
      login_id: row.login_id ?? null,
      account_name: row.account_name ?? null,
      ja_id: row.ja_id == null ? null : Number(row.ja_id),
      gamen_name: row.gamen_name ?? '',
      operation: row.operation ?? '',
      result_status: row.result_status,
      target_id: row.target_id == null ? null : Number(row.target_id),
      target_table: row.target_table ?? '',
      after_value: row.after_value ?? '',
      ip_address: row.ip_address ?? '',
    };
  }

  private buildCsvBuffer(rows: CsvRawRow[]): Buffer {
    const lines: string[] = [];
    lines.push(CSV_HEADER.map((h) => this.csvEscape(h)).join(','));
    for (const row of rows) {
      lines.push(
        [
          String(Number(row.log_id)),
          this.codeService.getLabel('LOG_TYPE', row.log_type),
          formatDateTimeJst(row.log_datetime),
          row.login_id ?? '',
          row.ja_id == null ? '' : String(Number(row.ja_id)),
          row.gamen_name ?? '',
          row.operation ?? '',
          this.codeService.getLabel('RESULT_STATUS', row.result_status),
          row.target_id == null ? '' : String(Number(row.target_id)),
          row.target_table ?? '',
          row.ip_address ?? '',
        ]
          .map((v) => this.csvEscape(v))
          .join(','),
      );
    }
    const body = lines.join('\r\n') + '\r\n';
    // UTF-8 BOM for Excel compatibility.
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body, 'utf8')]);
  }

  private csvEscape(value: string): string {
    // [csv-formula-injection] — Excel/LibreOffice evaluate a cell whose text
    // begins with = + - @ (or a leading TAB/CR) as a formula, even when the
    // field is CSV-quoted (the parser strips the quotes first). Some columns
    // (e.g. ip_address, sourced from the unvalidated X-Forwarded-For header)
    // are attacker-influenceable and land in t_log, so a later CSV export
    // opened by an admin would execute the payload (DDE / data exfiltration).
    // Neutralize by prefixing a single quote, which forces the cell to text.
    const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${neutralized.replaceAll('"', '""')}"`;
  }
}
