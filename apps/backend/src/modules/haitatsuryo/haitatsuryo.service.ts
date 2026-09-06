import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { ZEI_KUBUN_UCHIZEI } from '@/common/constants/zei-kubun.constant';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { FILE_DOWNLOAD_TARGET_TABLE } from '@/common/constants/audit-target-table.constant';
import { AuditOperation, DownloadType, LogType } from '@/common/enums';

import { InactiveTankaReferencedException } from '@/common/exceptions/inactive-tanka-referenced.exception';

import { HaitatsuryoQueryDto } from './dto/haitatsuryo-query.dto';
import {
  buildHaitatsuryoSql,
  buildInactiveHaitatsuryoTankaSql,
  mapHaitatsuryoRows,
  type HaitatsuryoAggRow,
  type HaitatsuryoPreviewData,
  type InactiveHaitatsuryoTankaRow,
} from './haitatsuryo.mapper';

// 失効単価参照エラー（error gate）の案内文（ACSMS-SCR-021 専用・顧客要件2026-07）。
const INACTIVE_TANKA_MESSAGE =
  '失効した配達手数料単価を参照している販売店が存在するため、配達手数料支払情報を出力できません。該当販売店の単価を変更してから再度実行してください。';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = '配達手数料支払情報';

export type ExportHaitatsuryoResult =
  | {
      /** 対象0件 → Excel は生成せず、controller は 200 + 空配列で応答する。 */
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

@Injectable()
export class HaitatsuryoService {
  private readonly logger = new Logger(HaitatsuryoService.name);

  constructor(
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    // 共通の S3 アーカイブ + t_file_upload 登録（ReportModule から再利用）。
    private readonly fileArchive: FileArchiveService,
    // CodeService (@Global) は Excel の貯金種目ラベル解決にのみ使用。spec が
    // 4 引数で `new` するため @Optional()（本番 DI では常に注入される）。
    @Optional()
    private readonly codeService?: CodeService,
  ) {}

  // ─── ACSMS-API-021-001 — GET /api/v1/haitatsuryo/preview ────────────
  async previewHaitatsuryo(
    query: HaitatsuryoQueryDto,
    session: SessionPayload,
  ): Promise<HaitatsuryoPreviewData> {
    // v1.x error gate: 出力対象に失効単価(active_flg=FALSE)を参照する販売店が
    // 居れば 409 (INACTIVE_TANKA_REFERENCED) で止め、該当販売店を提示する。
    // プレビュー段階で検出し、手動での単価移行を促す（顧客要件 2026-07）。
    await this.assertNoInactiveTanka(query, session);
    const zeiKubun = await this.fetchZeiKubun(session);
    const rows = await this.fetchAggRows(query, session, zeiKubun);
    // 0件は「検索成功・結果なし」として 200 + 空配列を返す（REST 準拠、
    // ACSMS-SCR-026/028 と同じ方針）。FE は data.length===0 で画面内に
    // 「該当する支払い情報が存在しません。」を表示する。
    // 集計は販売店単位（件数は限定的）なので全件集計→ページスライスで返す。
    // grand_total_* は全販売店通算（ページに依存しない）。
    return mapHaitatsuryoRows(rows, zeiKubun, {
      page: query.page ?? 1,
      per_page: query.per_page ?? 20,
    });
  }

  // ─── ACSMS-API-021-002 — POST /api/v1/haitatsuryo/export ────────────
  async exportHaitatsuryoExcel(
    body: HaitatsuryoQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportHaitatsuryoResult> {
    try {
      // 4.x error gate: 失効単価参照の販売店が居れば 409 で止める（preview と同様）。
      await this.assertNoInactiveTanka(body, session);
      const zeiKubun = await this.fetchZeiKubun(session);
      const rows = await this.fetchAggRows(body, session, zeiKubun);
      // 対象0件 → Excel 生成 / S3 保存 / DB 登録は実行しない。controller が
      // 200 + 空配列(JSON)で応答する（preview と同じ no-data 方針）。
      if (rows.length === 0) return { empty: true };

      const preview = mapHaitatsuryoRows(rows, zeiKubun);
      const buffer = await this.buildExcelBuffer(preview);

      const [y, m] = body.target_month.split('-');
      const baseName = `配達手数料支払情報出力_${y}年${m}月`;
      // ダウンロード名はタイムスタンプ無し（従来どおり）。
      const filename = `${baseName}.xlsx`;
      const asciiFilename = `haitatsuryo_shiharai_${y}${m}.xlsx`;

      // 共通サービスで S3 保存 + t_file_upload 登録。
      // S3 キー: haitatsuryo/{ja_code}/{YYYY}/{baseName}_{yyyyMMddHHmmss}.xlsx
      //（rootPrefix='' で reports/ プレフィックスなし、subFolder なし）。
      // scheduled_delete_date = 作成日(JST)+5年は本サービスが設定する。
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        category: 'haitatsuryo',
        rootPrefix: '',
        year: y,
        jaId: session.ja_id ?? null,
        session,
        recordCount: preview.meta.total,
        contentType: XLSX_MIME,
        extension: '.xlsx',
        // 配達手数料支払情報 (SCR-021)：その他扱い・日農担当者DL不可。
        downloadType: DownloadType.OTHER,
        nichinoDownloadAllowedFlg: false,
      });

      // 操作ログ(4.6)。アーカイブ先テーブル(t_file_download)を対象に記録する。
      const ctx = buildAuditCtx(
        session,
        req,
        ScreenName.ACSMS_SCR_021,
        FILE_DOWNLOAD_TARGET_TABLE,
        archived.fileDownloadId,
      );
      // 個人情報は含めず、出力条件と件数のみを記録する（4.6）。
      const afterValue = JSON.stringify({
        target_month: body.target_month,
        haitatsuryo_shiharai_cycle: body.haitatsuryo_shiharai_cycle ?? null,
        zei_kubun: zeiKubun,
        record_count: preview.meta.total,
        grand_total_busu: preview.meta.grand_total_busu,
        grand_total_kingaku: preview.meta.grand_total_kingaku,
        file_name: archived.filename,
        s3_file_path: archived.key,
      });
      await this.auditLog.logExport(ctx, {
        operation: AuditOperation.CREATE,
        logType: LogType.FILE_OPERATION,
        afterValue,
      });

      return { empty: false, buffer, filename, asciiFilename };
    } catch (err) {
      // 失効単価参照 (409) は業務エラーのためエラーログ対象外。0件は throw では
      // なく早期 return のためここには到達しない。それ以外は log_type=3 を
      // トランザクション外で記録する（4.8）。
      if (err instanceof InactiveTankaReferencedException) throw err;
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_021, FILE_DOWNLOAD_TARGET_TABLE, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── private ─────────────────────────────────────────────────────

  /**
   * 4.x 失効単価参照の検証（error gate）。出力対象の母集合に、配達手数料単価
   * (tanka_type=2) が active_flg=FALSE の販売店が 1 件でもあれば
   * InactiveTankaReferencedException(409) を送出し、出力を止める（顧客要件2026-07）。
   * 該当販売店は `errors[]`（field=hanbaiten_id, message=販売店名 + 単価）で先頭
   * INACTIVE_TANKA_LIST_LIMIT 件を列挙し、`total` に総該当件数を載せる。全件確認・
   * 単価変更は販売店明細検索で行う運用。
   */
  private async assertNoInactiveTanka(
    query: HaitatsuryoQueryDto,
    session: SessionPayload,
  ): Promise<void> {
    const { sql, params } = buildInactiveHaitatsuryoTankaSql(query, session);
    const rows: InactiveHaitatsuryoTankaRow[] = await this.dataSource.query(
      sql,
      params,
    );
    if (rows.length === 0) return;
    const total = Number(rows[0]?.total_count ?? rows.length);
    const errors = rows.map((r) => ({
      field: String(r.hanbaiten_id),
      message: `${r.hanbaiten_code ?? ''} ${r.hanbaiten_name ?? ''}（単価: ${r.tanka_code} ${r.tanka_name}）`,
    }));
    throw new InactiveTankaReferencedException(
      errors,
      total,
      INACTIVE_TANKA_MESSAGE,
    );
  }

  /** ログインユーザーの所属 JA の税区分を取得する（4.3。未取得時は内税）。 */
  private async fetchZeiKubun(session: SessionPayload): Promise<number> {
    const ja = await this.jaRepo.findOne({
      where: { jaId: session.ja_id as number, deletedAt: IsNull() },
    });
    return ja?.zeiKubun ?? ZEI_KUBUN_UCHIZEI;
  }

  /** 集計データ（販売店ごと）を取得する（4.4。DataScope は SQL に内包）。 */
  private async fetchAggRows(
    query: HaitatsuryoQueryDto,
    session: SessionPayload,
    zeiKubun: number,
  ): Promise<HaitatsuryoAggRow[]> {
    const { sql, params } = buildHaitatsuryoSql(query, session, zeiKubun);
    return this.dataSource.query(sql, params);
  }

  /**
   * 配達手数料支払情報の Excel を生成する（4.4）。ヘッダ行 + データ行 + 末尾の
   * 合計行。貯金種目は m_code ラベル（CodeService）で表示する。
   */
  private async buildExcelBuffer(
    preview: HaitatsuryoPreviewData,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);

    const header = [
      '対象月',
      '委託区分',
      '販売店コード',
      '販売店名',
      '当月部数',
      '単価',
      '当月金額',
      '支払サイクル',
      '金融機関コード',
      '金融機関名',
      '口座支店コード',
      '口座支店名',
      '貯金種目',
      '口座番号',
      '口座名義',
      '手数料',
      '備考',
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };

    for (const row of preview.data) {
      sheet.addRow([
        row.target_month,
        row.itaku_kubun == null
          ? ''
          : (this.codeService?.getLabel('ITAKU_KUBUN', row.itaku_kubun) ??
            String(row.itaku_kubun)),
        row.hanbaiten_code,
        row.hanbaiten_name,
        row.total_busu,
        row.tesuryo,
        row.total_kingaku,
        row.haitatsuryo_shiharai_cycle ?? '',
        row.bank_code,
        row.bank_name,
        row.bank_branch_code,
        row.bank_branch_name,
        row.yokin_shubetsu == null
          ? ''
          : (this.codeService?.getLabel('YOKIN_SHUBETSU', row.yokin_shubetsu) ??
            String(row.yokin_shubetsu)),
        row.koza_no,
        row.koza_meigi,
        // 「手数料」列は振込手数料負担区分の m_code ラベル（TESURYO_KUBUN）を表示する。
        row.furikomi_tesuryo_futan_kubun == null
          ? ''
          : (this.codeService?.getLabel(
              'TESURYO_KUBUN',
              row.furikomi_tesuryo_futan_kubun,
            ) ?? String(row.furikomi_tesuryo_futan_kubun)),
        row.biko,
      ]);
    }

    // 合計行（末尾）
    const totalRow = sheet.addRow([
      '合計',
      '',
      '',
      '',
      preview.meta.grand_total_busu,
      '',
      preview.meta.grand_total_kingaku,
    ]);
    totalRow.font = { bold: true };

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
