import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as iconv from 'iconv-lite';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { AuditOperation, DownloadType } from '@/common/enums';

import { ExportKozaFurikaeDto } from './dto/export-koza-furikae.dto';
import { PreviewKozaFurikaeDto } from './dto/preview-koza-furikae.dto';
import { NoTargetDataException } from './exceptions/no-target-data.exception';
import { InactiveTankaReferencedException } from '@/common/exceptions/inactive-tanka-referenced.exception';
import { toKozaPreviewRow, type KozaPreviewRow } from './koza-furikae.mapper';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  buildRecord,
  padCharSpace,
  padNumSpaceRight,
  padNumZero,
  spaces,
} from './zengin-format';

const SCREEN_NAME = '口座振替データ出力画面 (ACSMS-SCR-020)';
const TABLE_NAME = 't_file_download';
// 全銀フォーマットは固定長テキスト（CSV ではない）。Shift_JIS 固定。
const ZENGIN_MIME = 'text/plain; charset=Shift_JIS';

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

/** preview / export が共有する集計フィルタ（target_month + 絞込ID群）。 */
export interface KozaFurikaeAggFilter {
  target_month: string;
  kanri_shiten_ids?: number[];
  shiten_ids?: number[];
  koza_shiten_ids?: number[];
}

/** 集計1行（購読者×引落口座）。raw `dataSource.query(...)` の SQL 別名。 */
export interface KozaFurikaeAggRow {
  dokusya_id: number | string;
  koza_meigi: string | null;
  bank_branch_code: string | null;
  bank_branch_name: string | null;
  bank_branch_name_kana: string | null;
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

/** 失効単価参照チェック（KOZA_FURIKAE_INACTIVE_TANKA_SQL）の1行。 */
export interface InactiveTankaRow {
  dokusya_id: number | string;
  koza_meigi: string | null;
  tanka_code: string | null;
  tanka_name: string | null;
  /** COUNT(*) OVER() — LIMIT 前の総該当件数（pg は文字列で返す場合あり）。 */
  total_count: number | string;
}

/**
 * 失効単価参照エラーで返す該当購読者一覧の上限。全件はエラー画面に列挙せず、
 * 総件数(total)＋先頭 N 件のみ提示し、全件の確認・単価変更は購読者明細検索画面
 * （「失効単価参照」絞込）へ誘導する運用（顧客要件 2026-07）。
 */
const INACTIVE_TANKA_LIST_LIMIT = 15;

export interface ExportKozaFurikaeResult {
  buffer: Buffer;
  /** ダウンロード用ファイル名（日本語名、タイムスタンプ無し）。 */
  filename: string;
  /** Content-Disposition の filename 用 ASCII フォールバック名。 */
  asciiFilename: string;
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
    // 共通の S3 アーカイブ + t_file_upload 登録（ReportModule から再利用）。
    private readonly fileArchive: FileArchiveService,
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

  // ─── ACSMS-API-020-003 — POST /api/v1/koza-furikae/preview ──────────
  /**
   * 「作成開始」= 集計してプレビュー一覧を返す（v1.1）。DB / S3 / 監査ログは
   * 書き込まない（閲覧のみ）。0 件は 404 (NO_TARGET_DATA) で MSG-020-002 を
   * プレビュー段に表示させる。金額は集計初期値で、FE で編集される。
   */
  async previewData(
    body: PreviewKozaFurikaeDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<KozaPreviewRow>> {
    // v1.1 error gate: 出力対象に失効単価(active_flg=FALSE)を参照する購読者が
    // 居れば 409 (INACTIVE_TANKA_REFERENCED) で止め、該当者を提示する。プレビュー
    // 段階で検出することで、金額編集前にユーザーへ手動移行を促す（顧客要件 2026-07）。
    await this.assertNoInactiveTanka(body, session);
    const rows = await this.fetchAggRows(body, session);
    if (rows.length === 0) throw new NoTargetDataException();
    // 全件を1ページで返す（D4）。FE はクライアントページングで表示、meta.total を
    // 件数表示に使う。合計金額は FE 側で行金額を合算する（編集で変動するため）。
    const data = rows.map(toKozaPreviewRow);
    return paginate(data, data.length, 1, data.length);
  }

  // ─── ACSMS-API-020-002 — POST /api/v1/koza-furikae/export ───────────
  async exportCsv(
    body: ExportKozaFurikaeDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportKozaFurikaeResult> {
    try {
      // 4.3 error gate: 出力対象に失効単価(active_flg=FALSE)を参照する購読者が
      // 居れば 409 (INACTIVE_TANKA_REFERENCED) で出力を止め、該当者を提示する
      // （顧客要件 2026-07）。CSV / S3 / DB は実行しない。
      await this.assertNoInactiveTanka(body, session);

      // 4.3 集計対象の購読者（口座引落・継続）を取得する。スコープ（ja_id /
      // kanri_shiten_id）は params に内包されるため、これが信頼できる行集合。
      const rows: KozaFurikaeAggRow[] = await this.fetchAggRows(body, session);
      // 4.3 0件 → 404 (NO_TARGET_DATA)。CSV / S3 / DB は実行しない。
      if (rows.length === 0) throw new NoTargetDataException();

      // v1.1: プレビューで編集した金額を dokusya_id で突合し、スコープ内の行だけ
      // 上書きする。client が送った dokusya_id は信用しない — 再集計した rows を
      // 基準にループするので、スコープ外/偽の dokusya_id は自然に無視される
      // （security.md Layer2/4）。未編集行は集計の DB 金額をそのまま使う。
      const override = new Map<number, number>(
        (body.rows ?? []).map((r) => [Number(r.dokusya_id), r.furikae_kingaku]),
      );
      for (const r of rows) {
        const edited = override.get(Number(r.dokusya_id));
        if (edited != null) r.furikae_kingaku = edited;
      }

      // 4.4 全銀フォーマット（固定長120バイト・種別91）を生成し Shift_JIS へ変換する。
      const zengin = this.buildZenginFixed(body, rows);
      const buffer = iconv.encode(zengin, 'Shift_JIS');

      // ダウンロード名は全銀の慣例に合わせ固定名 `ZENOUTFD`（拡張子なし）とする。
      // 顧客提供サンプル `ZENOUTFD_口座振替データサンプル` に準拠。銀行の全銀メディア
      // 受入名がこの固定名のため、ユーザーはそのまま媒体へ書き出せる。
      const ja = await this.fileArchive.resolveJa(session.ja_id);
      const [y, m, d] = body.hikiotoshi_date.split('-');
      // S3 アーカイブ名は検索性のため日本語の説明的名称を維持する（内部保管用）。
      const baseName = `口座振替データ_${ja.code}_${y}年${m}月${d}日`;
      const filename = 'ZENOUTFD';
      const asciiFilename = 'ZENOUTFD';

      // 共通サービスで S3 保存 + t_file_upload 登録。
      // S3 キー: koza-furikae/{ja_code}/{YYYY}/{baseName}_{yyyyMMddHHmmss}.csv
      //（rootPrefix='' で reports/ プレフィックスなし、subFolder なし）。
      // scheduled_delete_date = 作成日(JST)+5年は本サービスが設定する。
      // S3 保存（外部 I/O）はトランザクション外で先に完了させる（4.4）。
      const archived = await this.fileArchive.archive({
        buffer,
        baseName,
        category: 'koza-furikae',
        rootPrefix: '',
        year: y,
        jaId: session.ja_id ?? null,
        jaCode: ja.code,
        session,
        recordCount: rows.length,
        contentType: ZENGIN_MIME,
        // 全銀メディアの受入名は拡張子なし（固定名 ZENOUTFD）。銀行提出ファイルに
        // .txt は不要なため、S3 保存名 / t_file_download / 履歴からの再DL とも
        // 拡張子を付けない。
        extension: '',
        // 口座振替データ (SCR-020)：日農担当者DL不可。
        downloadType: DownloadType.KOZA_FURIKAE,
        nichinoDownloadAllowedFlg: false,
        targetMonth: body.target_month.slice(0, 7).replace('-', ''),
      });

      // 4.6〜4.8 t_koza_furikae upsert + 操作ログ を単一トランザクションで実行する。
      // 顧客要件: JASTEM 委託者情報(m_ja) / 金融機関支店情報(m_shiten) は **readonly**
      // 表示のみで、出力時に m_ja / m_shiten へは更新しない（旧版の書き戻しを撤廃）。
      // CSV ヘッダの JASTEM 値は m_ja + 選択した口座支店(m_shiten) 由来の表示値を
      // そのまま使う（body 経由・readonly）。
      await this.dataSource.transaction(async (manager) => {
        const updatedBy = String(session.account_id);

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

        // 4.8 操作ログ。アーカイブ先テーブル(t_file_upload)を対象に記録する。
        //     機密情報（口座番号）はマスクして after_value に格納。
        const ctx = buildAuditCtx(
          session,
          req,
          SCREEN_NAME,
          TABLE_NAME,
          archived.fileDownloadId,
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
          file_name: archived.filename,
          s3_file_path: archived.key,
          record_count: rows.length,
        });
        await this.auditLog.logExport(ctx, {
          operation: AuditOperation.CREATE,
          afterValue,
          manager,
        });
      });

      return { buffer, filename, asciiFilename, recordCount: rows.length };
    } catch (err) {
      // 業務上の 0 件 (404) / 失効単価参照 (409) はエラーログ対象外。それ以外は
      // log_type=3 をトランザクション外で記録してから再スローする（4.10）。
      if (
        err instanceof NoTargetDataException ||
        err instanceof InactiveTankaReferencedException
      ) {
        throw err;
      }
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── private ─────────────────────────────────────────────────────

  /**
   * 4.3 集計 SQL 用パラメータ（DataScope は params に内包）。集計・失効チェックで共用。
   * params: [$1 target_month, $2 ja_id, $3 kanri_shiten_id,
   *          $4 kanri_shiten_ids, $5 shiten_ids, $6 koza_shiten_ids]
   */
  private buildAggParams(
    body: KozaFurikaeAggFilter,
    session: SessionPayload,
  ): unknown[] {
    return [
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
  }

  /**
   * 4.3 対象購読者の集計（DataScope は params に内包）。preview / export で共用する
   * 唯一の集計ロジック。フィルタ項目だけを持つ構造型を受け取り、両 DTO で使える。
   */
  private async fetchAggRows(
    body: KozaFurikaeAggFilter,
    session: SessionPayload,
  ): Promise<KozaFurikaeAggRow[]> {
    return this.dataSource.query(
      KOZA_FURIKAE_AGG_SQL,
      this.buildAggParams(body, session),
    );
  }

  /**
   * 4.3 失効単価参照の検証（export 前の error gate）。出力対象の母集合に
   * active_flg=FALSE の単価を参照する購読者が 1 件でもあれば
   * InactiveTankaReferencedException を送出し、出力を止める（顧客要件 2026-07）。
   * 該当購読者は `errors[]`（field=dokusya_id, message=購読者名 + 単価）で列挙する。
   */
  private async assertNoInactiveTanka(
    body: KozaFurikaeAggFilter,
    session: SessionPayload,
  ): Promise<void> {
    const rows: InactiveTankaRow[] = await this.dataSource.query(
      KOZA_FURIKAE_INACTIVE_TANKA_SQL,
      this.buildAggParams(body, session),
    );
    if (rows.length === 0) return;
    // SQL は COUNT(*) OVER() で LIMIT 前の総件数を各行に載せ、行自体は
    // INACTIVE_TANKA_LIST_LIMIT 件に絞る。総件数(total)＋先頭N件を返す。
    const total = Number(rows[0]?.total_count ?? rows.length);
    const errors = rows.map((r) => ({
      field: String(r.dokusya_id),
      message: `${r.koza_meigi ?? ''}（単価: ${r.tanka_code} ${r.tanka_name}）`,
    }));
    throw new InactiveTankaReferencedException(errors, total);
  }

  /** 全銀フォーマット CSV（ヘッダ/データ/トレーラ/エンド）を組み立てる（4.4）。 */
  /**
   * 全銀フォーマット（種別91・預金口座振替）固定長テキストを生成する（4.4）。
   * 1レコード=120バイト、順序 1:ヘッダ→2:データ×N→8:トレーラ→9:エンド、末尾CRLF。
   * Shift_JIS 変換は呼び出し側（exportCsv）で行う。
   * docs/demo/全銀フォーマット_91_口座振替データについて.xlsx「レコード定義」準拠。
   * NOTE: 取引/引落銀行番号は暫定的に jastem_ja_code を使用する
   *       （統一金融機関番号の正式ソース確定までのつなぎ・顧客合意 2026-07）。
   */
  private buildZenginFixed(
    body: ExportKozaFurikaeDto,
    rows: KozaFurikaeAggRow[],
  ): string {
    const hikiotoshiMmdd = body.hikiotoshi_date.replaceAll('-', '').slice(4); // MMDD

    // ── 1:ヘッダ（入金先=選択した口座支店 + 委託者=JA）──
    const header = buildRecord(
      [
        '1', // データ区分
        '91', // 種別コード（預金口座振替）
        '0', // コード区分（JIS系）
        padNumZero(body.jastem_itakusha_code, 10), // 委託者コード
        padCharSpace(body.jastem_itakusha_name, 40), // 委託者名
        padNumZero(hikiotoshiMmdd, 4), // 引落日 MMDD
        padNumZero(body.jastem_ja_code, 4), // 取引銀行番号（暫定=JA番号）
        padCharSpace(body.jastem_ja_name, 15), // 取引銀行名（カナ）
        padNumZero(body.jastem_toriatsukai_tenpo_code, 3), // 取引支店番号
        padCharSpace(body.jastem_tenpo_name, 15), // 取引支店名（カナ）
        padNumZero(body.jastem_tyokin_shubetsu, 1), // 預金種目
        padNumZero(body.jastem_koza_no, 7), // 口座番号
        spaces(17), // ダミー
      ],
      'ヘッダ',
    );

    // ── 2:データ×N（請求先=購読者の引落口座）──
    let total = 0;
    const data = rows.map((r) => {
      const kingaku = r.furikae_kingaku == null ? 0 : Number(r.furikae_kingaku);
      total += kingaku;
      return buildRecord(
        [
          '2', // データ区分
          padNumZero(body.jastem_ja_code, 4), // 引落銀行番号（暫定=JA番号）
          padCharSpace(body.jastem_ja_name, 15), // 引落銀行名（カナ）
          padNumZero(r.bank_branch_code, 3), // 引落支店番号
          padCharSpace(r.bank_branch_name_kana ?? r.bank_branch_name, 15), // 引落支店名（カナ）
          spaces(4), // ダミー
          padNumZero(r.hikiotoshi_yokin_shubetsu ?? '', 1), // 預金種目
          padNumZero(r.hikiotoshi_koza_no, 7), // 口座番号
          padCharSpace(r.hikiotoshi_koza_meigi ?? r.koza_meigi, 30), // 預金者名（カナ）
          padNumZero(kingaku, 10), // 引落金額
          '0', // 新規コード（0=その他）
          padNumSpaceRight(r.dokusya_id, 20), // 顧客番号（購読者ID・右詰めスペース埋め）
          '0', // 振替結果コード（請求時は0）
          spaces(8), // ダミー
        ],
        'データ',
      );
    });

    // ── 8:トレーラ（請求時は振替済/不能をゼロ）──
    const trailer = buildRecord(
      [
        '8', // データ区分
        padNumZero(rows.length, 6), // 合計件数
        padNumZero(total, 12), // 合計金額
        padNumZero(0, 6), // 振替済件数
        padNumZero(0, 12), // 振替済金額
        padNumZero(0, 6), // 振替不能件数
        padNumZero(0, 12), // 振替不能金額
        spaces(65), // ダミー
      ],
      'トレーラ',
    );

    // ── 9:エンド ──
    const end = buildRecord(['9', spaces(119)], 'エンド');

    return [header, ...data, trailer, end].join('\r\n') + '\r\n';
  }
}

/**
 * 4.3 対象購読者の集計 SQL。口座引落(shiharai_hoho=1)・継続(tetsuzuki_shurui=1)で
 * 有効な購読料単価(tanka_type=1, active_flg=TRUE)を持つ購読者を販売店・支店スコープで抽出。
 *
 * 顧客要件 2026-07: 単価の適用期間(tekiyo_start_date / tekiyo_end_date)と active_flg の
 * 整合は毎日 0:05 の単価失効バッチ（tekiyo_end_date < 本日 → active_flg=FALSE）が担保する。
 * よって本集計では期間の日付判定は行わず active_flg=TRUE のみで有効判定する。
 * 出力対象に失効単価(active_flg=FALSE)を参照する購読者が居ないことは、export 前に
 * KOZA_FURIKAE_INACTIVE_TANKA_SQL で検証しエラーで止める（該当者は本集計から除外される）。
 *
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
         s.shiten_name     AS bank_branch_name_master,
         s.shiten_name_kana AS bank_branch_name_kana
    FROM t_dokusya d
    INNER JOIN m_hanbaiten h
      ON h.hanbaiten_id = d.hanbaiten_id
     AND h.deleted_at IS NULL
    INNER JOIN m_tanka t
      ON t.tanka_id = d.tanka_id
     AND t.tanka_type = 1
     AND t.deleted_at IS NULL
     AND t.active_flg = TRUE
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
 * 4.3 失効単価参照チェック SQL（export 前の error gate）。KOZA_FURIKAE_AGG_SQL と
 * 同一の対象母集合（口座引落・継続・スコープ・画面絞込）から、参照単価が
 * active_flg=FALSE の購読者だけを抽出する。1件以上返れば出力を止める。
 * params は KOZA_FURIKAE_AGG_SQL と同一（$1..$6）。
 */
const KOZA_FURIKAE_INACTIVE_TANKA_SQL = `
  SELECT d.dokusya_id,
         d.shimei_kana_sei || ' ' || d.shimei_kana_mei AS koza_meigi,
         t.tanka_code,
         t.tanka_name,
         COUNT(*) OVER() AS total_count   -- LIMIT 前の総該当件数（window は LIMIT より先に評価される）
    FROM t_dokusya d
    INNER JOIN m_hanbaiten h
      ON h.hanbaiten_id = d.hanbaiten_id
     AND h.deleted_at IS NULL
    INNER JOIN m_tanka t
      ON t.tanka_id = d.tanka_id
     AND t.tanka_type = 1
     AND t.deleted_at IS NULL
     AND t.active_flg = FALSE
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
   LIMIT ${INACTIVE_TANKA_LIST_LIMIT}
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
