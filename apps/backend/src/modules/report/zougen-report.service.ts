import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope } from '@/common/utils/data-scope';
import { ScreenName } from '@/common/constants/screen-name.constant';
import {
  AuditOperation,
  DokusyaShubetsu,
  DownloadType,
  RoleCode,
} from '@/common/enums';

import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ZougenNichinoQueryDto } from './dto/zougen-nichino-query.dto';
import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import { PdfExportService } from './pdf-export.service';
import { ReportNotificationService } from './report-notification.service';
import {
  buildZougenDocDefinition,
  groupZougenReports,
  jpDate,
  paginateZougenSubscribers,
  ZOUGEN_PER_PAGE,
  type AddressChangeRow,
  type ZougenEntry,
  type ZougenReport,
  type ZougenPreviewData,
  type ZougenRawRow,
} from './zougen.mapper';
import {
  buildZougenNichinoDocDefinition,
  formatGenBusu,
  formatKanriShitenCode,
  groupZougenNichinoReports,
  paginateNichinoSubscribers,
  ZOUGEN_NICHINO_PER_PAGE,
  type ZougenNichinoReport,
  type ZougenNichinoPreviewData,
  type ZougenNichinoRawRow,
} from './zougen-nichino.mapper';

// ─── ACSMS-SCR-028 — 増減連絡票（販売店） ─────────────────────────────
// ACSMS-SCR-028 は共通の FileArchiveService 経由で S3 + t_file_download に保存する
// ため、操作ログの対象テーブルは t_file_download。
const ZOUGEN_TARGET_TABLE = 't_file_download';
const PDF_MIME = 'application/pdf';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ZOUGEN_SHEET_NAME = '増減連絡票';
// ACSMS-SCR-029 も共通の FileArchiveService 経由で S3 + t_file_download に保存する
// ため、操作ログの対象テーブルは t_file_download。
const NICHINO_TARGET_TABLE = 't_file_download';
const NICHINO_SHEET_NAME = '増減通知';

// ─── ACSMS-SCR-029 — 増減通知（日本農業新聞） ─────────────────────────

/**
 * ファイル名の一部（JA名・管理支店名）をサニタイズする。区切り文字 `_` と
 * ファイルパス／S3キーで問題になる文字を除去し、空白を1つに畳む。日本語は保持。
 */
function sanitizeFilenamePart(value: string): string {
  return value
    .replaceAll(/[/\\:*?"<>|_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
 * ACSMS-SCR-029 出力結果。対象0件は `{ empty: true }`。
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
export class ZougenReportService {
  constructor(
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    private readonly auditLog: AuditLogService,
    private readonly fileArchive: FileArchiveService,
    @Optional()
    private readonly pdfService?: PdfExportService,
    // ACSMS-SCR-029 appends this（日農担当者へのメール通知）. @Optional() so the
    // ACSMS-SCR-026/028 specs that `new` with fewer args keep type-checking.
    @Optional()
    private readonly reportNotification?: ReportNotificationService,
  ) {}

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  async previewZougenHanbaiten(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenPreviewData> {
    // グループ単位ページング（顧客要件 2026-07・ACSMS-SCR-026/029 と同方針）: 販売店+管理支店
    // (combo)ごとに独立ページ、ページ数は販売店ごとに 1..N。全件取得 →
    // paginateZougenSubscribers で combo ページに分割し、要求ページを返す。preview と
    // PDF が同じ関数を共有するのでページ構成は一致（BEが唯一の真実源）。0件は 200 + 空。
    const perPage = query.per_page ?? ZOUGEN_PER_PAGE;
    const rows = await this.fetchZougenRows(query, session);
    // hanbaitenFilter 指定時、行取得(EXISTS)は同日の関連行を広めに含むが、出力は
    // 選択した店舗の分類結果だけに絞る（顧客要件2026-08 — フィルタで選んだ店の分だけ
    // 表示する）。group_count はその絞り込み後の pages から数える — rows ベースだと
    // 転出/転入の相手店（表示されない側）が紛れ込み、実際に出力される件数と食い違う。
    const pages = paginateZougenSubscribers(rows, perPage, query.hanbaiten_id);
    const totalRows = new Set(rows.map((r) => Number(r.dokusya_id))).size;
    if (pages.length === 0) {
      return {
        tekiyo_date: query.tekiyo_date,
        reports: [],
        page_no: 1,
        per_page: perPage,
        total_pages: 1,
        total_rows: 0,
        is_last_page: true,
        group_count: 0,
        group_page_no: 1,
        group_total_pages: 1,
      };
    }
    const totalPages = pages.length;
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const pageReports = pages[page - 1];
    const rep = pageReports[0];
    return {
      tekiyo_date: query.tekiyo_date,
      reports: pageReports,
      page_no: page,
      per_page: perPage,
      total_pages: totalPages,
      total_rows: totalRows,
      is_last_page: page >= totalPages,
      // 全体の販売店グループ数（絞り込み後・実際に出力される独立販売店の数）。
      group_count: new Set(pages.flat().map((r) => r.hanbaiten_id)).size,
      group_page_no: rep?.group_page_no ?? 1,
      group_total_pages: rep?.group_total_pages ?? 1,
    };
  }

  // ─── ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export ──
  async exportZougenHanbaitenPdf(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenResult> {
    // ACSMS-SCR-028 は FileArchiveService 経由で S3 + t_file_upload に保存するため
    // dataSource トランザクションは使わない。PDF 生成のみ必須。
    if (!this.pdfService) {
      throw new Error(
        'ReportService.pdfService is undefined — SCR-028 export requires it.',
      );
    }

    try {
      const rows = await this.fetchZougenRows(query, session);
      // hanbaitenFilter 適用後（顧客要件2026-08）の分類結果で0件判定する。行取得
      // (EXISTS)は同日の関連行を広めに含むため、rows.length だけでは「選択した
      // 店舗の分類結果が実際には0件」のケースを見逃す。
      const reports = groupZougenReports(rows, query.hanbaiten_id); // 監査ログの販売店帳票数用
      if (reports.length === 0) return { empty: true };

      // PDFはプレビューと同じ改ページ（20購読者/ページ・販売店コード順）で出力する。
      const docDefinition = buildZougenDocDefinition(
        rows,
        query.tekiyo_date,
        ZOUGEN_PER_PAGE,
        query.issued_at ?? '',
        query.hanbaiten_id,
      );
      const buffer = await this.pdfService.generatePdf(docDefinition);

      // ファイル名はログイン権限で分岐する（顧客要件2026-07・機能詳細3.2）。
      // ダウンロード名・DB表示名はタイムスタンプ無し、S3キーのみ FileArchiveService が
      // 14桁の JST タイムスタンプを付与して一意化する。
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const baseName = this.buildZougenBaseName(
        query.tekiyo_date,
        session.role_code,
        ja.code,
        ja.name,
        rows[0]?.kanri_shiten_name ?? '',
        rows[0]?.kanri_shiten_code ?? '',
      );
      const filename = `${baseName}.pdf`;
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date, '.pdf');

      // S3 保存 + t_file_upload 登録は共通の FileArchiveService に委譲する。
      // S3 パス: reports/zougen-hanbaiten/{ja_code}/{year}/（subFolder なし）。
      const [year] = query.tekiyo_date.split('-');
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        // DB/DL表示名は baseName（タイムスタンプ無し）、S3キーは別途一意化。
        displayName: baseName,
        category: 'zougen-hanbaiten',
        // 増減連絡票（販売店） (SCR-028)：日農担当者DL不可。
        downloadType: DownloadType.ZOUGEN,
        nichinoDownloadAllowedFlg: false,
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
        ScreenName.ACSMS_SCR_028,
        ZOUGEN_TARGET_TABLE,
        archived.fileDownloadId,
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
      await this.auditLog.logExport(ctx, {
        operation: AuditOperation.EXPORT_PDF,
        afterValue,
      });

      return { empty: false, buffer, filename, asciiFilename };
    } catch (err) {
      // DB/S3/PDF障害等は log_type=3 をトランザクション外で記録する（4.8）。
      // 0件は throw ではなく早期 return のためここには到達しない。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_028, ZOUGEN_TARGET_TABLE, null),
        AuditOperation.EXPORT_PDF,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-028-003 — POST /api/v1/report/zougen-hanbaiten/export-excel ──
  /**
   * レポートプレビューと同じ内容（販売店＋管理支店ごとの増部/減部/住所変更）を、
   * 実際の増減連絡票PDFの帳票体裁に近い形でExcel出力する（顧客要件2026-08-26）。
   * PDF出力（exportZougenHanbaitenPdf）とは独立の読み取り専用出力で、集計・
   * ファイル名の役職分岐（buildZougenBaseName）・FileArchiveService経由の
   * S3保存は共通。メール送信なし。
   */
  async exportZougenHanbaitenExcel(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenResult> {
    try {
      const rows = await this.fetchZougenRows(query, session);
      // hanbaitenFilter 適用後の分類結果で0件判定する（PDF export と同じ理由）。
      const reports = groupZougenReports(rows, query.hanbaiten_id);
      if (reports.length === 0) return { empty: true };

      const buffer = await this.buildZougenExcelBuffer(rows, query);

      // ファイル名はログイン権限で分岐する（顧客要件2026-07・機能詳細3.2、PDF と同一規約）。
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const baseName = this.buildZougenBaseName(
        query.tekiyo_date,
        session.role_code,
        ja.code,
        ja.name,
        rows[0]?.kanri_shiten_name ?? '',
        rows[0]?.kanri_shiten_code ?? '',
      );
      const filename = `${baseName}.xlsx`;
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date, '.xlsx');

      // S3 保存 + t_file_upload 登録は共通の FileArchiveService に委譲する。
      // S3 パス: reports/zougen-hanbaiten/{ja_code}/{year}/（subFolder なし、PDF と同じ場所）。
      const [year] = query.tekiyo_date.split('-');
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        displayName: baseName,
        category: 'zougen-hanbaiten',
        // 増減連絡票（販売店） (SCR-028)：日農担当者DL不可（PDF と同方針）。
        downloadType: DownloadType.ZOUGEN,
        nichinoDownloadAllowedFlg: false,
        year,
        jaId: session.ja_id ?? null,
        jaCode: ja.code,
        session,
        recordCount: rows.length,
        contentType: XLSX_MIME,
        extension: '.xlsx',
      });

      const ctx = buildAuditCtx(
        session,
        req,
        ScreenName.ACSMS_SCR_028,
        ZOUGEN_TARGET_TABLE,
        archived.fileDownloadId,
      );
      // 個人情報（氏名・住所）は含めず、出力条件と件数のみを記録する（PDF export と同じ）。
      const afterValue = JSON.stringify({
        tekiyo_date: query.tekiyo_date,
        hanbaiten_id: query.hanbaiten_id ?? null,
        kanri_shiten_id: query.kanri_shiten_id ?? null,
        report_count: reports.length,
        record_count: rows.length,
        file_name: filename,
      });
      await this.auditLog.logExport(ctx, {
        operation: AuditOperation.EXPORT_EXCEL,
        afterValue,
      });

      return { empty: false, buffer, filename, asciiFilename };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_028, ZOUGEN_TARGET_TABLE, null),
        AuditOperation.EXPORT_EXCEL,
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
    // グループ単位ページング（顧客要件 2026-07・SCR-026 と同方針）: 管理支店ごとに
    // 独立A4ページ。全件取得 → paginateNichinoSubscribers で管理支店ページに分割し、
    // 要求ページを返す。preview と PDF が同じ関数を共有するのでページ構成は一致する
    // （BEが唯一の真実源）。0件は 200 + 空 reports（no-data方針）。
    const perPage = query.per_page ?? ZOUGEN_NICHINO_PER_PAGE;
    const rows = await this.fetchZougenNichinoRows(query, session);
    const pages = paginateNichinoSubscribers(rows, perPage);
    // 対象購読者数（ページングの単位ではないが従来の total_rows と互換のため保持）。
    const totalRows = new Set(rows.map((r) => Number(r.dokusya_id))).size;
    if (pages.length === 0) {
      return {
        tekiyo_date: query.tekiyo_date,
        reports: [],
        page_no: 1,
        per_page: perPage,
        total_pages: 1,
        total_rows: 0,
        is_last_page: true,
        group_count: 0,
        group_page_no: 1,
        group_total_pages: 1,
      };
    }
    const totalPages = pages.length;
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const pageReports = pages[page - 1];
    const rep = pageReports[0];
    return {
      tekiyo_date: query.tekiyo_date,
      reports: pageReports,
      page_no: page,
      per_page: perPage,
      total_pages: totalPages,
      total_rows: totalRows,
      is_last_page: page >= totalPages,
      // 全体の管理支店グループ数（= 独立管理支店の数）。
      group_count: new Set(rows.map((r) => Number(r.kanri_shiten_id))).size,
      group_page_no: rep?.group_page_no ?? 1,
      group_total_pages: rep?.group_total_pages ?? 1,
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

      // 表示ファイル名（顧客要件2026-07・機能詳細3.2）— 出力アカウントのロール別:
      //   JA本店 / 中央会      : 増減通知_{JA名}_{JAコード}_{適用日YYYYMMDD}
      //   JA管理支店           : 増減通知_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}
      // 中央会・JA本店は複数管理支店にまたがるため管理支店をファイル名に含めない。
      // JA管理支店は自管理支店のみのスコープなので rows[0] の管理支店で確定できる。
      const [year] = query.tekiyo_date.split('-');
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const jaCode = ja.code;
      const baseName = this.buildZougenNichinoBaseName(
        query.tekiyo_date,
        session.role_code,
        jaCode,
        ja.name,
        rows[0]?.kanri_shiten_name ?? '',
        rows[0]?.kanri_shiten_code ?? '',
      );

      // S3 保存 + t_file_download 登録は共通の FileArchiveService に委譲する。
      // S3 パス: reports/zougen-nichino/{ja_code}/{YYYY}/（subFolder なし、
      // YYYY=適用日の年）。S3キーは baseName＋14桁(JST)タイムスタンプで一意化し、
      // DB/DL表示名(file_name)は displayName（タイムスタンプ無し）を用いる。
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        displayName: baseName,
        category: 'zougen-nichino',
        // 増減通知（日本農業新聞） (SCR-029)：日農担当者DL可。
        downloadType: DownloadType.ZOUGEN_NICHINO,
        nichinoDownloadAllowedFlg: true,
        year,
        jaCode,
        jaId: session.ja_id ?? null,
        session,
        recordCount: rows.length,
        contentType: PDF_MIME,
        extension: '.pdf',
      });

      // 日農担当者（NICHINO_ADMIN/STAFF）へメール自動通知（4.5・顧客要件2026-07）。
      // 件名・本文に都道府県 + 発行アカウント（ログインID+アカウント名）を含める。
      // fire-and-forget / non-fatal: notify* は throw しないため await して
      // recipient_count を得る（メール失敗時も S3保存・監査ログは成功扱い）。
      const recipientCount =
        (await this.reportNotification?.notifyNichinoExport({
          session,
          // 出力スコープ（1JA/1中央会）内の都道府県は単一のため rows[0] で確定。
          todofukenName: rows[0]?.todofuken_name ?? '',
          tekiyoDate: query.tekiyo_date,
          fileName: archived.filename,
          recordCount: rows.length,
        })) ?? 0;

      // 操作ログ（4.7）— アーカイブと原子的に対にすべき DML がないため
      // 単一トランザクションは組まず、標準コネクションで記録する。
      const ctx = buildAuditCtx(
        session,
        req,
        ScreenName.ACSMS_SCR_029,
        NICHINO_TARGET_TABLE,
        archived.fileDownloadId,
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
      await this.auditLog.logExport(ctx, {
        operation: AuditOperation.EXPORT_PDF,
        afterValue,
      });

      // ブラウザへは返さず、保存ファイル名と通知宛先数のみ返す（4.8）。
      return { empty: false, fileName: archived.filename, recipientCount };
    } catch (err) {
      // DB/S3/PDF障害等は log_type=3 をトランザクション外で記録する（4.9）。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_029, NICHINO_TARGET_TABLE, null),
        AuditOperation.EXPORT_PDF,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-029-003 — POST /api/v1/report/zougen-nichino/export-excel ──
  /**
   * レポートプレビューと同じ内容（管理支店ごとの委託/販売店コード/販売店名/現在部数/
   * 増部数/減部数/新部数）を、実際の増減通知PDFの帳票体裁に近い形でExcel出力する
   * （顧客要件2026-08-26）。PDF出力（exportZougenNichinoPdf）と同じくブラウザへは
   * 返さず、S3アーカイブ + 日農担当者へのメール通知のみ行う（自動ダウンロードなし）。
   *
   * セル結合は一切行わない（SCR-028 Excel export で判明した実運用障害の教訓 —
   * ExcelJS.mergeCells() は呼び出しごとに既存の全結合を走査するため、ページ数の
   * 多い実データで O(ページ数²) となりバックエンド全体を長時間ブロックした）。
   * ページヘッダのラベルは列Aからの単一セル書き込み（左寄せオーバーフロー）のみ。
   */
  async exportZougenNichinoExcel(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenNichinoResult> {
    try {
      const rows = await this.fetchZougenNichinoRows(query, session);
      // 対象0件 → Excelは生成せず、履歴・操作ログ・メールも発生しない（PDF と同じ）。
      if (rows.length === 0) return { empty: true };

      const reports = groupZougenNichinoReports(rows);
      const bikoByKs = new Map<number, string>(
        (query.remarks ?? []).map((r) => [Number(r.kanri_shiten_id), r.biko ?? '']),
      );

      // プレビュー/PDFと同じ改ページ（管理支店ごとに独立ページ、28行超は自グループ内で
      // 複数ページ）で**1つのExcel**にまとめて出力する。ブラウザへは返さない。
      const buffer = await this.buildZougenNichinoExcelBuffer(
        rows,
        query.tekiyo_date,
        bikoByKs,
      );

      const [year] = query.tekiyo_date.split('-');
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const jaCode = ja.code;
      const baseName = this.buildZougenNichinoBaseName(
        query.tekiyo_date,
        session.role_code,
        jaCode,
        ja.name,
        rows[0]?.kanri_shiten_name ?? '',
        rows[0]?.kanri_shiten_code ?? '',
      );

      // S3 保存 + t_file_download 登録（PDF export と同じ場所・拡張子のみ .xlsx）。
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        displayName: baseName,
        category: 'zougen-nichino',
        downloadType: DownloadType.ZOUGEN_NICHINO,
        nichinoDownloadAllowedFlg: true,
        year,
        jaCode,
        jaId: session.ja_id ?? null,
        session,
        recordCount: rows.length,
        contentType: XLSX_MIME,
        extension: '.xlsx',
      });

      // 日農担当者へのメール自動通知は PDF export と同じ（fire-and-forget / non-fatal）。
      const recipientCount =
        (await this.reportNotification?.notifyNichinoExport({
          session,
          todofukenName: rows[0]?.todofuken_name ?? '',
          tekiyoDate: query.tekiyo_date,
          fileName: archived.filename,
          recordCount: rows.length,
        })) ?? 0;

      const ctx = buildAuditCtx(
        session,
        req,
        ScreenName.ACSMS_SCR_029,
        NICHINO_TARGET_TABLE,
        archived.fileDownloadId,
      );
      const afterValue = JSON.stringify({
        tekiyo_date: query.tekiyo_date,
        kanri_shiten_id: query.kanri_shiten_id ?? null,
        report_count: reports.length,
        record_count: rows.length,
        file_name: archived.filename,
        recipient_count: recipientCount,
      });
      await this.auditLog.logExport(ctx, {
        operation: AuditOperation.EXPORT_EXCEL,
        afterValue,
      });

      return { empty: false, fileName: archived.filename, recipientCount };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_029, NICHINO_TARGET_TABLE, null),
        AuditOperation.EXPORT_EXCEL,
        err as Error,
      );
      throw err;
    }
  }

  /**
   * 増減通知（日本農業新聞）のファイル名基底（拡張子・タイムスタンプ無し）。
   * PDF/Excel 両出力で共用。ロール別分岐は buildZougenBaseName（SCR-028）と同じ規約:
   * - JA本店 / 中央会 → `増減通知_{JA名}_{JAコード}_{適用日YYYYMMDD}`
   * - JA管理支店     → `増減通知_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}`
   */
  private buildZougenNichinoBaseName(
    tekiyoDate: string,
    roleCode: string,
    jaCode: string,
    jaName: string,
    kanriShitenName: string,
    kanriShitenCode: string,
  ): string {
    const ymd = tekiyoDate.replaceAll('-', '');
    const name = sanitizeFilenamePart(jaName);
    if (roleCode === RoleCode.JA_KANRI_SHITEN) {
      const ksName = sanitizeFilenamePart(kanriShitenName);
      return `増減通知_${name}_${jaCode}_${ksName}_${kanriShitenCode}_${ymd}`;
    }
    return `増減通知_${name}_${jaCode}_${ymd}`;
  }

  // ─── ACSMS-SCR-028 private helpers ─────────────────────────────────

  /** 明細行の SELECT 列（全件export・ページ行取得 共通）。 */
  private static readonly ZOUGEN_SELECT: string[] = [
    'r.dokusya_rireki_id AS dokusya_rireki_id',
    'r.dokusya_id AS dokusya_id',
    'r.hanbaiten_id AS hanbaiten_id',
    'h.hanbaiten_code AS hanbaiten_code',
    'h.hanbaiten_name AS hanbaiten_name',
    // #57976: 廃店(haiten_flg=true)を宛先とする報告を作らないための店舗単位判定に使う。
    'h.haiten_flg AS haiten_flg',
    'r.zenkai_hanbaiten_id AS zenkai_hanbaiten_id',
    'zh.hanbaiten_code AS zenkai_hanbaiten_code',
    'zh.hanbaiten_name AS zenkai_hanbaiten_name',
    'zh.haiten_flg AS zenkai_haiten_flg',
    'r.kanri_shiten_id AS kanri_shiten_id',
    'ks.kanri_shiten_code AS kanri_shiten_code',
    'ks.kanri_shiten_name AS kanri_shiten_name',
    'ks.tel AS kanri_shiten_tel',
    'ks.fax AS kanri_shiten_fax',
    'r.dokusya_busu AS dokusya_busu',
    'r.zenkai_dokusya_busu AS zenkai_dokusya_busu',
    // 電子版(2)は住所変更セクションから除外するため購読種別を取得する。
    'r.dokusya_shubetsu AS dokusya_shubetsu',
    'r.shimei_sei AS shimei_sei',
    'r.shimei_mei AS shimei_mei',
    'r.haitatsu_shimei_sei AS haitatsu_shimei_sei',
    'r.haitatsu_shimei_mei AS haitatsu_shimei_mei',
    // 電話番号列: haitatsu_same_flg=true → 購読者(renrakusaki_1)、false → 配達先。
    'r.renrakusaki_1 AS renrakusaki_1',
    'r.haitatsu_renrakusaki_1 AS haitatsu_renrakusaki_1',
    // 同日複数履歴のマージ(rmin/rmax)+ フィールド単位の住所比較に必要な生カラム。
    // haitatsu_same_flg=true → 購読者住所(r.*)、false → 配達先住所(haitatsu_*) を採用。
    'r.haitatsu_same_flg AS haitatsu_same_flg',
    // 購読者住所（生）
    'r.yubin_no AS yubin_no',
    'r.todofuken_code AS todofuken_code',
    'r.shikuchoson AS shikuchoson',
    'r.chome_banchi AS chome_banchi',
    'r.tatemono_mei AS tatemono_mei',
    // 配達先住所（生）
    'r.haitatsu_yubin_no AS haitatsu_yubin_no',
    'r.haitatsu_todofuken_code AS haitatsu_todofuken_code',
    'r.haitatsu_shikuchoson AS haitatsu_shikuchoson',
    'r.haitatsu_chome_banchi AS haitatsu_chome_banchi',
    'r.haitatsu_tatemono_mei AS haitatsu_tatemono_mei',
    // 前回住所（生。zenkai_shikuchoson/chome/tatemono は下で表示用にも選択）
    'r.zenkai_yubin_no AS zenkai_yubin_no',
    'r.zenkai_todofuken_code AS zenkai_todofuken_code',
    // 現住所: haitatsu_same_flg=true → 購読者住所(todofuken_code/shikuchoson/
    // chome_banchi/tatemono_mei)、false → 配達先住所(haitatsu_*) を採用する。
    'td_now.todofuken_name AS now_todofuken_name',
    'CASE WHEN r.haitatsu_same_flg THEN r.shikuchoson ELSE r.haitatsu_shikuchoson END AS now_shikuchoson',
    'CASE WHEN r.haitatsu_same_flg THEN r.chome_banchi ELSE r.haitatsu_chome_banchi END AS now_chome_banchi',
    'CASE WHEN r.haitatsu_same_flg THEN r.tatemono_mei ELSE r.haitatsu_tatemono_mei END AS now_tatemono_mei',
    'td_zen.todofuken_name AS zen_todofuken_name',
    'r.zenkai_shikuchoson AS zenkai_shikuchoson',
    'r.zenkai_chome_banchi AS zenkai_chome_banchi',
    'r.zenkai_tatemono_mei AS zenkai_tatemono_mei',
    'r.biko AS biko',
  ];

  /**
   * 行集合を決める INNER JOIN + WHERE + DataScope の QueryBuilder（SELECT/並び順
   * なし。api.md §4.4 と同一: joho=:tekiyo_date / zougen_hokoku_flg=true）。
   * 各クエリが共通の土台にしてフィルタのドリフトを防ぐ。
   *
   * #57976: 廃店(haiten_flg=true)を「行」単位で INNER JOIN 除外していたが、
   * これだと販売店変更で「転出元(旧店)→転入先(廃店)」となった行が丸ごと消え、
   * 旧店側の増減連絡票からもこの購読者の減部が欠落していた。廃店除外は
   * 「その店を宛先とする報告を作らない」という**店舗単位**のルールなので、
   * 行そのものは常に取得し、店舗ごとの haiten_flg を SELECT で運び、
   * classifyDayChange 側で報告作成の可否を判定する（zougen.mapper.ts 参照）。
   */
  private zougenBaseQuery(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      // 論理削除済み購読者（DokusyaService.remove()）を増減連絡票から除外する。
      // remove() の RELATED_TABLES は t_koza_furikae のみを FK ブロック対象とし
      // 履歴の有無では削除を止めないため、t_dokusya.deleted_at を明示的に確認する。
      .innerJoin(
        't_dokusya',
        'd',
        'd.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL',
      )
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date = :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true })
      // 取消(赤伝)行（誤入力行 + 対応する打ち消し行、いずれも zougen=true・同 joho）
      // を増減報告から除外する（履歴刷新 Pha5）。zougenBaseQuery は preview /
      // export / 同日履歴取得 で共用のため、この1箇所で 028・029 双方に効く。
      .andWhere('r.torikeshi_flg = false');

    // 集計対象は紙版(DokusyaShubetsu.PAPER=1)のみ（顧客要件 2026-08）。
    // 増減連絡票は販売店へ配達部数の増減を伝える帳票で、電子版・併読には
    // 配達という概念が無い（電子版単独はダミー販売店 9999999999 に紐づく）。
    //
    // 以前は「電子版は承認済(denshi_shonin_status=1)のみ集計」という条件だった。
    // 紙版限定はそれを包含する（電子版・併読は承認状態を問わず対象外）ので、
    // 条件を重ねずに置き換える — 残しても常に真で、読む側に「電子版も入りうる」と
    // 誤解させるだけ。SCR-029 増減通知は別の土台(nichinoBaseQuery)だが、そちらも
    // 同じく紙版限定（同条件を個別に持つ）。
    qb.andWhere('r.dokusya_shubetsu = :paperShubetsu', {
      paperShubetsu: DokusyaShubetsu.PAPER,
    });

    // 販売店統廃合フラグ=true の行は集計対象から除外する（顧客要件2026-08）。
    // 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面・SCR-015）経由の変更は
    // 販売店の統廃合に伴う付け替えであり、実際の増減として販売店へ通知したくないため。
    // SCR-029（増減通知・日本農業新聞）は仕様変更なし・別クエリ(nichinoBaseQuery)の
    // ため対象外（列はNOT NULL DEFAULT falseなのでIS NULL考慮は不要）。
    qb.andWhere('r.hanbaiten_tohaigo_flg = false');

    if (query.hanbaiten_id && query.hanbaiten_id.length > 0) {
      // 販売店変更で「転出元（旧店）」も拾えるよう、現販売店 OR 前回販売店が一致
      // する dokusya_id を対象にする。ただし判定は「同日(dokusya_id, joho)の
      // どれか1行でも一致するか」を EXISTS で行い、一致すればその dokusya_id の
      // 同日全行を取得する（行単位で絞ると同日複数履歴の一部だけが欠けて
      // groupZougenReports の rmin/rmax 集約が壊れるため。1件のみ変更なら
      // r.hanbaiten_id / r.zenkai_hanbaiten_id で自己完結し従来と同じ結果になる）。
      // 出力を選択した販売店だけに絞る処理は groupZougenReports 側の
      // hanbaitenFilter が担う（顧客要件 2026-08 — フィルタで選んだ店の分だけ表示）。
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM t_dokusya_rireki r2
            WHERE r2.dokusya_id = r.dokusya_id
              AND r2.joho_henko_tekiyo_date = r.joho_henko_tekiyo_date
              AND r2.torikeshi_flg = false
              AND (r2.hanbaiten_id IN (:...hanbaiten_id) OR r2.zenkai_hanbaiten_id IN (:...hanbaiten_id))
         )`,
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
      .leftJoin(
        'm_todofuken',
        'td_now',
        // 現住所の都道府県も haitatsu_same_flg で 購読者/配達先 を切替える。
        'td_now.todofuken_code = CASE WHEN r.haitatsu_same_flg THEN r.todofuken_code ELSE r.haitatsu_todofuken_code END',
      )
      .leftJoin('m_todofuken', 'td_zen', 'td_zen.todofuken_code = r.zenkai_todofuken_code')
      .select(ZougenReportService.ZOUGEN_SELECT);
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

  /**
   * 増減連絡票（販売店）のファイル名基底（拡張子・タイムスタンプ無し）。
   * 出力アカウントのロール別（顧客要件2026-07・機能詳細3.2）：
   * - JA本店 / 中央会 → `増減連絡票_{JA名}_{JAコード}_{適用日YYYYMMDD}`
   * - JA管理支店     → `増減連絡票_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}`
   * 中央会は複数管理支店にまたがるため管理支店を含めない（JA本店と同一形式）。
   * JA管理支店は自管理支店のみのスコープなので対象データ（rows[0]）で確定できる。
   * 日付は適用日（tekiyo_date）に基づく。
   */
  private buildZougenBaseName(
    tekiyoDate: string,
    roleCode: string,
    jaCode: string,
    jaName: string,
    kanriShitenName: string,
    kanriShitenCode: string,
  ): string {
    const ymd = tekiyoDate.replaceAll('-', '');
    const name = sanitizeFilenamePart(jaName);
    if (roleCode === RoleCode.JA_KANRI_SHITEN) {
      const ksName = sanitizeFilenamePart(kanriShitenName);
      return `増減連絡票_${name}_${jaCode}_${ksName}_${kanriShitenCode}_${ymd}`;
    }
    return `増減連絡票_${name}_${jaCode}_${ymd}`;
  }

  /** ASCII別名：zougen_hanbaiten_{YYYYMMDD}{extension}（Content-Disposition filename用）。 */
  private buildZougenAsciiFilename(tekiyoDate: string, extension: string): string {
    return `zougen_hanbaiten_${tekiyoDate.replaceAll('-', '')}${extension}`;
  }

  private readonly ZOUGEN_THIN_BORDER = {
    top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  };
  private readonly ZOUGEN_HEADER_FILL = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFF1F5F9' },
  };
  private readonly ZOUGEN_COLS = 6;
  // 部数8% / 住所30% / 氏名15% / 配達先読者名15% / 電話番号15% / 備考17%
  // （zougen.mapper.ts COL_WIDTHS と同じ比率。PDF は % 幅、Excel は文字幅なので
  // A4 1ページ幅に収まる程度の literal width に換算する）。
  private readonly ZOUGEN_COL_WIDTHS = [7, 32, 16, 16, 14, 18];

  private readonly NICHINO_COLS = 8;
  // 増減マーク4% / 委託8% / 販売店コード16% / 販売店名32% / 現在10% / 増10% / 減10% / 新10%
  // （zougen-nichino.mapper.ts COL_WIDTHS と同じ比率。PDFは%幅、Excelは文字幅換算）。
  private readonly NICHINO_COL_WIDTHS = [4, 8, 14, 28, 9, 9, 9, 9];

  /**
   * 増減連絡票（販売店）の Excel を生成する。実際のPDF帳票（zougen.mapper.ts の
   * buildZougenDocDefinition/reportContent/entrySection/addressSection）と
   * **同一のページ構成**（`paginateZougenSubscribers` を共有）で、1シート内に
   * 文書ページ単位のブロックとして縦に積む。ページ間は手動改ページ（印刷時に
   * PDFと同じ1ページ=1帳票になる）。
   */
  private async buildZougenExcelBuffer(
    rows: ZougenRawRow[],
    query: ZougenHanbaitenQueryDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(ZOUGEN_SHEET_NAME);
    // 既定のグリッド線を非表示にして、明示した枠線だけを見せる（meibo と同じ）。
    sheet.views = [{ showGridLines: false }];
    sheet.columns = this.ZOUGEN_COL_WIDTHS.map((width) => ({ width }));

    // PDF (buildZougenDocDefinition) と全く同じページ構成 — 販売店+管理支店(combo)
    // ごとに独立ページ、perPage(=ZOUGEN_PER_PAGE)件超は自 combo 内で複数ページに続く。
    const pages = paginateZougenSubscribers(
      rows,
      ZOUGEN_PER_PAGE,
      query.hanbaiten_id,
    );

    pages.forEach((pageReports, pi) => {
      for (const r of pageReports) {
        this.writeZougenPage(
          sheet,
          r,
          r.group_page_no ?? 1,
          r.group_total_pages ?? 1,
          query.tekiyo_date,
        );
      }
      // ページ間に手動改ページ（PDF の pageBreak: pi > 0 と同じ）。
      if (pi < pages.length - 1 && sheet.lastRow) sheet.lastRow.addPageBreak();
    });

    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    };
    // 発行日時（プレビュー押下時刻）を全ページのフッタ右寄せに印字する（PDF と同じ）。
    if (query.issued_at) {
      sheet.headerFooter = {
        oddFooter: `&R発行日時：${query.issued_at}`,
        evenFooter: `&R発行日時：${query.issued_at}`,
      };
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /** 表の1行のセル(1..cols)に枠線・塗り・寄せを適用（meibo styleRow と同じ規約。SCR-028/029 共用）。 */
  private styleZougenRow(
    row: ExcelJS.Row,
    cols: number,
    opts: { fill?: boolean; bold?: boolean; center?: boolean } = {},
  ): void {
    for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      cell.border = this.ZOUGEN_THIN_BORDER;
      if (opts.fill) cell.fill = this.ZOUGEN_HEADER_FILL;
      cell.font = { size: 9, bold: opts.bold ?? false };
      cell.alignment = {
        vertical: 'middle',
        wrapText: true,
        horizontal: opts.center ? 'center' : 'left',
      };
    }
  }

  /**
   * 1文書ページ（1帳票）を出力：タイトル+Page、販売店/管理支店ヘッダ、増部/減部/住所変更。
   *
   * ラベル行はセル結合せず、常に列Aから開始する単一セルへ書く（センタリングされた
   * "見た目上の結合" は行わない）。理由は住所変更セクションと同じ — mergeCells() は
   * 呼び出しごとに既存の全結合数を走査するため、combo（販売店+管理支店）数が多い
   * 実データ（1ページ=1 combo、大量combo で数千ページに及ぶ）ではページヘッダの結合
   * だけでも O(ページ数²) になり得る（実測: 55,000行/3,667ページ規模で2分超ブロック）。
   * 左寄せセルはExcelの標準挙動として右隣の空セルへ自然にオーバーフロー表示される
   * ため、視覚的な見え方はほぼ変わらない。
   */
  private writeZougenPage(
    sheet: ExcelJS.Worksheet,
    r: ZougenReport,
    pageNo: number,
    totalPages: number,
    tekiyoDate: string,
  ): void {
    const lastCol = this.ZOUGEN_COLS;

    // ── タイトル（列A、左寄せで右へオーバーフロー）+ Page：k/M（最終列、単独セル）──
    const titleRow = sheet.addRow([]);
    titleRow.getCell(1).value = '日本農業新聞増減連絡票';
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(lastCol).value = `Page：${pageNo}/${totalPages}`;
    titleRow.getCell(lastCol).font = { size: 8 };
    titleRow.getCell(lastCol).alignment = { horizontal: 'right' };

    // ── 販売店（列A）/ 管理支店（最終列、右寄せ）ヘッダ — reportContent の sellerRow と同じ情報 ──
    const leftLines = [
      `${r.hanbaiten_name}　御中`,
      `TEL：${r.kanri_shiten_tel || '-'}`,
      `FAX：${r.kanri_shiten_fax || '-'}`,
    ];
    const rightLines = [
      r.kanri_shiten_name || '（管理支店）',
      '＿＿＿＿＿＿ 部／ 担当：＿＿＿＿＿＿',
      `TEL：${r.kanri_shiten_tel || '-'}`,
      `FAX：${r.kanri_shiten_fax || '-'}`,
    ];
    const lines = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < lines; i++) {
      const row = sheet.addRow([]);
      if (leftLines[i] !== undefined) {
        row.getCell(1).value = leftLines[i];
        row.getCell(1).font = { size: 10, bold: i === 0 };
      }
      if (rightLines[i] !== undefined) {
        const rc = row.getCell(lastCol);
        rc.value = rightLines[i];
        rc.font = { size: 8 };
        rc.alignment = { horizontal: 'right' };
      }
    }

    // ── 適用日：下記の通り購読者が変更になりますのでお知らせします ──
    const noticeRow = sheet.addRow([
      `適用日：${jpDate(tekiyoDate)}　下記の通り購読者が変更になりますのでお知らせします`,
    ]);
    noticeRow.getCell(1).font = { size: 9 };
    sheet.addRow([]); // spacer

    this.writeZougenEntrySection(sheet, '増部', '新規氏名', r.zoubu);
    this.writeZougenEntrySection(sheet, '減部', '中止氏名', r.genbu);
    this.writeZougenAddressSection(sheet, r.address_change);
    sheet.addRow([]); // spacer（ページ末尾の余白）
  }

  /** 増部/減部の表（部数・住所・氏名・配達先読者名・電話番号・備考）— entrySection と同じ列構成。 */
  private writeZougenEntrySection(
    sheet: ExcelJS.Worksheet,
    title: string,
    nameHeader: string,
    entries: ZougenEntry[],
  ): void {
    const titleRow = sheet.addRow([title]);
    titleRow.getCell(1).font = { bold: true, size: 10 };
    const headerRow = sheet.addRow(['部数', '住所', nameHeader, '配達先読者名', '電話番号', '備考']);
    this.styleZougenRow(headerRow, this.ZOUGEN_COLS, { fill: true, bold: true, center: true });
    for (const e of entries) {
      const row = sheet.addRow([e.busu, e.address, e.name, e.delivery_name, e.phone, e.biko]);
      this.styleZougenRow(row, this.ZOUGEN_COLS);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
    // PDF の emptyRow()（罫線付き空白行）相当。件数の有無に関わらず表の末尾に必ず
    // 1行入れる — 0件のときも枠線付きの空行がプレビューPDFと同様に表示される
    // （顧客要件：0件でもExcelとPDFの見た目を揃える）。
    this.styleZougenRow(sheet.addRow([]), this.ZOUGEN_COLS);
    sheet.addRow([]); // spacer（セクション間の余白）
  }

  /**
   * 住所変更の表（変更前/変更後の2行1組）。
   *
   * PDF は氏名/配達先読者名/電話番号/備考を rowSpan=2 で縦結合するが、Excel では
   * ExcelJS.mergeCells() が呼び出しごとに既存の全結合を走査して重複チェックする
   * （worksheet.js `_mergeCellsInternal`）ため、1行ごとに複数回 mergeCells する実装は
   * O(結合数²) になる。住所変更が多い実データ（管理支店/販売店を絞らない全件出力等）で
   * Node イベントループを長時間占有し、バックエンド全体が固まる（#実測: nginx 504
   * 後もバックエンドがCPU100%張り付いたまま応答不能）。値を変更後行にも複製すること
   * で結合を完全に回避する（PDFと違い各行が値を持つだけで、rowSpan の見た目にはならない）。
   */
  private writeZougenAddressSection(
    sheet: ExcelJS.Worksheet,
    rows: AddressChangeRow[],
  ): void {
    const titleRow = sheet.addRow(['住所変更']);
    titleRow.getCell(1).font = { bold: true, size: 10 };
    const headerRow = sheet.addRow(['', '住所', '氏名', '配達先読者名', '電話番号', '備考']);
    this.styleZougenRow(headerRow, this.ZOUGEN_COLS, { fill: true, bold: true, center: true });

    for (let i = 0; i < rows.length; i += 2) {
      const before = rows[i];
      const after = rows[i + 1];
      const beforeRow = sheet.addRow([
        '変更前',
        before.address,
        before.name,
        before.delivery_name,
        before.phone,
        before.biko,
      ]);
      this.styleZougenRow(beforeRow, this.ZOUGEN_COLS);
      beforeRow.getCell(1).font = { bold: true, size: 9 };
      beforeRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // 氏名/配達先読者名/電話番号/備考は変更前後で同一値のため、結合せずそのまま複製する。
      const afterRow = sheet.addRow([
        '変更後',
        after?.address ?? '',
        before.name,
        before.delivery_name,
        before.phone,
        before.biko,
      ]);
      this.styleZougenRow(afterRow, this.ZOUGEN_COLS);
      afterRow.getCell(1).font = { bold: true, size: 9 };
      afterRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }
    // PDF の emptyRow()（罫線付き空白行）相当。件数の有無に関わらず表の末尾に必ず
    // 1行入れる — 0件のときも枠線付きの空行がプレビューPDFと同様に表示される。
    this.styleZougenRow(sheet.addRow([]), this.ZOUGEN_COLS);
    sheet.addRow([]); // spacer（セクション間の余白）
  }

  // ─── ACSMS-SCR-029 private helpers ─────────────────────────────────

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
   * 販売店 h / 前回販売店 zh / 管理支店 ks / JA j / 都道府県 td への JOIN のみを
   * 行う共通ヘルパ（WHERE・並び順・SELECTなし）。nichinoBaseQuery（当日の増減
   * 報告対象行）と nichinoBaselineQuery（動きの無い既存購読者の基礎行）の
   * 双方から同一の土台として使い、JOINのドリフトを防ぐ。
   */
  private nichinoJoins(
    qb: SelectQueryBuilder<DokusyaRireki>,
  ): SelectQueryBuilder<DokusyaRireki> {
    return qb
      // 論理削除済み購読者（DokusyaService.remove()）を増減通知から除外する。
      // 028 (zougenBaseQuery) と同じ根拠 — remove() は t_koza_furikae のみを
      // FK ブロック対象とし履歴の有無では削除を止めないため、ここで確認する。
      .innerJoin(
        't_dokusya',
        'd',
        'd.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL',
      )
      // #57976: 増減通知（日本農業新聞）は廃店(haiten_flg)を問わず対象とする
      // （028 増減連絡票と異なり、日農への通知は販売店の営業状態に関係なく
      // 全ての増減を報告する必要があるため、haiten_flg 条件は付けない）。
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .innerJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .innerJoin('m_ja', 'j', 'j.ja_id = r.ja_id AND j.deleted_at IS NULL')
      .leftJoin(
        'm_hanbaiten',
        'zh',
        'zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL',
      )
      .leftJoin('m_todofuken', 'td', 'td.todofuken_code = ks.todofuken_code');
  }

  /** kanri_shiten_id フィルタ + DataScope（nichinoBaseQuery / nichinoBaselineQuery 共通）。 */
  private applyNichinoScope(
    qb: SelectQueryBuilder<DokusyaRireki>,
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): void {
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
  }

  /**
   * 当日(適用日)の増減報告対象行を取得する QueryBuilder を返す（SELECT・並び順
   * なし）。count / ページID / 明細行 の各クエリで共通の土台にしてフィルタの
   * ドリフトを防ぐ（SCR-028 と同方針）。
   */
  private nichinoBaseQuery(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.nichinoJoins(this.rirekiRepo.createQueryBuilder('r'));
    qb.where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date = :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true })
      // 取消(赤伝)行を増減通知から除外する（履歴刷新 Pha5）。SCR-029 は 028 と別の
      // 土台(nichinoBaseQuery)を使うため、ここにも同じ条件を追加する。
      .andWhere('r.torikeshi_flg = false')
      // 現在部数=0 かつ 新部数=0 のレコードは除外（api.md §4.5）。
      .andWhere(
        'NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)',
      );

    // 集計対象は紙版(DokusyaShubetsu.PAPER=1)のみ（顧客要件 2026-08）。
    // 増減通知も部数の増減を伝える帳票で、電子版・併読は配達を伴わないため
    // 対象外（SCR-028 増減連絡票と同方針）。
    //
    // 以前は「電子版は承認済(denshi_shonin_status=1)のみ集計」だった。紙版限定は
    // それを包含するので条件を重ねずに置き換える — 残しても常に真で、読む側に
    // 「電子版も入りうる」と誤解させるだけ。
    qb.andWhere('r.dokusya_shubetsu = :paperShubetsu', {
      paperShubetsu: DokusyaShubetsu.PAPER,
    });

    this.applyNichinoScope(qb, query, session);
    return qb;
  }

  /**
   * 適用日に動きの無い既存購読者の基礎行を取得する QueryBuilder（顧客CR #59108
   * 片岡様フィードバック 2026-08-31 — 「部数の動きがあった販売店のみ」ではなく
   * 現在部数または新部数がある販売店は全て出力したい）。
   *
   * 各購読者の「適用日時点で有効な履歴」= torikeshi_flg=false の行のうち
   * joho_henko_tekiyo_date が適用日以下で最大（同 joho は rireki_no 最大）の
   * 1行（`t_dokusya_rireki` の現行判定と同じ定義。エンティティ doc 参照）。
   * この行が当日(=適用日)の増減報告対象行（nichinoBaseQuery が拾う行）なら
   * そちらで既に計上済みのため、ここでは除外する（二重計上防止）。
   *
   * 生行の zenkai_dokusya_busu / zenkai_hanbaiten_id はこの行「自体」の変更前
   * 値であり、動きの無い購読者を表すには不適切（例えば半年前の変更行が拾われた
   * 場合、当時の前回値が現在部数として出てしまう）。fetchZougenNichinoRows が
   * dokusya_busu/hanbaiten_id を zenkai_* 側へ複製してから返すことで「現在＝新
   * （変化なし）」を表現する — groupZougenNichinoReports 側の変更は不要（同一
   * 販売店内で classifyNichino が自然に 増部数=減部数=0 と分類する）。
   */
  private nichinoBaselineQuery(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): SelectQueryBuilder<DokusyaRireki> {
    const qb = this.nichinoJoins(this.rirekiRepo.createQueryBuilder('r'));
    qb.where('r.torikeshi_flg = false')
      .andWhere('r.joho_henko_tekiyo_date <= :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      // 現在0部の購読者は現在部数=新部数=0となり出力対象外のため、事前に除外
      // する（api.md §4.5「現在部数または新部数がともに0の行は除外」と同義）。
      .andWhere('r.dokusya_busu != 0')
      .andWhere('r.dokusya_shubetsu = :paperShubetsu', {
        paperShubetsu: DokusyaShubetsu.PAPER,
      })
      // r が「適用日時点で有効な履歴」であること（同一購読者でより新しい
      // (joho, rireki_no) の行が存在しない）。IX_t_dokusya_rireki_chain
      // (dokusya_id, joho_henko_tekiyo_date, rireki_no) で効率化される。
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM t_dokusya_rireki r2
            WHERE r2.dokusya_id = r.dokusya_id
              AND r2.torikeshi_flg = false
              AND r2.joho_henko_tekiyo_date <= :tekiyo_date
              AND (r2.joho_henko_tekiyo_date > r.joho_henko_tekiyo_date
                   OR (r2.joho_henko_tekiyo_date = r.joho_henko_tekiyo_date
                       AND r2.rireki_no > r.rireki_no))
         )`,
      )
      // 当日の増減報告対象行（nichinoBaseQuery 側）がある購読者は除外
      // （二重計上防止）。
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM t_dokusya_rireki r3
            WHERE r3.dokusya_id = r.dokusya_id
              AND r3.torikeshi_flg = false
              AND r3.joho_henko_tekiyo_date = :tekiyo_date
              AND r3.zougen_hokoku_flg = true
         )`,
      );

    this.applyNichinoScope(qb, query, session);
    return qb;
  }

  /** 明細 SELECT を付与（前回販売店 zh / 都道府県 td への JOIN は nichinoJoins 側で付与済み）。 */
  private nichinoDetailSelect(
    qb: SelectQueryBuilder<DokusyaRireki>,
  ): SelectQueryBuilder<DokusyaRireki> {
    return qb.select(ZougenReportService.NICHINO_SELECT);
  }

  /**
   * 全件取得（export PDF/Excel・preview 共用。ページングなし）。当日(適用日)の
   * 増減報告対象行（nichinoBaseQuery）と、動きの無い既存購読者の基礎行
   * （nichinoBaselineQuery）を取得し1つの配列にまとめて返す（顧客CR #59108
   * 片岡様フィードバック 2026-08-31）。基礎行は zenkai_dokusya_busu /
   * zenkai_hanbaiten_* を現在値で複製し「現在＝新（変化なし）」を表現する —
   * groupZougenNichinoReports 側はそのまま既存ロジックで処理できる。
   * 両クエリの購読者集合は互いに素（nichinoBaselineQuery の NOT EXISTS で
   * 二重計上を防止）のため、単純に連結してよい。
   */
  private async fetchZougenNichinoRows(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): Promise<ZougenNichinoRawRow[]> {
    const changedQb = this.nichinoDetailSelect(
      this.nichinoBaseQuery(query, session),
    );
    changedQb.orderBy('r.dokusya_id', 'ASC').addOrderBy('r.rireki_no', 'ASC');
    const changedRows = await changedQb.getRawMany<ZougenNichinoRawRow>();

    const baselineQb = this.nichinoDetailSelect(
      this.nichinoBaselineQuery(query, session),
    );
    baselineQb.orderBy('r.dokusya_id', 'ASC');
    const baselineRawRows = await baselineQb.getRawMany<ZougenNichinoRawRow>();
    const baselineRows: ZougenNichinoRawRow[] = baselineRawRows.map((row) => ({
      ...row,
      zenkai_dokusya_busu: row.dokusya_busu,
      zenkai_hanbaiten_id: row.hanbaiten_id,
      zenkai_hanbaiten_code: row.hanbaiten_code,
      zenkai_hanbaiten_name: row.hanbaiten_name,
      zenkai_itaku_kubun: row.itaku_kubun,
      zenkai_torihikisaki_no: row.torihikisaki_no,
    }));

    return [...changedRows, ...baselineRows];
  }

  /**
   * 増減通知（日本農業新聞）の Excel を生成する。PDF（buildZougenNichinoDocDefinition /
   * nichinoReportBlock / detailTable）と同じページ構成（`paginateNichinoSubscribers`
   * を共有 — 管理支店ごとに独立ページ、28行超は自グループ内で複数ページ）で1シート内に
   * 文書ページを積む。セル結合は一切行わない（zougen-hanbaiten Excel export で判明した
   * mergeCells の O(n²) 障害の教訓 — 詳細は writeZougenPage のコメント参照）。
   */
  private async buildZougenNichinoExcelBuffer(
    rows: ZougenNichinoRawRow[],
    tekiyoDate: string,
    bikoByKs: Map<number, string>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(NICHINO_SHEET_NAME);
    sheet.views = [{ showGridLines: false }];
    sheet.columns = this.NICHINO_COL_WIDTHS.map((width) => ({ width }));

    // PDF (buildZougenNichinoDocDefinition) と全く同じページ構成。
    const pages = paginateNichinoSubscribers(rows, ZOUGEN_NICHINO_PER_PAGE);

    pages.forEach((pageReports, pi) => {
      for (const report of pageReports) {
        this.writeZougenNichinoPage(
          sheet,
          report,
          report.group_page_no ?? 1,
          report.group_total_pages ?? 1,
          tekiyoDate,
          bikoByKs.get(report.kanri_shiten_id) ?? '',
        );
      }
      if (pi < pages.length - 1 && sheet.lastRow) sheet.lastRow.addPageBreak();
    });

    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    };

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /** 1文書ページ（1管理支店）を出力：発行元+タイトル+Page、見出し、明細テーブル、＜備考＞。 */
  private writeZougenNichinoPage(
    sheet: ExcelJS.Worksheet,
    report: ZougenNichinoReport,
    pageNo: number,
    totalPages: number,
    tekiyoDate: string,
    biko: string,
  ): void {
    const lastCol = this.NICHINO_COLS;

    // ── 発行元（列A、複数行）+ タイトル（中央寄せの単独セル）+ ページ数（最終列） ──
    const issuerRow1 = sheet.addRow([]);
    issuerRow1.getCell(1).value = '日本農業新聞社 業務管理部';
    issuerRow1.getCell(1).font = { size: 8 };
    const titleCol = Math.ceil(lastCol / 2);
    issuerRow1.getCell(titleCol).value = '日本農業新聞増減通知';
    issuerRow1.getCell(titleCol).font = { bold: true, size: 14 };
    issuerRow1.getCell(titleCol).alignment = { horizontal: 'center' };
    issuerRow1.getCell(lastCol).value = `ページ数：${pageNo}/${totalPages}`;
    issuerRow1.getCell(lastCol).font = { size: 8 };
    issuerRow1.getCell(lastCol).alignment = { horizontal: 'right' };

    const issuerRow2 = sheet.addRow([]);
    issuerRow2.getCell(1).value = 'TEL：03-6281-5800';
    issuerRow2.getCell(1).font = { size: 8 };
    const issuerRow3 = sheet.addRow([]);
    issuerRow3.getCell(1).value = 'FAX：03-3225-6936';
    issuerRow3.getCell(1).font = { size: 8 };

    // ── 適用日（列A）/ 都道府県名・組合名・担当（最終列、右寄せ）── nichinoReportBlock と同じ情報。
    const kumiaiName = `${formatKanriShitenCode(report.kanri_shiten_code)}: ${report.ja_name}　${report.kanri_shiten_name}`;
    const dateRow = sheet.addRow([]);
    dateRow.getCell(1).value = `適用日：${jpDate(tekiyoDate)}`;
    dateRow.getCell(1).font = { size: 9 };

    const rightLines = [
      `都道府県名：${report.todofuken_name}`,
      `組合名：${kumiaiName}`,
      '＿＿＿＿＿＿ 部／ 担当：＿＿＿＿＿＿',
      `TEL：${report.tel || '-'}`,
      `FAX：${report.fax || '-'}`,
    ];
    rightLines.forEach((line, i) => {
      const row = i === 0 ? dateRow : sheet.addRow([]);
      const rc = row.getCell(lastCol);
      rc.value = line;
      rc.font = { size: 9, bold: i === 1 };
      rc.alignment = { horizontal: 'right' };
    });
    sheet.addRow([]); // spacer

    // ── 明細テーブル（委託/販売店コード/販売店名/現在部数/増部数/減部数/新部数）+ 合計行 ──
    const headerRow = sheet.addRow([
      '', '委託', '販売店コード', '販売店名', '現在部数', '増部数', '減部数', '新部数',
    ]);
    this.styleZougenRow(headerRow, lastCol, { fill: true, bold: true, center: true });
    for (const row of report.rows) {
      const dataRow = sheet.addRow([
        row.diff_mark ? '◆' : '',
        row.itaku_label,
        row.hanbaiten_code,
        row.hanbaiten_name,
        row.genzai_busu,
        row.zou_busu,
        formatGenBusu(row.gen_busu),
        row.shin_busu,
      ]);
      this.styleZougenRow(dataRow, lastCol);
      dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      dataRow.getCell(1).font = { bold: true, size: 9 };
    }
    const totalRow = sheet.addRow([
      '',
      '合計',
      '',
      '',
      report.total.genzai_busu,
      report.total.zou_busu,
      formatGenBusu(report.total.gen_busu),
      report.total.shin_busu,
    ]);
    this.styleZougenRow(totalRow, lastCol, { fill: true, bold: true });

    // ── ＜備考＞ ──
    const bikoRow = sheet.addRow([`＜備考＞ ${biko}`]);
    bikoRow.getCell(1).font = { size: 9 };
    sheet.addRow([]); // spacer（ページ末尾）
  }

}
