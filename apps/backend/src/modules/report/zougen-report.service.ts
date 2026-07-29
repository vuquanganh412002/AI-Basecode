import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope } from '@/common/utils/data-scope';
import {
  AuditOperation,
  DenshiShoninStatus,
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
  paginateZougenSubscribers,
  ZOUGEN_PER_PAGE,
  type ZougenPreviewData,
  type ZougenRawRow,
} from './zougen.mapper';
import {
  buildZougenNichinoDocDefinition,
  groupZougenNichinoReports,
  paginateNichinoSubscribers,
  ZOUGEN_NICHINO_PER_PAGE,
  type ZougenNichinoPreviewData,
  type ZougenNichinoRawRow,
} from './zougen-nichino.mapper';

// ─── ACSMS-SCR-028 — 増減連絡票（販売店） ─────────────────────────────
const ZOUGEN_SCREEN_NAME = '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)';
// SCR-028 は共通の FileArchiveService 経由で S3 + t_file_download に保存する
// ため、操作ログの対象テーブルは t_file_download。
const ZOUGEN_TARGET_TABLE = 't_file_download';
const PDF_MIME = 'application/pdf';
// SCR-029 も共通の FileArchiveService 経由で S3 + t_file_download に保存する
// ため、操作ログの対象テーブルは t_file_download。
const NICHINO_TARGET_TABLE = 't_file_download';

// ─── ACSMS-SCR-029 — 増減通知（日本農業新聞） ─────────────────────────
const NICHINO_SCREEN_NAME = '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)';

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
export class ZougenReportService {
  constructor(
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    private readonly auditLog: AuditLogService,
    private readonly fileArchive: FileArchiveService,
    @Optional()
    private readonly pdfService?: PdfExportService,
    // SCR-029 appends this（日農担当者へのメール通知）. @Optional() so the
    // SCR-026/028 specs that `new` with fewer args keep type-checking.
    @Optional()
    private readonly reportNotification?: ReportNotificationService,
  ) {}

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  async previewZougenHanbaiten(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenPreviewData> {
    // グループ単位ページング（顧客要件 2026-07・SCR-026/029 と同方針）: 販売店+管理支店
    // (combo)ごとに独立ページ、ページ数は販売店ごとに 1..N。全件取得 →
    // paginateZougenSubscribers で combo ページに分割し、要求ページを返す。preview と
    // PDF が同じ関数を共有するのでページ構成は一致（BEが唯一の真実源）。0件は 200 + 空。
    const perPage = query.per_page ?? ZOUGEN_PER_PAGE;
    const rows = await this.fetchZougenRows(query, session);
    const pages = paginateZougenSubscribers(rows, perPage);
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
      // 全体の販売店グループ数（独立販売店の数）。
      group_count: new Set(rows.map((r) => Number(r.hanbaiten_id))).size,
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
    // SCR-028 は FileArchiveService 経由で S3 + t_file_upload に保存するため
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
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date);

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
        ZOUGEN_SCREEN_NAME,
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
      const ymd = query.tekiyo_date.replaceAll('-', '');
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const jaName = sanitizeFilenamePart(ja.name);
      const jaCode = ja.code;
      let baseName: string;
      if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
        const ksName = sanitizeFilenamePart(rows[0]?.kanri_shiten_name ?? '');
        const ksCode = rows[0]?.kanri_shiten_code ?? '';
        baseName = `増減通知_${jaName}_${jaCode}_${ksName}_${ksCode}_${ymd}`;
      } else {
        baseName = `増減通知_${jaName}_${jaCode}_${ymd}`;
      }

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
        NICHINO_SCREEN_NAME,
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
        buildAuditCtx(session, req, NICHINO_SCREEN_NAME, NICHINO_TARGET_TABLE, null),
        AuditOperation.EXPORT_PDF,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-SCR-028 private helpers ─────────────────────────────────

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
   * 行集合を決める INNER JOIN(廃店除外) + WHERE + DataScope の QueryBuilder（SELECT/並び順
   * なし。api.md §4.4 と同一: joho=:tekiyo_date / zougen_hokoku_flg=true / h.haiten_flg=false）。
   * 各クエリが共通の土台にしてフィルタのドリフトを防ぐ。
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
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true })
      // 取消(赤伝)行（誤入力行 + 対応する打ち消し行、いずれも zougen=true・同 joho）
      // を増減報告から除外する（履歴刷新 Pha5）。zougenBaseQuery は preview /
      // export / 同日履歴取得 で共用のため、この1箇所で 028・029 双方に効く。
      .andWhere('r.torikeshi_flg = false');

    // 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(denshi_shonin_status=1)のみ
    // 集計対象とする。承認待ち(0)/否認(2)の電子版は増減連絡票から除外する。
    qb.andWhere(
      '(r.dokusya_shubetsu <> :denshiShubetsu OR r.denshi_shonin_status = :denshiApproved)',
      {
        denshiShubetsu: DokusyaShubetsu.DIGITAL,
        denshiApproved: DenshiShoninStatus.APPROVED,
      },
    );

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

  /** ASCII別名：zougen_hanbaiten_{YYYYMMDD}.pdf（Content-Disposition filename用）。 */
  private buildZougenAsciiFilename(tekiyoDate: string): string {
    return `zougen_hanbaiten_${tekiyoDate.replaceAll('-', '')}.pdf`;
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
      // 取消(赤伝)行を増減通知から除外する（履歴刷新 Pha5）。SCR-029 は 028 と別の
      // 土台(nichinoBaseQuery)を使うため、ここにも同じ条件を追加する。
      .andWhere('r.torikeshi_flg = false')
      // 現在部数=0 かつ 新部数=0 のレコードは除外（api.md §4.5）。
      .andWhere(
        'NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)',
      );

    // 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(denshi_shonin_status=1)のみ
    // 集計対象とする。承認待ち(0)/否認(2)の電子版は増減通知から除外する。
    qb.andWhere(
      '(r.dokusya_shubetsu <> :denshiShubetsu OR r.denshi_shonin_status = :denshiApproved)',
      {
        denshiShubetsu: DokusyaShubetsu.DIGITAL,
        denshiApproved: DenshiShoninStatus.APPROVED,
      },
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
      .select(ZougenReportService.NICHINO_SELECT);
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

}
