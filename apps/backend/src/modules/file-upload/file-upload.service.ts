import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { DataSource, IsNull, Repository } from 'typeorm';

import {
  AuditOperation,
  LogType,
  ResultStatus,
  RoleCode,
} from '@/common/enums';
import {
  DataScopeViolationException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import {
  buildAuditCtx,
  extractAuditContext,
} from '@/common/utils/audit-context';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  dateOnlyIsoJst,
  todayIsoJst,
} from '@/common/utils/datetime';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { StorageService } from '@/modules/storage/storage.service';

import { SearchFileUploadDto } from './dto/search-file-upload.dto';
import {
  type FileUploadCreatedItemDto,
  type FileUploadListItemDto,
} from './dto/file-upload-response.dto';
import { FileUploadFormatException } from './exceptions/file-format-error.exception';
import { FileSizeExceededException } from './exceptions/file-size-exceeded.exception';
import { TargetJaRequiredException } from './exceptions/target-ja-required.exception';
import { FileUploadStatus } from './file-upload-status.constant';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationStatus } from './notification-status.constant';

/**
 * Subset of `Express.Multer.File` we actually consume — keeping the
 * interface local avoids requiring `@types/multer` in tsconfig.
 */
export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const SCREEN_NAME = 'ファイルダウンロード画面 (ACSMS-SCR-022)';
const SCR023_SCREEN = 'ファイルアップロード画面 (ACSMS-SCR-023)';
const TABLE_NAME = 't_file_upload';
const PREVIEW_TTL_SECONDS = 3600;
/** 削除予定日の既定オフセット（アップロード日 + N 日）。FE が値を省略した時のみ適用。 */
const DEFAULT_RETENTION_DAYS = 180;

/**
 * SCR-023 — file format check (customer review 2026-05).
 *
 * Customer tightened the originally-open policy
 * (「ファイル形式制限なし」) to a 12-extension whitelist covering
 * the practical document/media set they want to share via the
 * upload screen. Matched by lowercased trailing suffix; comparison
 * is case-insensitive so `IMG.JPG` is accepted.
 *
 * Preview support (separate scope — see SCR-022) intentionally stays
 * narrower: only PDF + JPG/JPEG/PNG render inline; everything else
 * is download-only.
 *
 * Source of truth — keep in sync with:
 *   - FE: ALLOWED_EXTENSIONS in apps/frontend/src/views/file-upload/FileUploadView.vue
 *   - Spec: screen-design.md §B.4.1 + api.md §エラー一覧 row 10
 */
const ALLOWED_EXTENSIONS = new Set([
  '.xlsx', '.xls',        // Excel
  '.pdf',                  // PDF
  '.jpg', '.jpeg', '.png', // Image
  '.doc', '.docx',         // Word
  '.pptx', '.ppt',         // PowerPoint
  '.csv',                  // CSV
  '.txt',                  // Text
  '.zip',                  // Compressed
]);

function isAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx < 0) return false;
  return ALLOWED_EXTENSIONS.has(lower.slice(dotIdx));
}

/**
 * Parse the user-selected 削除予定日 (`YYYY/MM/DD` from the FE date-picker)
 * to a calendar-date string `YYYY-MM-DD` (no time, no timezone — the
 * column is `date`). Returns null on a blank / malformed value so the
 * caller falls back to its default.
 */
function parseScheduledDeleteDate(input: string | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(input.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}


/**
 * Normalise a nullable `date` column value to `YYYY-MM-DD` (Asia/Tokyo) or
 * null. 日付整形は集約ヘルパ `dateOnlyIsoJst`（`@/common/utils/datetime`）に
 * 委譲し、ここでは nullable 列の null 契約（未設定は '' でなく null）だけ保つ。
 */
function toDateOnly(v: DateOrString): string | null {
  return v == null ? null : dateOnlyIsoJst(v) || null;
}

/** Maps a saved FileUpload entity → SCR-023 POST response item. */
function toUploadedRow(
  saved: FileUpload,
  filePath: string,
): {
  file_upload_id: number;
  ja_id: number | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  status: number;
  notification_status: number;
  upload_datetime: string;
  scheduled_delete_date: string | null;
  error_file_path: string;
} {
  return {
    file_upload_id: Number(saved.fileUploadId),
    ja_id: saved.jaId == null ? null : Number(saved.jaId),
    file_name: saved.fileName,
    file_path: filePath,
    file_size: saved.fileSize == null ? null : Number(saved.fileSize),
    status: Number(saved.status),
    notification_status: Number(saved.notificationStatus),
    upload_datetime:
      saved.uploadDatetime instanceof Date
        ? saved.uploadDatetime.toISOString()
        : new Date(saved.uploadDatetime).toISOString(),
    scheduled_delete_date: toDateOnly(saved.scheduledDeleteDate),
    error_file_path: saved.errorFilePath ?? '',
  };
}

/**
 * Number-or-stringified-number — pg-mem returns BIGINT as strings, real
 * Postgres returns them as numbers via node-postgres' typecasters.
 */
type Numericish = number | string;

/** A `date`/`timestamptz` column value as TypeORM / pg may hand it back. */
type DateOrString = Date | string | null;

/** One (jaId × file) pair staged for the DB insert after storage upload. */
interface UploadInput {
  jaId: number;
  file: UploadedMulterFile;
  filePath: string;
}

/**
 * Raw row shape returned by the list endpoint's hand-written SQL.
 * pg-style snake_case so `paginate(...)` can pass it through to the
 * response without re-mapping.
 *
 * SCR-023 extended this row with: ja_code, ja_name, success_count,
 * error_count, notification_status, scheduled_delete_date, error_file_path.
 */
interface JoinedRow {
  file_upload_id: Numericish;
  ja_id: Numericish | null;
  ja_code: string | null;
  ja_name: string | null;
  upload_datetime: Date | string;
  file_name: string;
  file_size: Numericish | null;
  record_count: Numericish | null;
  success_count: Numericish | null;
  error_count: Numericish | null;
  status: Numericish;
  notification_status: Numericish;
  notified_at: DateOrString;
  scheduled_delete_date: DateOrString;
  deleted_at: DateOrString;
  error_file_path: string;
  created_by: string;
  created_by_name: string | null;
  created_at: Date | string;
}

/**
 * Convert a Date / pg-mem string to ISO 8601 with `+09:00` offset.
 * pg-mem returns Date objects; real Postgres returns ISO strings.
 * Both flow through `new Date(v).toISOString()` cleanly.
 */
function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    @InjectRepository(FileUpload)
    private readonly repo: Repository<FileUpload>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly storage: StorageService,
    // [scr-023-optional-dep] Added by SCR-023; declared @Optional() so
    // SCR-022 spec's `new FileUploadService(repo, ds, auditLog, storage)`
    // (4-arg form) keeps compiling. SCR-023 spec passes a 5th stub.
    // Production DI injects NotificationQueueService (see module).
    //
    // [di-class-not-interface] Param type MUST be the concrete class
    // (`NotificationQueueService`), NOT the `NotificationQueue` interface
    // — NestJS DI resolves by class token (emitted by `design:paramtypes`
    // metadata), so an interface-typed param resolves to `Object` and
    // stays `undefined` at runtime, silently disabling the enqueue path.
    @Optional()
    private readonly notificationQueue?: NotificationQueueService,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // API-022-001 — GET /api/v1/file-upload (list)
  // ──────────────────────────────────────────────────────────────
  async findAll(
    query: SearchFileUploadDto,
    session: SessionPayload,
    _req: Request,
  ): Promise<PaginatedResponse<FileUploadListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by = query.sort_by ?? 'upload_datetime';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() === 'ASC'
      ? 'ASC'
      : 'DESC';
    // [sort-column-map] Translate the whitelisted sort_by to its
    // table-qualified SQL column. `created_by_name` is the JOINed
    // m_account.account_name alias (NOT a t_file_upload column), so a
    // bare `fu.<sort_by>` would be invalid SQL. The DTO @IsIn already
    // rejects unknown keys; this map is the static safety net.
    const SORT_COLUMN_MAP: Record<string, string> = {
      upload_datetime: 'fu.upload_datetime',
      file_name: 'fu.file_name',
      file_size: 'fu.file_size',
      created_by: 'fu.created_by',
      created_by_name: 'a.account_name',
    };
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? 'fu.upload_datetime';

    // DataScope role list — api.md §4.2 / §4.4. NICHINO_* bypass; the
    // 3 JA-level roles narrow by ja_id-or-NULL. CHUOKAI's "managed JAs"
    // resolution is conservative for now: own ja_id only (matches the
    // CHUOKAI seed shape — `ja_id` IS the chuokai's home JA). Future
    // SCR for cross-JA management can swap in a m_ja_chuokai lookup.
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    const managedJaIds: number[] = !isNichino && session.ja_id != null
      ? [Number(session.ja_id)]
      : [];

    // Build a single parameter map so the SQL string stays identical
    // between the COUNT and SELECT queries.
    // SCR-023 added `ja_id` (NICHINO_* JA filter) and `status` (m_code
    // FILE_UPLOAD_STATUS) — both nullable.
    const params: {
      file_name: string | null;
      todofuken_code: string | null;
      ja_id_filter: number | null;
      status_filter: number | null;
    } = {
      file_name: query.file_name ?? null,
      todofuken_code: query.todofuken_code ?? null,
      ja_id_filter: query.ja_id ?? null,
      status_filter: query.status ?? null,
    };

    let scopeClause: string;
    if (isNichino) {
      // NICHINO_ADMIN / NICHINO_STAFF — no DataScope filter (TS comment).
      // The inline SQL comment used to live in this string but pg-mem's
      // lexer choked on the U+2014 em-dash inside the `/* … */` block,
      // failing every integration test with `invalid syntax at line 12`.
      scopeClause = 'TRUE';
    } else if (managedJaIds.length === 0) {
      scopeClause = '(fu.ja_id IS NULL)';
    } else {
      scopeClause = `(fu.ja_id IS NULL OR fu.ja_id IN (${managedJaIds.map(Number).join(',')}))`;
    }

    // [dynamic-where] Build the WHERE clause from only the filters
    // that have a non-null value. The earlier `($N::text IS NULL OR
    // col = $N)` short-circuit pattern read well but tripped pg-mem's
    // "lookups on joins" limitation when the join-aliased column
    // (j.todofuken_code) appeared on the right side of an equality
    // with a null literal — every integration test failed at the
    // SELECT step. Pushing each conditional clause only when its
    // param fires also generates simpler plans against real
    // Postgres.
    // [include-soft-deleted] The list intentionally returns soft-deleted
    // rows too (screen-design 画面項目定義 No.17/18): the 削除日 column shows
    // their deleted_at and the 削除 button is disabled for them. So NO
    // `fu.deleted_at IS NULL` filter here (unlike preview/download/remove,
    // which still reject already-deleted rows).
    const wheres: string[] = [];
    const queryParams: unknown[] = [];
    if (params.file_name != null) {
      queryParams.push(params.file_name);
      wheres.push(`fu.file_name ILIKE '%' || $${queryParams.length} || '%'`);
    }
    if (params.todofuken_code != null) {
      queryParams.push(params.todofuken_code);
      wheres.push(`j.todofuken_code = $${queryParams.length}`);
    }
    if (params.ja_id_filter != null) {
      queryParams.push(params.ja_id_filter);
      wheres.push(`fu.ja_id = $${queryParams.length}`);
    }
    if (params.status_filter != null) {
      queryParams.push(params.status_filter);
      wheres.push(`fu.status = $${queryParams.length}`);
    }
    wheres.push(scopeClause);
    const whereSql = wheres.join(' AND ');

    const countSql = `
      SELECT COUNT(*) AS total
        FROM t_file_upload fu
        LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
        LEFT JOIN m_account a ON a.account_id::text = fu.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
    `;
    const countRows = await this.dataSource.query<Array<{ total: Numericish }>>(
      countSql,
      queryParams,
    );
    const total = Number(countRows[0]?.total ?? 0);

    // orderColumn comes from the SORT_COLUMN_MAP (whitelisted) so inline
    // interpolation is safe.
    // SCR-023 SELECT adds m_ja.ja_code/ja_name + 5 t_file_upload columns.
    const dataSql = `
      SELECT
          fu.file_upload_id,
          fu.ja_id,
          j.ja_code  AS ja_code,
          j.ja_name  AS ja_name,
          fu.upload_datetime,
          fu.file_name,
          fu.file_size,
          fu.record_count,
          fu.success_count,
          fu.error_count,
          fu.status,
          fu.notification_status,
          fu.notified_at,
          fu.scheduled_delete_date,
          fu.deleted_at,
          fu.error_file_path,
          fu.created_by,
          a.account_name AS created_by_name,
          fu.created_at
        FROM t_file_upload fu
        LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
        LEFT JOIN m_account a ON a.account_id::text = fu.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
       ORDER BY ${orderColumn} ${sort_order}
       LIMIT ${Number(per_page)} OFFSET ${(Number(page) - 1) * Number(per_page)}
    `;
    const rawRows = await this.dataSource.query<JoinedRow[]>(dataSql, queryParams);

    const data: FileUploadListItemDto[] = rawRows.map((r) => ({
      file_upload_id: Number(r.file_upload_id),
      ja_id: r.ja_id == null ? null : Number(r.ja_id),
      ja_code: r.ja_code,
      ja_name: r.ja_name,
      upload_datetime: toIso(r.upload_datetime),
      file_name: r.file_name,
      file_size: r.file_size == null ? null : Number(r.file_size),
      record_count: r.record_count == null ? null : Number(r.record_count),
      success_count: r.success_count == null ? null : Number(r.success_count),
      error_count: r.error_count == null ? null : Number(r.error_count),
      status: Number(r.status),
      notification_status: Number(r.notification_status),
      notified_at: r.notified_at == null ? null : toIso(r.notified_at),
      scheduled_delete_date: toDateOnly(r.scheduled_delete_date),
      deleted_at: r.deleted_at == null ? null : toIso(r.deleted_at),
      error_file_path: r.error_file_path ?? '',
      created_by: r.created_by,
      created_by_name: r.created_by_name ?? '',
      created_at: toIso(r.created_at),
    }));

    return paginate(data, total, page, per_page);
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — POST /api/v1/file-upload (multipart upload)
  // ══════════════════════════════════════════════════════════════
  async upload(
    jaIds: number[],
    files: UploadedMulterFile[],
    session: SessionPayload,
    req: Request,
    scheduledDeleteDateInput?: string,
  ): Promise<{ data: FileUploadCreatedItemDto[]; message: string }> {
    // [diag] Entry — what the service actually received post-multer.
    this.logger.log({
      event: 'file_upload.service.start',
      ja_ids: jaIds,
      file_count: Array.isArray(files) ? files.length : 0,
      login_id: session?.login_id ?? null,
      role_code: session?.role_code ?? null,
    });

    // ─── [4.1] Per-file shape validation ────────────────────────
    this.validateUploadInputs(jaIds, files);
    this.logger.log({ event: 'file_upload.validate.ok', file_count: files.length });

    // ─── [4.2] DataScope on each ja_id ──────────────────────────
    this.assertUploadScope(jaIds, session);
    this.logger.log({ event: 'file_upload.scope.ok', ja_ids: jaIds });

    // [scheduled-delete-date-guard] 削除予定日 must not be in the past.
    // Mirrors the FE date-picker's disabled-date and runs BEFORE any S3
    // upload so a bad date fails cleanly with no side effects. Compared
    // at JST day precision (Asia/Tokyo) regardless of container TZ.
    const parsedDeleteDate = parseScheduledDeleteDate(scheduledDeleteDateInput);
    if (parsedDeleteDate && parsedDeleteDate < todayIsoJst()) {
      throw new ValidationException([
        {
          field: 'scheduled_delete_date',
          message: '削除予定日は本日以降の日付を指定してください。',
        },
      ]);
    }

    // [ja-code-folder] Resolve each ja_id → ja_code so the S3 folder is
    // human-readable in the console (`ja-{ja_id}-{ja_code}`). ja_id stays
    // the leading, stable, unique key; ja_code is an immutable readability
    // suffix (update-ja OmitType drops ja_code, so the stored file_path
    // never drifts). One lookup per request.
    const jaCodeById = await this.fetchJaCodes(jaIds);

    // ─── [4.4] Physical-file upload — runs BEFORE the DB tx so a
    // storage failure doesn't leave half-committed rows. Track each
    // successful key for compensation rollback. ────────────────────
    const { uploadedKeys, inputs } = await this.uploadPhysicalFiles(
      jaIds,
      files,
      jaCodeById,
      session,
      req,
    );

    // ─── [4.5 + 4.6] INSERT t_file_upload + t_log in one tx ─────
    const savedRows: FileUpload[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const now = new Date();
        // [scheduled-delete-date] Use the 削除予定日 the user picked on the
        // screen (parsed + past-date-validated above) as a plain calendar
        // date (YYYY-MM-DD). Only fall back to アップロード日+180日 (in JST)
        // when the FE omits it. Previously this stored NOW()+180days as a
        // timestamptz and discarded the user's selection — reported bug.
        const deleteDate =
          parsedDeleteDate ??
          dateOnlyIsoJst(
            new Date(now.getTime() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
          );
        for (const { jaId, file, filePath } of inputs) {
          const entity = manager.create(FileUpload, {
            jaId,
            uploadDatetime: now,
            scheduledDeleteDate: deleteDate,
            fileName: file.originalname,
            filePath,
            fileSize: file.size,
            recordCount: null,
            successCount: null,
            errorCount: null,
            status: FileUploadStatus.PROCESSING,
            notificationStatus: NotificationStatus.NOT_SENT,
            errorFilePath: '',
            createdBy: String(session.account_id),
          });
          const saved = await manager.save(FileUpload, entity);
          this.logger.log({
            event: 'file_upload.db.insert.ok',
            file_upload_id: Number(saved.fileUploadId),
            ja_id: jaId,
            file_path: filePath,
          });
          savedRows.push(saved);

          await this.auditLog.logOperation(
            {
              logType: LogType.FILE_OPERATION,
              accountId: session.account_id,
              jaId,
              gamenName: SCR023_SCREEN,
              operation: AuditOperation.CREATE,
              resultStatus: ResultStatus.SUCCESS,
              targetId: Number(saved.fileUploadId),
              targetTable: TABLE_NAME,
              beforeValue: '',
              afterValue: JSON.stringify({
                file_upload_id: Number(saved.fileUploadId),
                ja_id: jaId,
                file_name: file.originalname,
                file_path: filePath,
                file_size: file.size,
                status: FileUploadStatus.PROCESSING,
                notification_status: NotificationStatus.NOT_SENT,
                upload_datetime: now.toISOString(),
                scheduled_delete_date: deleteDate,
                error_file_path: '',
              }),
              ...extractAuditContext(req),
            },
            manager,
          );
        }
      });
    } catch (err) {
      this.logger.error({
        event: 'file_upload.db.insert.failed',
        uploaded_keys: uploadedKeys,
        err: (err as Error).message,
        stack: (err as Error).stack,
      });
      // [compensate] DB rollback ran — clean S3 too so we don't leak
      // orphan objects. Error log lives OUTSIDE the tx (no manager).
      await this.compensateStorage(uploadedKeys);
      const errorCtx = buildAuditCtx(
        session,
        req,
        SCR023_SCREEN,
        TABLE_NAME,
        null,
      );
      await this.auditLog.logError(errorCtx, AuditOperation.CREATE, err as Error);
      throw err;
    }

    // ─── [4.7] Enqueue notification job AFTER commit — one job per
    //          saved row (== one job per JA per file). 1-job-per-JA
    //          isolates retry: SES throttle on JA-X must NOT force
    //          a retry of JA-Y's mail. Trade-off is more Redis ops,
    //          which is cheap. See review thread for context. ──────
    await this.enqueueUploadNotifications(savedRows, session);

    this.logger.log({
      event: 'file_upload.service.done',
      saved_count: savedRows.length,
      file_upload_ids: savedRows.map((r) => Number(r.fileUploadId)),
    });

    return {
      data: savedRows.map((r, idx) => toUploadedRow(r, inputs[idx].filePath)),
      message:
        'アップロードを受け付けました。通知メールはバックグラウンドで送信されます。',
    };
  }

  /**
   * [4.4] Upload every (jaId × file) to storage BEFORE the DB tx so a
   * storage failure leaves no half-committed rows. On any failure,
   * compensate (delete already-uploaded objects) + error-log, then
   * rethrow. Returns the uploaded keys (for the caller's own
   * compensation on a later DB failure) and the per-file inputs.
   */
  private async uploadPhysicalFiles(
    jaIds: number[],
    files: UploadedMulterFile[],
    jaCodeById: Map<number, string>,
    session: SessionPayload,
    req: Request,
  ): Promise<{ uploadedKeys: string[]; inputs: UploadInput[] }> {
    const uploadedKeys: string[] = [];
    const inputs: UploadInput[] = [];
    try {
      for (const jaId of jaIds) {
        const folder = this.buildJaFolder(jaId, jaCodeById.get(Number(jaId)));
        for (const file of files) {
          const filePath = `${folder}/files/${randomUUID()}-${file.originalname}`;
          this.logger.log({
            event: 'file_upload.storage.upload.start',
            ja_id: Number(jaId),
            file_path: filePath,
            mimetype: file.mimetype,
            size: file.size,
            buffer_bytes: file.buffer?.length ?? 0,
          });
          await this.storage.upload(filePath, file.buffer, file.mimetype);
          this.logger.log({
            event: 'file_upload.storage.upload.ok',
            file_path: filePath,
          });
          uploadedKeys.push(filePath);
          inputs.push({ jaId: Number(jaId), file, filePath });
        }
      }
    } catch (err) {
      this.logger.error({
        event: 'file_upload.storage.upload.failed',
        uploaded_keys: uploadedKeys,
        err: (err as Error).message,
        stack: (err as Error).stack,
      });
      await this.compensateStorage(uploadedKeys);
      const errorCtx = buildAuditCtx(session, req, SCR023_SCREEN, TABLE_NAME, null);
      await this.auditLog.logError(errorCtx, AuditOperation.CREATE, err as Error);
      throw err;
    }
    return { uploadedKeys, inputs };
  }

  /**
   * [4.7] Enqueue one notification job per saved row (== one per JA per
   * file) AFTER commit. 1-job-per-JA isolates retry: an SES throttle on
   * JA-X must NOT force a retry of JA-Y's mail. enqueue failure must NOT
   * fail the API — log and continue so a single Redis hiccup doesn't lose
   * every pending notification (row stays at notification_status=1 未送信).
   */
  private async enqueueUploadNotifications(
    savedRows: FileUpload[],
    session: SessionPayload,
  ): Promise<void> {
    if (!this.notificationQueue) return;
    for (const saved of savedRows) {
      if (saved.jaId == null) {
        // [skip-null-ja] Upload to "全JA向け" folder (ja_id NULL) has no
        // target audience for notification — SCR-023 requires jaIds[]
        // non-empty so this branch is defensive only.
        continue;
      }
      try {
        await this.notificationQueue.enqueue({
          file_upload_id: Number(saved.fileUploadId),
          ja_id: Number(saved.jaId),
          uploaded_by: session.account_id,
        });
      } catch (err) {
        this.logger.error({
          event: 'notification.enqueue.failed',
          file_upload_id: Number(saved.fileUploadId),
          ja_id: Number(saved.jaId),
          err: (err as Error).message,
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — DELETE /api/v1/file-upload/:id
  // ══════════════════════════════════════════════════════════════
  async remove(
    fileUploadId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // ─── [4.3] Existence + scope check ──────────────────────────
    const before = await this.repo.findOne({
      where: { fileUploadId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('ファイル');
    }
    this.assertScope(before, session);

    const ctx = buildAuditCtx(
      session,
      req,
      SCR023_SCREEN,
      TABLE_NAME,
      Number(before.fileUploadId),
    );

    // ─── [4.4 + 4.5] Soft delete + audit log in one tx ──────────
    let committed = false;
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(FileUpload, before.fileUploadId, {
          deletedAt: new Date(),
        });
        await this.auditLog.logOperation(
          {
            logType: LogType.FILE_OPERATION,
            accountId: ctx.accountId,
            jaId: ctx.jaId,
            gamenName: ctx.screen,
            operation: AuditOperation.DELETE,
            resultStatus: ResultStatus.SUCCESS,
            targetId: ctx.targetId,
            targetTable: ctx.table,
            beforeValue: JSON.stringify({
              file_upload_id: Number(before.fileUploadId),
              ja_id: before.jaId,
              file_name: before.fileName,
              file_path: before.filePath,
              file_size: before.fileSize,
              status: before.status,
              upload_datetime:
                before.uploadDatetime instanceof Date
                  ? before.uploadDatetime.toISOString()
                  : before.uploadDatetime,
              scheduled_delete_date: toDateOnly(before.scheduledDeleteDate),
              error_file_path: before.errorFilePath ?? '',
            }),
            afterValue: '',
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          manager,
        );
      });
      committed = true;
    } catch (err) {
      await this.auditLog.logError(ctx, AuditOperation.DELETE, err as Error);
      throw err;
    }

    // ─── [4.6] Physical delete AFTER commit — failure non-fatal ─
    if (committed) {
      try {
        await this.storage.delete(before.filePath);
      } catch (err) {
        this.logger.warn({
          event: 'storage.delete.orphan',
          file_path: before.filePath,
          err: (err as Error).message,
        });
      }
    }

    return { message: '削除しました。' };
  }

  /**
   * Resolve ja_id → ja_code for the upload folder name. Numeric ids are
   * interpolated directly (no injection risk) to sidestep pg-mem's
   * `::bigint[]` array-param quirk. Soft-deleted JAs are excluded; a
   * missing id simply has no entry and falls back to `ja-{ja_id}`.
   */
  private async fetchJaCodes(jaIds: number[]): Promise<Map<number, string>> {
    const ids = Array.from(new Set(jaIds.map(Number))).filter((n) =>
      Number.isFinite(n),
    );
    if (ids.length === 0) return new Map();
    const rows = await this.dataSource.query<
      Array<{ ja_id: number | string; ja_code: string }>
    >(
      `SELECT ja_id, ja_code FROM m_ja WHERE ja_id IN (${ids.join(',')}) AND deleted_at IS NULL`,
    );
    return new Map(rows.map((r) => [Number(r.ja_id), r.ja_code]));
  }

  /**
   * Build the per-JA storage folder: `ja-{ja_id}-{ja_code}`. ja_id leads
   * (stable unique key); ja_code is sanitized to `[A-Za-z0-9_-]` since the
   * DTO puts no charset rule on it, so an unexpected character can never
   * inject a path separator. Falls back to `ja-{ja_id}` when ja_code is
   * unknown (deleted JA / id not found / NICHINO bypass to a stray id).
   */
  private buildJaFolder(jaId: number, jaCode: string | undefined): string {
    if (!jaCode) return `ja-${Number(jaId)}`;
    const safe = jaCode.replace(/[^A-Za-z0-9_-]/g, '_');
    return safe ? `ja-${Number(jaId)}-${safe}` : `ja-${Number(jaId)}`;
  }

  /**
   * Best-effort S3 cleanup on upload failure. Iterates `uploadedKeys`
   * and absorbs per-key errors so one bad delete doesn't stop the rest.
   */
  private async compensateStorage(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (err) {
        this.logger.warn({
          event: 'storage.compensate.failed',
          key,
          err: (err as Error).message,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // SCR-023 upload — per-file shape validation (size + extension)
  // ──────────────────────────────────────────────────────────────
  private validateUploadInputs(
    jaIds: number[],
    files: UploadedMulterFile[],
  ): void {
    if (!Array.isArray(jaIds) || jaIds.length === 0) {
      throw new TargetJaRequiredException();
    }
    for (const f of files) {
      // [size-cap] 30MB per file — screen-design.md 機能定義 4.2.
      // (Earlier api.md said 10MB; customer spec wins.)
      if (f.size > 30 * 1024 * 1024) {
        throw new FileSizeExceededException();
      }
      if (!isAllowedExtension(f.originalname)) {
        throw new FileUploadFormatException();
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // SCR-023 upload — DataScope on each ja_id
  // ──────────────────────────────────────────────────────────────
  private assertUploadScope(
    jaIds: number[],
    session: SessionPayload,
  ): void {
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    if (isNichino) return;
    const allowed = session.ja_id == null ? [] : [Number(session.ja_id)];
    const outOfScope = jaIds.find((id) => !allowed.includes(Number(id)));
    if (outOfScope !== undefined) {
      // [cross-tenant-data-scope] Customer decision 2026-05-19 (see
      // .claude/rules/security.md Layer 4): cross-tenant access must
      // throw DATA_SCOPE_VIOLATION (HTTP 403), not generic FORBIDDEN.
      // Same explicit-403 trade-off as fetchFkInJa() — UX clarity over
      // tenant-id enumeration hardening.
      throw new DataScopeViolationException();
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Internal — DataScope assertion (existence-hiding via 404)
  // ──────────────────────────────────────────────────────────────
  private assertScope(row: FileUpload, session: SessionPayload): void {
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    // Global files (ja_id IS NULL) are visible to every role per
    // api.md §4.2.
    if (row.jaId == null) return;
    if (isNichino) return;
    // CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN — own JA only (managed-JA
    // resolution simplified to session.ja_id; see findAll comment).
    if (session.ja_id != null && Number(row.jaId) === Number(session.ja_id)) {
      return;
    }
    throw new NotFoundException('ファイル');
  }
}

