import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { DataSource, Repository } from 'typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import { StorageService } from '@/modules/storage/storage.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope } from '@/common/utils/data-scope';
import { ValidationException } from '@/common/exceptions/common.exceptions';

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ReportNoDataException } from './exceptions/report-no-data.exception';
import { ZougenNoDataException } from './exceptions/zougen-no-data.exception';
import { PdfExportService } from './pdf-export.service';
import {
  groupByHanbaiten,
  groupByKanriShiten,
  type HanbaitenReportRow,
  type MeiboPreviewData,
  type MeiboRawRow,
} from './report.mapper';
import {
  buildZougenDocDefinition,
  groupZougenReports,
  type ZougenPreviewData,
  type ZougenRawRow,
} from './zougen.mapper';

const SCREEN_NAME = '購読者名簿出力画面 (ACSMS-SCR-026)';
const TABLE_NAME = 't_dokusya_rireki';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = '購読者名簿';
/** m_code DOWNLOAD_TYPE = 5 : 購読者名簿 (seeder.md §5). */
const DOWNLOAD_TYPE_MEIBO = 5;
/** 紙版＋電子版の対象。併読(3)は本帳票では常に除外（画面項目No.5）。 */
const SHUBETSU_HEIYO = 3;
/** 新規（解約=0は除外）。 */
const TETSUZUKI_NEW = 1;

// ─── ACSMS-SCR-028 — 増減連絡票（販売店） ─────────────────────────────
const ZOUGEN_SCREEN_NAME = '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)';
const ZOUGEN_TARGET_TABLE = 't_file_download';
const PDF_MIME = 'application/pdf';
/** m_code DOWNLOAD_TYPE = 3 : 増減連絡票 (seeder.md §5). */
const DOWNLOAD_TYPE_ZOUGEN = 3;

export interface ExportMeiboResult {
  buffer: Buffer;
  filename: string;
}

export interface ExportZougenResult {
  buffer: Buffer;
  /** 表示名（日本語、Content-Disposition filename* 用）。 */
  filename: string;
  /** ASCII 別名（Content-Disposition filename 用）。 */
  asciiFilename: string;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    @InjectRepository(FileDownload)
    private readonly fileDownloadRepo: Repository<FileDownload>,
    private readonly auditLog: AuditLogService,
    // CodeService (@Global) — reserved for future m_code label resolution.
    private readonly codeService: CodeService,
    private readonly storage: StorageService,
    // SCR-028 appends these so SCR-026-only specs (5-arg `new`) keep
    // type-checking. Production DI always injects the real instances.
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly pdfService?: PdfExportService,
  ) {}

  // ─── ACSMS-API-026-001 — GET /api/v1/report/meibo/preview ────────
  async previewMeibo(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboPreviewData> {
    this.assertConditionalRequired(query);
    const rows = await this.fetchRows(query, session);
    return this.buildPreview(query, rows);
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
      const filename = this.buildFilename(query.tekiyo_date);

      // S3保存（パス: ja-{ja_id}/report/meibo/{filename}）。
      const key = `ja-${session.ja_id ?? 0}/report/meibo/${filename}`;
      await this.storage.upload(key, buffer, XLSX_MIME);

      // ファイルダウンロード履歴の記録（download_type=5: 購読者名簿）。
      await this.fileDownloadRepo.save(
        this.fileDownloadRepo.create({
          jaId: session.ja_id ?? null,
          downloadDatetime: new Date(),
          downloadType: DOWNLOAD_TYPE_MEIBO,
          fileName: filename,
          filePath: key,
          fileSize: buffer.length,
          recordCount: rows.length,
          targetMonth: this.targetMonth(query.tekiyo_date),
          createdBy: String(session.account_id),
        }),
      );

      return { buffer, filename };
    } catch (err) {
      // 業務的な「対象なし」(404) はエラーログ対象外。それ以外（DB/S3障害等）
      // は log_type=3 をトランザクション外で記録する（4.7）。
      if (err instanceof ReportNoDataException) throw err;
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        'EXPORT',
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
    const rows = await this.fetchZougenRows(query, session);
    // 増減連絡票は0件の場合は意味を成さないため、プレビューでも404を返す（4.4）。
    if (rows.length === 0) throw new ZougenNoDataException();
    return {
      tekiyo_date: query.tekiyo_date,
      reports: groupZougenReports(rows),
    };
  }

  // ─── ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export ──
  async exportZougenHanbaitenPdf(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenResult> {
    if (!this.dataSource) {
      throw new Error(
        'ReportService.dataSource is undefined — SCR-028 export requires it.',
      );
    }
    if (!this.pdfService) {
      throw new Error(
        'ReportService.pdfService is undefined — SCR-028 export requires it.',
      );
    }

    try {
      const rows = await this.fetchZougenRows(query, session);
      // 対象データなし → PDFは生成しない（業務的な404、エラーログ対象外）。
      if (rows.length === 0) throw new ZougenNoDataException();

      const reports = groupZougenReports(rows);
      const docDefinition = buildZougenDocDefinition(reports, query.tekiyo_date);
      const buffer = await this.pdfService.generatePdf(docDefinition);

      const filename = this.buildZougenFilename(query.tekiyo_date);
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date);

      // S3保存は外部I/Oのためトランザクション外で先に完了させる（4.4）。
      const ymd = query.tekiyo_date.replaceAll('-', '');
      const key = `ja-${session.ja_id ?? 0}/report/zougen_hanbaiten_${ymd}_${Date.now()}.pdf`;
      await this.storage.upload(key, buffer, PDF_MIME);

      // ダウンロード履歴登録(4.5) + 操作ログ(4.6) を単一トランザクションで実行。
      await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(
          FileDownload,
          manager.create(FileDownload, {
            jaId: session.ja_id ?? null,
            downloadDatetime: new Date(),
            downloadType: DOWNLOAD_TYPE_ZOUGEN,
            fileName: filename,
            filePath: key,
            fileSize: buffer.length,
            recordCount: rows.length,
            targetMonth: this.zougenTargetMonth(query.tekiyo_date),
            createdBy: String(session.account_id),
          }),
        );

        const ctx = buildAuditCtx(
          session,
          req,
          ZOUGEN_SCREEN_NAME,
          ZOUGEN_TARGET_TABLE,
          saved.fileDownloadId ?? null,
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
        await this.auditLog.logOperation(
          {
            logType: 1,
            accountId: ctx.accountId,
            jaId: ctx.jaId,
            gamenName: ctx.screen,
            operation: 'EXPORT_PDF',
            resultStatus: 1,
            targetId: ctx.targetId,
            targetTable: ctx.table,
            beforeValue: '',
            afterValue,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          manager,
        );
      });

      return { buffer, filename, asciiFilename };
    } catch (err) {
      // 業務的な「対象なし」(404) はエラーログ対象外。それ以外（DB/S3/PDF障害等）
      // は log_type=3 をトランザクション外で記録する（4.8）。
      if (err instanceof ZougenNoDataException) throw err;
      await this.auditLog.logError(
        buildAuditCtx(session, req, ZOUGEN_SCREEN_NAME, ZOUGEN_TARGET_TABLE, null),
        'EXPORT_PDF',
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

  /**
   * 適用日時点の最新スナップショットを取得する。各 dokusya_id について
   * `joho_henko_tekiyo_date <= :tekiyo_date` を満たす最大 rireki_no を対象。
   */
  private async fetchRows(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboRawRow[]> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .innerJoin('m_ja', 'j', 'j.ja_id = r.ja_id AND j.deleted_at IS NULL')
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin(
        'm_shiten',
        's',
        's.shiten_id = r.shiten_id AND s.deleted_at IS NULL',
      )
      .select([
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
      ])
      // t_dokusya_rireki は履歴テーブルで deleted_at を持たない（insert-only）。
      // 論理削除は t_dokusya 側の状態で表現されるため、ここでは付与しない。
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date <= :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      // 適用日時点の最新スナップショット（最大 rireki_no）。
      .andWhere(
        'r.rireki_no = (SELECT MAX(r2.rireki_no) FROM t_dokusya_rireki r2 ' +
          'WHERE r2.dokusya_id = r.dokusya_id ' +
          'AND r2.joho_henko_tekiyo_date <= :tekiyo_date)',
      )
      // 新規のみ（解約 tetsuzuki_shurui=0 は除外）。
      .andWhere('r.tetsuzuki_shurui = :tetsuzuki', { tetsuzuki: TETSUZUKI_NEW })
      // 併読(3)は常に除外（画面項目No.5「併読は除外」）。
      .andWhere('r.dokusya_shubetsu <> :heiyo', { heiyo: SHUBETSU_HEIYO });

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

    // 支払区分（購読料支払サイクル）は両帳票種別で有効（画面項目No.6 常時表示）。
    if (query.shiharai_cycle != null) {
      qb.andWhere('r.dokusyaryo_shiharai_cycle = :cycle', {
        cycle: query.shiharai_cycle,
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

    // 出力順：販売店 → 管理支店 → 購読者（管理支店別は管理支店 → 購読者）。
    qb.orderBy('r.hanbaiten_id', 'ASC')
      .addOrderBy('r.kanri_shiten_id', 'ASC')
      .addOrderBy('r.dokusya_id', 'ASC');

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

  /** 帳票ヘッダ（タイトル・チェック日/確認印・販売店/組合情報）を描く。 */
  private writeReportHeader(
    sheet: ExcelJS.Worksheet,
    cols: number,
    title: string,
    leftLines: string[],
    rightLines: string[],
  ): void {
    const lastCol = String.fromCodePoint(64 + cols); // A=65
    const midCol = String.fromCodePoint(64 + Math.ceil(cols / 2));
    const nextMid = String.fromCodePoint(64 + Math.ceil(cols / 2) + 1);

    // チェック日 / 確認印（右上）
    const chk = sheet.addRow([]);
    chk.getCell(cols - 1).value = 'チェック日';
    chk.getCell(cols).value = '確認印';
    chk.getCell(cols - 1).border = this.THIN_BORDER;
    chk.getCell(cols).border = this.THIN_BORDER;
    chk.getCell(cols - 1).alignment = { horizontal: 'center' };
    chk.getCell(cols).alignment = { horizontal: 'center' };

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

  private fillHanbaitenSheet(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
  ): void {
    const COLS = 7;
    sheet.columns = [
      { width: 9 }, { width: 24 }, { width: 32 }, { width: 16 },
      { width: 18 }, { width: 14 }, { width: 11 },
    ];
    const head = data.hanbaiten_groups[0];
    const names = data.hanbaiten_groups.map((g) => g.hanbaiten_name).join('、');
    const shisho = data.hanbaiten_groups[0]?.kanri_shiten_groups[0]?.kanri_shiten_name ?? '';

    this.writeReportHeader(
      sheet,
      COLS,
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
        `出力日：${this.nowJstDate()}`,
        `出力時間：${this.nowJstTime()}`,
        'ページ数：1/1',
      ],
    );

    // 表ヘッダ
    this.styleRow(
      sheet.addRow([
        'チェック欄', '配達先氏名\n配達先氏名かな', '配達先住所', '管理支店',
        '配達先電話番号', '購読開始日', '購読部数',
      ]),
      COLS,
      { fill: true, bold: true, center: true },
    );

    // 管理支店(支所)単位でまとめる。
    const merged = new Map<
      string,
      { name: string; subtotal: number; rows: HanbaitenReportRow[] }
    >();
    for (const hg of data.hanbaiten_groups) {
      for (const sg of hg.kanri_shiten_groups) {
        const key = sg.kanri_shiten_id == null ? 'none' : String(sg.kanri_shiten_id);
        const ex = merged.get(key);
        if (ex) {
          ex.subtotal += sg.subtotal_busu;
          ex.rows.push(...sg.rows);
        } else {
          merged.set(key, {
            name: sg.kanri_shiten_name || '（未割当）',
            subtotal: sg.subtotal_busu,
            rows: [...sg.rows],
          });
        }
      }
    }
    for (const g of merged.values()) {
      for (const row of g.rows) {
        this.styleRow(
          sheet.addRow([
            '',
            `${row.shimei}\n${row.shimei_kana}`,
            this.formatAddressMultiline(row.haitatsu_address),
            row.kanri_shiten_name,
            row.haitatsu_tel,
            this.formatDateSlash(row.dokusya_kaishi_date),
            row.dokusya_busu,
          ]),
          COLS,
        );
      }
      // 管理支店 小計
      this.styleRow(
        sheet.addRow(['', '', '', '', '', g.name, `${g.subtotal}件`]),
        COLS,
        { fill: true, bold: true, center: true },
      );
    }
    // 全体 合計
    this.styleRow(
      sheet.addRow(['', '', '', '', '', names, `${data.grand_total_busu}件`]),
      COLS,
      { fill: true, bold: true, center: true },
    );
  }

  private fillKanriShitenSheet(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
  ): void {
    const COLS = 12;
    sheet.columns = [
      { width: 14 }, { width: 10 }, { width: 22 }, { width: 14 }, { width: 16 },
      { width: 14 }, { width: 30 }, { width: 10 }, { width: 14 }, { width: 14 },
      { width: 18 }, { width: 4 },
    ];
    const names = data.kanri_shiten_groups
      .map((g) => g.kanri_shiten_name || '（未割当）')
      .join('、');

    this.writeReportHeader(
      sheet,
      COLS,
      '管理支店別購読者名簿',
      [`${names}　御中`, `${data.tekiyo_date} 現在`],
      [
        `${data.ja_name}　TEL：${data.ja_tel || '-'}`,
        `出力日：${this.nowJstDate()}`,
        `出力時間：${this.nowJstTime()}`,
        'ページ数：1/1',
      ],
    );

    this.styleRow(
      sheet.addRow([
        '管理支店', '購読種別', '購読者名\n購読者かな', '組合員コード',
        '配達先電話番号', '支店', '配達先住所', '購読部数', '支払い方法',
        '購読開始日', '配達担当販売店', '',
      ]),
      COLS - 1,
      { fill: true, bold: true, center: true },
    );

    for (const kg of data.kanri_shiten_groups) {
      for (const row of kg.rows) {
        this.styleRow(
          sheet.addRow([
            kg.kanri_shiten_name || '（未割当）',
            this.codeService.getLabel('DOKUSYA_SHUBETSU', row.dokusya_shubetsu),
            `${row.shimei}\n${row.shimei_kana}`,
            row.kumiaiin_code,
            row.haitatsu_tel,
            row.shiten_name,
            this.formatAddressMultiline(row.haitatsu_address),
            row.dokusya_busu,
            this.codeService.getLabel('SHIHARAI_HOHO', row.shiharai_hoho),
            this.formatDateSlash(row.dokusya_kaishi_date),
            row.hanbaiten_name,
          ]),
          COLS - 1,
        );
      }
      this.styleRow(
        sheet.addRow([
          `${kg.kanri_shiten_name || '（未割当）'} 小計`,
          '', '', '', '', '', '', `${kg.subtotal_busu}件`,
        ]),
        COLS - 1,
        { fill: true, bold: true, center: true },
      );
    }
    this.styleRow(
      sheet.addRow(['合計', '', '', '', '', '', '', `${data.grand_total_busu}件`]),
      COLS - 1,
      { fill: true, bold: true, center: true },
    );
  }

  /** 出力日（Asia/Tokyo）— YYYY/MM/DD。 */
  private nowJstDate(): string {
    return this.jstParts('YMD');
  }

  /** 出力時間（Asia/Tokyo）— HH:mm:ss。 */
  private nowJstTime(): string {
    return this.jstParts('HMS');
  }

  private jstParts(kind: 'YMD' | 'HMS'): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return kind === 'YMD'
      ? `${get('year')}/${get('month')}/${get('day')}`
      : `${get('hour')}:${get('minute')}:${get('second')}`;
  }

  /** `〒{7桁}{住所}` を `〒XXX-XXXX\n{住所}` の2行表記に整形。 */
  private formatAddressMultiline(addr: string): string {
    const m = /^〒(\d{7})(.*)$/.exec(addr ?? '');
    if (!m) return addr ?? '';
    return `〒${m[1].slice(0, 3)}-${m[1].slice(3)}\n${m[2]}`;
  }

  /** YYYY-MM-DD → YYYY/MM/DD（空はそのまま）。 */
  private formatDateSlash(d: string): string {
    return d ? d.replaceAll('-', '/') : '';
  }

  /** 購読者名簿_{YYYY年MM月}.xlsx（適用日 tekiyo_date=YYYY-MM-DD に基づく）。 */
  private buildFilename(tekiyoDate: string): string {
    const [y, m] = tekiyoDate.split('-');
    return `${SHEET_NAME}_${y}年${m}月.xlsx`;
  }

  /** target_month: YYYYMM（適用日に基づく）。 */
  private targetMonth(tekiyoDate: string): string {
    const [y, m] = tekiyoDate.split('-');
    return `${y}${m}`;
  }

  // ─── ACSMS-SCR-028 private helpers ─────────────────────────────────

  /**
   * 適用日に変更があった増減対象レコードを取得する（api.md §4.4 のSQLと同一）。
   *   joho_henko_tekiyo_date = :tekiyo_date / zougen_hokoku_flg = true /
   *   h.haiten_flg = false（廃店・電子版ダミー販売店を除外）/ DataScope適用。
   */
  private async fetchZougenRows(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenRawRow[]> {
    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      // 廃店(haiten_flg=true)はINNER JOINのON条件でサーバ側強制除外する。
      .innerJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL AND h.haiten_flg = false',
      )
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin(
        'm_todofuken',
        'td_now',
        'td_now.todofuken_code = r.haitatsu_todofuken_code',
      )
      .leftJoin(
        'm_todofuken',
        'td_zen',
        'td_zen.todofuken_code = r.zenkai_todofuken_code',
      )
      .select([
        'r.dokusya_rireki_id AS dokusya_rireki_id',
        'r.hanbaiten_id AS hanbaiten_id',
        'h.hanbaiten_code AS hanbaiten_code',
        'h.hanbaiten_name AS hanbaiten_name',
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
      ])
      .where('1 = 1')
      .andWhere('r.joho_henko_tekiyo_date = :tekiyo_date', {
        tekiyo_date: query.tekiyo_date,
      })
      .andWhere('r.zougen_hokoku_flg = :zougenFlg', { zougenFlg: true });

    if (query.hanbaiten_id && query.hanbaiten_id.length > 0) {
      qb.andWhere('r.hanbaiten_id IN (:...hanbaiten_id)', {
        hanbaiten_id: query.hanbaiten_id,
      });
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

    qb.orderBy('h.hanbaiten_code', 'ASC').addOrderBy('r.kanri_shiten_id', 'ASC');

    return qb.getRawMany<ZougenRawRow>();
  }

  /** 表示名：増減連絡票_販売店_{YYYY年MM月DD日}.pdf（適用日に基づく）。 */
  private buildZougenFilename(tekiyoDate: string): string {
    const [y, m, d] = tekiyoDate.split('-');
    return `増減連絡票_販売店_${y}年${m}月${d}日.pdf`;
  }

  /** ASCII別名：zougen_hanbaiten_{YYYYMMDD}.pdf（Content-Disposition filename用）。 */
  private buildZougenAsciiFilename(tekiyoDate: string): string {
    return `zougen_hanbaiten_${tekiyoDate.replaceAll('-', '')}.pdf`;
  }

  /** target_month: YYYYMM（適用日に基づく）。 */
  private zougenTargetMonth(tekiyoDate: string): string {
    const [y, m] = tekiyoDate.split('-');
    return `${y}${m}`;
  }
}
