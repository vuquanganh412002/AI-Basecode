import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { DataSource, IsNull, Repository } from 'typeorm';

import { LogType, ResultStatus, RoleCode } from '@/common/enums';
import {
  DataScopeViolationException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { FileDownload } from '@/database/entities/file-download.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { StorageService } from '@/modules/storage/storage.service';

import { SearchFileUploadDto } from './dto/search-file-upload.dto';
import {
  type FileUploadCreatedItemDto,
  type FileUploadListItemDto,
  type FilePreviewResponseDto,
} from './dto/file-upload-response.dto';
import { FileUploadFormatException } from './exceptions/file-format-error.exception';
import { FileSizeExceededException } from './exceptions/file-size-exceeded.exception';
import { TargetJaRequiredException } from './exceptions/target-ja-required.exception';
import { NotificationQueueService } from './notification-queue.service';

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
  function scheduledDeleteDateIso(): string | null {
    if (saved.scheduledDeleteDate == null) return null;
    if (saved.scheduledDeleteDate instanceof Date) {
      return saved.scheduledDeleteDate.toISOString();
    }
    return new Date(saved.scheduledDeleteDate).toISOString();
  }

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
    scheduled_delete_date: scheduledDeleteDateIso(),
    error_file_path: saved.errorFilePath ?? '',
  };
}

/**
 * Number-or-stringified-number — pg-mem returns BIGINT as strings, real
 * Postgres returns them as numbers via node-postgres' typecasters.
 */
type Numericish = number | string;

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
  notified_at: Date | string | null;
  scheduled_delete_date: Date | string | null;
  error_file_path: string;
  created_by: string;
  created_by_name: string | null;
  created_at: Date | string;
}

/**
 * Self-documenting const for the 5 `download_type` values
 * (`m_code.code_category='DOWNLOAD_TYPE'` per seeder.md §5.19).
 *
 * DOWNLOAD_TYPE is Group B (customer-extensible — no TS enum), but
 * `classifyDownloadType` branches on these values, so we declare a
 * named const here to replace the bare 1/2/3/4/5 literals. Same Group-B
 * named-const pattern as `ITAKU_KUBUN_FURIKOMI` (hanbaiten.service.ts).
 * (OSHIRASE_TYPE was previously similar but has since been promoted to
 * Group A — see `@/common/enums/oshirase-type.enum.ts`.)
 *
 * Sync requirement: if the customer renames a label via the m_code
 * admin screen the customer-visible string flips immediately (no
 * deploy). But adding / removing a VALUE here requires a code change
 * — the classifier above maps filename patterns to one specific value
 * each.
 */
const DOWNLOAD_TYPE = {
  /** 口座振替 — Zengin / OA-連動 CSV files. */
  KOUZA_FURIKAE: 1,
  /** その他 — fallback when no filename pattern matches. */
  OTHER: 2,
  /** 増減連絡票 — 販売店宛て増減レポート. */
  ZOUGEN_RENRAKU: 3,
  /** 増減通知書 — 日本農業新聞宛て増減通知. */
  ZOUGEN_TSUCHI: 4,
  /** 購読者名簿 — 販売店 / 管理支店別の名簿出力. */
  MEIBO: 5,
} as const;

/**
 * `download_type` classifier per api.md §4.5. Priority-ordered — first
 * match wins; default = OTHER. Keep this list in sync with
 * `m_code.code_category='DOWNLOAD_TYPE'`.
 */
function classifyDownloadType(fileName: string): number {
  if (fileName.includes('kouza_furikae')) return DOWNLOAD_TYPE.KOUZA_FURIKAE;
  if (fileName.includes('zougen_renraku')) return DOWNLOAD_TYPE.ZOUGEN_RENRAKU;
  if (fileName.includes('zougen_tsuchi')) return DOWNLOAD_TYPE.ZOUGEN_TSUCHI;
  if (fileName.includes('meibo')) return DOWNLOAD_TYPE.MEIBO;
  return DOWNLOAD_TYPE.OTHER;
}

/**
 * MIME type by extension — kept narrow on purpose (api.md §4.4
 * enumerates only PDF / CSV / XLSX). Everything else falls back to
 * `application/octet-stream` which makes browsers force a download
 * rather than guess.
 */
function contentTypeFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

/**
 * Convert a Date / pg-mem string to ISO 8601 with `+09:00` offset.
 * pg-mem returns Date objects; real Postgres returns ISO strings.
 * Both flow through `new Date(v).toISOString()` cleanly.
 */
function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

interface DownloadResult {
  body: Buffer;
  contentType: string;
  contentLength: number;
  fileName: string;
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
    const wheres: string[] = ['fu.deleted_at IS NULL'];
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
        LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
    `;
    const countRows = await this.dataSource.query<Array<{ total: Numericish }>>(
      countSql,
      queryParams,
    );
    const total = Number(countRows[0]?.total ?? 0);

    // sort_by is whitelisted by the DTO so inline interpolation is safe.
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
          fu.error_file_path,
          fu.created_by,
          a.account_name AS created_by_name,
          fu.created_at
        FROM t_file_upload fu
        LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
        LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
       ORDER BY fu.${sort_by} ${sort_order}
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
      scheduled_delete_date: r.scheduled_delete_date == null
        ? null
        : toIso(r.scheduled_delete_date),
      error_file_path: r.error_file_path ?? '',
      created_by: r.created_by,
      created_by_name: r.created_by_name ?? '',
      created_at: toIso(r.created_at),
    }));

    return paginate(data, total, page, per_page);
  }

  // ──────────────────────────────────────────────────────────────
  // API-022-002 — GET /api/v1/file-upload/:id/preview
  // ──────────────────────────────────────────────────────────────
  async getPreview(
    fileUploadId: number,
    session: SessionPayload,
    _req: Request,
  ): Promise<{ data: FilePreviewResponseDto }> {
    const row = await this.repo.findOne({
      where: { fileUploadId, deletedAt: IsNull() },
    });
    if (!row) {
      throw new NotFoundException('ファイル');
    }
    this.assertScope(row, session);

    const preview_url = await this.storage.getSignedUrl(
      row.filePath,
      PREVIEW_TTL_SECONDS,
    );
    const expires_at = new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000).toISOString();

    return {
      data: {
        file_upload_id: Number(row.fileUploadId),
        file_name: row.fileName,
        file_size: row.fileSize == null ? null : Number(row.fileSize),
        content_type: contentTypeFor(row.fileName),
        preview_url,
        expires_at,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // API-022-003 — GET /api/v1/file-upload/:id/download
  // ──────────────────────────────────────────────────────────────
  async download(
    fileUploadId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<DownloadResult> {
    const row = await this.repo.findOne({
      where: { fileUploadId, deletedAt: IsNull() },
    });
    if (!row) {
      throw new NotFoundException('ファイル');
    }
    this.assertScope(row, session);

    // Stream from object storage BEFORE opening the transaction. If the
    // S3 fetch fails we want a clean HTTP 500 with no DB side-effects
    // (no t_file_download row, no t_log row).
    const body = await this.storage.download(row.filePath);
    const contentType = contentTypeFor(row.fileName);
    const fileSize = row.fileSize == null ? Buffer.byteLength(body) : Number(row.fileSize);

    const ctx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME,
      TABLE_NAME,
      Number(row.fileUploadId),
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        // §4.5 — t_file_download history
        const downloadType = classifyDownloadType(row.fileName);
        const targetMonth = extractTargetMonth(row.fileName);
        const fileDownload = manager.create(FileDownload, {
          jaId: session.ja_id ?? null,
          downloadDatetime: new Date(),
          downloadType,
          fileName: row.fileName,
          filePath: row.filePath,
          fileSize,
          recordCount: row.recordCount == null ? 0 : Number(row.recordCount),
          targetMonth,
          createdBy: session.login_id,
        });
        const savedDownload = await manager.save(FileDownload, fileDownload);

        // §4.6 — operation log (log_type=4, operation='DOWNLOAD'). We
        // use logOperation directly because logCreate hard-codes
        // log_type=1 / operation='CREATE'.
        await this.auditLog.logOperation(
          {
            logType: LogType.FILE_OPERATION,
            accountId: ctx.accountId,
            jaId: ctx.jaId,
            gamenName: ctx.screen,
            operation: 'DOWNLOAD',
            resultStatus: ResultStatus.SUCCESS,
            targetId: ctx.targetId,
            targetTable: ctx.table,
            beforeValue: '',
            afterValue: JSON.stringify({
              file_upload_id: Number(row.fileUploadId),
              file_download_id: Number(savedDownload.fileDownloadId),
              file_name: row.fileName,
              file_size: fileSize,
              ja_id: row.jaId,
            }),
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          manager,
        );
      });
    } catch (err) {
      // Error log lives OUTSIDE the rolled-back transaction so the
      // failure trace persists. Never pass `manager` here.
      await this.auditLog.logError(ctx, 'DOWNLOAD', err as Error);
      throw err;
    }

    return { body, contentType, contentLength: fileSize, fileName: row.fileName };
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — POST /api/v1/file-upload (multipart upload)
  // ══════════════════════════════════════════════════════════════
  async upload(
    jaIds: number[],
    files: UploadedMulterFile[],
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: FileUploadCreatedItemDto[]; message: string }> {
    // ─── [4.1] Per-file shape validation ────────────────────────
    this.validateUploadInputs(jaIds, files);

    // ─── [4.2] DataScope on each ja_id ──────────────────────────
    this.assertUploadScope(jaIds, session);

    // ─── [4.4] Physical-file upload — runs BEFORE the DB tx so a
    // storage failure doesn't leave half-committed rows. Track each
    // successful key for compensation rollback. ────────────────────
    const uploadedKeys: string[] = [];
    const inputs: Array<{
      jaId: number;
      file: UploadedMulterFile;
      filePath: string;
    }> = [];

    try {
      for (const jaId of jaIds) {
        for (const file of files) {
          const filePath = `ja-${jaId}/files/${randomUUID()}-${file.originalname}`;
          await this.storage.upload(filePath, file.buffer, file.mimetype);
          uploadedKeys.push(filePath);
          inputs.push({ jaId: Number(jaId), file, filePath });
        }
      }
    } catch (err) {
      await this.compensateStorage(uploadedKeys);
      const errorCtx = buildAuditCtx(
        session,
        req,
        SCR023_SCREEN,
        TABLE_NAME,
        null,
      );
      await this.auditLog.logError(errorCtx, 'CREATE', err as Error);
      throw err;
    }

    // ─── [4.5 + 4.6] INSERT t_file_upload + t_log in one tx ─────
    const savedRows: FileUpload[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const now = new Date();
        const deleteDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
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
            status: 1,
            notificationStatus: 1,
            errorFilePath: '',
            createdBy: session.login_id,
          });
          const saved = await manager.save(FileUpload, entity);
          savedRows.push(saved);

          await this.auditLog.logOperation(
            {
              logType: LogType.FILE_OPERATION,
              accountId: session.account_id,
              jaId,
              gamenName: SCR023_SCREEN,
              operation: 'CREATE',
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
                status: 1,
                notification_status: 1,
                upload_datetime: now.toISOString(),
                scheduled_delete_date: deleteDate.toISOString(),
                error_file_path: '',
              }),
              ipAddress: String(req.ip ?? ''),
              userAgent: String(req.headers?.['user-agent'] ?? ''),
            },
            manager,
          );
        }
      });
    } catch (err) {
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
      await this.auditLog.logError(errorCtx, 'CREATE', err as Error);
      throw err;
    }

    // ─── [4.7] Enqueue notification job AFTER commit — one job per
    //          saved row (== one job per JA per file). 1-job-per-JA
    //          isolates retry: SES throttle on JA-X must NOT force
    //          a retry of JA-Y's mail. Trade-off is more Redis ops,
    //          which is cheap. See review thread for context. ──────
    if (this.notificationQueue) {
      for (const saved of savedRows) {
        if (saved.jaId == null) {
          // [skip-null-ja] Upload to "全JA向け" folder (ja_id NULL)
          // doesn't have a target audience for notification — skip.
          // Real-world: SCR-023 upload requires jaIds[] non-empty so
          // this branch is defensive only.
          continue;
        }
        try {
          await this.notificationQueue.enqueue({
            file_upload_id: Number(saved.fileUploadId),
            ja_id: Number(saved.jaId),
            uploaded_by: session.account_id,
          });
        } catch (err) {
          // enqueue failure must NOT fail the API — just log it. Row
          // stays at notification_status=1 (未送信); a manual resend
          // or recovery job is the operator path. Continue with the
          // other rows so a single Redis hiccup doesn't lose every
          // pending notification.
          this.logger.error({
            event: 'notification.enqueue.failed',
            file_upload_id: Number(saved.fileUploadId),
            ja_id: Number(saved.jaId),
            err: (err as Error).message,
          });
        }
      }
    }

    return {
      data: savedRows.map((r, idx) => toUploadedRow(r, inputs[idx].filePath)),
      message:
        'アップロードを受け付けました。通知メールはバックグラウンドで送信されます。',
    };
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
            operation: 'DELETE',
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
              scheduled_delete_date:
                before.scheduledDeleteDate instanceof Date
                  ? before.scheduledDeleteDate.toISOString()
                  : before.scheduledDeleteDate,
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
      await this.auditLog.logError(ctx, 'DELETE', err as Error);
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

/**
 * Best-effort YYYYMM extraction from the file name. Returns empty
 * string when no 6-digit run is found (`t_file_download.target_month`
 * is nullable + DEFAULT '').
 */
function extractTargetMonth(fileName: string): string {
  const m = /(20\d{2})(0[1-9]|1[0-2])/.exec(fileName);
  return m ? `${m[1]}${m[2]}` : '';
}
