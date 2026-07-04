import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, In, Repository } from 'typeorm';

import {
  AuditOperation,
  LogType,
  ResultStatus,
  RoleCode,
} from '@/common/enums';
import {
  ForbiddenException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { compactTimestampJst } from '@/common/utils/datetime';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { buildZipArchive } from '@/common/utils/zip';
import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { StorageService } from '@/modules/storage/storage.service';

import { FileDownloadListItemDto } from './dto/file-download-response.dto';
import { SearchFileDownloadDto } from './dto/search-file-download.dto';

const SCREEN_NAME = 'ファイルダウンロード画面 (ACSMS-SCR-022)';
const TABLE_NAME = 't_file_download';

type Numericish = number | string | null;
type Dateish = Date | string | null;

interface JoinedRow {
  file_download_id: Numericish;
  ja_id: Numericish;
  ja_code: string | null;
  ja_name: string | null;
  download_datetime: Date | string;
  download_type: Numericish;
  file_name: string;
  file_size: Numericish;
  record_count: Numericish;
  target_month: string | null;
  scheduled_delete_date: Dateish;
  nichino_download_allowed_flg: boolean;
  deleted_at: Dateish;
  created_by: string;
  created_by_name: string | null;
  created_at: Dateish;
}

interface DownloadResult {
  body: Buffer;
  contentType: string;
  contentLength: number;
  fileName: string;
}

/** 拡張子から Content-Type を導出（不明は octet-stream）。 */
function contentTypeFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

/** Date / pg-mem 文字列 → ISO 8601（+09:00）。null は null のまま。 */
function toIso(v: Dateish): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

/**
 * SCR-022 ファイルダウンロード画面のサービス。
 *
 * データソースは `t_file_download`（帳票各画面が生成時に INSERT する。本画面は
 * **読み取り + ダウンロード専用**）。ダウンロード時は t_file_download への INSERT
 * を行わず、`t_log`（log_type=4 / operation=DOWNLOAD）のみ記録する。
 */
@Injectable()
export class FileDownloadService {
  private readonly logger = new Logger(FileDownloadService.name);

  constructor(
    @InjectRepository(FileDownload)
    private readonly repo: Repository<FileDownload>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly storage: StorageService,
  ) {}

  // ── API-022-001 — GET /api/v1/file-download（一覧）─────────────────
  async findAll(
    query: SearchFileDownloadDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<FileDownloadListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by = query.sort_by ?? 'download_datetime';
    const sort_order =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const SORT_COLUMN_MAP: Record<string, string> = {
      download_datetime: 'fd.download_datetime',
      file_name: 'fd.file_name',
      file_size: 'fd.file_size',
      created_by: 'fd.created_by',
      created_by_name: 'a.account_name',
    };
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? 'fd.download_datetime';

    // DataScope — NICHINO_* は全件、JA系ロールは ja_id-or-NULL に絞る。
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    const managedJaIds: number[] =
      !isNichino && session.ja_id != null ? [Number(session.ja_id)] : [];

    let scopeClause: string;
    if (isNichino) {
      scopeClause = 'TRUE';
    } else if (managedJaIds.length === 0) {
      scopeClause = '(fd.ja_id IS NULL)';
    } else {
      scopeClause = `(fd.ja_id IS NULL OR fd.ja_id IN (${managedJaIds
        .map(Number)
        .join(',')}))`;
    }

    const wheres: string[] = [];
    const queryParams: unknown[] = [];
    if (query.file_name != null) {
      queryParams.push(query.file_name);
      wheres.push(`fd.file_name ILIKE '%' || $${queryParams.length} || '%'`);
    }
    if (query.todofuken_code != null) {
      queryParams.push(query.todofuken_code);
      wheres.push(`j.todofuken_code = $${queryParams.length}`);
    }
    if (query.ja_id != null) {
      queryParams.push(query.ja_id);
      wheres.push(`fd.ja_id = $${queryParams.length}`);
    }
    if (query.download_type != null) {
      queryParams.push(query.download_type);
      wheres.push(`fd.download_type = $${queryParams.length}`);
    }
    // 論理削除された行はダウンロードできないため一覧から除外する。
    wheres.push('fd.deleted_at IS NULL', scopeClause);
    const whereSql = wheres.join(' AND ');

    const countSql = `
      SELECT COUNT(*) AS total
        FROM t_file_download fd
        LEFT JOIN m_ja j      ON j.ja_id    = fd.ja_id      AND j.deleted_at IS NULL
        LEFT JOIN m_account a ON a.account_id::text = fd.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
    `;
    const countRows = await this.dataSource.query<Array<{ total: Numericish }>>(
      countSql,
      queryParams,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const dataSql = `
      SELECT
          fd.file_download_id,
          fd.ja_id,
          j.ja_code AS ja_code,
          j.ja_name AS ja_name,
          fd.download_datetime,
          fd.download_type,
          fd.file_name,
          fd.file_size,
          fd.record_count,
          fd.target_month,
          fd.scheduled_delete_date,
          fd.nichino_download_allowed_flg,
          fd.deleted_at,
          fd.created_by,
          a.account_name AS created_by_name,
          fd.created_at
        FROM t_file_download fd
        LEFT JOIN m_ja j      ON j.ja_id    = fd.ja_id      AND j.deleted_at IS NULL
        LEFT JOIN m_account a ON a.account_id::text = fd.created_by AND a.deleted_at IS NULL
       WHERE ${whereSql}
       ORDER BY ${orderColumn} ${sort_order}
       LIMIT ${Number(per_page)} OFFSET ${(Number(page) - 1) * Number(per_page)}
    `;
    const rawRows = await this.dataSource.query<JoinedRow[]>(dataSql, queryParams);

    const data: FileDownloadListItemDto[] = rawRows.map((r) => ({
      file_download_id: Number(r.file_download_id),
      ja_id: r.ja_id == null ? null : Number(r.ja_id),
      ja_code: r.ja_code ?? null,
      ja_name: r.ja_name ?? null,
      download_datetime: toIso(r.download_datetime) as string,
      download_type: Number(r.download_type),
      file_name: r.file_name,
      file_size: Number(r.file_size ?? 0),
      record_count: Number(r.record_count ?? 0),
      target_month: r.target_month ?? null,
      scheduled_delete_date: toIso(r.scheduled_delete_date),
      nichino_download_allowed_flg: Boolean(r.nichino_download_allowed_flg),
      deleted_at: toIso(r.deleted_at),
      created_by: r.created_by,
      created_by_name: r.created_by_name ?? null,
      created_at: toIso(r.created_at),
    }));

    return paginate(data, total, page, per_page);
  }

  // ── API-022-002 — GET /api/v1/file-download/:id/preview ────────────
  async getPreview(
    fileDownloadId: number,
    session: SessionPayload,
  ): Promise<{ data: { preview_url: string; file_name: string } }> {
    const row = await this.repo.findOne({ where: { fileDownloadId } });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session);
    this.assertNichinoDownloadAllowed(row, session);

    const previewUrl = await this.storage.getSignedUrl(row.filePath);
    return { data: { preview_url: previewUrl, file_name: row.fileName } };
  }

  // ── API-022-003 — GET /api/v1/file-download/:id/download ───────────
  async download(
    fileDownloadId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<DownloadResult> {
    const row = await this.repo.findOne({ where: { fileDownloadId } });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session);
    this.assertNichinoDownloadAllowed(row, session);

    // ストレージ取得はトランザクション外で先に行う（失敗時 t_log を残さない）。
    const body = await this.storage.download(row.filePath);
    const contentType = contentTypeFor(row.fileName);
    const fileSize =
      row.fileSize == null ? Buffer.byteLength(body) : Number(row.fileSize);

    const ctx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME,
      TABLE_NAME,
      Number(row.fileDownloadId),
    );

    // t_file_download への INSERT は行わない（帳票画面が生成時に登録済み）。
    // ダウンロード実行の証跡は t_log（log_type=4 / DOWNLOAD）のみ。
    try {
      await this.auditLog.logOperation({
        logType: LogType.FILE_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.DOWNLOAD,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: '',
        afterValue: JSON.stringify({
          file_download_id: Number(row.fileDownloadId),
          file_name: row.fileName,
          file_size: fileSize,
          ja_id: row.jaId,
        }),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    } catch (err) {
      await this.auditLog.logError(ctx, AuditOperation.DOWNLOAD, err as Error);
      throw err;
    }

    return { body, contentType, contentLength: fileSize, fileName: row.fileName };
  }

  // ── API-022-004 — POST /api/v1/file-download/download-zip ──────────
  async downloadZip(
    fileDownloadIds: number[],
    session: SessionPayload,
    req: Request,
  ): Promise<DownloadResult> {
    const rows = await this.repo.find({
      where: { fileDownloadId: In(fileDownloadIds) },
    });
    const byId = new Map(rows.map((r) => [Number(r.fileDownloadId), r]));
    const ordered: FileDownload[] = [];
    for (const id of fileDownloadIds) {
      const row = byId.get(id);
      if (!row) throw new NotFoundException('ファイル');
      this.assertScope(row, session);
      this.assertNichinoDownloadAllowed(row, session);
      ordered.push(row);
    }

    const fetched = await Promise.all(
      ordered.map(async (row) => ({
        row,
        body: await this.storage.download(row.filePath),
      })),
    );

    const zipBuffer = await buildZipArchive(
      fetched.map((f) => ({ name: f.row.fileName, body: f.body })),
    );
    const fileName = `一括ダウンロード_${compactTimestampJst()}.zip`;

    const ctx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null);
    try {
      // 一括も t_file_download への INSERT はせず、1件の t_log のみ。
      await this.auditLog.logOperation({
        logType: LogType.FILE_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.DOWNLOAD,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: '',
        afterValue: JSON.stringify({
          bulk: true,
          zip_file_name: fileName,
          file_count: fetched.length,
          file_download_ids: ordered.map((r) => Number(r.fileDownloadId)),
        }),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    } catch (err) {
      await this.auditLog.logError(ctx, AuditOperation.DOWNLOAD, err as Error);
      throw err;
    }

    return {
      body: zipBuffer,
      contentType: 'application/zip',
      contentLength: zipBuffer.length,
      fileName,
    };
  }

  /**
   * 単一行の DataScope チェック。NICHINO_* は全件許可。JA系ロールは
   * ja_id が NULL（全JA向け）または自 JA のときのみ許可、それ以外は 404
   * でマスクする（行の存在を隠す）。
   */
  private assertScope(row: FileDownload, session: SessionPayload): void {
    const role = session.role_code;
    if (role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF) {
      return;
    }
    if (row.jaId == null) return; // 全JA向けファイルは誰でも可
    if (session.ja_id != null && Number(row.jaId) === Number(session.ja_id)) {
      return;
    }
    throw new NotFoundException('ファイル');
  }

  /**
   * 日農DL許可チェック。日農（NICHINO_ADMIN=role1 / NICHINO_STAFF=role2）は
   * nichino_download_allowed_flg=false のファイルをダウンロード／プレビュー
   * できない（FE の行無効化と対になるサーバ側強制＝実際のアクセス境界）。
   * 一覧には表示される行なので、存在を隠す 404 ではなく 403 を返す。
   */
  private assertNichinoDownloadAllowed(
    row: FileDownload,
    session: SessionPayload,
  ): void {
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    if (isNichino && row.nichinoDownloadAllowedFlg === false) {
      throw new ForbiddenException(
        'このファイルは日農のダウンロードが許可されていません。',
      );
    }
  }
}
