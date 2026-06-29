import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import { StorageService } from '@/modules/storage/storage.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  isoDateToSlash,
  nowDateJst,
  nowTimeJst,
} from '@/common/utils/datetime';
import { applyBranchScope } from '@/common/utils/data-scope';
import { ValidationException } from '@/common/exceptions/common.exceptions';
import {
  AuditOperation,
  DokusyaShubetsu,
  LogType,
  ResultStatus,
  TetsuzukiShurui,
} from '@/common/enums';

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ZougenNichinoQueryDto } from './dto/zougen-nichino-query.dto';
import { ReportNoDataException } from './exceptions/report-no-data.exception';
import { PdfExportService } from './pdf-export.service';
import { ReportArchiveService } from './report-archive.service';
import { ReportNotificationService } from './report-notification.service';
import {
  buildMeiboPreview,
  groupByHanbaiten,
  groupByKanriShiten,
  MEIBO_PREVIEW_PER_PAGE,
  type HanbaitenGroup,
  type HanbaitenReportRow,
  type KanriShitenGroup,
  type KanriShitenReportRow,
  type MeiboPreviewData,
  type MeiboRawRow,
} from './report.mapper';
import {
  buildZougenDocDefinition,
  groupZougenReports,
  ZOUGEN_PER_PAGE,
  type ZougenPreviewData,
  type ZougenRawRow,
} from './zougen.mapper';
import {
  buildZougenNichinoDocDefinition,
  groupZougenNichinoReports,
  ZOUGEN_NICHINO_PER_PAGE,
  type ZougenNichinoPreviewData,
  type ZougenNichinoRawRow,
} from './zougen-nichino.mapper';

const SCREEN_NAME = '購読者名簿出力画面 (ACSMS-SCR-026)';
const TABLE_NAME = 't_dokusya_rireki';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = '購読者名簿';
// Excel の「1文書ページ = A4 1枚」に収める明細行数（手動改ページの間隔）。
// preview（Web）とページ数を一致させるため、FE の meiboRowsPerA4
// （= MEIBO_PREVIEW_PER_PAGE）と必ず同じ値にする。販売店別・管理支店別とも 15 行。
// 実際の印刷結果に合わせて FE/BE 両側を揃えて調整する。
const EXCEL_ROWS_PER_PAGE: Record<'hanbaiten' | 'kanri_shiten', number> = {
  hanbaiten: 15,
  kanri_shiten: 15,
};
// 出力種別は DownloadType enum を直接使用（MEIBO=5 / ZOUGEN=3 /
// ZOUGEN_NICHINO=4）。併読(DokusyaShubetsu.BOTH)は本帳票では常に除外
// （画面項目No.5）、新規(TetsuzukiShurui.SHINKI)のみ対象（解約=0は除外）。

// ─── ACSMS-SCR-028 — 増減連絡票（販売店） ─────────────────────────────
const ZOUGEN_SCREEN_NAME = '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)';
// SCR-028 は共通の ReportArchiveService 経由で S3 + t_file_upload に保存する
// ため、操作ログの対象テーブルは t_file_upload。
const ZOUGEN_TARGET_TABLE = 't_file_upload';
const PDF_MIME = 'application/pdf';
// SCR-029 も共通の ReportArchiveService 経由で S3 + t_file_upload に保存する
// ようになったため、操作ログの対象テーブルは t_file_upload。
const NICHINO_TARGET_TABLE = 't_file_upload';

// ─── ACSMS-SCR-029 — 増減通知（日本農業新聞） ─────────────────────────
const NICHINO_SCREEN_NAME = '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)';
// 通知先ロール: NICHINO_ADMIN(1) / NICHINO_STAFF(2)（m_roles SERIAL 順）。
const NICHINO_NOTIFY_ROLE_IDS = [1, 2];

export interface ExportMeiboResult {
  buffer: Buffer;
  filename: string;
}

export type ExportZougenResult =
  | {
      /** 対象0件 → PDFは生成せず、controller は 200 + 空配列で応答する。 */
      empty: true;
    }
  | {
      empty: false;
      buffer: Buffer;
      /** 表示名（日本語、Content-Disposition filename* 用）。 */
      filename: string;
      /** ASCII 別名（Content-Disposition filename 用）。 */
      asciiFilename: string;
    };

/**
 * SCR-029 出力結果。対象0件は `{ empty: true }`。
 * それ以外はブラウザへ PDF を返さず、S3 アーカイブ（t_file_upload）+
 * 日農担当者へのメール通知のみを行い、保存ファイル名と通知宛先数を返す。
 */
export type ExportZougenNichinoResult =
  | { empty: true }
  | {
      empty: false;
      /** S3 に保存したファイル名（タイムスタンプ付き）。 */
      fileName: string;
      /** 通知メールを送信した宛先数。 */
      recipientCount: number;
    };

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    private readonly auditLog: AuditLogService,
    // CodeService (@Global) — reserved for future m_code label resolution.
    private readonly codeService: CodeService,
    // storage は SCR-026/028 の名残で保持する（現状の出力は全て
    // ReportArchiveService 経由のため未使用だが、constructor 位置を維持して
    // 既存 spec の `new ReportService(...)` を壊さない）。
    private readonly storage: StorageService,
    private readonly reportArchive: ReportArchiveService,
    // SCR-028 appends these so SCR-026-only specs keep type-checking.
    // Production DI always injects the real instances.
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly pdfService?: PdfExportService,
    // SCR-029 appends this（日農担当者へのメール通知）. @Optional() so the
    // SCR-026/028 specs that `new` with fewer args keep type-checking.
    @Optional()
    private readonly reportNotification?: ReportNotificationService,
  ) {}

  // ─── ACSMS-API-026-001 — GET /api/v1/report/meibo/preview ────────
  async previewMeibo(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboPreviewData> {
    this.assertConditionalRequired(query);
    // SQLページング: 1ページ分の明細のみ OFFSET/LIMIT で取得し、各行に付与した
    // ウィンドウ集計列（全件の小計/合計/件数）からページ構造を組み立てる。
    // → BE は全件をメモリに抱えない。export は別途 fetchRows で全件を使う。
    const perPage = query.per_page ?? MEIBO_PREVIEW_PER_PAGE;
    const page = Math.max(query.page ?? 1, 1);
    const offset = (page - 1) * perPage;
    const rows = await this.fetchMeiboPage(query, session, offset, perPage);
    return buildMeiboPreview(query.report_type, query.tekiyo_date, rows, page, perPage);
  }

  // ─── ACSMS-API-026-002 — GET /api/v1/report/meibo/export ─────────
  async exportMeiboExcel(
    query: MeiboReportQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportMeiboResult> {
    this.assertConditionalRequired(query);
    try {
      const rows = await this.fetchRows(query, session);
      // 対象データなし → Excelは生成しない（業務的な404、エラーログ対象外）。
      if (rows.length === 0) throw new ReportNoDataException();

      const preview = this.buildPreview(query, rows);
      const buffer = await this.buildExcelBuffer(preview);
      // ダウンロード用ファイル名（タイムスタンプ無し）。
      const filename = this.buildFilename(query.tekiyo_date, query.report_type);

      // S3 アーカイブ（タイムスタンプ付きファイル名）+ t_file_upload 登録は
      // 共通の ReportArchiveService に委譲する。S3 パスの年は適用日の年。
      const [year] = query.tekiyo_date.split('-');
      await this.reportArchive.archive({
        buffer,
        baseName: this.buildBaseName(query.tekiyo_date, query.report_type),
        category: 'meibo',
        subFolder: query.report_type,
        year,
        jaId: session.ja_id ?? null,
        session,
        recordCount: rows.length,
        contentType: XLSX_MIME,
      });

      return { buffer, filename };
    } catch (err) {
      // 業務的な「対象なし」(404) はエラーログ対象外。それ以外（DB/S3障害等）
      // は log_type=3 をトランザクション外で記録する（4.7）。
      if (err instanceof ReportNoDataException) throw err;
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.EXPORT,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  async previewZougenHanbaiten(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenPreviewData> {
    // SQLページング（購読者単位）。累計は同日履歴をまたいで分割できないため、
    // OFFSET/LIMIT の最小単位は dokusya_id（≒1レコード/購読者）。BEは1ページ分の
    // 購読者の明細のみロードする。export PDF は別途 fetchZougenRows で全件を使う。
    // 0件は 200 + 空 reports（FE が「対象のデータが存在しません。」を表示）。
    const perPage = query.per_page ?? ZOUGEN_PER_PAGE;
    const total = await this.countZougenSubscribers(query, session);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const offset = (page - 1) * perPage;
    const ids =
      total === 0
        ? []
        : await this.fetchZougenSubscriberIds(query, session, offset, perPage);
    const rows = await this.fetchZougenRowsByIds(query, session, ids);
    return {
      tekiyo_date: query.tekiyo_date,
      reports: groupZougenReports(rows),
      page_no: page,
      per_page: perPage,
      total_pages: totalPages,
      total_rows: total,
      is_last_page: page >= totalPages,
    };
  }

  // ─── ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export ──
  async exportZougenHanbaitenPdf(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenResult> {
    // SCR-028 は ReportArchiveService 経由で S3 + t_file_upload に保存するため
    // dataSource トランザクションは使わない。PDF 生成のみ必須。
    if (!this.pdfService) {
      throw new Error(
        'ReportService.pdfService is undefined — SCR-028 export requires it.',
      );
    }

    try {
      const rows = await this.fetchZougenRows(query, session);
      // 対象0件 → PDFは生成せず、アーカイブ・操作ログも残さない。
      // controller が 200 + 空配列で応答する（preview と同じ no-data 方針）。
      if (rows.length === 0) return { empty: true };

      // PDFはプレビューと同じ改ページ（15購読者/ページ・販売店コード順）で出力する。
      const reports = groupZougenReports(rows); // 監査ログの販売店帳票数用
      const docDefinition = buildZougenDocDefinition(
        rows,
        query.tekiyo_date,
        ZOUGEN_PER_PAGE,
        query.issued_at ?? '',
      );
      const buffer = await this.pdfService.generatePdf(docDefinition);

      // ファイル名はログイン権限で分岐する（JA_KANRI_SHITEN は ja_name を含める）。
      // ダウンロード名はタイムスタンプ無し、S3 名のみ ReportArchiveService が
      // 14桁の JST タイムスタンプを付与する。
      const ja = await this.reportArchive.resolveJa(session.ja_id ?? null);
      const baseName = this.buildZougenBaseName(
        query.tekiyo_date,
        session.role_code,
        ja.code,
        ja.name,
      );
      const filename = `${baseName}.pdf`;
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date);

      // S3 保存 + t_file_upload 登録は共通の ReportArchiveService に委譲する。
      // S3 パス: reports/zougen-hanbaiten/{ja_code}/{year}/（subFolder なし）。
      const [year] = query.tekiyo_date.split('-');
      const archived = await this.reportArchive.archive({
        buffer,
        baseName,
        category: 'zougen-hanbaiten',
        year,
        jaId: session.ja_id ?? null,
        jaCode: ja.code,
        session,
        recordCount: rows.length,
        contentType: PDF_MIME,
        extension: '.pdf',
      });

      // 操作ログ（4.6）— アーカイブと原子的に対にすべき DML がないため
      // 単一トランザクションは組まず、標準コネクションで記録する。
      const ctx = buildAuditCtx(
        session,
        req,
        ZOUGEN_SCREEN_NAME,
        ZOUGEN_TARGET_TABLE,
        archived.fileUploadId,
      );
      // 個人情報（氏名・住所）は含めず、出力条件と件数のみを記録する（4.6）。
      const afterValue = JSON.stringify({
        tekiyo_date: query.tekiyo_date,
        hanbaiten_id: query.hanbaiten_id ?? null,
        kanri_shiten_id: query.kanri_shiten_id ?? null,
        report_count: reports.length,
        record_count: rows.length,
        file_name: filename,
      });
      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.EXPORT_PDF,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: '',
        afterValue,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return { empty: false, buffer, filename, asciiFilename };
    } catch (err) {
      // DB/S3/PDF障害等は log_type=3 をトランザクション外で記録する（4.8）。
      // 0件は throw ではなく早期 return のためここには到達しない。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ZOUGEN_SCREEN_NAME, ZOUGEN_TARGET_TABLE, null),
        AuditOperation.EXPORT_PDF,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-029-001 — GET /api/v1/report/zougen-nichino/preview ────
  async previewZougenNichino(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): Promise<ZougenNichinoPreviewData> {
    // SQLページング（購読者単位。SCR-028 と同方針）。累計は同日履歴をまたいで
    // 分割できないため OFFSET/LIMIT の最小単位は dokusya_id（≒1行/購読者）。BEは
    // 1ページ分の購読者の明細のみロードする。0件は 200 + 空 reports（no-data方針）。
    const perPage = query.per_page ?? ZOUGEN_NICHINO_PER_PAGE;
    const total = await this.countNichinoSubscribers(query, session);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const offset = (page - 1) * perPage;
    const ids =
      total === 0
        ? []
        : await this.fetchNichinoSubscriberIds(query, session, offset, perPage);
    const rows = await this.fetchNichinoRowsByIds(query, session, ids);
    return {
      tekiyo_date: query.tekiyo_date,
      reports: groupZougenNichinoReports(rows),
      page_no: page,
      per_page: perPage,
      total_pages: totalPages,
      total_rows: total,
      is_last_page: page >= totalPages,
    };
  }

  // ─── ACSMS-API-029-002 — POST /api/v1/report/zougen-nichino/export ────
  async exportZougenNichinoPdf(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenNichinoResult> {
    if (!this.pdfService) {
      throw new Error(
        'ReportService.pdfService is undefined — SCR-029 export requires it.',
      );
    }

    try {
      const rows = await this.fetchZougenNichinoRows(query, session);
      // 対象0件 → PDFは生成せず、履歴・操作ログ・メールも発生しない（4.3）。
      if (rows.length === 0) return { empty: true };

      const reports = groupZougenNichinoReports(rows);
      const bikoByKs = new Map<number, string>(
        (query.remarks ?? []).map((r) => [Number(r.kanri_shiten_id), r.biko ?? '']),
      );

      // プレビューと同じ改ページ（15行/ページ・管理支店コード順）で**1つのPDF**に
      // まとめて出力する。ブラウザへは返さず、S3 アーカイブ + メール通知のみ行う。
      const doc = buildZougenNichinoDocDefinition(
        rows,
        query.tekiyo_date,
        bikoByKs,
        ZOUGEN_NICHINO_PER_PAGE,
      );
      const buffer = await this.pdfService.generatePdf(doc);

      // 基底ファイル名: 増減通知_{YYYY年MM月DD日}（年月日表記）。
      const [year, month, day] = query.tekiyo_date.split('-');
      const baseName = `増減通知_${year}年${month}月${day}日`;

      // S3 保存 + t_file_upload 登録は共通の ReportArchiveService に委譲する。
      // S3 パス: reports/zougen_nichino/{ja_code}/{YYYY}/（subFolder なし、
      // YYYY=適用日の年）。ReportArchiveService が 14桁(JST)のタイムスタンプを
      // ファイル名に付与する。
      const archived = await this.reportArchive.archive({
        buffer,
        baseName,
        category: 'zougen_nichino',
        year,
        jaId: session.ja_id ?? null,
        session,
        recordCount: rows.length,
        contentType: PDF_MIME,
        extension: '.pdf',
      });

      // 日農担当者（NICHINO_ADMIN/STAFF）へメール自動通知（4.5）。
      // fire-and-forget / non-fatal: notifyRoles は throw しないため await して
      // recipient_count を得る（メール失敗時も S3保存・監査ログは成功扱い）。
      const recipientCount =
        (await this.reportNotification?.notifyRoles(NICHINO_NOTIFY_ROLE_IDS, {
          subject: '増減通知（日本農業新聞）を出力しました',
          body:
            `<p>増減通知（日本農業新聞）を出力しました。</p>` +
            `<p>対象月：${query.tekiyo_date}<br>` +
            `ファイル名：${archived.filename}<br>` +
            `件数：${rows.length}件</p>` +
            `<p>ファイル管理画面からダウンロードできます。</p>`,
        })) ?? 0;

      // 操作ログ（4.7）— アーカイブと原子的に対にすべき DML がないため
      // 単一トランザクションは組まず、標準コネクションで記録する。
      const ctx = buildAuditCtx(
        session,
        req,
        NICHINO_SCREEN_NAME,
        NICHINO_TARGET_TABLE,
        archived.fileUploadId,
      );
      // 個人情報（氏名・住所）は含めず、出力条件と件数のみを記録する（4.7）。
      const afterValue = JSON.stringify({
        tekiyo_date: query.tekiyo_date,
        kanri_shiten_id: query.kanri_shiten_id ?? null,
        report_count: reports.length,
        record_count: rows.length,
        file_name: archived.filename,
        recipient_count: recipientCount,
      });
      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.EXPORT_PDF,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: '',
        afterValue,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      // ブラウザへは返さず、保存ファイル名と通知宛先数のみ返す（4.8）。
      return { empty: false, fileName: archived.filename, recipientCount };
    } catch (err) {
      // DB/S3/PDF障害等は log_type=3 をトランザクション外で記録する（4.9）。
      await this.auditLog.logError(
        buildAuditCtx(session, req, NICHINO_SCREEN_NAME, NICHINO_TARGET_TABLE, null),
        AuditOperation.EXPORT_PDF,
        err as Error,
      );
      throw err;
    }
  }

  // ─── private ─────────────────────────────────────────────────────

  /** 帳票種別に応じた1件以上必須（ACSMS-MSG-026-002 / 003）。 */
  private assertConditionalRequired(query: MeiboReportQueryDto): void {
    if (
      query.report_type === 'hanbaiten' &&
      (!query.hanbaiten_ids || query.hanbaiten_ids.length === 0)
    ) {
      throw new ValidationException([
        { field: 'hanbaiten_ids', message: '販売店を1件以上選択してください。' },
      ]);
    }
    if (
      query.report_type === 'kanri_shiten' &&
      (!query.kanri_shiten_ids || query.kanri_shiten_ids.length === 0)
    ) {
      throw new ValidationException([
        {
          field: 'kanri_shiten_ids',
          message: '管理支店を1件以上選択してください。',
        },
      ]);
    }
  }

  /** 明細行の SELECT 列（preview のページクエリ・export の全件クエリ共通）。 */
  private static readonly MEIBO_SELECT: string[] = [
    'r.dokusya_id AS dokusya_id',
    'r.dokusya_shubetsu AS dokusya_shubetsu',
    'r.shimei_sei AS shimei_sei',
    'r.shimei_mei AS shimei_mei',
    'r.shimei_kana_sei AS shimei_kana_sei',
    'r.shimei_kana_mei AS shimei_kana_mei',
    'r.haitatsu_same_flg AS haitatsu_same_flg',
    'r.haitatsu_shimei_sei AS haitatsu_shimei_sei',
    'r.haitatsu_shimei_mei AS haitatsu_shimei_mei',
    'r.haitatsu_shimei_kana_sei AS haitatsu_shimei_kana_sei',
    'r.haitatsu_shimei_kana_mei AS haitatsu_shimei_kana_mei',
    'r.kumiaiin_code AS kumiaiin_code',
    'r.haitatsu_yubin_no AS haitatsu_yubin_no',
    'r.haitatsu_shikuchoson AS haitatsu_shikuchoson',
    'r.haitatsu_chome_banchi AS haitatsu_chome_banchi',
    'r.haitatsu_tatemono_mei AS haitatsu_tatemono_mei',
    'r.haitatsu_renrakusaki_1 AS haitatsu_renrakusaki_1',
    // 購読者本人の住所・連絡先 — haitatsu_same_flg=TRUE のとき配達先として使う。
    'r.yubin_no AS yubin_no',
    'r.shikuchoson AS shikuchoson',
    'r.chome_banchi AS chome_banchi',
    'r.tatemono_mei AS tatemono_mei',
    'r.renrakusaki_1 AS renrakusaki_1',
    'r.dokusya_kaishi_date AS dokusya_kaishi_date',
    'r.dokusya_busu AS dokusya_busu',
    'r.shiharai_hoho AS shiharai_hoho',
    'r.dokusyaryo_shiharai_cycle AS dokusyaryo_shiharai_cycle',
    'r.kanri_shiten_id AS kanri_shiten_id',
    'ks.kanri_shiten_name AS kanri_shiten_name',
    'r.shiten_id AS shiten_id',
    's.shiten_name AS shiten_name',
    'r.hanbaiten_id AS hanbaiten_id',
    'h.hanbaiten_name AS hanbaiten_name',
    'h.hanbaiten_code AS hanbaiten_code',
    'h.tel AS hanbaiten_tel',
    'h.fax AS hanbaiten_fax',
    'j.ja_name AS ja_name',
    'j.tel AS ja_tel',
  ];

  /**
   * 行集合を決める JOIN(必須) + WHERE + DataScope を組み立てた QueryBuilder を返す
   * （SELECT・並び順・ページングは含めない）。明細クエリ（全件/ページ）が共通の
   * 土台にすることでフィルタのドリフトを防ぐ。
   *
   * 適用日時点の最新スナップショット（各 dokusya_id で
   * `joho_henko_tekiyo_date <= :tekiyo_date` を満たす最大 rireki_no）を対象。
   * m_hanbaiten / m_ja は INNER JOIN（deleted_at IS NULL）で行集合に影響するため
   * ここに含める。名称用の m_kanri_shiten / m_shiten は LEFT JOIN なので明細
   * SELECT 側で付与する。
   */
  private meiboBaseQuery(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .innerJoin('m_ja', 'j', 'j.ja_id = r.ja_id AND j.deleted_at IS NULL')
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date <= :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere(
        'r.rireki_no = (SELECT MAX(r2.rireki_no) FROM t_dokusya_rireki r2 ' +
          'WHERE r2.dokusya_id = r.dokusya_id ' +
          'AND r2.joho_henko_tekiyo_date <= :tekiyo_date)',
      )
      .andWhere('r.tetsuzuki_shurui = :tetsuzuki', {
        tetsuzuki: TetsuzukiShurui.SHINKI,
      })
      .andWhere('r.dokusya_shubetsu <> :heiyo', { heiyo: DokusyaShubetsu.BOTH });

    if (query.dokusya_shubetsu != null) {
      qb.andWhere('r.dokusya_shubetsu = :shubetsu', {
        shubetsu: query.dokusya_shubetsu,
      });
    }
    if (query.report_type === 'hanbaiten') {
      qb.andWhere('r.hanbaiten_id IN (:...hanbaiten_ids)', {
        hanbaiten_ids: query.hanbaiten_ids,
      });
    } else {
      qb.andWhere('r.kanri_shiten_id IN (:...kanri_shiten_ids)', {
        kanri_shiten_ids: query.kanri_shiten_ids,
      });
    }
    if (query.shiharai_hoho != null) {
      // 支払方法（m_code SHIHARAI_HOHO）で絞り込む。旧「支払区分（支払サイクル）」
      // フィルタから変更（dokusyaryo_shiharai_cycle → shiharai_hoho）。
      qb.andWhere('r.shiharai_hoho = :shiharaiHoho', {
        shiharaiHoho: query.shiharai_hoho,
      });
    }

    // DataScope: CHUOKAI/JA_HONTEN → ja_id, JA_KANRI_SHITEN → kanri_shiten_id,
    // NICHINO_* は本画面の権限を持たないため到達しない。
    applyBranchScope(
      qb,
      'r',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );
    return qb;
  }

  /** 名称用の LEFT JOIN + 明細 SELECT を付与（preview/export 共通）。 */
  private meiboDetailSelect(
    qb: SelectQueryBuilder<DokusyaRireki>,
  ): SelectQueryBuilder<DokusyaRireki> {
    return qb
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin('m_shiten', 's', 's.shiten_id = r.shiten_id AND s.deleted_at IS NULL')
      .select(ReportService.MEIBO_SELECT);
  }

  /**
   * 並び順。グループのネスト順と一致させる（オフセット境界がグループ境界と
   * 整合するように）：販売店別 = 販売店→管理支店→購読者、管理支店別 =
   * 管理支店→購読者。
   */
  private applyMeiboOrder(
    qb: SelectQueryBuilder<DokusyaRireki>,
    reportType: 'hanbaiten' | 'kanri_shiten',
  ): void {
    if (reportType === 'hanbaiten') {
      qb.orderBy('r.hanbaiten_id', 'ASC')
        .addOrderBy('r.kanri_shiten_id', 'ASC')
        .addOrderBy('r.dokusya_id', 'ASC');
    } else {
      qb.orderBy('r.kanri_shiten_id', 'ASC').addOrderBy('r.dokusya_id', 'ASC');
    }
  }

  /** 全件取得（export 用。ページングなし）。 */
  private async fetchRows(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboRawRow[]> {
    const qb = this.meiboDetailSelect(this.meiboBaseQuery(query, session));
    this.applyMeiboOrder(qb, query.report_type);
    return qb.getRawMany<MeiboRawRow>();
  }

  /**
   * 1ページ分の明細のみ取得（preview 用。OFFSET/LIMIT）。各行に全件のウィンドウ
   * 集計列を付与する（COUNT/SUM OVER / ROW_NUMBER OVER）。ウィンドウ関数は
   * LIMIT/OFFSET の前に全件に対して評価されるため、ページ行だけ取得しても
   * 全件の小計・合計・件数・グループ境界を再現できる（BEは全件を抱えない）。
   */
  private async fetchMeiboPage(
    query: MeiboReportQueryDto,
    session: SessionPayload,
    offset: number,
    limit: number,
  ): Promise<MeiboRawRow[]> {
    const qb = this.meiboDetailSelect(this.meiboBaseQuery(query, session))
      .addSelect('COUNT(*) OVER ()', '_total_rows')
      .addSelect('COALESCE(SUM(r.dokusya_busu) OVER (), 0)', '_grand_busu');
    if (query.report_type === 'hanbaiten') {
      qb.addSelect('COALESCE(SUM(r.dokusya_busu) OVER (PARTITION BY r.hanbaiten_id), 0)', '_hg_busu')
        .addSelect(
          'ROW_NUMBER() OVER (PARTITION BY r.hanbaiten_id ORDER BY r.kanri_shiten_id, r.dokusya_id)',
          '_hg_rn',
        )
        .addSelect('COUNT(*) OVER (PARTITION BY r.hanbaiten_id)', '_hg_count')
        .addSelect(
          'COALESCE(SUM(r.dokusya_busu) OVER (PARTITION BY r.hanbaiten_id, r.kanri_shiten_id), 0)',
          '_sg_busu',
        )
        .addSelect(
          'ROW_NUMBER() OVER (PARTITION BY r.hanbaiten_id, r.kanri_shiten_id ORDER BY r.dokusya_id)',
          '_sg_rn',
        )
        .addSelect('COUNT(*) OVER (PARTITION BY r.hanbaiten_id, r.kanri_shiten_id)', '_sg_count');
    } else {
      qb.addSelect('COALESCE(SUM(r.dokusya_busu) OVER (PARTITION BY r.kanri_shiten_id), 0)', '_kg_busu')
        .addSelect(
          'ROW_NUMBER() OVER (PARTITION BY r.kanri_shiten_id ORDER BY r.dokusya_id)',
          '_kg_rn',
        )
        .addSelect('COUNT(*) OVER (PARTITION BY r.kanri_shiten_id)', '_kg_count');
    }
    this.applyMeiboOrder(qb, query.report_type);
    qb.offset(offset).limit(limit);
    return qb.getRawMany<MeiboRawRow>();
  }

  private buildPreview(
    query: MeiboReportQueryDto,
    rows: MeiboRawRow[],
  ): MeiboPreviewData {
    // 組合情報は全行同一JAスコープなので先頭行から取得（0件時は空）。
    const jaName = rows[0]?.ja_name ?? '';
    const jaTel = rows[0]?.ja_tel ?? '';
    if (query.report_type === 'hanbaiten') {
      const { hanbaiten_groups, grand_total_busu } = groupByHanbaiten(rows);
      return {
        report_type: 'hanbaiten',
        tekiyo_date: query.tekiyo_date,
        ja_name: jaName,
        ja_tel: jaTel,
        grand_total_busu,
        hanbaiten_groups,
        kanri_shiten_groups: [],
      };
    }
    const { kanri_shiten_groups, grand_total_busu } = groupByKanriShiten(rows);
    return {
      report_type: 'kanri_shiten',
      tekiyo_date: query.tekiyo_date,
      ja_name: jaName,
      ja_tel: jaTel,
      grand_total_busu,
      hanbaiten_groups: [],
      kanri_shiten_groups,
    };
  }

  /** プレビューテーブルと同一構成（小計行・合計行を含む）でExcelを出力する。 */
  private async buildExcelBuffer(data: MeiboPreviewData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);
    // 既定のグリッド線（View）を非表示にして、明示した枠線だけを見せる。
    sheet.views = [{ showGridLines: false }];

    if (data.report_type === 'hanbaiten') {
      this.fillHanbaitenSheet(sheet, data);
    } else {
      this.fillKanriShitenSheet(sheet, data);
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── Excel スタイル共通 ────────────────────────────────────────────
  private readonly THIN_BORDER = {
    top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  };
  private readonly HEADER_FILL = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFF1F5F9' },
  };

  /** 表の1行のセル(1..cols)に枠線・塗り・寄せを適用。 */
  private styleRow(
    row: ExcelJS.Row,
    cols: number,
    opts: { fill?: boolean; bold?: boolean; center?: boolean } = {},
  ): void {
    for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      cell.border = this.THIN_BORDER;
      if (opts.fill) cell.fill = this.HEADER_FILL;
      cell.font = { size: 10, bold: opts.bold ?? false };
      cell.alignment = {
        vertical: 'middle',
        wrapText: true,
        horizontal: opts.center ? 'center' : 'left',
      };
    }
  }

  /**
   * 1シートを A4縦・印刷向けにセットアップする。
   * - `fitToWidth: 1` … 列を1ページ幅(A4)に収める（横にはみ出さない）。
   * - `fitToHeight: 0` … 行は縦に連続させ、手動改ページ位置で各A4へ分ける。
   *
   * ページ区切りは「文書ページ」単位の**手動改ページ**（addPageBreak）で行い、各
   * ページ先頭にヘッダ（タイトル＋組合情報＋ページ数 k/M）を**セルに直接**書く。
   * よって Excel を開いた時点（標準ビュー）で、複数ページがヘッダ付き・ページ番号
   * 付きで縦に並んで見え、そのまま印刷すれば各A4に1ページずつ出力される。
   * （printTitlesRow / フッタ &P は使わない＝ヘッダ二重表示・番号不一致を避ける）
   */
  private applyA4PageSetup(sheet: ExcelJS.Worksheet): void {
    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };
  }

  /**
   * 帳票ヘッダ（タイトル・チェック日/確認印・販売店/組合情報）を描く。
   * `showCheckBox=false` でチェック日/確認印ボックスを省略する（管理支店別は
   * 手書きチェック欄が無いため出さない）。
   */
  private writeReportHeader(
    sheet: ExcelJS.Worksheet,
    cols: number,
    title: string,
    leftLines: string[],
    rightLines: string[],
    showCheckBox = true,
  ): void {
    const lastCol = String.fromCodePoint(64 + cols); // A=65
    const midCol = String.fromCodePoint(64 + Math.ceil(cols / 2));
    const nextMid = String.fromCodePoint(64 + Math.ceil(cols / 2) + 1);

    // チェック日 / 確認印（右上）— ヘッダ行 + 手書き用の空欄ボックス。
    // 見出し行の下に枠線付きの空セルを数行積み、手書きで日付・確認印を
    // 記入できるようにする（販売店別のみ。管理支店別は省略）。
    if (showCheckBox) {
      const CHECK_BOX_BLANK_ROWS = 3;
      const chkHeader = sheet.addRow([]);
      chkHeader.getCell(cols - 1).value = 'チェック日';
      chkHeader.getCell(cols).value = '確認印';
      for (const c of [cols - 1, cols]) {
        chkHeader.getCell(c).border = this.THIN_BORDER;
        chkHeader.getCell(c).alignment = { horizontal: 'center' };
        chkHeader.getCell(c).font = { bold: true };
      }
      // 空欄（手書き記入エリア）— 複数行を縦結合して 1 列につき 1 つの
      // 背の高いボックスにする（チェック日 / 確認印 をそれぞれ手書き）。
      const firstBlank = chkHeader.number + 1;
      for (let i = 0; i < CHECK_BOX_BLANK_ROWS; i++) {
        const blank = sheet.addRow([]);
        blank.getCell(cols - 1).border = this.THIN_BORDER;
        blank.getCell(cols).border = this.THIN_BORDER;
      }
      const lastBlank = firstBlank + CHECK_BOX_BLANK_ROWS - 1;
      const chkCol1 = String.fromCodePoint(64 + cols - 1);
      const chkCol2 = String.fromCodePoint(64 + cols);
      sheet.mergeCells(`${chkCol1}${firstBlank}:${chkCol1}${lastBlank}`);
      sheet.mergeCells(`${chkCol2}${firstBlank}:${chkCol2}${lastBlank}`);
    }

    // タイトル（中央・太字）
    const titleRow = sheet.addRow([title]);
    sheet.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);
    titleRow.getCell(1).font = { bold: true, size: 16 };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    sheet.addRow([]); // spacer

    // 左右の情報を行ごとに配置（左: A〜mid / 右: nextMid〜last 右寄せ）
    const lines = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < lines; i++) {
      const r = sheet.addRow([]);
      if (leftLines[i] !== undefined) {
        sheet.mergeCells(`A${r.number}:${midCol}${r.number}`);
        r.getCell(1).value = leftLines[i];
        r.getCell(1).font = { size: 10 };
      }
      if (rightLines[i] !== undefined) {
        sheet.mergeCells(`${nextMid}${r.number}:${lastCol}${r.number}`);
        const rc = r.getCell(Math.ceil(cols / 2) + 1);
        rc.value = rightLines[i];
        rc.font = { size: 10 };
        rc.alignment = { horizontal: 'right' };
      }
    }
    sheet.addRow([]); // spacer
  }

  /**
   * 販売店別: 1シートを「文書ページ」単位に出力する。各ページ先頭に帳票ヘッダ
   * （ページ数 k/M をセルに直接）を書き、明細 N 行ごとに手動改ページを入れる。
   * グループがページをまたぐときは見出し帯に「（続き）」を付け、小計はグループの
   * 最終行が載るページに出す。Excel を開いた時点で各ページがヘッダ付き・番号付き
   * で縦に並ぶ。
   */
  private fillHanbaitenSheet(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
  ): void {
    const COLS = 7;
    sheet.columns = [
      { width: 9 }, { width: 24 }, { width: 32 }, { width: 16 },
      { width: 18 }, { width: 14 }, { width: 11 },
    ];
    const lastCol = String.fromCodePoint(64 + COLS); // 'G'
    const outDate = nowDateJst();
    const outTime = nowTimeJst(); // 全ページ同一時刻（ページ毎の再評価でズレない）

    // 明細行を描画順にフラット化 + グループの先頭/最終インデックス。
    const { flat, firstIdx, lastIdx } = this.flattenHanbaitenRows(data);

    const N = EXCEL_ROWS_PER_PAGE.hanbaiten;
    const totalPages = Math.max(1, Math.ceil(flat.length / N));
    let idx = 0;
    for (let page = 1; page <= totalPages; page++) {
      const pageStart = idx;
      this.writeHanbaitenPageHeader(sheet, data, COLS, page, totalPages, outDate, outTime);
      idx = this.writeHanbaitenPageDetails(
        sheet,
        flat,
        { start: idx, end: Math.min(idx + N, flat.length), pageStart },
        { firstIdx, lastIdx },
        { cols: COLS, lastCol },
      );
      // 合計は最終ページにのみ（複数販売店のとき）。
      if (page === totalPages && data.hanbaiten_groups.length > 1) {
        this.styleRow(
          sheet.addRow(['', '', '', '', '', '合計', `${data.grand_total_busu}件`]),
          COLS,
          { fill: true, bold: true, center: true },
        );
      }
      // ページ間に手動改ページ（最終ページの後ろには入れない）。
      if (page < totalPages && sheet.lastRow) sheet.lastRow.addPageBreak();
    }

    this.applyA4PageSetup(sheet);
  }

  /** 明細行を描画順にフラット化し、販売店ごとの先頭/最終インデックスを得る。 */
  private flattenHanbaitenRows(data: MeiboPreviewData): {
    flat: { hg: HanbaitenGroup; row: HanbaitenReportRow }[];
    firstIdx: Map<number, number>;
    lastIdx: Map<number, number>;
  } {
    const flat: { hg: HanbaitenGroup; row: HanbaitenReportRow }[] = [];
    for (const hg of data.hanbaiten_groups) {
      for (const sg of hg.kanri_shiten_groups) {
        for (const row of sg.rows) flat.push({ hg, row });
      }
    }
    const firstIdx = new Map<number, number>();
    const lastIdx = new Map<number, number>();
    flat.forEach((f, i) => {
      if (!firstIdx.has(f.hg.hanbaiten_id)) firstIdx.set(f.hg.hanbaiten_id, i);
      lastIdx.set(f.hg.hanbaiten_id, i);
    });
    return { flat, firstIdx, lastIdx };
  }

  /**
   * 1 文書ページ分の明細（販売店見出し帯 + 明細行 + グループ小計）を書き、
   * 次ページ開始の flat インデックスを返す。
   */
  private writeHanbaitenPageDetails(
    sheet: ExcelJS.Worksheet,
    flat: { hg: HanbaitenGroup; row: HanbaitenReportRow }[],
    range: { start: number; end: number; pageStart: number },
    idxMaps: { firstIdx: Map<number, number>; lastIdx: Map<number, number> },
    layout: { cols: number; lastCol: string },
  ): number {
    const { cols, lastCol } = layout;
    let idx = range.start;
    let curHg: number | null = null;
    while (idx < range.end) {
      const { hg, row } = flat[idx];
      if (hg.hanbaiten_id !== curHg) {
        this.writeHanbaitenBand(
          sheet,
          hg,
          cols,
          lastCol,
          idxMaps.firstIdx.get(hg.hanbaiten_id)! < range.pageStart,
        );
        curHg = hg.hanbaiten_id;
      }
      this.writeHanbaitenDetail(sheet, row, cols);
      if (idx === idxMaps.lastIdx.get(hg.hanbaiten_id)) {
        this.styleRow(
          sheet.addRow(['', '', '', '', '', '小計', `${hg.total_busu}件`]),
          cols,
          { fill: true, bold: true, center: true },
        );
      }
      idx++;
    }
    return idx;
  }

  /** 販売店別: 1ページ分の帳票ヘッダ + 表頭（ページ数 k/M をセルに直接）。 */
  private writeHanbaitenPageHeader(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
    cols: number,
    pageNo: number,
    totalPages: number,
    outDate: string,
    outTime: string,
  ): void {
    const head = data.hanbaiten_groups[0];
    const names = data.hanbaiten_groups.map((g) => g.hanbaiten_name).join('、');
    const shisho = data.hanbaiten_groups[0]?.kanri_shiten_groups[0]?.kanri_shiten_name ?? '';
    this.writeReportHeader(
      sheet,
      cols,
      '販売店別購読者名簿',
      [
        `販売店コード：${head?.hanbaiten_code ?? ''}`,
        `${names}　御中`,
        `TEL：${head?.hanbaiten_tel || '-'}`,
        `FAX：${head?.hanbaiten_fax || '-'}`,
        `${data.tekiyo_date} 現在`,
      ],
      [
        `${data.ja_name}　TEL：${data.ja_tel || '-'}`,
        `${shisho || '（未割当）支所'}　TEL：-`,
        `出力日：${outDate}`,
        `出力時間：${outTime}`,
        `ページ数：${pageNo}/${totalPages}`,
      ],
    );
    const th = sheet.addRow([
      'チェック欄', '配達先氏名\n配達先氏名かな', '配達先住所', '管理支店',
      '配達先電話番号', '購読開始日', '購読部数',
    ]);
    this.styleRow(th, cols, { fill: true, bold: true, center: true });
  }

  /** 販売店 見出し帯（続きのときは「（続き）」を付す）。 */
  private writeHanbaitenBand(
    sheet: ExcelJS.Worksheet,
    hg: HanbaitenGroup,
    cols: number,
    lastCol: string,
    continued: boolean,
  ): void {
    const codeSuffix = hg.hanbaiten_code ? `（${hg.hanbaiten_code}）` : '';
    const cont = continued ? '（続き）' : '';
    const bandRow = sheet.addRow([`${hg.hanbaiten_name}${codeSuffix}${cont}`]);
    this.styleRow(bandRow, cols, { fill: true, bold: true });
    sheet.mergeCells(`A${bandRow.number}:${lastCol}${bandRow.number}`);
    bandRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
  }

  /** 販売店別: 購読者1行（チェックボックス付き）。 */
  private writeHanbaitenDetail(
    sheet: ExcelJS.Worksheet,
    row: HanbaitenReportRow,
    cols: number,
  ): void {
    const detailRow = sheet.addRow([
      '□',
      `${row.shimei}\n${row.shimei_kana}`,
      this.formatAddressMultiline(row.haitatsu_address),
      row.kanri_shiten_name,
      row.haitatsu_tel,
      isoDateToSlash(row.dokusya_kaishi_date),
      row.dokusya_busu,
    ]);
    this.styleRow(detailRow, cols);
    detailRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    detailRow.getCell(1).font = { size: 36 };
    detailRow.height = 48;
  }

  /**
   * 管理支店別: 文書ページ単位に出力（販売店別と同方針）。明細 N 行ごとに改ページ、
   * 各ページ先頭にヘッダ（ページ数 k/M をセルに直接）を書く。
   */
  private fillKanriShitenSheet(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
  ): void {
    const COLS = 7;
    sheet.columns = [
      { width: 22 }, { width: 18 }, { width: 30 }, { width: 9 },
      { width: 12 }, { width: 12 }, { width: 28 },
    ];
    const outDate = nowDateJst();
    const outTime = nowTimeJst();

    const flat: { kg: KanriShitenGroup; row: KanriShitenReportRow }[] = [];
    for (const kg of data.kanri_shiten_groups) {
      for (const row of kg.rows) flat.push({ kg, row });
    }
    const firstIdx = new Map<string, number>();
    const lastIdx = new Map<string, number>();
    const keyOf = (kg: KanriShitenGroup) =>
      kg.kanri_shiten_id == null ? 'none' : String(kg.kanri_shiten_id);
    flat.forEach((f, i) => {
      const k = keyOf(f.kg);
      if (!firstIdx.has(k)) firstIdx.set(k, i);
      lastIdx.set(k, i);
    });

    const N = EXCEL_ROWS_PER_PAGE.kanri_shiten;
    const totalPages = Math.max(1, Math.ceil(flat.length / N));
    let idx = 0;
    for (let page = 1; page <= totalPages; page++) {
      this.writeKanriPageHeader(sheet, data, COLS, page, totalPages, outDate, outTime);
      const pageEnd = Math.min(idx + N, flat.length);
      while (idx < pageEnd) {
        const { kg, row } = flat[idx];
        this.styleRow(
          sheet.addRow([
            `${row.shimei}\n${row.shimei_kana}`,
            `${row.kumiaiin_code || '-'}\n${row.haitatsu_tel}`,
            `${row.shiten_name}\n${this.formatAddressMultiline(row.haitatsu_address)}`,
            row.dokusya_busu,
            this.codeService.getLabel('DOKUSYA_SHUBETSU', row.dokusya_shubetsu),
            this.codeService.getLabel('SHIHARAI_HOHO', row.shiharai_hoho),
            `${isoDateToSlash(row.dokusya_kaishi_date)}\n${row.hanbaiten_name}`,
          ]),
          COLS,
        );
        if (idx === lastIdx.get(keyOf(kg))) {
          this.styleRow(
            sheet.addRow(['', '', '', '', '', '小計', `${kg.subtotal_busu}件`]),
            COLS,
            { fill: true, bold: true, center: true },
          );
        }
        idx++;
      }
      if (page === totalPages && data.kanri_shiten_groups.length > 1) {
        this.styleRow(
          sheet.addRow(['', '', '', '', '', '合計', `${data.grand_total_busu}件`]),
          COLS,
          { fill: true, bold: true, center: true },
        );
      }
      if (page < totalPages && sheet.lastRow) sheet.lastRow.addPageBreak();
    }

    this.applyA4PageSetup(sheet);
  }

  /** 管理支店別: 1ページ分の帳票ヘッダ + 表頭（ページ数 k/M をセルに直接）。 */
  private writeKanriPageHeader(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
    cols: number,
    pageNo: number,
    totalPages: number,
    outDate: string,
    outTime: string,
  ): void {
    const names = data.kanri_shiten_groups
      .map((g) => g.kanri_shiten_name || '（未割当）')
      .join('、');
    this.writeReportHeader(
      sheet,
      cols,
      '管理支店別購読者名簿',
      [`管理支店：${names}`, `${data.tekiyo_date} 現在`],
      [
        `${data.ja_name}　TEL：${data.ja_tel || '-'}`,
        `出力日：${outDate}`,
        `出力時間：${outTime}`,
        `ページ数：${pageNo}/${totalPages}`,
      ],
      false, // 管理支店別は手書きチェック欄なし
    );
    const th = sheet.addRow([
      '配達先氏名\n配達先氏名かな',
      '組合員コード\n配達先電話番号',
      '支店\n配達先住所',
      '購読部数',
      '購読種別',
      '支払方法',
      '購読開始日\n配達担当販売店',
    ]);
    this.styleRow(th, cols, { fill: true, bold: true, center: true });
  }

  /** `〒{7桁}{住所}` を `〒XXX-XXXX\n{住所}` の2行表記に整形。 */
  private formatAddressMultiline(addr: string): string {
    const m = /^〒(\d{7})(.*)$/.exec(addr ?? '');
    if (!m) return addr ?? '';
    return `〒${m[1].slice(0, 3)}-${m[1].slice(3)}\n${m[2]}`;
  }

  /**
   * {販売店別|管理支店別}購読者名簿_{YYYY年MM月}.xlsx（適用日
   * tekiyo_date=YYYY-MM-DD に基づく）。prefix は帳票種別で切替
   * （hanbaiten=販売店別 / kanri_shiten=管理支店別）。
   * 例: 販売店別購読者名簿_2026年01月.xlsx
   */
  private buildFilename(
    tekiyoDate: string,
    reportType: 'hanbaiten' | 'kanri_shiten',
  ): string {
    return `${this.buildBaseName(tekiyoDate, reportType)}.xlsx`;
  }

  /**
   * 拡張子を除いたファイル名の基底（例: 販売店別購読者名簿_2026年01月）。
   * ダウンロード名・S3 アーカイブ名の両方の土台にする。
   */
  private buildBaseName(
    tekiyoDate: string,
    reportType: 'hanbaiten' | 'kanri_shiten',
  ): string {
    const [y, m] = tekiyoDate.split('-');
    const prefix = reportType === 'hanbaiten' ? '販売店別' : '管理支店別';
    return `${prefix}${SHEET_NAME}_${y}年${m}月`;
  }

  // ─── ACSMS-SCR-028 private helpers ─────────────────────────────────

  /**
   * 適用日に変更があった増減対象レコードを取得する（api.md §4.4 のSQLと同一）。
   *   joho_henko_tekiyo_date = :tekiyo_date / zougen_hokoku_flg = true /
   *   h.haiten_flg = false（廃店・電子版ダミー販売店を除外）/ DataScope適用。
   */
  /** 明細行の SELECT 列（全件export・ページ行取得 共通）。 */
  private static readonly ZOUGEN_SELECT: string[] = [
    'r.dokusya_rireki_id AS dokusya_rireki_id',
    'r.dokusya_id AS dokusya_id',
    'r.hanbaiten_id AS hanbaiten_id',
    'h.hanbaiten_code AS hanbaiten_code',
    'h.hanbaiten_name AS hanbaiten_name',
    'r.zenkai_hanbaiten_id AS zenkai_hanbaiten_id',
    'zh.hanbaiten_code AS zenkai_hanbaiten_code',
    'zh.hanbaiten_name AS zenkai_hanbaiten_name',
    'r.kanri_shiten_id AS kanri_shiten_id',
    'ks.kanri_shiten_name AS kanri_shiten_name',
    'ks.tel AS kanri_shiten_tel',
    'ks.fax AS kanri_shiten_fax',
    'r.dokusya_busu AS dokusya_busu',
    'r.zenkai_dokusya_busu AS zenkai_dokusya_busu',
    'r.shimei_sei AS shimei_sei',
    'r.shimei_mei AS shimei_mei',
    'r.haitatsu_shimei_sei AS haitatsu_shimei_sei',
    'r.haitatsu_shimei_mei AS haitatsu_shimei_mei',
    'r.haitatsu_renrakusaki_1 AS haitatsu_renrakusaki_1',
    'td_now.todofuken_name AS now_todofuken_name',
    'r.haitatsu_shikuchoson AS haitatsu_shikuchoson',
    'r.haitatsu_chome_banchi AS haitatsu_chome_banchi',
    'r.haitatsu_tatemono_mei AS haitatsu_tatemono_mei',
    'td_zen.todofuken_name AS zen_todofuken_name',
    'r.zenkai_shikuchoson AS zenkai_shikuchoson',
    'r.zenkai_chome_banchi AS zenkai_chome_banchi',
    'r.zenkai_tatemono_mei AS zenkai_tatemono_mei',
    'r.biko AS biko',
  ];

  /**
   * 行集合を決める INNER JOIN(廃店除外) + WHERE + DataScope を組み立てた
   * QueryBuilder を返す（SELECT・並び順なし）。count / ページID / 明細行 の
   * 各クエリが共通の土台にすることでフィルタのドリフトを防ぐ。
   */
  private zougenBaseQuery(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      // 廃店(haiten_flg=true)はINNER JOINのON条件でサーバ側強制除外する。
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL AND h.haiten_flg = false',
      )
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date = :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true });

    if (query.hanbaiten_id && query.hanbaiten_id.length > 0) {
      // 販売店変更で「転出元（旧店）」も拾えるよう、現販売店 OR 前回販売店で絞る。
      qb.andWhere(
        '(r.hanbaiten_id IN (:...hanbaiten_id) OR r.zenkai_hanbaiten_id IN (:...hanbaiten_id))',
        { hanbaiten_id: query.hanbaiten_id },
      );
    }
    if (query.kanri_shiten_id && query.kanri_shiten_id.length > 0) {
      qb.andWhere('r.kanri_shiten_id IN (:...kanri_shiten_id)', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }

    // DataScope: CHUOKAI/JA_HONTEN → ja_id, JA_KANRI_SHITEN → kanri_shiten_id。
    applyBranchScope(
      qb,
      'r',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );
    return qb;
  }

  /** 名称用 LEFT JOIN + 明細 SELECT を付与（全件export・ページ行 共通）。 */
  private zougenDetailSelect(
    qb: SelectQueryBuilder<DokusyaRireki>,
  ): SelectQueryBuilder<DokusyaRireki> {
    return qb
      .leftJoin(
        'm_hanbaiten',
        'zh',
        'zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL',
      )
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin('m_todofuken', 'td_now', 'td_now.todofuken_code = r.haitatsu_todofuken_code')
      .leftJoin('m_todofuken', 'td_zen', 'td_zen.todofuken_code = r.zenkai_todofuken_code')
      .select(ReportService.ZOUGEN_SELECT);
  }

  /** 全件取得（export PDF 用。ページングなし）。 */
  private async fetchZougenRows(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenRawRow[]> {
    const qb = this.zougenDetailSelect(this.zougenBaseQuery(query, session));
    qb.orderBy('r.dokusya_id', 'ASC').addOrderBy('r.rireki_no', 'ASC');
    return qb.getRawMany<ZougenRawRow>();
  }

  /** 対象購読者数（dokusya_id の distinct 件数）。ページ数算出用。 */
  private async countZougenSubscribers(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<number> {
    const qb = this.zougenBaseQuery(query, session).select(
      'COUNT(DISTINCT r.dokusya_id)',
      'cnt',
    );
    const row = await qb.getRawOne<{ cnt: string }>();
    return Number(row?.cnt ?? 0);
  }

  /**
   * ページ対象の dokusya_id を SQL の OFFSET/LIMIT で取得（販売店コード昇順）。
   * 累計は購読者単位のため、ページングの最小単位も購読者（同日履歴をまたいで
   * 分割しない）。
   */
  private async fetchZougenSubscriberIds(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    offset: number,
    limit: number,
  ): Promise<number[]> {
    const qb = this.zougenBaseQuery(query, session)
      .select('r.dokusya_id', 'dokusya_id')
      .addSelect('MIN(h.hanbaiten_code)', 'hc')
      .groupBy('r.dokusya_id')
      .orderBy('hc', 'ASC')
      .addOrderBy('r.dokusya_id', 'ASC')
      .offset(offset)
      .limit(limit);
    const rows = await qb.getRawMany<{ dokusya_id: number | string }>();
    return rows.map((r) => Number(r.dokusya_id));
  }

  /** 指定購読者の同日履歴を全件取得（dokusya_id, rireki_no 昇順）。 */
  private async fetchZougenRowsByIds(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    dokusyaIds: number[],
  ): Promise<ZougenRawRow[]> {
    if (dokusyaIds.length === 0) return [];
    const qb = this.zougenDetailSelect(this.zougenBaseQuery(query, session))
      .andWhere('r.dokusya_id IN (:...dokusyaIds)', { dokusyaIds })
      .orderBy('r.dokusya_id', 'ASC')
      .addOrderBy('r.rireki_no', 'ASC');
    return qb.getRawMany<ZougenRawRow>();
  }

  /**
   * 増減連絡票（販売店）のファイル名基底（拡張子・タイムスタンプ無し）。
   * ログイン権限で分岐する：
   * - JA_KANRI_SHITEN → `増減連絡票_{ja_code}_{ja_name}_{YYYY年MM月DD日}`
   * - それ以外（CHUOKAI / JA_HONTEN など）→ `増減連絡票_{ja_code}_{YYYY年MM月DD日}`
   * 日付は適用日（tekiyo_date）に基づく。
   */
  private buildZougenBaseName(
    tekiyoDate: string,
    roleCode: string,
    jaCode: string,
    jaName: string,
  ): string {
    const [y, m, d] = tekiyoDate.split('-');
    const date = `${y}年${m}月${d}日`;
    if (roleCode === 'JA_KANRI_SHITEN') {
      return `増減連絡票_${jaCode}_${jaName}_${date}`;
    }
    return `増減連絡票_${jaCode}_${date}`;
  }

  /** ASCII別名：zougen_hanbaiten_{YYYYMMDD}.pdf（Content-Disposition filename用）。 */
  private buildZougenAsciiFilename(tekiyoDate: string): string {
    return `zougen_hanbaiten_${tekiyoDate.replaceAll('-', '')}.pdf`;
  }

  // ─── ACSMS-SCR-029 private helpers ─────────────────────────────────

  /**
   * 適用日に増減があった増減対象レコードを取得する（api.md §4.5 のSQLと同一）。
   *   joho_henko_tekiyo_date = :tekiyo_date / zougen_hokoku_flg = true /
   *   h.haiten_flg = false / 現在部数=0 かつ 新部数=0 を除外 / DataScope適用。
   */
  /** 明細行の SELECT 列（全件export・ページ行取得 共通）。 */
  private static readonly NICHINO_SELECT: string[] = [
    'r.dokusya_rireki_id AS dokusya_rireki_id',
    'r.dokusya_id AS dokusya_id',
    'r.hanbaiten_id AS hanbaiten_id',
    'h.hanbaiten_code AS hanbaiten_code',
    'h.hanbaiten_name AS hanbaiten_name',
    'h.itaku_kubun AS itaku_kubun',
    'h.torihikisaki_no AS torihikisaki_no',
    'r.zenkai_hanbaiten_id AS zenkai_hanbaiten_id',
    'zh.hanbaiten_code AS zenkai_hanbaiten_code',
    'zh.hanbaiten_name AS zenkai_hanbaiten_name',
    'zh.itaku_kubun AS zenkai_itaku_kubun',
    'zh.torihikisaki_no AS zenkai_torihikisaki_no',
    'r.kanri_shiten_id AS kanri_shiten_id',
    'ks.kanri_shiten_code AS kanri_shiten_code',
    'ks.kanri_shiten_name AS kanri_shiten_name',
    'ks.tel AS kanri_shiten_tel',
    'ks.fax AS kanri_shiten_fax',
    'td.todofuken_name AS todofuken_name',
    'j.ja_name AS ja_name',
    'j.tanto_busho AS tanto_busho',
    'j.tanto_name AS tanto_name',
    'r.dokusya_busu AS dokusya_busu',
    'r.zenkai_dokusya_busu AS zenkai_dokusya_busu',
  ];

  /**
   * 行集合を決める INNER JOIN（廃店除外 h / 管理支店 ks / JA j）+ WHERE + DataScope を
   * 組み立てた QueryBuilder を返す（SELECT・並び順なし）。count / ページID / 明細行 の
   * 各クエリで共通の土台にしてフィルタのドリフトを防ぐ（SCR-028 と同方針）。
   */
  private nichinoBaseQuery(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL AND h.haiten_flg = false',
      )
      .innerJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .innerJoin('m_ja', 'j', 'j.ja_id = r.ja_id AND j.deleted_at IS NULL')
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date = :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true })
      // 現在部数=0 かつ 新部数=0 のレコードは除外（api.md §4.5）。
      .andWhere(
        'NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)',
      );

    if (query.kanri_shiten_id && query.kanri_shiten_id.length > 0) {
      qb.andWhere('r.kanri_shiten_id IN (:...kanri_shiten_id)', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }

    // DataScope: CHUOKAI/JA_HONTEN → ja_id, JA_KANRI_SHITEN → kanri_shiten_id。
    applyBranchScope(
      qb,
      'r',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );
    return qb;
  }

  /** 名称用 LEFT JOIN（前回販売店 zh / 都道府県 td）+ 明細 SELECT を付与。 */
  private nichinoDetailSelect(
    qb: SelectQueryBuilder<DokusyaRireki>,
  ): SelectQueryBuilder<DokusyaRireki> {
    return qb
      .leftJoin(
        'm_hanbaiten',
        'zh',
        'zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL',
      )
      .leftJoin('m_todofuken', 'td', 'td.todofuken_code = ks.todofuken_code')
      .select(ReportService.NICHINO_SELECT);
  }

  /** 全件取得（export PDF 用。ページングなし）。 */
  private async fetchZougenNichinoRows(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): Promise<ZougenNichinoRawRow[]> {
    const qb = this.nichinoDetailSelect(this.nichinoBaseQuery(query, session));
    qb.orderBy('r.dokusya_id', 'ASC').addOrderBy('r.rireki_no', 'ASC');
    return qb.getRawMany<ZougenNichinoRawRow>();
  }

  /** 対象購読者数（dokusya_id の distinct 件数）。ページ数算出用。 */
  private async countNichinoSubscribers(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): Promise<number> {
    const row = await this.nichinoBaseQuery(query, session)
      .select('COUNT(DISTINCT r.dokusya_id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    return Number(row?.cnt ?? 0);
  }

  /**
   * ページ対象の dokusya_id を SQL の OFFSET/LIMIT で取得（管理支店コード昇順 →
   * 販売店コード昇順 → dokusya_id 昇順＝プレビューの表示順）。累計は購読者単位の
   * ため、ページングの最小単位も購読者（同日履歴をまたいで分割しない）。
   */
  private async fetchNichinoSubscriberIds(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
    offset: number,
    limit: number,
  ): Promise<number[]> {
    const rows = await this.nichinoBaseQuery(query, session)
      .select('r.dokusya_id', 'dokusya_id')
      .addSelect('MIN(ks.kanri_shiten_code)', 'ksc')
      .addSelect('MIN(h.hanbaiten_code)', 'hc')
      .groupBy('r.dokusya_id')
      .orderBy('ksc', 'ASC')
      .addOrderBy('hc', 'ASC')
      .addOrderBy('r.dokusya_id', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ dokusya_id: number | string }>();
    return rows.map((r) => Number(r.dokusya_id));
  }

  /** 指定購読者の同日履歴を全件取得（dokusya_id, rireki_no 昇順）。 */
  private async fetchNichinoRowsByIds(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
    dokusyaIds: number[],
  ): Promise<ZougenNichinoRawRow[]> {
    if (dokusyaIds.length === 0) return [];
    const qb = this.nichinoDetailSelect(this.nichinoBaseQuery(query, session))
      .andWhere('r.dokusya_id IN (:...dokusyaIds)', { dokusyaIds })
      .orderBy('r.dokusya_id', 'ASC')
      .addOrderBy('r.rireki_no', 'ASC');
    return qb.getRawMany<ZougenNichinoRawRow>();
  }
}
