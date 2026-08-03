import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { ValidationException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  slashDateToIso,
  timestampForFilenameJst,
} from '@/common/utils/datetime';
import { applyBranchScope, applyShitenScope } from '@/common/utils/data-scope';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, clampPerPage, type PaginatedResponse } from '@/common/utils/paginate';
import {
  AuditOperation,
  DokusyaShubetsu,
  LogType,
  ResultStatus,
  ShiharaiHoho,
} from '@/common/enums';
import { TANKA_TYPE_KODOKU } from '@/common/constants/tanka-type.constant';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { ExportNoDataException } from './exceptions/export-no-data.exception';
import { ExportLimitExceededException } from './exceptions/export-limit-exceeded.exception';
import {
  DOKUSYA_EXPORT_HEADERS,
  DokusyaListItem,
  toDokusyaExcelRow,
  toDokusyaListItem,
} from './dokusya.mapper';

/**
 * SCR-014 監査ラベル。core DokusyaService と同一値だが自己完結のため複製
 * （delete も SCR-014 を使うため core 側にも同名定数が残る）。
 */
const SCREEN_NAME_SCR014 = '購読者明細検索画面 (ACSMS-SCR-014)';

/** SCR-014 監査テーブル名（t_log.target_table）。core と同一値だが複製保持。 */
const TABLE_NAME = 't_dokusya';

/**
 * 検索の sort_by 許可リスト。FE の snake_case 識別子 → 完全修飾 QB カラム。
 * DTO の `@IsIn` と一致必須。既定は `updated_at`、他は screen-design v1.2 の
 * 検索結果テーブルの sortable 列。
 */
const SORT_COLUMN_MAP: Record<string, string> = {
  dokusya_id: 'd.dokusya_id',
  kanri_shiten_id: 'd.kanri_shiten_id',
  shiten_id: 'd.shiten_id',
  kumiaiin_code: 'd.kumiaiin_code',
  hanbaiten_id: 'd.hanbaiten_id',
  hanbaiten_code: 'h.hanbaiten_code',
  shoki_dokusya_kaishi_date: 'd.shoki_dokusya_kaishi_date',
  dokusya_chushi_date: 'd.dokusya_chushi_date',
  updated_at: 'd.updated_at',
};

/** Excel 出力上限（api.md §API-014-003 §4.3 30,000件）。 */
const EXPORT_MAX_ROWS = 30000;

/**
 * 単一フィールド errors[] の VALIDATION_ERROR を生成。`ValidationPipe` と同形状で
 * FE `useApiForm` が DTO エラーと同じく `<a-form-item :help>` にマップできる。
 * core DokusyaService と同一実装（文言・形を揃えるため複製）。
 */
function fieldValidationError(
  field: string,
  message: string,
): ValidationException {
  return new ValidationException([{ field, message }]);
}

/**
 * SCR-014 — 購読者明細検索（検索 + Excel出力）サービス。
 * `DokusyaService` から SEARCH / EXPORT concern を切り出し、検索クエリ組み立て
 * （DataScope・等価/部分一致/日付範囲フィルタ）・Excel 生成・検索専用 m_code 再検証を
 * 集約。facade が `search` / `exportExcel` へ薄く委譲する。
 * constructor は dokusyaRepo / auditLog / codeService のみ注入（dataSource /
 * accountFlags は検索に不要）。
 */
@Injectable()
export class DokusyaSearchService {
  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // SCR-014 — 購読者明細検索画面
  // ════════════════════════════════════════════════════════════════════

  // ─── API-014-001 — GET /api/v1/dokusya (search) ─────────────────────
  /**
   * 購読者一覧を pagination + sort + filter + DataScope で検索。
   * Flow (api.md §API-014-001):
   *   §4.1 DTO が形状 + sort_by 許可リストを検証。本メソッドは追加で m_code 値
   *        (dokusya_shubetsu / shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status)
   *        を runtime 許可リストで再検証（closed-set の DTO `@IsIn` は顧客追加の
   *        m_code 拡張をカバーしないため）。
   *   §4.2 applyBranchScope で DataScope（CHUOKAI/JA_HONTEN→ja_id、
   *        JA_KANRI_SHITEN→kanri_shiten_id、NICHINO_*=bypass）。
   *   §4.3 パラメータ毎の等価 + ILIKE + 範囲フィルタ。
   *   §4.4/§4.5 単一 SELECT + getCount()（spec の getCount.mockResolvedValue(N) が
   *        meta.total を制御）。
   *   §4.6 paginate() で正準エンベロープへ。
   * 適用日(joho_henko_tekiyo_date)分岐:
   *   - 両方空 → t_dokusya の live 行（master が saishin 状態を反映）、rireki JOIN なし。
   *   - 片側でも指定 → t_dokusya_rireki を INNER JOIN し履歴の joho 列でフィルタ。
   */
  async search(
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaListItem>> {
    this.assertSearchMCodeValues(query);
    const sortColumn = this.resolveSortColumn(query.sort_by);
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = clampPerPage(query.per_page);

    const qb = this.dokusyaRepo.createQueryBuilder('d');
    this.buildSearchQuery(qb, query, session);

    // 購読部数の合計用に、ORDER BY / LIMIT を付ける前の絞り込み条件だけを複製する。
    const busuQb = qb.clone();

    // ORDER BY + LIMIT + OFFSET はデータ取得パスのみ。
    qb.orderBy(sortColumn, sortOrder);
    // limit/offset を使う（take/skip 不可）: take/skip は getMany() のみ効き
    // getRawMany() では無視されるため per_page が効かず全行返っていた。getCount() は
    // limit/offset を無視するので total は正しいまま。
    qb.limit(perPage);
    qb.offset((page - 1) * perPage);

    const [rows, total, totalBusu] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
      this.sumDokusyaBusu(busuQb),
    ]);

    const data = rows.map((row) => toDokusyaListItem(row));
    return paginate(data, Number(total), page, perPage, {
      total_busu: totalBusu,
    });
  }

  /**
   * 検索条件に一致する購読者の購読部数合計（顧客要件 2026-08。画面は
   * 「全 N 件　全 M 部」と併記する）。
   *
   * 素の `SUM(d.dokusya_busu)` は使えない。適用日で絞ると `t_dokusya_rireki` を
   * INNER JOIN するため 1購読者が履歴行の数だけ重複し、部数が水増しされる
   * （件数側は `getCount()` が `COUNT(DISTINCT)` なので影響を受けず、合計だけが
   * ずれる — 気付きにくい形の不一致になる）。
   *
   * そこで「購読者ごとに1行」へ畳んでから外側で合計する。DISTINCT の対象に
   * dokusya_id を含めるので、同部数の別購読者が潰れることもない。
   */
  private async sumDokusyaBusu(
    filteredQb: SelectQueryBuilder<Dokusya>,
  ): Promise<number> {
    const [sql, params] = filteredQb
      .select('DISTINCT d.dokusya_id', 'dokusya_id')
      .addSelect('d.dokusya_busu', 'dokusya_busu')
      .getQueryAndParameters();
    const rows: Array<{ total_busu: string | number | null }> =
      await this.dokusyaRepo.manager.query(
        `SELECT COALESCE(SUM(t.dokusya_busu), 0)::int AS total_busu FROM (${sql}) t`,
        params,
      );
    return Number(rows[0]?.total_busu ?? 0);
  }

  // ─── API-014-003 — GET /api/v1/dokusya/export ───────────────────────
  /**
   * フィルタ済み購読者一覧を Excel(xlsx) で出力。
   * Flow (api.md §API-014-003):
   *   §4.3 同一フィルタ/DataScope で COUNT(*)。0 → 404 EXPORT_NO_DATA、
   *        >30000 → 409 EXPORT_LIMIT_EXCEEDED。
   *   §4.4 行取得（pagination なし・30,000 件で hard-cap）。
   *   §4.5 14 列ヘッダ（検索結果テーブル準拠。手続種類/購読種別/配達先氏名/支払方法 含む、
   *        支店/連絡先２/かな氏名 除く）。
   *   §4.6 監査行（log_type=1, operation='EXPORT_EXCEL', after_value に record_count）。
   *   §4.7 ファイル名 `購読者一覧出力_YYYYMMDD_HHmmss.xlsx`(JST)。
   *   §4.8 エラーログは tx 外（remove() と同パターン）。
   */
  async exportExcel(
    query: SearchDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ buffer: Buffer; filename: string; headers: readonly string[] }> {
    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR014,
      TABLE_NAME,
      null,
    );

    try {
      this.assertSearchMCodeValues(query);

      // [count-guard] 単一 QB を getCount + getRawMany で 2 度使う。unit spec の
      // dokusyaQb は共有モックなので両呼び出しが同一チェーンに乗る。
      const qb = this.dokusyaRepo.createQueryBuilder('d');
      this.buildSearchQuery(qb, query, session);

      const total = Number(await qb.getCount());
      if (total === 0) {
        throw new ExportNoDataException();
      }
      if (total > EXPORT_MAX_ROWS) {
        throw new ExportLimitExceededException();
      }

      // pagination なし — 防御として明示 LIMIT cap。limit を使う（take 不可）:
      // take は getRawMany() で無視され cap が効かない。limit() が実 SQL LIMIT を出す。
      qb.orderBy('d.dokusya_id', 'ASC');
      qb.limit(EXPORT_MAX_ROWS);
      const rows = await qb.getRawMany<Record<string, unknown>>();
      const items = rows.map((row) => toDokusyaListItem(row));

      const filename = `購読者一覧出力_${timestampForFilenameJst()}.xlsx`;
      const buffer = await this.buildExcelBuffer(items);

      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: session.account_id,
        jaId: session.ja_id,
        gamenName: SCREEN_NAME_SCR014,
        operation: AuditOperation.EXPORT_EXCEL,
        resultStatus: ResultStatus.SUCCESS,
        targetId: null,
        targetTable: TABLE_NAME,
        afterValue: JSON.stringify({
          kanri_shiten_id: query.kanri_shiten_id ?? null,
          shiten_id: query.shiten_id ?? null,
          hanbaiten_id: query.hanbaiten_id ?? null,
          dokusya_shubetsu: query.dokusya_shubetsu ?? null,
          shiharai_hoho: query.shiharai_hoho ?? null,
          tetsuzuki_shurui: query.tetsuzuki_shurui ?? null,
          denshi_shonin_status: query.denshi_shonin_status ?? null,
          record_count: total,
        }),
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });

      return { buffer, filename, headers: DOKUSYA_EXPORT_HEADERS };
    } catch (err) {
      if (
        err instanceof ExportNoDataException ||
        err instanceof ExportLimitExceededException
      ) {
        throw err;
      }
      await this.auditLog.logError(auditCtx, AuditOperation.EXPORT_EXCEL, err as Error);
      throw err;
    }
  }

  // ─── private helpers (SCR-014) ───────────────────────────────────────

  /** m_code 連動の検索フィールドを CodeService で再検証。 */
  private assertSearchMCodeValues(query: SearchDokusyaDto): void {
    assertMCodeValues(this.codeService, [
      {
        field: 'dokusya_shubetsu',
        value: query.dokusya_shubetsu,
        category: 'DOKUSYA_SHUBETSU',
        label: '購読種別',
      },
      {
        field: 'shiharai_hoho',
        value: query.shiharai_hoho,
        category: 'SHIHARAI_HOHO',
        label: '支払方法',
      },
      {
        field: 'tetsuzuki_shurui',
        value: query.tetsuzuki_shurui,
        category: 'TETSUZUKI_SHURUI',
        label: '手続種類',
      },
    ]);
  }

  /**
   * FE 指定の sort_by から QB カラムを引く。許可リスト外は VALIDATION_ERROR。
   * DTO も未知値を弾くが、本ガードが権威チェック — 将来の DTO 変更や pipe を
   * 迂回する呼び出しでも任意 SQL を注入させない。
   */
  private resolveSortColumn(sortBy: string = 'updated_at'): string {
    const column = SORT_COLUMN_MAP[sortBy];
    if (!column) {
      throw fieldValidationError('sort_by', 'ソートカラムの値が不正です。');
    }
    return column;
  }

  /**
   * search()（ORDER BY + paging を追加）と exportExcel()（paging なし）が共有する
   * 共通 SELECT + JOIN + WHERE。
   * SELECT 形状は api.md §4.5 準拠 — full_name/full_name_kana は shimei concat、
   * haitatsu は住所 concat、is_read_only は boolean 式。mapper がこの alias を厳密に参照。
   */
  private buildSearchQuery(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): void {
    qb
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin(
        'm_shiten',
        's',
        's.shiten_id = d.shiten_id AND s.deleted_at IS NULL',
      )
      .leftJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .leftJoin(
        'm_todofuken',
        't',
        't.todofuken_code = d.haitatsu_todofuken_code',
      )
      .select([
        'd.dokusya_id AS dokusya_id',
        'd.ja_id AS ja_id',
        'd.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'd.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
        'd.kumiaiin_code AS kumiaiin_code',
        "(d.shimei_sei || ' ' || d.shimei_mei) AS full_name",
        "(d.shimei_kana_sei || ' ' || d.shimei_kana_mei) AS full_name_kana",
        'd.renrakusaki_1 AS renrakusaki_1',
        'd.renrakusaki_2 AS renrakusaki_2',
        'd.haitatsu_renrakusaki_1 AS haitatsu_renrakusaki_1',
        "(d.haitatsu_shimei_sei || ' ' || d.haitatsu_shimei_mei) AS haitatsu_full_name",
        'd.haitatsu_yubin_no AS haitatsu_yubin_no',
        "(COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) AS haitatsu",
        'd.hanbaiten_id AS hanbaiten_id',
        'h.hanbaiten_code AS hanbaiten_code',
        'h.hanbaiten_name AS hanbaiten_name',
        'd.dokusya_shubetsu AS dokusya_shubetsu',
        'd.tetsuzuki_shurui AS tetsuzuki_shurui',
        'd.shiharai_hoho AS shiharai_hoho',
        'd.denshi_shonin_status AS denshi_shonin_status',
        'd.shoki_dokusya_kaishi_date AS shoki_dokusya_kaishi_date',
        'd.dokusya_chushi_date AS dokusya_chushi_date',
        `((d.dokusya_shubetsu = ${DokusyaShubetsu.DIGITAL} AND d.shiharai_hoho = ${ShiharaiHoho.CREDIT_CARD}) OR d.dokusya_shubetsu = ${DokusyaShubetsu.BOTH}) AS is_read_only`,
      ])
      .where('d.deleted_at IS NULL');

    // Branch DataScope — NICHINO_*=bypass、CHUOKAI/JA_HONTEN→ja_id、
    // JA_KANRI_SHITEN→kanri_shiten_id。
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );
    // 所属支店スコープ（顧客要件 2026-07）— session.shiten_id 設定時のみ支店へ絞る。
    applyShitenScope(qb, 'd', 'shiten_id', session);

    this.applySearchEqualityFilters(qb, query);
    this.applySearchPartialFilters(qb, query);
    this.applySearchDateFilters(qb, query);
  }

  /** 等価（`= :param`）フィルタ — 値が設定済みのとき適用。 */
  private applySearchEqualityFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('d.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
    if (query.shiten_id !== undefined) {
      qb.andWhere('d.shiten_id = :shiten_id', { shiten_id: query.shiten_id });
    }
    if (query.hanbaiten_id !== undefined) {
      qb.andWhere('d.hanbaiten_id = :hanbaiten_id', {
        hanbaiten_id: query.hanbaiten_id,
      });
    }
    if (query.dokusya_shubetsu !== undefined) {
      qb.andWhere('d.dokusya_shubetsu = :dokusya_shubetsu', {
        dokusya_shubetsu: query.dokusya_shubetsu,
      });
    }
    if (query.shiharai_hoho !== undefined) {
      qb.andWhere('d.shiharai_hoho = :shiharai_hoho', {
        shiharai_hoho: query.shiharai_hoho,
      });
    }
    if (query.tetsuzuki_shurui !== undefined) {
      qb.andWhere('d.tetsuzuki_shurui = :tetsuzuki_shurui', {
        tetsuzuki_shurui: query.tetsuzuki_shurui,
      });
    }
    if (query.denshi_shonin_status !== undefined) {
      qb.andWhere('d.denshi_shonin_status = :denshi_shonin_status', {
        denshi_shonin_status: query.denshi_shonin_status,
      });
    }
    // 有効単価フラグ（SCR-020 error gate 連携・顧客要件 2026-07）。参照する購読料単価
    // (tanka_type=1)の active_flg で絞込: true=有効単価、false=失効単価を参照する購読者。
    // 省略時は絞らない。tanka_id は m_tanka PK ゆえ INNER JOIN で行数は増えない(0/1件)。
    // 相関 EXISTS は pg-mem が外側 alias を解決できず失敗するため JOIN を採用
    // （SCR-020 の失効判定 SQL と同方式）。
    if (query.active_tanka_flg !== undefined) {
      qb.innerJoin(
        'm_tanka',
        'mti',
        `mti.tanka_id = d.tanka_id AND mti.tanka_type = ${TANKA_TYPE_KODOKU} AND mti.deleted_at IS NULL AND mti.active_flg = :activeTankaFlg`,
        { activeTankaFlg: query.active_tanka_flg },
      );
    }
  }

  /** 部分一致（`ILIKE %param%`）フィルタ — 非空のとき適用。 */
  private applySearchPartialFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    if (query.kumiaiin_code) {
      qb.andWhere(
        "d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'",
        { kumiaiin_code: query.kumiaiin_code },
      );
    }
    // 引落元口座支店: コード + 名称を横断して部分一致 OR（物理カラムは
    // bank_branch_code / bank_branch_name のレガシー名）。
    if (query.bank_branch) {
      qb.andWhere(
        "(d.bank_branch_code ILIKE '%' || :bank_branch || '%' " +
          "OR d.bank_branch_name ILIKE '%' || :bank_branch || '%')",
        { bank_branch: query.bank_branch },
      );
    }
    if (query.full_name) {
      // 氏名: 購読者氏名 + 配達先氏名の各カラムを部分一致 OR
      // (shimei_sei / shimei_mei / haitatsu_shimei_sei / haitatsu_shimei_mei)。
      qb.andWhere(
        "(d.shimei_sei ILIKE '%' || :full_name || '%' " +
          "OR d.shimei_mei ILIKE '%' || :full_name || '%' " +
          "OR d.haitatsu_shimei_sei ILIKE '%' || :full_name || '%' " +
          "OR d.haitatsu_shimei_mei ILIKE '%' || :full_name || '%')",
        { full_name: query.full_name },
      );
    }
    if (query.full_name_kana) {
      // かな氏名: 購読者 + 配達先の各かな氏名カラムを部分一致 OR。
      qb.andWhere(
        "(d.shimei_kana_sei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.shimei_kana_mei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.haitatsu_shimei_kana_sei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.haitatsu_shimei_kana_mei ILIKE '%' || :full_name_kana || '%')",
        { full_name_kana: query.full_name_kana },
      );
    }
    if (query.renrakusaki) {
      // 連絡先: 購読者連絡先1/2 + 配達先連絡先1/2 を横断部分一致 OR。
      qb.andWhere(
        "(d.renrakusaki_1 ILIKE '%' || :renrakusaki || '%' " +
          "OR d.haitatsu_renrakusaki_1 ILIKE '%' || :renrakusaki || '%' " +
          "OR d.renrakusaki_2 ILIKE '%' || :renrakusaki || '%' " +
          "OR d.haitatsu_renrakusaki_2 ILIKE '%' || :renrakusaki || '%')",
        { renrakusaki: query.renrakusaki },
      );
    }
    if (query.haitatsu) {
      // 配達先住所: 配達先住所4項目 + 購読者住所4項目を部分一致 OR。
      qb.andWhere(
        "(d.haitatsu_todofuken_code ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_shikuchoson ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_chome_banchi ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_tatemono_mei ILIKE '%' || :haitatsu || '%' " +
          "OR d.todofuken_code ILIKE '%' || :haitatsu || '%' " +
          "OR d.shikuchoson ILIKE '%' || :haitatsu || '%' " +
          "OR d.chome_banchi ILIKE '%' || :haitatsu || '%' " +
          "OR d.tatemono_mei ILIKE '%' || :haitatsu || '%')",
        { haitatsu: query.haitatsu },
      );
    }
    // 郵送区分: m_code YUBIN_KUBUN の完全一致（物理カラムは VARCHAR '0'/'1'）。
    if (query.yubin_kubun) {
      qb.andWhere('d.yubin_kubun = :yubin_kubun', {
        yubin_kubun: query.yubin_kubun,
      });
    }
    // 新聞単価: tanka_id の完全一致。
    if (query.tanka_id != null) {
      qb.andWhere('d.tanka_id = :tanka_id', { tanka_id: query.tanka_id });
    }
    // 備考: 部分一致 ILIKE。
    if (query.biko) {
      qb.andWhere("d.biko ILIKE '%' || :biko || '%'", { biko: query.biko });
    }
    if (query.email) {
      qb.andWhere("d.email ILIKE '%' || :email || '%'", { email: query.email });
    }
    // 請求開始月: YYYYMM 範囲検索（from ≦ 月 ≦ to）。6桁固定ゆえ辞書順=数値順。
    // 未設定（空文字）は課金未開始とみなし除外（from/to 指定時に <> '' を要求）。
    if (query.seikyu_kaishi_month_from || query.seikyu_kaishi_month_to) {
      qb.andWhere("d.seikyu_kaishi_month <> ''");
      if (query.seikyu_kaishi_month_from) {
        qb.andWhere('d.seikyu_kaishi_month >= :seikyu_from', {
          seikyu_from: query.seikyu_kaishi_month_from,
        });
      }
      if (query.seikyu_kaishi_month_to) {
        qb.andWhere('d.seikyu_kaishi_month <= :seikyu_to', {
          seikyu_to: query.seikyu_kaishi_month_to,
        });
      }
    }
  }

  /** 日付範囲 + 適用日(履歴) フィルタ — 境界が設定済みのとき適用。 */
  private applySearchDateFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    // 範囲フィルタ — shoki_dokusya_kaishi_date。
    if (query.shoki_dokusya_kaishi_date_from) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date >= :shoki_dokusya_kaishi_date_from',
        {
          shoki_dokusya_kaishi_date_from:
            slashDateToIso(query.shoki_dokusya_kaishi_date_from),
        },
      );
    }
    if (query.shoki_dokusya_kaishi_date_to) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date <= :shoki_dokusya_kaishi_date_to',
        {
          shoki_dokusya_kaishi_date_to:
            slashDateToIso(query.shoki_dokusya_kaishi_date_to),
        },
      );
    }
    if (query.dokusya_chushi_date_from) {
      qb.andWhere('d.dokusya_chushi_date >= :dokusya_chushi_date_from', {
        dokusya_chushi_date_from: slashDateToIso(query.dokusya_chushi_date_from),
      });
    }
    if (query.dokusya_chushi_date_to) {
      qb.andWhere('d.dokusya_chushi_date <= :dokusya_chushi_date_to', {
        dokusya_chushi_date_to: slashDateToIso(query.dokusya_chushi_date_to),
      });
    }

    // 適用日 (joho_henko_tekiyo_date) 分岐。
    //   - 両方空 → live master 行。master は現行(saishin)状態を反映済で追加述語不要。
    //     unit spec は saishin_data_flg 述語か rireki JOIN 無しのどちらも許容 →
    //     性能のため後者を採用。
    //   - 片側でも指定 → t_dokusya_rireki を INNER JOIN し履歴行でフィルタ。
    if (
      query.joho_henko_tekiyo_date_from ||
      query.joho_henko_tekiyo_date_to
    ) {
      qb.innerJoin(
        't_dokusya_rireki',
        'rireki',
        'rireki.dokusya_id = d.dokusya_id',
      );
      if (query.joho_henko_tekiyo_date_from) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date >= :joho_henko_tekiyo_date_from',
          {
            joho_henko_tekiyo_date_from: slashDateToIso(
              query.joho_henko_tekiyo_date_from,
            ),
          },
        );
      }
      if (query.joho_henko_tekiyo_date_to) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date <= :joho_henko_tekiyo_date_to',
          {
            joho_henko_tekiyo_date_to: slashDateToIso(
              query.joho_henko_tekiyo_date_to,
            ),
          },
        );
      }
    }
  }

  /**
   * Excel workbook buffer を生成。worksheet '購読者一覧' 1枚、太字ヘッダ行、続いて
   * `toDokusyaExcelRow` でマップしたデータ行。Node Buffer を返す（ExcelJS は Node で
   * ArrayBuffer を返す）。
   */
  private async buildExcelBuffer(rows: DokusyaListItem[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者一覧');
    sheet.addRow([...DOKUSYA_EXPORT_HEADERS]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // 既定幅 — 配達先住所が最長(~200文字)だが Excel auto-fit は不安定なので
    // 18文字に固定し、ユーザが手動で広げられるようにする。
    sheet.columns = DOKUSYA_EXPORT_HEADERS.map(() => ({ width: 18 }));
    for (const row of rows) {
      // 手続種類/購読種別/支払方法 は m_code 値。Excel には顧客が読めるラベルを出力
      // （CodeService は @Global でメモリキャッシュ済ゆえ行毎ルックアップは実質ゼロコスト）。
      sheet.addRow(
        toDokusyaExcelRow(row, {
          tetsuzuki_shurui: this.codeService.getLabel(
            'TETSUZUKI_SHURUI',
            row.tetsuzuki_shurui,
          ),
          dokusya_shubetsu: this.codeService.getLabel(
            'DOKUSYA_SHUBETSU',
            row.dokusya_shubetsu,
          ),
          shiharai_hoho: this.codeService.getLabel(
            'SHIHARAI_HOHO',
            row.shiharai_hoho,
          ),
        }),
      );
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }
}
