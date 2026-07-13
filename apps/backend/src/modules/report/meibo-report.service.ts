import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
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
  DenshiShoninStatus,
  DokusyaShubetsu,
  DownloadType,
  TetsuzukiShurui,
} from '@/common/enums';

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ReportNoDataException } from './exceptions/report-no-data.exception';
import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import {
  buildMeiboDocPages,
  estimateMeiboRowHeightPt,
  groupByHanbaiten,
  groupByKanriShiten,
  MEIBO_COL_WIDTHS,
  MEIBO_HANBAITEN_MIN_ROW_PT,
  MEIBO_PREVIEW_PER_PAGE,
  type HanbaitenGroup,
  type HanbaitenReportRow,
  type KanriShitenGroup,
  type KanriShitenReportRow,
  type MeiboPreviewData,
  type MeiboRawRow,
} from './report.mapper';

const SCREEN_NAME = '購読者名簿出力画面 (ACSMS-SCR-026)';
const TABLE_NAME = 't_dokusya_rireki';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = '購読者名簿';
// 出力種別は DownloadType enum を直接使用（MEIBO=5 / ZOUGEN=3 /
// ZOUGEN_NICHINO=4）。併読(DokusyaShubetsu.BOTH)は本帳票では常に除外
// （画面項目No.5）、新規(TetsuzukiShurui.SHINKI)のみ対象（解約=0は除外）。

export interface ExportMeiboResult {
  buffer: Buffer;
  /** 表示名（日本語、Content-Disposition filename* 用）。 */
  filename: string;
  /** ASCII 別名（Content-Disposition filename 用）。 */
  asciiFilename: string;
}

/** Excel 出力の1文書ページ共通コンテキスト（列数・ページ番号・出力日時）。 */
interface MeiboPageCtx {
  cols: number;
  pageNo: number;
  totalPages: number;
  outDate: string;
  outTime: string;
}

@Injectable()
export class MeiboReportService {
  constructor(
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    private readonly auditLog: AuditLogService,
    // CodeService (@Global) — 管理支店別Excel の 種別/支払方法ラベル解決に使用。
    private readonly codeService: CodeService,
    private readonly fileArchive: FileArchiveService,
  ) {}

  // ─── ACSMS-API-026-001 — GET /api/v1/report/meibo/preview ────────
  async previewMeibo(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboPreviewData> {
    this.assertConditionalRequired(query);
    // 動的ページング（顧客要件 2026-07）: 販売店/管理支店ごとに独立A4ページ + 明細の
    // 高さ(氏名/住所の折返しで可変)を積算して A4 1ページに収まる範囲で改ページする。
    // 全件取得 → グループ化 → buildMeiboDocPages で文書ページ化。preview と Excel が
    // 同じ関数を共有するのでページ構成は必ず一致する（BE が唯一の真実源）。
    const rows = await this.fetchRows(query, session);
    const full = this.buildPreview(query, rows);
    const pages = buildMeiboDocPages(full);

    const totalRows =
      full.report_type === 'hanbaiten'
        ? full.hanbaiten_groups.reduce(
            (a, g) =>
              a + g.kanri_shiten_groups.reduce((b, s) => b + s.rows.length, 0),
            0,
          )
        : full.kanri_shiten_groups.reduce((a, g) => a + g.rows.length, 0);
    const groupCount =
      full.report_type === 'hanbaiten'
        ? full.hanbaiten_groups.length
        : full.kanri_shiten_groups.length;

    // データなし → 空プレビュー（FE は grand_total_busu=0 で「対象なし」表示）。
    if (pages.length === 0) {
      return {
        ...full,
        page_no: 1,
        per_page: MEIBO_PREVIEW_PER_PAGE,
        total_pages: 1,
        total_rows: 0,
        is_last_page: true,
        group_count: 0,
        group_page_no: 1,
        group_total_pages: 1,
      };
    }

    const page = Math.min(Math.max(query.page ?? 1, 1), pages.length);
    const p = pages[page - 1];
    return {
      ...p, // group_page_no / group_total_pages は p に設定済み
      page_no: page,
      // 動的ページのため per_page は名目値。FE のページャは total_pages を使う。
      per_page: MEIBO_PREVIEW_PER_PAGE,
      total_pages: pages.length,
      total_rows: totalRows,
      is_last_page: page >= pages.length,
      group_count: groupCount,
    };
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
      // ASCII別名（Content-Disposition filename 用）。日本語名は filename* に置く。
      const asciiFilename = this.buildMeiboAsciiFilename(
        query.tekiyo_date,
        query.report_type,
      );

      // S3 アーカイブ（タイムスタンプ付きファイル名）+ t_file_upload 登録は
      // 共通の FileArchiveService に委譲する。S3 パスの年は適用日の年。
      const [year] = query.tekiyo_date.split('-');
      await this.fileArchive.archive({
        buffer,
        baseName: this.buildBaseName(query.tekiyo_date, query.report_type),
        category: 'meibo',
        subFolder: query.report_type,
        year,
        jaId: session.ja_id ?? null,
        session,
        recordCount: rows.length,
        contentType: XLSX_MIME,
        // 購読者名簿 (SCR-026)：日農DL許可フラグは画面のラジオで選択（既定 false）。
        downloadType: DownloadType.MEIBO,
        nichinoDownloadAllowedFlg: query.nichino_download_allowed_flg ?? false,
      });

      return { buffer, filename, asciiFilename };
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
      // 取消(赤伝)済みの行は名簿の現在行として選ばない（履歴刷新 Pha5）。
      .andWhere('r.torikeshi_flg = false')
      .andWhere(
        // as-of-date の現在行は (joho, rireki_no) 最大の行で選ぶ。MAX(rireki_no)
        // 単独ではバックデート時に joho の小さい行を誤選択するため不可。取消済
        // (torikeshi_flg=true) はスナップショット候補から除外する。
        '(r.joho_henko_tekiyo_date, r.rireki_no) = (' +
          'SELECT r2.joho_henko_tekiyo_date, r2.rireki_no FROM t_dokusya_rireki r2 ' +
          'WHERE r2.dokusya_id = r.dokusya_id ' +
          'AND r2.joho_henko_tekiyo_date <= :tekiyo_date ' +
          'AND r2.torikeshi_flg = false ' +
          'ORDER BY r2.joho_henko_tekiyo_date DESC, r2.rireki_no DESC LIMIT 1)',
      )
      .andWhere('r.tetsuzuki_shurui = :tetsuzuki', {
        tetsuzuki: TetsuzukiShurui.SHINKI,
      })
      .andWhere('r.dokusya_shubetsu <> :heiyo', { heiyo: DokusyaShubetsu.BOTH });

    // 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(denshi_shonin_status=1)のみ
    // 集計対象とする。承認待ち(0)/否認(2)の電子版は名簿から除外する。紙版は対象外。
    qb.andWhere(
      '(r.dokusya_shubetsu <> :denshiShubetsu OR r.denshi_shonin_status = :denshiApproved)',
      {
        denshiShubetsu: DokusyaShubetsu.DIGITAL,
        denshiApproved: DenshiShoninStatus.APPROVED,
      },
    );

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
      .select(MeiboReportService.MEIBO_SELECT);
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
   * 明細行の高さを内容に合わせて自動調整する（Excel は生成ファイルの折返し行を
   * 自動フィットしないため、明示的に高さを計算して切れないようにする・顧客要件
   * 2026-07）。各セルの明示改行(\n)に加え、列幅からの折返し行数も概算し、最大行数
   * ×1行高で設定する。全角(日本語)は幅2、半角は幅1として概算。
   */
  private autoFitRowHeight(
    sheet: ExcelJS.Worksheet,
    row: ExcelJS.Row,
    cols: number,
    minHeightPt = 0,
  ): void {
    // 動的ページングの分割見積り(estimateMeiboRowHeightPt)と同一ロジックで行高を
    // 決める。両者が一致することで「preview/Excel のページ構成」と「実際の行高」が
    // 整合し、A4 からのはみ出しを防ぐ。
    const texts: string[] = [];
    const widths: number[] = [];
    for (let c = 1; c <= cols; c++) {
      const v = row.getCell(c).value;
      let text = '';
      if (typeof v === 'string') text = v;
      else if (typeof v === 'number') text = String(v);
      texts.push(text);
      widths.push(Number(sheet.getColumn(c).width ?? 10));
    }
    row.height = estimateMeiboRowHeightPt(texts, widths, minHeightPt);
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
    // 列幅は mapper の見積り(estimateMeiboRowHeightPt)と共有 — 改ページ位置一致のため。
    sheet.columns = MEIBO_COL_WIDTHS.hanbaiten.map((width) => ({ width }));
    const outDate = nowDateJst();
    const outTime = nowTimeJst(); // 全ページ同一時刻（ページ毎の再評価でズレない）

    // 動的ページング（顧客要件 2026-07）: preview と同じ buildMeiboDocPages で文書
    // ページ化（各販売店 独立A4ページ + 明細高さ積算で A4 に収める）。ページ数は
    // 販売店ごとに 1..N（ヘッダ）。見出し帯・全体合計は廃止（小計のみ）。
    const pages = buildMeiboDocPages(data);
    pages.forEach((page, idx) => {
      const hg = page.hanbaiten_groups[0];
      const ctx: MeiboPageCtx = {
        cols: COLS,
        pageNo: page.group_page_no ?? 1,
        totalPages: page.group_total_pages ?? 1,
        outDate,
        outTime,
      };
      this.writeHanbaitenPageHeader(sheet, data, hg, ctx);
      for (const sg of hg.kanri_shiten_groups) {
        for (const row of sg.rows) this.writeHanbaitenDetail(sheet, row, COLS);
      }
      if (hg.show_total !== false) this.writeSubtotalRow(sheet, COLS, hg.total_busu);
      // ページ間に手動改ページ（全体の最終ページの後ろには入れない）。
      if (idx < pages.length - 1 && sheet.lastRow) sheet.lastRow.addPageBreak();
    });

    this.applyA4PageSetup(sheet);
  }

  /** 小計行を出力（グループ最終ページ）。販売店別・管理支店別 共通。合計行は廃止。 */
  private writeSubtotalRow(
    sheet: ExcelJS.Worksheet,
    cols: number,
    busu: number,
  ): void {
    this.styleRow(sheet.addRow(['', '', '', '', '', '小計', `${busu}件`]), cols, {
      fill: true,
      bold: true,
      center: true,
    });
  }

  /** 販売店別: 1ページ分の帳票ヘッダ + 表頭（当該ページの販売店を表示）。 */
  private writeHanbaitenPageHeader(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
    hg: HanbaitenGroup,
    ctx: MeiboPageCtx,
  ): void {
    // 販売店別は1ページに複数の管理支店(支所)が載りうるため、代表1件をヘッダに出すのは
    // 誤解を招く → 支所行は表示しない（顧客要件 2026-07・preview と同一）。
    this.writeReportHeader(
      sheet,
      ctx.cols,
      '販売店別購読者名簿',
      [
        `販売店コード：${hg.hanbaiten_code ?? ''}`,
        `${hg.hanbaiten_name}　御中`,
        `TEL：${hg.hanbaiten_tel || '-'}`,
        `FAX：${hg.hanbaiten_fax || '-'}`,
        `${data.tekiyo_date} 現在`,
      ],
      [
        `${data.ja_name}　TEL：${data.ja_tel || '-'}`,
        `出力日：${ctx.outDate}`,
        `出力時間：${ctx.outTime}`,
        `ページ数：${ctx.pageNo}/${ctx.totalPages}`,
      ],
    );
    const th = sheet.addRow([
      'チェック欄', '配達先氏名\n配達先氏名かな', '配達先住所', '管理支店',
      '配達先電話番号', '購読開始日', '購読部数',
    ]);
    this.styleRow(th, ctx.cols, { fill: true, bold: true, center: true });
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
    // 内容に合わせて高さを自動調整（チェックボックス font36 のため最低 44pt）。
    this.autoFitRowHeight(sheet, detailRow, cols, MEIBO_HANBAITEN_MIN_ROW_PT);
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
    // 列幅は mapper の見積り(estimateMeiboRowHeightPt)と共有 — 改ページ位置一致のため。
    sheet.columns = MEIBO_COL_WIDTHS.kanri_shiten.map((width) => ({ width }));
    const outDate = nowDateJst();
    const outTime = nowTimeJst();

    // 動的ページング（顧客要件 2026-07）: preview と同じ buildMeiboDocPages で文書
    // ページ化（管理支店ごと独立A4ページ + 明細高さ積算で A4 に収める）。合計行は廃止。
    const pages = buildMeiboDocPages(data);
    pages.forEach((page, idx) => {
      const kg = page.kanri_shiten_groups[0];
      const ctx: MeiboPageCtx = {
        cols: COLS,
        pageNo: page.group_page_no ?? 1,
        totalPages: page.group_total_pages ?? 1,
        outDate,
        outTime,
      };
      this.writeKanriPageHeader(sheet, data, kg, ctx);
      for (const row of kg.rows) this.writeKanriDetailRow(sheet, row, COLS);
      if (kg.show_subtotal !== false) this.writeSubtotalRow(sheet, COLS, kg.subtotal_busu);
      if (idx < pages.length - 1 && sheet.lastRow) sheet.lastRow.addPageBreak();
    });

    this.applyA4PageSetup(sheet);
  }

  /** 管理支店別: 購読者1行。 */
  private writeKanriDetailRow(
    sheet: ExcelJS.Worksheet,
    row: KanriShitenReportRow,
    cols: number,
  ): void {
    const detailRow = sheet.addRow([
      `${row.shimei}\n${row.shimei_kana}`,
      `${row.kumiaiin_code || '-'}\n${row.haitatsu_tel}`,
      `${row.shiten_name}\n${this.formatAddressMultiline(row.haitatsu_address)}`,
      row.dokusya_busu,
      this.codeService.getLabel('DOKUSYA_SHUBETSU', row.dokusya_shubetsu),
      this.codeService.getLabel('SHIHARAI_HOHO', row.shiharai_hoho),
      `${isoDateToSlash(row.dokusya_kaishi_date)}\n${row.hanbaiten_name}`,
    ]);
    this.styleRow(detailRow, cols);
    // 内容に合わせて高さを自動調整（住所などの折返しで切れないように）。
    this.autoFitRowHeight(sheet, detailRow, cols);
  }

  /** 管理支店別: 1ページ分の帳票ヘッダ + 表頭（当該ページの管理支店名を表示）。 */
  private writeKanriPageHeader(
    sheet: ExcelJS.Worksheet,
    data: MeiboPreviewData,
    kg: KanriShitenGroup,
    ctx: MeiboPageCtx,
  ): void {
    const names = kg.kanri_shiten_name || '（未割当）';
    this.writeReportHeader(
      sheet,
      ctx.cols,
      '管理支店別購読者名簿',
      [`管理支店：${names}`, `${data.tekiyo_date} 現在`],
      [
        `${data.ja_name}　TEL：${data.ja_tel || '-'}`,
        `出力日：${ctx.outDate}`,
        `出力時間：${ctx.outTime}`,
        `ページ数：${ctx.pageNo}/${ctx.totalPages}`,
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
    this.styleRow(th, ctx.cols, { fill: true, bold: true, center: true });
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

  /**
   * ASCII別名：meibo_{report_type}_{YYYYMM}.xlsx（Content-Disposition
   * filename 用）。日本語の表示名は filename* に置く。
   * 例: meibo_hanbaiten_202601.xlsx
   */
  private buildMeiboAsciiFilename(
    tekiyoDate: string,
    reportType: 'hanbaiten' | 'kanri_shiten',
  ): string {
    const [y, m] = tekiyoDate.split('-');
    return `meibo_${reportType}_${y}${m}.xlsx`;
  }
}
