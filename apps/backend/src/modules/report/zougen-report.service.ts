import { Injectable, Logger, Optional } from '@nestjs/common';
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
} from '@/common/enums';

import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ZougenNichinoQueryDto } from './dto/zougen-nichino-query.dto';
import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import { PdfExportService } from './pdf-export.service';
import { ReportNotificationService } from './report-notification.service';
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
// 通知先ロール: NICHINO_ADMIN(1) / NICHINO_STAFF(2)（m_roles SERIAL 順）。
const NICHINO_NOTIFY_ROLE_IDS = [1, 2];

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
  private readonly logger = new Logger(ZougenReportService.name);

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

      // ファイル名はログイン権限で分岐する（JA_KANRI_SHITEN は ja_name を含める）。
      // ダウンロード名はタイムスタンプ無し、S3 名のみ FileArchiveService が
      // 14桁の JST タイムスタンプを付与する。
      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
      const baseName = this.buildZougenBaseName(
        query.tekiyo_date,
        session.role_code,
        ja.code,
        ja.name,
      );
      const filename = `${baseName}.pdf`;
      const asciiFilename = this.buildZougenAsciiFilename(query.tekiyo_date);

      // S3 保存 + t_file_upload 登録は共通の FileArchiveService に委譲する。
      // S3 パス: reports/zougen-hanbaiten/{ja_code}/{year}/（subFolder なし）。
      const [year] = query.tekiyo_date.split('-');
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
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

      // S3 保存 + t_file_upload 登録は共通の FileArchiveService に委譲する。
      // S3 パス: reports/zougen-nichino/{ja_code}/{YYYY}/（subFolder なし、
      // YYYY=適用日の年）。FileArchiveService が 14桁(JST)のタイムスタンプを
      // ファイル名に付与する。
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        category: 'zougen-nichino',
        // 増減通知（日本農業新聞） (SCR-029)：日農担当者DL可。
        downloadType: DownloadType.ZOUGEN_NICHINO,
        nichinoDownloadAllowedFlg: true,
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
