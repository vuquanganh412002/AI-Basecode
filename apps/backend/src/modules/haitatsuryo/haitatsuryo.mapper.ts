// 配達手数料支払情報 (ACSMS-SCR-021) の純ヘルパー: 集計SQLビルダ + フラット行→
// レスポンス変換。Nest DI / repo / service を持たず、service からもユニット
// テストからも import できる。
//
// 集計は CTE + DISTINCT ON で最新スナップショットを 販売店 単位に集約する処理で、
// TypeORM QueryBuilder では表現できないため、パラメータ化した raw SQL 文字列
// （位置指定 $1..$5、ユーザー入力は絶対に文字列展開しない）を dataSource.query で実行する。

import { DokusyaShubetsu, TetsuzukiShurui } from '@/common/enums';
import { ZEI_KUBUN_UCHIZEI } from '@/common/constants/zei-kubun.constant';
import { TANKA_TYPE_HAITATSURYO } from '@/common/constants/tanka-type.constant';
import { HaitatsuryoQueryDto } from './dto/haitatsuryo-query.dto';

/** DataScope に使う SessionPayload の部分型。 */
interface ScopeSession {
  ja_id: number | null;
  kanri_shiten_id: number | null;
}

/** driver により number / 文字列 / null で届く集計カラムの共通型。 */
type Numericish = number | string | null;

/** raw `dataSource.query(...)` が返す集計1行。 */
export interface HaitatsuryoAggRow {
  target_month: string;
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  /** 委託区分（m_code ITAKU_KUBUN: 1:振込, 2:日農委託, 9:その他）。 */
  itaku_kubun: Numericish;
  total_busu: number | string;
  total_kingaku: number | string;
  /** 配達手数料単価（1部あたり、税区分で税込/税抜を切替）。 */
  tesuryo: number | string;
  haitatsuryo_shiharai_cycle: Numericish;
  bank_code: string | null;
  bank_name: string | null;
  bank_branch_code: string | null;
  bank_branch_name: string | null;
  yokin_shubetsu: Numericish;
  koza_no: string | null;
  koza_meigi: string | null;
  /** 振込手数料負担区分（m_code TESURYO_KUBUN: 1:JA, 2:販売店）。 */
  furikomi_tesuryo_futan_kubun: Numericish;
  biko: string | null;
}

/** 販売店ごとの集計行（api.md §レスポンスデータ data[]）。 */
export interface HaitatsuryoRow {
  target_month: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  /** 委託区分（m_code ITAKU_KUBUN: 1:振込, 2:日農委託, 9:その他）。 */
  itaku_kubun: number | null;
  total_busu: number;
  total_kingaku: number;
  haitatsuryo_shiharai_cycle: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  /** 手数料（配達手数料単価、1部あたり）。当月金額の算出に使用。 */
  tesuryo: number;
  /** 振込手数料負担区分（m_code TESURYO_KUBUN: 1:JA, 2:販売店）。「手数料」列に表示。 */
  furikomi_tesuryo_futan_kubun: number | null;
  biko: string;
}

export interface HaitatsuryoMeta {
  /** 集計対象の販売店総数（全ページ通算）。 */
  total: number;
  /** 現在ページ（1始まり）。 */
  page: number;
  /** 1ページ件数。 */
  per_page: number;
  /** 総ページ数（`ceil(total / per_page)`）。 */
  total_pages: number;
  /** 全販売店合計部数（ページに関係なく全件で算出）。 */
  grand_total_busu: number;
  /** 全販売店合計金額（ページに関係なく全件で算出）。 */
  grand_total_kingaku: number;
  zei_kubun: number;
}

export interface HaitatsuryoPreviewData {
  data: HaitatsuryoRow[];
  meta: HaitatsuryoMeta;
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0);
const str = (v: string | null | undefined): string => v ?? '';
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

/**
 * 対象年月の最新スナップショットを購読者ごとに特定（変更適用日 DESC・created_at
 * DESC で最上位 1 件）し、販売店単位でグループ化して 当月部数・当月金額を集計する
 * （api.md §4.3〜§4.4 と同一）。金額は税区分により kingaku_zeikomi（内税）/
 * kingaku_zeinuki（外税）を切替える。
 *
 * params 順: [$1 target_month, $2 ja_id, $3 kanri_shiten_id, $4 zei_kubun,
 *             $5 haitatsuryo_shiharai_cycle]
 */
export function buildHaitatsuryoSql(
  query: HaitatsuryoQueryDto,
  session: ScopeSession,
  zeiKubun: number,
): { sql: string; params: unknown[] } {
  const sql = `
    WITH latest_dokusya AS (
      SELECT DISTINCT ON (d.dokusya_id)
             d.dokusya_id,
             d.ja_id,
             d.kanri_shiten_id,
             d.hanbaiten_id,
             d.tanka_id,
             d.dokusya_busu,
             d.tetsuzuki_shurui,
             d.joho_henko_tekiyo_date
        FROM t_dokusya d
       WHERE d.deleted_at IS NULL
         AND d.tetsuzuki_shurui = ${TetsuzukiShurui.SHINKI}
         -- 配達手数料は「紙を配達した対価」なので紙版(1)のみ集計する
         -- （顧客要件 2026-08 / #56599）。電子版(2)は配達自体が無く、併読(3)も
         -- 対象外とする。従来は種別で絞っておらず、実在の販売店に紐づく併読は
         -- そのまま加算され、電子版もダミー販売店に配達手数料単価が設定されて
         -- いれば加算されていた（＝データ次第で金額が変わる状態だった）。
         AND d.dokusya_shubetsu = ${DokusyaShubetsu.PAPER}
         AND d.joho_henko_tekiyo_date
             <= DATE_TRUNC('month', $1::date) + INTERVAL '1 month' - INTERVAL '1 day'
         AND d.ja_id = $2
         AND ($3::bigint IS NULL OR d.kanri_shiten_id = $3::bigint)
       ORDER BY d.dokusya_id,
                d.joho_henko_tekiyo_date DESC,
                d.created_at DESC
    )
    SELECT TO_CHAR($1::date, 'YYYYMM')                AS target_month,
           h.hanbaiten_id,
           h.hanbaiten_code,
           h.hanbaiten_name,
           h.itaku_kubun,
           SUM(ld.dokusya_busu)                       AS total_busu,
           SUM(ld.dokusya_busu * CASE
                WHEN $4::int = ${ZEI_KUBUN_UCHIZEI} THEN t.kingaku_zeikomi
                ELSE t.kingaku_zeinuki
           END)                                       AS total_kingaku,
           MAX(CASE
                WHEN $4::int = ${ZEI_KUBUN_UCHIZEI} THEN t.kingaku_zeikomi
                ELSE t.kingaku_zeinuki
           END)                                       AS tesuryo,
           h.haitatsuryo_shiharai_cycle,
           h.bank_code,
           h.bank_name,
           h.bank_branch_code,
           h.bank_branch_name,
           h.yokin_shubetsu,
           h.koza_no,
           h.koza_meigi,
           h.furikomi_tesuryo_futan_kubun,
           h.biko
      FROM latest_dokusya ld
      INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = ld.hanbaiten_id
       AND h.deleted_at IS NULL
       AND h.haiten_flg = FALSE
      INNER JOIN m_tanka t
        ON t.tanka_id = h.haitatsuryo_tanka_id
       AND t.tanka_type = ${TANKA_TYPE_HAITATSURYO}
       AND t.deleted_at IS NULL
       AND t.active_flg = TRUE
     WHERE ($5::int IS NULL OR h.haitatsuryo_shiharai_cycle = $5::int)
     GROUP BY h.hanbaiten_id,
              h.hanbaiten_code, h.hanbaiten_name, h.itaku_kubun,
              h.haitatsuryo_shiharai_cycle,
              h.bank_code, h.bank_name,
              h.bank_branch_code, h.bank_branch_name,
              h.yokin_shubetsu, h.koza_no, h.koza_meigi,
              h.furikomi_tesuryo_futan_kubun, h.biko
     ORDER BY h.hanbaiten_code
  `;
  const params: unknown[] = [
    query.target_month,
    session.ja_id,
    session.kanri_shiten_id ?? null,
    zeiKubun,
    query.haitatsuryo_shiharai_cycle ?? null,
  ];
  return { sql, params };
}

/** 失効単価参照チェック（error gate）で返す該当販売店一覧の上限。SCR-020 と同値。 */
export const INACTIVE_TANKA_LIST_LIMIT = 15;

/** 失効単価参照チェック（error gate）の1行（該当販売店）。 */
export interface InactiveHaitatsuryoTankaRow {
  hanbaiten_id: number | string;
  hanbaiten_code: string | null;
  hanbaiten_name: string | null;
  tanka_code: string | null;
  tanka_name: string | null;
  /** COUNT(*) OVER() — LIMIT 前の総該当件数（pg は文字列で返す場合あり）。 */
  total_count: number | string;
}

/**
 * 失効単価参照チェック SQL（SCR-021 error gate・顧客要件2026-07）。
 * 集計と同一の母集合（対象年月・スコープ・支払サイクル絞込に一致する販売店）から、
 * 配達手数料単価(tanka_type=2)が active_flg=FALSE の販売店だけを抽出する。
 * COUNT(*) OVER() で GROUP BY 後の総該当件数（＝販売店数）を各行に載せ、
 * 行自体は INACTIVE_TANKA_LIST_LIMIT 件で打ち切る。
 *
 * params 順: [$1 target_month, $2 ja_id, $3 kanri_shiten_id,
 *             $4 haitatsuryo_shiharai_cycle]
 */
export function buildInactiveHaitatsuryoTankaSql(
  query: HaitatsuryoQueryDto,
  session: ScopeSession,
): { sql: string; params: unknown[] } {
  const sql = `
    WITH latest_dokusya AS (
      SELECT DISTINCT ON (d.dokusya_id)
             d.dokusya_id,
             d.hanbaiten_id,
             d.joho_henko_tekiyo_date
        FROM t_dokusya d
       WHERE d.deleted_at IS NULL
         AND d.tetsuzuki_shurui = ${TetsuzukiShurui.SHINKI}
         -- 配達手数料は「紙を配達した対価」なので紙版(1)のみ集計する
         -- （顧客要件 2026-08 / #56599）。電子版(2)は配達自体が無く、併読(3)も
         -- 対象外とする。従来は種別で絞っておらず、実在の販売店に紐づく併読は
         -- そのまま加算され、電子版もダミー販売店に配達手数料単価が設定されて
         -- いれば加算されていた（＝データ次第で金額が変わる状態だった）。
         AND d.dokusya_shubetsu = ${DokusyaShubetsu.PAPER}
         AND d.joho_henko_tekiyo_date
             <= DATE_TRUNC('month', $1::date) + INTERVAL '1 month' - INTERVAL '1 day'
         AND d.ja_id = $2
         AND ($3::bigint IS NULL OR d.kanri_shiten_id = $3::bigint)
       ORDER BY d.dokusya_id,
                d.joho_henko_tekiyo_date DESC,
                d.created_at DESC
    )
    SELECT h.hanbaiten_id,
           h.hanbaiten_code,
           h.hanbaiten_name,
           t.tanka_code,
           t.tanka_name,
           COUNT(*) OVER() AS total_count   -- GROUP BY 後の総該当販売店数（LIMIT 前）
      FROM latest_dokusya ld
      INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = ld.hanbaiten_id
       AND h.deleted_at IS NULL
       AND h.haiten_flg = FALSE
      INNER JOIN m_tanka t
        ON t.tanka_id = h.haitatsuryo_tanka_id
       AND t.tanka_type = ${TANKA_TYPE_HAITATSURYO}
       AND t.deleted_at IS NULL
       AND t.active_flg = FALSE          -- ← 失効単価のみ
     WHERE ($4::int IS NULL OR h.haitatsuryo_shiharai_cycle = $4::int)
     GROUP BY h.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name,
              t.tanka_code, t.tanka_name
     ORDER BY h.hanbaiten_code
     LIMIT ${INACTIVE_TANKA_LIST_LIMIT}
  `;
  const params: unknown[] = [
    query.target_month,
    session.ja_id,
    session.kanri_shiten_id ?? null,
    query.haitatsuryo_shiharai_cycle ?? null,
  ];
  return { sql, params };
}

/**
 * 集計 raw 行を `{ data, meta }` レスポンス形へ変換する。
 *
 * `pagination` を渡すと `data` を該当ページにスライスし、`meta` に
 * page/per_page/total_pages を設定する（preview 用）。未指定時は全件返却
 * （export 用 — Excel は全販売店を出力する）。grand_total_* と total は
 * 常に全件で算出するため、ページを跨いでも合計は一定になる。
 */
export function mapHaitatsuryoRows(
  rows: HaitatsuryoAggRow[],
  zeiKubun: number,
  pagination?: { page: number; per_page: number },
): HaitatsuryoPreviewData {
  const allData: HaitatsuryoRow[] = rows.map((r) => ({
    target_month: str(r.target_month),
    hanbaiten_id: num(r.hanbaiten_id),
    hanbaiten_code: str(r.hanbaiten_code),
    hanbaiten_name: str(r.hanbaiten_name),
    itaku_kubun: numOrNull(r.itaku_kubun),
    total_busu: num(r.total_busu),
    total_kingaku: num(r.total_kingaku),
    haitatsuryo_shiharai_cycle: numOrNull(r.haitatsuryo_shiharai_cycle),
    bank_code: str(r.bank_code),
    bank_name: str(r.bank_name),
    bank_branch_code: str(r.bank_branch_code),
    bank_branch_name: str(r.bank_branch_name),
    yokin_shubetsu: numOrNull(r.yokin_shubetsu),
    koza_no: str(r.koza_no),
    koza_meigi: str(r.koza_meigi),
    tesuryo: num(r.tesuryo),
    furikomi_tesuryo_futan_kubun: numOrNull(r.furikomi_tesuryo_futan_kubun),
    biko: str(r.biko),
  }));

  // 合計・件数は常に全件で算出（ページを跨いでも合計は一定）。
  const total = allData.length;
  const grandTotalBusu = allData.reduce((sum, d) => sum + d.total_busu, 0);
  const grandTotalKingaku = allData.reduce((sum, d) => sum + d.total_kingaku, 0);

  // pagination 指定時のみ該当ページにスライス。未指定（export）は全件。
  const page = pagination?.page ?? 1;
  const perPage = pagination?.per_page ?? (total > 0 ? total : 1);
  const totalPages = perPage > 0 ? Math.ceil(total / perPage) : 0;
  const data = pagination
    ? allData.slice((page - 1) * perPage, page * perPage)
    : allData;

  return {
    data,
    meta: {
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
      grand_total_busu: grandTotalBusu,
      grand_total_kingaku: grandTotalKingaku,
      zei_kubun: zeiKubun,
    },
  };
}
