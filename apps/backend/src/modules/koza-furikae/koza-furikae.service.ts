import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as iconv from 'iconv-lite';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { StorageService } from '@/modules/storage/storage.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { timestampForFilenameJst } from '@/common/utils/datetime';
import {
  AuditOperation,
  DownloadType,
  LogType,
  ResultStatus,
} from '@/common/enums';

import { ExportKozaFurikaeDto } from './dto/export-koza-furikae.dto';
import { NoTargetDataException } from './exceptions/no-target-data.exception';

const SCREEN_NAME = '口座振替データ出力画面 (ACSMS-SCR-020)';
const TABLE_NAME = 't_file_download';
const CSV_MIME = 'text/csv; charset=Shift_JIS';

/** API-020-001 初期データ（m_ja JASTEM 委託者情報 + 最終使用 m_shiten 金融機関支店情報）。 */
export interface KozaFurikaeInitialData {
  ja_id: number | null;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

/** raw SQL 由来の数値列（pg ドライバが string で返す場合あり、NULL 許容）。 */
type NullableNumeric = number | string | null;

/** 集計1行（購読者×引落口座）。raw `dataSource.query(...)` の SQL 別名。 */
interface KozaFurikaeAggRow {
  dokusya_id: number | string;
  koza_meigi: string | null;
  bank_branch_code: string | null;
  bank_branch_name: string | null;
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string | null;
  hikiotoshi_koza_meigi: string | null;
  ja_id: number | string;
  kanri_shiten_id: NullableNumeric;
  shiten_id: NullableNumeric;
  furikae_kingaku: NullableNumeric;
  koza_shiten_id: NullableNumeric;
  bank_branch_code_master: string | null;
  bank_branch_name_master: string | null;
}

export interface ExportKozaFurikaeResult {
  buffer: Buffer;
  filename: string;
  recordCount: number;
}

@Injectable()
export class KozaFurikaeService {
  private readonly logger = new Logger(KozaFurikaeService.name);

  constructor(
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    @InjectRepository(Shiten)
    private readonly shitenRepo: Repository<Shiten>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly storage: StorageService,
  ) {}

  // ─── ACSMS-API-020-001 — GET /api/v1/koza-furikae/initial ───────────
  async getInitialData(
    session: SessionPayload,
  ): Promise<{ data: KozaFurikaeInitialData }> {
    // 4.3 m_ja JASTEM 委託者情報（DataScope: ja_id = user.ja_id）。
    const ja = await this.jaRepo.findOne({
      where: { jaId: session.ja_id as number, deletedAt: IsNull() },
    });

    // 4.3 同一JA内・最終更新の金融機関支店（kinyu_shiten_flg=TRUE）。
    const shiten = await this.shitenRepo.findOne({
      where: {
        jaId: session.ja_id as number,
        kinyuShitenFlg: true,
        deletedAt: IsNull(),
      },
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });

    // 4.4 金融機関支店が無い場合は空文字 + 貯金種目 "1"（画面デフォルト）。
    return {
      data: {
        ja_id: session.ja_id,
        jastem_itakusha_code: ja?.jastemItakushaCode ?? '',
        jastem_itakusha_name: ja?.jastemItakushaName ?? '',
        jastem_ja_code: ja?.jastemJaCode ?? '',
        jastem_ja_name: ja?.jastemJaName ?? '',
        jastem_toriatsukai_tenpo_code: shiten?.jastemToriatsukaiTenpoCode ?? '',
        jastem_tenpo_name: shiten?.jastemTenpoName ?? '',
        jastem_tyokin_shubetsu: shiten?.jastemTyokinShubetsu || '1',
        jastem_koza_no: shiten?.jastemKozaNo ?? '',
      },
    };
  }

  // ─── ACSMS-API-020-002 — POST /api/v1/koza-furikae/export ───────────
  async exportCsv(
    body: ExportKozaFurikaeDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportKozaFurikaeResult> {
    try {
      // 4.3 集計対象の購読者（口座引落・継続）を取得する。
      const rows: KozaFurikaeAggRow[] = await this.fetchAggRows(body, session);
      // 4.3 0件 → 404 (NO_TARGET_DATA)。CSV / S3 / DB は実行しない。
      if (rows.length === 0) throw new NoTargetDataException();

      // 4.4 全銀フォーマット CSV を生成し、S3 にアップロードする（tx 外で先に実行）。
      const csv = this.buildZenginCsv(body, rows);
      const buffer = iconv.encode(csv, 'Shift_JIS');
      const filename = `koza_furikae_${timestampForFilenameJst()}.csv`;
      const key = `ja-${session.ja_id}/koza_furikae/${filename}`;
      await this.storage.upload(key, buffer, CSV_MIME);

      // 4.5〜4.8 m_ja / m_shiten 更新 + t_koza_furikae upsert + t_file_download
      //          登録 + 操作ログ を単一トランザクションで実行する。
      await this.dataSource.transaction(async (manager) => {
        const updatedBy = String(session.account_id);

        // 4.5 m_ja JASTEM 委託者情報を更新。
        await manager.update(
          Ja,
          { jaId: session.ja_id as number },
          {
            jastemItakushaCode: body.jastem_itakusha_code,
            jastemItakushaName: body.jastem_itakusha_name,
            jastemJaCode: body.jastem_ja_code,
            jastemJaName: body.jastem_ja_name,
            updatedBy,
          },
        );

        // 4.5 対象 m_shiten の JASTEM 金融機関支店情報を更新。koza_shiten_ids が
        //     空のときは集計に登場した全 m_shiten を対象とする。
        const targetShitenIds =
          body.koza_shiten_ids && body.koza_shiten_ids.length > 0
            ? body.koza_shiten_ids
            : [
                ...new Set(
                  rows
                    .map((r) => (r.koza_shiten_id == null ? null : Number(r.koza_shiten_id)))
                    .filter((v): v is number => v != null),
                ),
              ];
        if (targetShitenIds.length > 0) {
          await manager.update(
            Shiten,
            {
              shitenId: In(targetShitenIds),
              jaId: session.ja_id as number,
              kinyuShitenFlg: true,
            },
            {
              jastemToriatsukaiTenpoCode: body.jastem_toriatsukai_tenpo_code,
              jastemTenpoName: body.jastem_tenpo_name,
              jastemTyokinShubetsu: body.jastem_tyokin_shubetsu,
              jastemKozaNo: body.jastem_koza_no,
              updatedBy,
            },
          );
        }

        // 4.6 t_koza_furikae にスナップショットを upsert（dokusya_id, target_month）。
        const targetMonthYm = body.target_month.slice(0, 7).replace('-', '');
        for (const r of rows) {
          await manager.query(KOZA_FURIKAE_UPSERT_SQL, [
            session.ja_id,
            Number(r.dokusya_id),
            targetMonthYm,
            body.hikiotoshi_date,
            r.furikae_kingaku == null ? 0 : Number(r.furikae_kingaku),
            r.hikiotoshi_koza_no ?? '',
            r.hikiotoshi_koza_meigi ?? r.koza_meigi ?? '',
            r.hikiotoshi_yokin_shubetsu ?? null,
            body.jastem_ja_code,
            body.jastem_tenpo_name,
            r.bank_branch_code ?? '',
            r.bank_branch_name ?? '',
            updatedBy,
          ]);
        }

        // 4.7 t_file_download にダウンロード履歴を登録。
        const saved = await manager.save(
          FileDownload,
          manager.create(FileDownload, {
            jaId: session.ja_id ?? null,
            downloadDatetime: new Date(),
            downloadType: DownloadType.KOZA_FURIKAE,
            fileName: filename,
            filePath: key,
            fileSize: buffer.length,
            recordCount: rows.length,
            targetMonth: targetMonthYm,
            createdBy: updatedBy,
          }),
        );

        // 4.8 操作ログ。機密情報（口座番号）はマスクして after_value に格納。
        const ctx = buildAuditCtx(
          session,
          req,
          SCREEN_NAME,
          TABLE_NAME,
          saved.fileDownloadId ?? null,
        );
        const afterValue = JSON.stringify({
          target_month: body.target_month,
          hikiotoshi_date: body.hikiotoshi_date,
          kanri_shiten_ids: body.kanri_shiten_ids ?? [],
          shiten_ids: body.shiten_ids ?? [],
          koza_shiten_ids: body.koza_shiten_ids ?? [],
          jastem_itakusha_code: body.jastem_itakusha_code,
          jastem_ja_code: body.jastem_ja_code,
          jastem_toriatsukai_tenpo_code: body.jastem_toriatsukai_tenpo_code,
          jastem_tyokin_shubetsu: body.jastem_tyokin_shubetsu,
          jastem_koza_no: '*'.repeat(body.jastem_koza_no.length),
          file_name: filename,
          record_count: rows.length,
        });
        await this.auditLog.logOperation(
          {
            logType: LogType.USER_OPERATION,
            accountId: ctx.accountId,
            jaId: ctx.jaId,
            gamenName: ctx.screen,
            operation: AuditOperation.CREATE,
            resultStatus: ResultStatus.SUCCESS,
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

      return { buffer, filename, recordCount: rows.length };
    } catch (err) {
      // 業務上の 0 件 (404) はエラーログ対象外。それ以外は log_type=3 を
      // トランザクション外で記録してから再スローする（4.10）。
      if (err instanceof NoTargetDataException) throw err;
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── private ─────────────────────────────────────────────────────

  /** 4.3 対象購読者の集計（DataScope は params に内包）。 */
  private async fetchAggRows(
    body: ExportKozaFurikaeDto,
    session: SessionPayload,
  ): Promise<KozaFurikaeAggRow[]> {
    const params: unknown[] = [
      body.target_month, // $1
      session.ja_id, // $2
      session.kanri_shiten_id ?? null, // $3
      body.kanri_shiten_ids && body.kanri_shiten_ids.length > 0
        ? body.kanri_shiten_ids
        : null, // $4
      body.shiten_ids && body.shiten_ids.length > 0 ? body.shiten_ids : null, // $5
      body.koza_shiten_ids && body.koza_shiten_ids.length > 0
        ? body.koza_shiten_ids
        : null, // $6
    ];
    return this.dataSource.query(KOZA_FURIKAE_AGG_SQL, params);
  }

  /** 全銀フォーマット CSV（ヘッダ/データ/トレーラ/エンド）を組み立てる（4.4）。 */
  private buildZenginCsv(
    body: ExportKozaFurikaeDto,
    rows: KozaFurikaeAggRow[],
  ): string {
    const hikiotoshiMmdd = body.hikiotoshi_date.replaceAll('-', '').slice(4); // MMDD
    const header = [
      '1',
      '21',
      '0',
      body.jastem_itakusha_code,
      body.jastem_itakusha_name,
      hikiotoshiMmdd,
      body.jastem_ja_code,
      body.jastem_ja_name,
      body.jastem_toriatsukai_tenpo_code,
      body.jastem_tenpo_name,
      body.jastem_tyokin_shubetsu,
      body.jastem_koza_no,
    ].join(',');

    let total = 0;
    const data = rows.map((r) => {
      const kingaku = r.furikae_kingaku == null ? 0 : Number(r.furikae_kingaku);
      total += kingaku;
      return [
        '2',
        body.jastem_ja_code,
        body.jastem_tenpo_name,
        r.bank_branch_code ?? '',
        r.bank_branch_name ?? '',
        String(r.hikiotoshi_yokin_shubetsu ?? ''),
        r.hikiotoshi_koza_no ?? '',
        r.hikiotoshi_koza_meigi ?? r.koza_meigi ?? '',
        String(kingaku),
        String(r.dokusya_id),
      ].join(',');
    });

    const trailer = ['8', String(rows.length), String(total)].join(',');
    const end = '9';
    return [header, ...data, trailer, end].join('\r\n') + '\r\n';
  }

  /** S3 保存・ファイル名用タイムスタンプ（Asia/Tokyo, YYYYMMDD_HHmmss）。 */
}

/**
 * 4.3 対象購読者の集計 SQL。口座引落(shiharai_hoho=1)・継続(tetsuzuki_shurui=1)で
 * 対象年月時点の有効購読料単価(tanka_type=1)を持つ購読者を販売店・支店スコープで抽出。
 * params: [$1 target_month, $2 ja_id, $3 kanri_shiten_id,
 *          $4 kanri_shiten_ids, $5 shiten_ids, $6 koza_shiten_ids]
 */
const KOZA_FURIKAE_AGG_SQL = `
  SELECT d.dokusya_id,
         d.shimei_kana_sei || ' ' || d.shimei_kana_mei AS koza_meigi,
         d.bank_branch_code,
         d.bank_branch_name,
         d.hikiotoshi_yokin_shubetsu,
         d.hikiotoshi_koza_no,
         d.hikiotoshi_koza_meigi,
         d.ja_id,
         d.kanri_shiten_id,
         d.shiten_id,
         t.kingaku_zeikomi AS furikae_kingaku,
         s.shiten_id       AS koza_shiten_id,
         s.shiten_code     AS bank_branch_code_master,
         s.shiten_name     AS bank_branch_name_master
    FROM t_dokusya d
    INNER JOIN m_hanbaiten h
      ON h.hanbaiten_id = d.hanbaiten_id
     AND h.deleted_at IS NULL
    INNER JOIN m_tanka t
      ON t.tanka_id = d.tanka_id
     AND t.tanka_type = 1
     AND t.deleted_at IS NULL
     AND t.active_flg = TRUE
     AND t.tekiyo_start_date <= $1::date
     AND (t.tekiyo_end_date IS NULL OR t.tekiyo_end_date >= $1::date)
    LEFT JOIN m_shiten s
      ON s.shiten_code = d.bank_branch_code
     AND s.ja_id = d.ja_id
     AND s.kinyu_shiten_flg = TRUE
     AND s.deleted_at IS NULL
   WHERE d.deleted_at IS NULL
     AND d.shiharai_hoho = 1
     AND d.tetsuzuki_shurui = 1
     AND d.dokusya_kaishi_date <= $1
     AND (d.dokusya_chushi_date IS NULL OR d.dokusya_chushi_date > $1)
     AND d.ja_id = $2
     AND ($3::bigint IS NULL OR d.kanri_shiten_id = $3::bigint)
     AND ($4::bigint[] IS NULL OR d.kanri_shiten_id = ANY($4::bigint[]))
     AND ($5::bigint[] IS NULL OR d.shiten_id = ANY($5::bigint[]))
     AND ($6::bigint[] IS NULL OR s.shiten_id = ANY($6::bigint[]))
   ORDER BY d.kanri_shiten_id, d.shiten_id, d.dokusya_id
`;

/**
 * 4.6 t_koza_furikae upsert（同月再生成は ON CONFLICT で更新）。
 * params: [$1 ja_id, $2 dokusya_id, $3 target_month, $4 furikae_date,
 *          $5 furikae_kingaku, $6 koza_no, $7 koza_meigi, $8 yokin_shubetsu,
 *          $9 bank_code, $10 bank_name, $11 bank_branch_code,
 *          $12 bank_branch_name, $13 updated_by]
 */
const KOZA_FURIKAE_UPSERT_SQL = `
  INSERT INTO t_koza_furikae (
    ja_id, dokusya_id, target_month, furikae_date, furikae_kingaku,
    koza_no, koza_meigi, yokin_shubetsu,
    bank_code, bank_name, bank_branch_code, bank_branch_name,
    created_at, created_by, updated_at, updated_by
  ) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8,
    $9, $10, $11, $12,
    NOW(), $13, NOW(), $13
  )
  ON CONFLICT (dokusya_id, target_month)
  DO UPDATE SET
    furikae_date     = EXCLUDED.furikae_date,
    furikae_kingaku  = EXCLUDED.furikae_kingaku,
    koza_no          = EXCLUDED.koza_no,
    koza_meigi       = EXCLUDED.koza_meigi,
    yokin_shubetsu   = EXCLUDED.yokin_shubetsu,
    bank_code        = EXCLUDED.bank_code,
    bank_name        = EXCLUDED.bank_name,
    bank_branch_code = EXCLUDED.bank_branch_code,
    bank_branch_name = EXCLUDED.bank_branch_name,
    updated_at       = NOW(),
    updated_by       = EXCLUDED.updated_by
`;
