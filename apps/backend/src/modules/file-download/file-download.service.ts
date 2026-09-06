import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, In, IsNull, Repository } from 'typeorm';

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
import { ScreenName } from '@/common/constants/screen-name.constant';
import { FILE_DOWNLOAD_TARGET_TABLE } from '@/common/constants/audit-target-table.constant';
import {
  contentTypeFor,
  type DownloadResult,
} from '@/common/utils/file-delivery';
import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { StorageService } from '@/modules/storage/storage.service';

import { FileDownloadListItemDto } from './dto/file-download-response.dto';
import { SearchFileDownloadDto } from './dto/search-file-download.dto';


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

/** Date / pg-mem 文字列 → ISO 8601（+09:00）。null は null のまま。 */
function toIso(v: Dateish): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

/**
 * 中央会(CHUOKAI)の都道府県スコープ用コード。対象外ロール・未設定なら null。
 *
 * 中央会は「自JAのみ」ではなく **同一都道府県の全JA** のファイルを閲覧できる
 * （顧客要件 2026-07）。突合は `m_account.todofuken_code` ⇔ `m_ja.todofuken_code`。
 *
 * 中央会に限定する理由: JA本店・JA管理支店も todofuken_code を持つが、DataScope は
 * 従来どおり自JA（さらに支店）に閉じる必要がある。todofuken_code の有無だけで
 * 判定すると、それらのロールまで県内全JAへ広がってしまう。
 *
 * デプロイ前に発行された既存セッションは本項目を持たない → null を返し、
 * 呼び出し側は従来の自JAスコープにフォールバックする（安全側）。
 */
function chuokaiTodofukenCode(session: SessionPayload): string | null {
  if (session.role_code !== RoleCode.CHUOKAI) return null;
  const code = (session.todofuken_code ?? '').trim();
  return code === '' ? null : code;
}

/**
 * ログイン中のアカウントが自分で出力したファイルか。
 *
 * `created_by` は varchar(50) に account_id を文字列で保持する（一覧 SQL も
 * `m_account.account_id::text = fd.created_by` で突合）。数値と文字列の比較に
 * ならないよう両辺を trim 済み文字列に揃える。空・未設定は「本人でない」扱い。
 */
function isCreatedBySelf(
  row: FileDownload,
  session: SessionPayload,
): boolean {
  const createdBy = (row.createdBy ?? '').trim();
  if (createdBy === '') return false;
  return createdBy === String(session.account_id ?? '').trim();
}

/**
 * ACSMS-SCR-022 ファイルダウンロード画面サービス。データソースは `t_file_download`
 * (帳票各画面が生成時 INSERT。本画面は読取 + DL 専用)。DL 時は INSERT せず
 * `t_log`(log_type=4 / operation=DOWNLOAD)のみ記録。
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

  // ── ACSMS-API-022-001 — GET /api/v1/file-download（一覧）─────────────────
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

    // DataScope — NICHINO_* は全件、中央会は同一都道府県の全JA、他のJA系ロールは
    // ja_id-or-NULL に絞る。全JA向けファイル(ja_id IS NULL)はどのロールでも可視。
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    const managedJaIds: number[] =
      !isNichino && session.ja_id != null ? [Number(session.ja_id)] : [];

    const wheres: string[] = [];
    const queryParams: unknown[] = [];

    let scopeClause: string;
    if (isNichino) {
      scopeClause = 'TRUE';
    } else if (chuokaiTodofukenCode(session) != null) {
      // 中央会は自県内の全JAのファイルを閲覧できる（顧客要件 2026-07）。
      // 実際にDLできるかは nichino_download_allowed_flg 次第（別チェック）。
      queryParams.push(chuokaiTodofukenCode(session));
      scopeClause = `(fd.ja_id IS NULL OR j.todofuken_code = $${queryParams.length})`;
    } else if (managedJaIds.length === 0) {
      scopeClause = '(fd.ja_id IS NULL)';
    } else {
      scopeClause = `(fd.ja_id IS NULL OR fd.ja_id IN (${managedJaIds
        .map(Number)
        .join(',')}))`;
    }

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
    const row = await this.repo.findOne({
      where: { fileDownloadId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session, await this.resolveAllowedJaIds(session));
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
    const row = await this.repo.findOne({
      where: { fileDownloadId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session, await this.resolveAllowedJaIds(session));
    this.assertNichinoDownloadAllowed(row, session);

    // ストレージ取得はトランザクション外で先に行う（失敗時 t_log を残さない）。
    const body = await this.storage.download(row.filePath);
    const contentType = contentTypeFor(row.fileName);
    const fileSize =
      row.fileSize == null ? Buffer.byteLength(body) : Number(row.fileSize);

    const ctx = buildAuditCtx(
      session,
      req,
      ScreenName.ACSMS_SCR_022,
      FILE_DOWNLOAD_TARGET_TABLE,
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
      where: { fileDownloadId: In(fileDownloadIds), deletedAt: IsNull() },
    });
    const byId = new Map(rows.map((r) => [Number(r.fileDownloadId), r]));
    // スコープ集合はループ前に1回だけ解決（行ごとに引くと N+1 になる）。
    const allowedJaIds = await this.resolveAllowedJaIds(session);
    const ordered: FileDownload[] = [];
    for (const id of fileDownloadIds) {
      const row = byId.get(id);
      if (!row) throw new NotFoundException('ファイル');
      this.assertScope(row, session, allowedJaIds);
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

    const ctx = buildAuditCtx(session, req, ScreenName.ACSMS_SCR_022, FILE_DOWNLOAD_TARGET_TABLE, null);
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
   * 単一行 DataScope チェック。NICHINO_* は全件許可。JA系は ja_id が NULL(全JA向け)
   * か自 JA のみ許可、他は存在秘匿のため 404。
   */
  private assertScope(
    row: FileDownload,
    session: SessionPayload,
    /** {@link resolveAllowedJaIds} の結果。null = 制限なし（NICHINO_*）。 */
    allowedJaIds: Set<number> | null,
  ): void {
    if (allowedJaIds === null) return; // NICHINO_* は全件
    if (row.jaId == null) return; // 全JA向けファイルは誰でも可
    if (allowedJaIds.has(Number(row.jaId))) return;
    throw new NotFoundException('ファイル');
  }

  /**
   * このセッションが閲覧できる ja_id 集合。`null` は制限なし（NICHINO_*）。
   *
   * - NICHINO_ADMIN / NICHINO_STAFF … null（全件）
   * - CHUOKAI かつ todofuken_code あり … 同一都道府県の全JA（顧客要件 2026-07）
   * - その他のJA系ロール … 自JAのみ（従来どおり）
   *
   * 一覧の scopeClause と同じ規則をここでも表現する（一覧に出た行は個別 DL でも
   * 通る、が不変条件）。呼び出しごとに1回だけ解決し、複数DLのループでは使い回して
   * N+1 を避ける。ja_id が NULL の「全JA向け」ファイルは集合に関係なく可視。
   */
  private async resolveAllowedJaIds(
    session: SessionPayload,
  ): Promise<Set<number> | null> {
    const role = session.role_code;
    if (role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF) {
      return null;
    }
    const todofuken = chuokaiTodofukenCode(session);
    if (todofuken != null) {
      const rows: { ja_id: string }[] = await this.dataSource.query(
        `SELECT ja_id FROM m_ja WHERE todofuken_code = $1 AND deleted_at IS NULL`,
        [todofuken],
      );
      return new Set(rows.map((r) => Number(r.ja_id)));
    }
    return session.ja_id != null ? new Set([Number(session.ja_id)]) : new Set();
  }

  /**
   * 日農DL許可チェック。対象ロールは nichino_download_allowed_flg=false のファイルを
   * DL/プレビュー不可（FE の行無効化と対のサーバ側強制＝実際の境界）。一覧表示行なので
   * 404 でなく 403。対象ロール（顧客要件）: 日農(NICHINO_ADMIN/STAFF) + 中央会(CHUOKAI)。
   *
   * ただし **自分が作成したファイルは常に DL 可**（顧客要件 2026-07）。本フラグは
   * 「他組織（日農・中央会）に自組織のファイルを見せてよいか」を JA 側が決めるもので、
   * 出力した本人まで締め出す意図はない。既定 FALSE のため、この例外が無いと
   * 中央会が自分で出力した帳票をその場でダウンロードできない。
   *
   * 突合は t_file_download.created_by（account_id を varchar で保持。一覧 SQL の
   * `m_account.account_id::text = fd.created_by` と同じ前提）。
   */
  private assertNichinoDownloadAllowed(
    row: FileDownload,
    session: SessionPayload,
  ): void {
    const role = session.role_code;
    const isDlRestrictedRole =
      role === RoleCode.NICHINO_ADMIN ||
      role === RoleCode.NICHINO_STAFF ||
      role === RoleCode.CHUOKAI;
    if (!isDlRestrictedRole) return;
    if (isCreatedBySelf(row, session)) return;
    if (row.nichinoDownloadAllowedFlg === false) {
      throw new ForbiddenException(
        'このファイルは日農のダウンロードが許可されていません。',
      );
    }
  }
}
