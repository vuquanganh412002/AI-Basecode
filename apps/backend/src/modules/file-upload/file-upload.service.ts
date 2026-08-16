import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import {
  AuditOperation,
  DownloadType,
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
  compactTimestampJst,
  dateOnlyIsoJst,
  todayIsoJst,
} from '@/common/utils/datetime';
import { buildZipArchive } from '@/common/utils/zip';
import {
  contentTypeFor,
  type DownloadResult,
} from '@/common/utils/file-delivery';
import { FileUploadStatus } from '@/common/constants/file-upload-status.constant';
import { NotificationStatus } from '@/common/constants/notification-status.constant';
import { FileDownload } from '@/database/entities/file-download.entity';
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
import { matchesDeclaredFileType } from './file-signature';
import { NotificationQueueService } from './notification-queue.service';

/** 使用する `Express.Multer.File` の部分集合。`@types/multer` 依存回避のためローカル定義。 */
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
/** ペア登録する `t_file_download` の表名（監査ログ・ログ出力用）。 */
const DOWNLOAD_TABLE_NAME = 't_file_download';
/**
 * アップロードされたファイルは帳票ではないので出力種別は「その他」で登録する
 * （`m_code.DOWNLOAD_TYPE` に「アップロード」区分は無い）。
 */
const UPLOAD_DOWNLOAD_TYPE = DownloadType.OTHER;
/**
 * ペア行の `nichino_download_allowed_flg`。アップロードは日農↔JA 間の受け渡しが
 * 目的で、日農・中央会が自分で上げたファイルを取り直せないと運用が回らないため
 * 常に true（顧客要件 2026-08）。帳票出力(ACSMS-SCR-021/026/028/029)は画面ごとに
 * 固定 or 選択なので、この既定は本画面限定。
 */
const UPLOAD_NICHINO_DOWNLOAD_ALLOWED = true;
/** ペア行の `record_count`（NOT NULL）。アップロードは明細を持たないので 0。 */
const UPLOAD_RECORD_COUNT = 0;

/**
 * ACSMS-SCR-023 ファイルサイズ上限（1ファイルあたり）。screen-design.md 機能定義 4.2 /
 * ACSMS-MSG-023-002 / api.md §エラー一覧 row 9 で規定される 30MB。
 * 同期対象: FE MAX_FILE_SIZE (apps/frontend/src/views/file-upload/FileUploadView.vue)。
 * export — file-upload.controller.ts の `FilesInterceptor` limits にも同値を渡す
 * ため（Multer 側の上限とサービス側の業務チェックが食い違うと、コントローラは
 * 通すのにサービスが弾く／その逆という分かりにくいエラーになる）。
 */
export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

/**
 * ACSMS-SCR-023 ファイル形式チェック（顧客レビュー 2026-05）。
 * 当初「制限なし」を 12 拡張子ホワイトリストに厳格化。末尾拡張子を小文字化して照合（大小無視）。
 * プレビュー対応（別スコープ ACSMS-SCR-022）は PDF + JPG/JPEG/PNG のみインライン、他は DL のみ。
 * 同期対象: FE ALLOWED_EXTENSIONS (apps/frontend/src/views/file-upload/FileUploadView.vue) /
 * screen-design.md §B.4.1 + api.md §エラー一覧 row 10。
 */
const ALLOWED_EXTENSIONS = new Set([
  '.xlsx', '.xls',
  '.pdf',
  '.jpg', '.jpeg', '.png',
  '.doc', '.docx',
  '.pptx', '.ppt',
  '.csv',
  '.txt',
  '.zip',
]);

function isAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx < 0) return false;
  return ALLOWED_EXTENSIONS.has(lower.slice(dotIdx));
}

/**
 * アップロードファイル名を S3/MinIO キーへ安全に埋め込むためサニタイズする。
 * `/` `\` を許すと `../../ja-9-OTHERJA/files/evil.pdf` のような originalname で
 * `ja-{id}-{code}/files/` プレフィックスの外へキーが広がる — filesystem-backed
 * MinIO（本プロジェクトの dev/stg 環境）では実際のパストラバーサルになる。
 * 表示用の originalname（DB 保存・Content-Disposition・画面表示）はそのまま
 * 保持し、S3 キー生成の直前にだけ適用する（buildJaFolder の ja_code
 * サニタイズと同じ考え方）。
 */
function sanitizeFileNameForKey(fileName: string): string {
  return fileName.replace(/[/\\]/g, '_');
}

/**
 * 削除予定日（FE date-picker の `YYYY/MM/DD`）を `date` 列用の `YYYY-MM-DD` へ。
 * 空/不正は null → 呼び出し側で既定へフォールバック。
 */
function parseScheduledDeleteDate(input: string | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(input.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}


/**
 * nullable `date` 列を `YYYY-MM-DD`(Asia/Tokyo) か null へ。整形は `dateOnlyIsoJst`
 * に委譲し、ここでは null 契約（未設定は '' でなく null）だけ保つ。
 */
function toDateOnly(v: DateOrString): string | null {
  return v == null ? null : dateOnlyIsoJst(v) || null;
}

/** 保存済み FileUpload → SCR-023 POST レスポンス項目。 */
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

/** 数値/数値文字列 — pg-mem は BIGINT を文字列、実 Postgres は数値で返す。 */
type Numericish = number | string;

/** TypeORM/pg が返す `date`/`timestamptz` 列値。 */
type DateOrString = Date | string | null;

/** storage アップロード後の DB insert 用にステージした (jaId × file) 対。 */
interface UploadInput {
  jaId: number;
  file: UploadedMulterFile;
  filePath: string;
}

/**
 * list エンドポイントの手書き SQL が返す生行。`paginate(...)` が再マップ不要で
 * 通せるよう pg-style snake_case。SCR-023 で ja_code/ja_name/success_count/
 * error_count/notification_status/scheduled_delete_date/error_file_path を追加。
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

/** Date / pg-mem 文字列を ISO 8601(+09:00) へ。両者とも `new Date(v).toISOString()` で吸収。 */
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
    // [scr-023-optional-dep] SCR-023 追加。@Optional() で SCR-022 spec の 4 引数
    // `new FileUploadService(repo, ds, auditLog, storage)` を維持（本番 DI は module 参照）。
    // [di-class-not-interface] 型は具象クラス必須。interface 型だと NestJS DI が
    // `design:paramtypes` で `Object` トークンに解決し undefined 化 → enqueue 無効化。
    @Optional()
    private readonly notificationQueue?: NotificationQueueService,
  ) {}

  // API-022-001 — GET /api/v1/file-upload (list)
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
    // [sort-column-map] ホワイトリスト sort_by → テーブル修飾 SQL 列。
    // created_by_name は JOIN 先 m_account.account_name の別名(t_file_upload 列でない)
    // なので `fu.<sort_by>` は不正 SQL。DTO @IsIn に加えた静的セーフティネット。
    const SORT_COLUMN_MAP: Record<string, string> = {
      upload_datetime: 'fu.upload_datetime',
      file_name: 'fu.file_name',
      file_size: 'fu.file_size',
      created_by: 'fu.created_by',
      created_by_name: 'a.account_name',
    };
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? 'fu.upload_datetime';

    // DataScope — api.md §4.2 / §4.4。NICHINO_* はバイパス、JA 3 ロールは
    // ja_id-or-NULL で絞る。CHUOKAI の managed JAs は暫定で自 ja_id のみ
    // (seed 形状 = ja_id が chuokai の home JA)。将来 m_ja_chuokai lookup へ差替可。
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    const managedJaIds: number[] = !isNichino && session.ja_id != null
      ? [Number(session.ja_id)]
      : [];

    // COUNT/SELECT で SQL 文字列を同一に保つため単一パラメータマップ。
    // SCR-023 で ja_id(NICHINO_* JA フィルタ) と status(m_code FILE_UPLOAD_STATUS) 追加。両者 nullable。
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
      // NICHINO_ADMIN / NICHINO_STAFF — DataScope フィルタ無し。
      // SQL 内コメントは不可: pg-mem lexer が /* */ 内の U+2014 em-dash で
      // `invalid syntax` を出し全 integration test が落ちるため TS 側で説明。
      scopeClause = 'TRUE';
    } else if (managedJaIds.length === 0) {
      scopeClause = '(fu.ja_id IS NULL)';
    } else {
      scopeClause = `(fu.ja_id IS NULL OR fu.ja_id IN (${managedJaIds.map(Number).join(',')}))`;
    }

    // [dynamic-where] 非 null のフィルタのみで WHERE を組む。旧 `($N::text IS NULL
    // OR col = $N)` 方式は join 別名列(j.todofuken_code)を null リテラルと等値比較
    // した際 pg-mem の "lookups on joins" 制限に触れ SELECT で全 test 失敗。
    // 条件を発火時のみ足す方式は実 Postgres でも単純なプランになる。
    // [include-soft-deleted] soft-delete 行も意図的に返す(screen-design 画面項目定義
    // No.17/18): 削除日列に deleted_at 表示・削除ボタン無効。よって `fu.deleted_at
    // IS NULL` フィルタは付けない(preview/download/remove は削除済みを弾く)。
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

    // orderColumn は SORT_COLUMN_MAP(ホワイトリスト)由来なので直挿し安全。
    // SCR-023 SELECT は m_ja.ja_code/ja_name + t_file_upload 5 列を追加。
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

  // SCR-023 — POST /api/v1/file-upload (multipart upload)
  async upload(
    jaIds: number[],
    files: UploadedMulterFile[],
    session: SessionPayload,
    req: Request,
    scheduledDeleteDateInput?: string,
  ): Promise<{ data: FileUploadCreatedItemDto[]; message: string }> {
    // [diag] multer 後にサービスが受け取った内容。
    this.logger.log({
      event: 'file_upload.service.start',
      ja_ids: jaIds,
      file_count: Array.isArray(files) ? files.length : 0,
      login_id: session?.login_id ?? null,
      role_code: session?.role_code ?? null,
    });

    // [4.1] ファイル毎の形状バリデーション
    this.validateUploadInputs(jaIds, files);
    this.logger.log({ event: 'file_upload.validate.ok', file_count: files.length });

    // [4.2] 各 ja_id の DataScope
    this.assertUploadScope(jaIds, session);
    this.logger.log({ event: 'file_upload.scope.ok', ja_ids: jaIds });

    // [scheduled-delete-date-guard] 削除予定日は過去不可。FE date-picker の
    // disabled-date と同方針で、S3 アップロード前に副作用なく弾く。
    // container TZ に依らず JST 日精度(Asia/Tokyo)で比較。
    const parsedDeleteDate = parseScheduledDeleteDate(scheduledDeleteDateInput);
    if (parsedDeleteDate && parsedDeleteDate < todayIsoJst()) {
      throw new ValidationException([
        {
          field: 'scheduled_delete_date',
          message: '削除予定日は本日以降の日付を指定してください。',
        },
      ]);
    }

    // [ja-code-folder] ja_id → ja_code を解決し S3 フォルダを可読化
    // (`ja-{ja_id}-{ja_code}`)。ja_id が安定した一意キー、ja_code は不変の可読
    // 接尾辞(update-ja OmitType が ja_code を落とすので file_path はドリフトしない)。1 リクエスト 1 lookup。
    const jaCodeById = await this.fetchJaCodes(jaIds);

    // [4.4] 物理ファイルアップロード。DB tx の前に実行し storage 失敗で
    // 中途コミット行を残さない。補償ロールバック用に成功キーを記録。
    const { uploadedKeys, inputs } = await this.uploadPhysicalFiles(
      jaIds,
      files,
      jaCodeById,
      session,
      req,
    );

    // [4.5 + 4.6] t_file_upload + t_log を 1 tx で INSERT
    const savedRows: FileUpload[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const now = new Date();
        // [scheduled-delete-date] ユーザー選択の 削除予定日(上で parse + 過去日
        // 検証済)をカレンダー日(YYYY-MM-DD)で使用。FE 省略時のみ アップロード日+180日
        // (JST)へフォールバック。旧実装は NOW()+180days を timestamptz で保存し
        // 選択値を捨てていた(報告バグ)。
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

          // [download-pair] ダウンロード画面(SCR-022)は t_file_download しか見ない
          // ため、同じ S3 オブジェクトを指す行をここで登録する。これが無いと
          // アップロードしたファイルを JA 側(role 3/4/5)が取得できない
          // （顧客要件 2026-08）。同一 tx なので t_file_upload だけ残る片落ちは
          // 起きない。ja_id は選択された JA なので SCR-022 の DataScope
          // （JA ロールは自 JA 行のみ）にそのまま乗る。
          const download = manager.create(FileDownload, {
            jaId,
            downloadDatetime: now,
            downloadType: UPLOAD_DOWNLOAD_TYPE,
            // t_file_upload と同じ削除予定日にする。別々にすると片方だけ
            // 消えて「一覧に出るのに実体が無い」行が生まれる。
            scheduledDeleteDate: deleteDate,
            nichinoDownloadAllowedFlg: UPLOAD_NICHINO_DOWNLOAD_ALLOWED,
            fileName: file.originalname,
            // file_path は upload 側と同一キー。remove() のペア解決もこの値で
            // 行う（キーに randomUUID を含むので衝突しない）。
            filePath,
            fileSize: file.size,
            recordCount: UPLOAD_RECORD_COUNT,
            targetMonth: null,
            createdBy: String(session.account_id),
          });
          const savedDownload = await manager.save(FileDownload, download);
          this.logger.log({
            event: 'file_upload.download_pair.insert.ok',
            file_upload_id: Number(saved.fileUploadId),
            file_download_id: Number(savedDownload.fileDownloadId),
            ja_id: jaId,
          });

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
                // ペアで作った t_file_download 行。削除時の追跡用。
                file_download_id: Number(savedDownload.fileDownloadId),
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
      // [compensate] DB ロールバック済 → S3 もクリーンし orphan を残さない。
      // エラーログは tx 外(manager なし)。
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

    // [4.7] commit 後に通知ジョブを enqueue。保存行 1 件 = 1 ジョブ(JA×ファイル毎)。
    // 1-job-per-JA でリトライ隔離: JA-X の SES throttle が JA-Y のメールを
    // 巻き込まない。Redis ops は増えるが安価(review スレッド参照)。
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
   * [4.4] 各 (jaId × file) を DB tx の前に storage へアップロード(中途コミット行を残さない)。
   * 失敗時は補償(アップロード済削除)+ エラーログ後に再throw。
   * 戻り値: uploadedKeys(後続 DB 失敗時の呼び出し側補償用) と per-file inputs。
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
          const filePath = `${folder}/files/${randomUUID()}-${sanitizeFileNameForKey(file.originalname)}`;
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
   * [4.7] commit 後に保存行 1 件 = 1 通知ジョブ(JA×ファイル毎)を enqueue。
   * 1-job-per-JA でリトライ隔離(JA-X の SES throttle が JA-Y を巻き込まない)。
   * enqueue 失敗は API を落とさず log & continue — Redis 一時障害で全通知を
   * 失わない(行は notification_status=1 未送信 のまま)。
   */
  private async enqueueUploadNotifications(
    savedRows: FileUpload[],
    session: SessionPayload,
  ): Promise<void> {
    if (!this.notificationQueue) return;
    for (const saved of savedRows) {
      if (saved.jaId == null) {
        // [skip-null-ja] "全JA向け"(ja_id NULL)は通知対象者なし。SCR-023 は
        // jaIds[] 非空必須のため防御的分岐。
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

  // SCR-023 — DELETE /api/v1/file-upload/:id
  async remove(
    fileUploadId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [4.3] 存在 + スコープチェック
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

    // [4.4 + 4.5] soft delete + 監査ログを 1 tx で
    let committed = false;
    try {
      await this.dataSource.transaction(async (manager) => {
        const deletedAt = new Date();
        await manager.update(FileUpload, before.fileUploadId, { deletedAt });
        // [download-pair] upload 時に登録したダウンロード行も同時に落とす。
        // 下の [4.6] で S3 実体を消すので、残すと SCR-022 の一覧に出るのに
        // 押すと storage 404 になる行が生まれる。突合は file_path — キーに
        // randomUUID を含むため一意で、FK 列の追加(マイグレーション + 既存
        // 帳票行への影響)を伴わずにペアを解決できる。
        await manager.update(
          FileDownload,
          { filePath: before.filePath, deletedAt: IsNull() },
          { deletedAt },
        );
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

    // [4.6] commit 後に物理削除 — 失敗は非致命的
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
   * upload フォルダ名用に ja_id → ja_code を解決。pg-mem の `::bigint[]` 配列
   * パラメータ癖を回避するため数値 id を直挿し(注入リスク無し)。soft-delete JA は
   * 除外、欠落 id はエントリ無し → `ja-{ja_id}` へフォールバック。
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
   * JA 毎の storage フォルダ `ja-{ja_id}-{ja_code}` を生成。ja_id が先頭(安定一意キー)。
   * ja_code は DTO に charset ルールが無いため `[A-Za-z0-9_-]` にサニタイズし
   * パス区切り注入を防ぐ。ja_code 不明時は `ja-{ja_id}` へフォールバック
   * (削除 JA / id 不在 / NICHINO の stray id バイパス)。
   */
  private buildJaFolder(jaId: number, jaCode: string | undefined): string {
    if (!jaCode) return `ja-${Number(jaId)}`;
    const safe = jaCode.replace(/[^A-Za-z0-9_-]/g, '_');
    return safe ? `ja-${Number(jaId)}-${safe}` : `ja-${Number(jaId)}`;
  }

  /** upload 失敗時のベストエフォート S3 クリーンアップ。各キーのエラーは吸収し継続。 */
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

  // SCR-023 upload — ファイル毎の形状バリデーション(size + extension)
  private validateUploadInputs(
    jaIds: number[],
    files: UploadedMulterFile[],
  ): void {
    if (!Array.isArray(jaIds) || jaIds.length === 0) {
      throw new TargetJaRequiredException();
    }
    for (const f of files) {
      // [size-cap] 1 ファイル 30MB — screen-design.md 機能定義 4.2。
      // api.md は元々 10MB のstale な例示が残っていたが、実装・screen-design.md
      // 側の 30MB が正（api.md 側を是正済み）。
      if (f.size > MAX_FILE_SIZE_BYTES) {
        throw new FileSizeExceededException();
      }
      if (!isAllowedExtension(f.originalname)) {
        throw new FileUploadFormatException();
      }
      // [magic-bytes] 拡張子だけでなく実バイト列の先頭シグネチャも照合する。
      // 拡張子チェックのみだと HTML/実行ファイルを許可拡張子（.pdf 等）へ
      // リネームするだけで通過できていた（バックエンドコードレビュー finding #7）。
      if (!matchesDeclaredFileType(f.originalname, f.buffer)) {
        throw new FileUploadFormatException();
      }
    }
  }

  // SCR-023 upload — 各 ja_id の DataScope
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
      // [cross-tenant-data-scope] 顧客決定 2026-05-19(security.md Layer 4):
      // クロステナントは DATA_SCOPE_VIOLATION(HTTP 403)を throw、汎用 FORBIDDEN 不可。
      // fetchFkInJa() と同じ明示 403 トレードオフ(tenant-id 列挙耐性より UX 明快さ)。
      throw new DataScopeViolationException();
    }
  }

  // Preview / Download（SCR-022 と同方針。t_file_upload のファイルを署名URL /
  // バイナリで返す。削除済み・スコープ外は対象外）

  /** プレビュー用の署名付き URL を返す（画像/PDF は FE がインライン表示）。 */
  async getPreview(
    fileUploadId: number,
    session: SessionPayload,
  ): Promise<{ data: { preview_url: string; file_name: string } }> {
    const row = await this.repo.findOne({
      where: { fileUploadId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session);
    const previewUrl = await this.storage.getSignedUrl(
      row.filePath,
      PREVIEW_TTL_SECONDS,
    );
    return { data: { preview_url: previewUrl, file_name: row.fileName } };
  }

  /** 単一ファイルをバイナリでダウンロード（証跡は t_log DOWNLOAD のみ）。 */
  async download(
    fileUploadId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<DownloadResult> {
    const row = await this.repo.findOne({
      where: { fileUploadId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('ファイル');
    this.assertScope(row, session);

    const body = await this.storage.download(row.filePath);
    const contentType = contentTypeFor(row.fileName);
    const fileSize =
      row.fileSize == null ? Buffer.byteLength(body) : Number(row.fileSize);

    const ctx = buildAuditCtx(
      session,
      req,
      SCR023_SCREEN,
      TABLE_NAME,
      Number(row.fileUploadId),
    );
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
          file_upload_id: Number(row.fileUploadId),
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

  /** 複数選択を ZIP 1つにまとめてダウンロード（一括ダウンロード_yyyyMMddHHmmss.zip）。 */
  async downloadZip(
    fileUploadIds: number[],
    session: SessionPayload,
    req: Request,
  ): Promise<DownloadResult> {
    const rows = await this.repo.find({
      where: { fileUploadId: In(fileUploadIds), deletedAt: IsNull() },
    });
    const byId = new Map(rows.map((r) => [Number(r.fileUploadId), r]));
    const ordered: FileUpload[] = [];
    for (const id of fileUploadIds) {
      const row = byId.get(id);
      if (!row) throw new NotFoundException('ファイル');
      this.assertScope(row, session);
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

    const ctx = buildAuditCtx(session, req, SCR023_SCREEN, TABLE_NAME, null);
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
          bulk: true,
          zip_file_name: fileName,
          file_count: fetched.length,
          file_upload_ids: ordered.map((r) => Number(r.fileUploadId)),
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

  // Internal — DataScope 判定(存在秘匿のため 404)
  private assertScope(row: FileUpload, session: SessionPayload): void {
    const role = session.role_code;
    const isNichino =
      role === RoleCode.NICHINO_ADMIN || role === RoleCode.NICHINO_STAFF;
    // グローバルファイル(ja_id IS NULL)は全ロール可視 — api.md §4.2。
    if (row.jaId == null) return;
    if (isNichino) return;
    // CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN — 自 JA のみ(managed-JA は
    // session.ja_id に簡略化。findAll コメント参照)。
    if (session.ja_id != null && Number(row.jaId) === Number(session.ja_id)) {
      return;
    }
    throw new NotFoundException('ファイル');
  }
}

