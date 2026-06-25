// Pure response-shaping for the 購読者名簿 report (ACSMS-SCR-026).
// No Nest DI / repo / service — only flat-row → grouped-DTO transforms,
// importable from anywhere (service + unit tests).

/** Flat row returned by the report QueryBuilder `.getRawMany()`. */
export interface MeiboRawRow {
  dokusya_id: number | string;
  dokusya_shubetsu: number;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  haitatsu_same_flg: boolean;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_shimei_kana_sei: string;
  haitatsu_shimei_kana_mei: string;
  kumiaiin_code: string;
  haitatsu_yubin_no: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_renrakusaki_1: string;
  // 購読者本人の住所・連絡先（haitatsu_same_flg=TRUE のとき配達先として使用）。
  yubin_no: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  dokusya_kaishi_date: string;
  dokusya_busu: number | string;
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle: number | null;
  kanri_shiten_id: number | string | null;
  kanri_shiten_name: string | null;
  shiten_id: number | string | null;
  shiten_name: string | null;
  hanbaiten_id: number | string;
  hanbaiten_name: string | null;
  hanbaiten_code: string | null;
  hanbaiten_tel: string | null;
  hanbaiten_fax: string | null;
  ja_name: string | null;
  ja_tel: string | null;
  // ─── ウィンドウ集計列（SQLページングの明細クエリが付与。preview のみ）──────
  // 全件を読まずに小計/合計/ページ境界を決めるための per-row 集計。export では未付与。
  _total_rows?: RawAgg; // COUNT(*) OVER () — 全明細行数
  _grand_busu?: RawAgg; // SUM(busu) OVER () — 総部数
  _hg_busu?: RawAgg; // SUM OVER (PARTITION BY hanbaiten)
  _hg_rn?: RawAgg; // ROW_NUMBER OVER (PARTITION BY hanbaiten)
  _hg_count?: RawAgg; // COUNT OVER (PARTITION BY hanbaiten)
  _sg_busu?: RawAgg; // 〃 (PARTITION BY hanbaiten, kanri_shiten)
  _sg_rn?: RawAgg;
  _sg_count?: RawAgg;
  _kg_busu?: RawAgg; // 管理支店別: (PARTITION BY kanri_shiten)
  _kg_rn?: RawAgg;
  _kg_count?: RawAgg;
}

/** SQL の集計列（COUNT/SUM/ROW_NUMBER）は pg ドライバが文字列で返すことがある。 */
type RawAgg = number | string | null;

// ─── response row shapes (api.md §レスポンスデータ) ─────────────────────
export interface HanbaitenReportRow {
  dokusya_id: number;
  shimei: string;
  shimei_kana: string;
  haitatsu_address: string;
  kanri_shiten_name: string;
  haitatsu_tel: string;
  dokusya_kaishi_date: string;
  dokusya_busu: number;
}

export interface KanriShitenReportRow {
  dokusya_id: number;
  dokusya_shubetsu: number;
  shimei: string;
  shimei_kana: string;
  kumiaiin_code: string;
  haitatsu_tel: string;
  shiten_name: string;
  haitatsu_address: string;
  dokusya_busu: number;
  shiharai_hoho: number;
  dokusya_kaishi_date: string;
  hanbaiten_name: string;
}

export interface KanriShitenSubGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  rows: HanbaitenReportRow[];
  /** ページ送り: このグループが前ページから継続（ヘッダに「(続き)」を付す）。 */
  is_continued?: boolean;
  /** ページ送り: このページでグループが終わる（小計を表示する）。 */
  show_subtotal?: boolean;
}

export interface HanbaitenGroup {
  hanbaiten_id: number;
  hanbaiten_name: string;
  hanbaiten_code: string;
  hanbaiten_tel: string;
  hanbaiten_fax: string;
  total_busu: number;
  kanri_shiten_groups: KanriShitenSubGroup[];
  is_continued?: boolean;
  /** ページ送り: このページでグループが終わる（合計を表示する）。 */
  show_total?: boolean;
}

export interface KanriShitenGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  total_busu: number;
  rows: KanriShitenReportRow[];
  is_continued?: boolean;
  show_subtotal?: boolean;
  show_total?: boolean;
}

export interface MeiboPreviewData {
  report_type: 'hanbaiten' | 'kanri_shiten';
  tekiyo_date: string;
  /** 組合情報（帳票ヘッダ表示用）。全行同一JAスコープなので先頭行から取得。 */
  ja_name: string;
  ja_tel: string;
  grand_total_busu: number;
  hanbaiten_groups: HanbaitenGroup[];
  kanri_shiten_groups: KanriShitenGroup[];
  /** ページ送りメタ（preview のみ設定。export は単一文書なので未設定）。 */
  page_no?: number;
  per_page?: number;
  total_pages?: number;
  /** 全明細行数（グループ・小計行を除く購読者行の総数）。 */
  total_rows?: number;
  is_last_page?: boolean;
  /** 全ページ通算のトップレベルグループ数（合計行の表示要否判定用）。 */
  group_count?: number;
}

// ─── shared field helpers ──────────────────────────────────────────────
const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : Number(v);

/**
 * 配達先氏名/かな — 配達先情報指定（haitatsu_same_flg=false）のときは配達先
 * 氏名、それ以外（購読者と同じ）のときは購読者氏名を使用する（画面項目No.10/11）。
 */
function resolveShimei(row: MeiboRawRow): { shimei: string; shimei_kana: string } {
  if (row.haitatsu_same_flg === false) {
    return {
      shimei: `${row.haitatsu_shimei_sei} ${row.haitatsu_shimei_mei}`,
      shimei_kana: `${row.haitatsu_shimei_kana_sei} ${row.haitatsu_shimei_kana_mei}`,
    };
  }
  return {
    shimei: `${row.shimei_sei} ${row.shimei_mei}`,
    shimei_kana: `${row.shimei_kana_sei} ${row.shimei_kana_mei}`,
  };
}

/**
 * 配達先住所 — 〒{郵便番号}{市町村郡}{丁目番地}{建物名}（画面項目No.12/25）。
 * haitatsu_same_flg=false（配達先を個別指定）のときは配達先住所、それ以外
 * （購読者と同じ）のときは購読者本人の住所を使う。same_flg=TRUE のとき
 * haitatsu_* は空欄で保存されるため、本人住所へフォールバックしないと住所が
 * 空になる（resolveShimei と同じ方針）。
 */
function resolveAddress(row: MeiboRawRow): string {
  if (row.haitatsu_same_flg === false) {
    return `〒${row.haitatsu_yubin_no}${row.haitatsu_shikuchoson}${row.haitatsu_chome_banchi}${row.haitatsu_tatemono_mei}`;
  }
  return `〒${row.yubin_no}${row.shikuchoson}${row.chome_banchi}${row.tatemono_mei}`;
}

/**
 * 配達先電話番号 — same_flg=false は配達先連絡先、それ以外は購読者本人の連絡先。
 * （same_flg=TRUE のとき haitatsu_renrakusaki_1 は空欄のため本人へフォールバック）
 */
function resolveTel(row: MeiboRawRow): string {
  return (
    (row.haitatsu_same_flg === false
      ? row.haitatsu_renrakusaki_1
      : row.renrakusaki_1) ?? ''
  );
}

// ─── 販売店別購読者名簿 — 販売店 → 管理支店 → 購読者 ──────────────────────
export function groupByHanbaiten(rows: MeiboRawRow[]): {
  hanbaiten_groups: HanbaitenGroup[];
  grand_total_busu: number;
} {
  const groups = new Map<number, HanbaitenGroup>();
  const subGroups = new Map<string, KanriShitenSubGroup>();
  let grand = 0;

  for (const row of rows) {
    const hanbaitenId = num(row.hanbaiten_id);
    const ksId = row.kanri_shiten_id == null ? null : num(row.kanri_shiten_id);
    const busu = num(row.dokusya_busu);
    grand += busu;

    let hg = groups.get(hanbaitenId);
    if (!hg) {
      hg = {
        hanbaiten_id: hanbaitenId,
        hanbaiten_name: row.hanbaiten_name ?? '',
        hanbaiten_code: row.hanbaiten_code ?? '',
        hanbaiten_tel: row.hanbaiten_tel ?? '',
        hanbaiten_fax: row.hanbaiten_fax ?? '',
        total_busu: 0,
        kanri_shiten_groups: [],
      };
      groups.set(hanbaitenId, hg);
    }
    hg.total_busu += busu;

    const subKey = `${hanbaitenId}::${ksId ?? 'none'}`;
    let sg = subGroups.get(subKey);
    if (!sg) {
      sg = {
        kanri_shiten_id: ksId,
        kanri_shiten_name: row.kanri_shiten_name ?? '',
        subtotal_busu: 0,
        rows: [],
      };
      subGroups.set(subKey, sg);
      hg.kanri_shiten_groups.push(sg);
    }
    sg.subtotal_busu += busu;

    const { shimei, shimei_kana } = resolveShimei(row);
    sg.rows.push({
      dokusya_id: num(row.dokusya_id),
      shimei,
      shimei_kana,
      haitatsu_address: resolveAddress(row),
      kanri_shiten_name: row.kanri_shiten_name ?? '',
      haitatsu_tel: resolveTel(row),
      dokusya_kaishi_date: row.dokusya_kaishi_date,
      dokusya_busu: busu,
    });
  }

  return { hanbaiten_groups: [...groups.values()], grand_total_busu: grand };
}

// ─── 管理支店別購読者名簿 — 管理支店 → 購読者 ───────────────────────────
export function groupByKanriShiten(rows: MeiboRawRow[]): {
  kanri_shiten_groups: KanriShitenGroup[];
  grand_total_busu: number;
} {
  const groups = new Map<string, KanriShitenGroup>();
  let grand = 0;

  for (const row of rows) {
    const ksId = row.kanri_shiten_id == null ? null : num(row.kanri_shiten_id);
    const busu = num(row.dokusya_busu);
    grand += busu;

    const key = ksId == null ? 'none' : String(ksId);
    let kg = groups.get(key);
    if (!kg) {
      kg = {
        kanri_shiten_id: ksId,
        kanri_shiten_name: row.kanri_shiten_name ?? '',
        subtotal_busu: 0,
        total_busu: 0,
        rows: [],
      };
      groups.set(key, kg);
    }
    kg.subtotal_busu += busu;
    kg.total_busu += busu;

    const { shimei, shimei_kana } = resolveShimei(row);
    kg.rows.push({
      dokusya_id: num(row.dokusya_id),
      dokusya_shubetsu: row.dokusya_shubetsu,
      shimei,
      shimei_kana,
      kumiaiin_code: row.kumiaiin_code ?? '',
      haitatsu_tel: resolveTel(row),
      shiten_name: row.shiten_name ?? '',
      haitatsu_address: resolveAddress(row),
      dokusya_busu: busu,
      shiharai_hoho: row.shiharai_hoho,
      dokusya_kaishi_date: row.dokusya_kaishi_date,
      hanbaiten_name: row.hanbaiten_name ?? '',
    });
  }

  return { kanri_shiten_groups: [...groups.values()], grand_total_busu: grand };
}

// ─── ページ送り（文書ページ単位 / SCR-026 preview）─────────────────────────
/**
 * preview の既定ページ行数（A4 1ページに収まる明細行数）。FE は report_type に
 * 関わらず 15 を送るため通常はこの既定値は使われないが、直接 API 呼び出しで
 * per_page 未指定のときも preview/Excel とページ数が一致するよう 15 にそろえる。
 */
export const MEIBO_PREVIEW_PER_PAGE = 15;

/**
 * SQLページングで取得した「1ページ分の明細行」から帳票のページ構造を組み立てる。
 *
 * 各行には明細クエリが付与したウィンドウ集計列が載っている：
 *   `_total_rows`(全明細行数) / `_grand_busu`(総部数) / `_hg_*`(販売店単位) /
 *   `_sg_*`(販売店×管理支店単位) / `_kg_*`(管理支店単位)。
 * これらから全件の小計・合計・ページ数・グループ境界を決めるので、**明細行は
 * 1ページ分しかロードしない**（＝BEが大量データを抱えない）。
 *
 * グループ境界（画面項目）:
 *   - `is_continued`：このページのグループ先頭行が全体先頭でない（_rn>1）→「(続き)」。
 *   - `show_subtotal`/`show_total`：このページにグループ全体の最終行が含まれる
 *     （_rn==_count）→ 小計／合計を表示。
 * 小計/合計/grand は全件のウィンドウ集計値（部分ページでも常に正しい）。
 *
 * ウィンドウ列が無い場合（export 経由ではなく、旧来の単体テスト等で素の行を
 * 渡したとき）は、与えられた行のみから単一ページとして集計する（フォールバック）。
 * 純関数（DI・I/O なし）。
 */
export function buildMeiboPreview(
  reportType: 'hanbaiten' | 'kanri_shiten',
  tekiyoDate: string,
  rows: MeiboRawRow[],
  page: number,
  perPage: number,
): MeiboPreviewData {
  const size = perPage > 0 ? perPage : MEIBO_PREVIEW_PER_PAGE;
  const hasWindow = rows.length > 0 && rows[0]._total_rows != null;
  const total = hasWindow
    ? num(rows[0]._total_rows)
    : rows.reduce((a) => a + 1, 0);
  const grand = hasWindow
    ? num(rows[0]._grand_busu)
    : rows.reduce((a, r) => a + num(r.dokusya_busu), 0);
  const totalPages = Math.max(1, Math.ceil((total || 0) / size));
  const p = total > 0 ? Math.min(Math.max(page, 1), totalPages) : 1;
  const base = {
    report_type: reportType,
    tekiyo_date: tekiyoDate,
    ja_name: rows[0]?.ja_name ?? '',
    ja_tel: rows[0]?.ja_tel ?? '',
    grand_total_busu: grand,
  };

  if (reportType === 'hanbaiten') {
    const { list, count } = groupHanbaitenPage(rows, hasWindow);
    return {
      ...base,
      hanbaiten_groups: list,
      kanri_shiten_groups: [],
      ...pageMeta(total, size, p, totalPages, count),
    };
  }
  const { list, count } = groupKanriPage(rows, hasWindow);
  return {
    ...base,
    hanbaiten_groups: [],
    kanri_shiten_groups: list,
    ...pageMeta(total, size, p, totalPages, count),
  };
}

/** グループ単位のウィンドウ集計（行ごとの _rn/_count/_busu を集約）。 */
interface WinAgg {
  min: number;
  max: number;
  count: number;
  busu: number;
}
function accWin<K>(map: Map<K, WinAgg>, key: K, rn: number, count: number, busu: number): void {
  const w = map.get(key);
  if (w) {
    if (rn < w.min) w.min = rn;
    if (rn > w.max) w.max = rn;
  } else {
    map.set(key, { min: rn, max: rn, count, busu });
  }
}

/** 販売店別: ページ行 → 販売店→管理支店→購読者 構造 + ウィンドウ集計でフラグ付与。 */
function groupHanbaitenPage(
  rows: MeiboRawRow[],
  hasWindow: boolean,
): { list: HanbaitenGroup[]; count: number } {
  const hgMap = new Map<number, HanbaitenGroup>();
  const sgMap = new Map<string, KanriShitenSubGroup>();
  const hgWin = new Map<number, WinAgg>();
  const sgWin = new Map<string, WinAgg>();

  for (const row of rows) {
    const hid = num(row.hanbaiten_id);
    const ksId = row.kanri_shiten_id == null ? null : num(row.kanri_shiten_id);
    const busu = num(row.dokusya_busu);
    const sgKey = `${hid}::${ksId ?? 'none'}`;

    let hg = hgMap.get(hid);
    if (!hg) {
      hg = {
        hanbaiten_id: hid,
        hanbaiten_name: row.hanbaiten_name ?? '',
        hanbaiten_code: row.hanbaiten_code ?? '',
        hanbaiten_tel: row.hanbaiten_tel ?? '',
        hanbaiten_fax: row.hanbaiten_fax ?? '',
        total_busu: 0,
        kanri_shiten_groups: [],
      };
      hgMap.set(hid, hg);
    }
    let sg = sgMap.get(sgKey);
    if (!sg) {
      sg = { kanri_shiten_id: ksId, kanri_shiten_name: row.kanri_shiten_name ?? '', subtotal_busu: 0, rows: [] };
      sgMap.set(sgKey, sg);
      hg.kanri_shiten_groups.push(sg);
    }
    const { shimei, shimei_kana } = resolveShimei(row);
    sg.rows.push({
      dokusya_id: num(row.dokusya_id),
      shimei,
      shimei_kana,
      haitatsu_address: resolveAddress(row),
      kanri_shiten_name: row.kanri_shiten_name ?? '',
      haitatsu_tel: resolveTel(row),
      dokusya_kaishi_date: row.dokusya_kaishi_date,
      dokusya_busu: busu,
    });
    sg.subtotal_busu += busu;
    hg.total_busu += busu;
    if (hasWindow) {
      accWin(hgWin, hid, num(row._hg_rn), num(row._hg_count), num(row._hg_busu));
      accWin(sgWin, sgKey, num(row._sg_rn), num(row._sg_count), num(row._sg_busu));
    }
  }

  if (hasWindow) applyHanbaitenWindow(hgMap, hgWin, sgWin);
  return { list: [...hgMap.values()], count: hgMap.size };
}

/** 全件ウィンドウ集計を販売店/管理支店グループに反映（小計・合計・境界フラグ）。 */
function applyHanbaitenWindow(
  hgMap: Map<number, HanbaitenGroup>,
  hgWin: Map<number, WinAgg>,
  sgWin: Map<string, WinAgg>,
): void {
  for (const [hid, hg] of hgMap) {
    const w = hgWin.get(hid);
    if (w) {
      hg.total_busu = w.busu;
      hg.is_continued = w.min > 1;
      hg.show_total = w.max === w.count;
    }
    for (const sg of hg.kanri_shiten_groups) {
      const sw = sgWin.get(`${hid}::${sg.kanri_shiten_id ?? 'none'}`);
      if (sw) {
        sg.subtotal_busu = sw.busu;
        sg.is_continued = sw.min > 1;
        sg.show_subtotal = sw.max === sw.count;
      }
    }
  }
}

/** 管理支店別: ページ行 → 管理支店→購読者 構造 + ウィンドウ集計でフラグ付与。 */
function groupKanriPage(
  rows: MeiboRawRow[],
  hasWindow: boolean,
): { list: KanriShitenGroup[]; count: number } {
  const kgMap = new Map<string, KanriShitenGroup>();
  const kgWin = new Map<string, WinAgg>();

  for (const row of rows) {
    const ksId = row.kanri_shiten_id == null ? null : num(row.kanri_shiten_id);
    const busu = num(row.dokusya_busu);
    const key = ksId == null ? 'none' : String(ksId);

    let kg = kgMap.get(key);
    if (!kg) {
      kg = {
        kanri_shiten_id: ksId,
        kanri_shiten_name: row.kanri_shiten_name ?? '',
        subtotal_busu: 0,
        total_busu: 0,
        rows: [],
      };
      kgMap.set(key, kg);
    }
    const { shimei, shimei_kana } = resolveShimei(row);
    kg.rows.push({
      dokusya_id: num(row.dokusya_id),
      dokusya_shubetsu: row.dokusya_shubetsu,
      shimei,
      shimei_kana,
      kumiaiin_code: row.kumiaiin_code ?? '',
      haitatsu_tel: resolveTel(row),
      shiten_name: row.shiten_name ?? '',
      haitatsu_address: resolveAddress(row),
      dokusya_busu: busu,
      shiharai_hoho: row.shiharai_hoho,
      dokusya_kaishi_date: row.dokusya_kaishi_date,
      hanbaiten_name: row.hanbaiten_name ?? '',
    });
    kg.subtotal_busu += busu;
    kg.total_busu += busu;
    if (hasWindow) accWin(kgWin, key, num(row._kg_rn), num(row._kg_count), num(row._kg_busu));
  }

  if (hasWindow) {
    for (const [key, kg] of kgMap) {
      const w = kgWin.get(key);
      if (w) {
        const ends = w.max === w.count;
        kg.subtotal_busu = w.busu;
        kg.total_busu = w.busu;
        kg.is_continued = w.min > 1;
        kg.show_subtotal = ends;
        kg.show_total = ends;
      }
    }
  }
  return { list: [...kgMap.values()], count: kgMap.size };
}

type PageMeta = {
  page_no: number;
  per_page: number;
  total_pages: number;
  total_rows: number;
  is_last_page: boolean;
  group_count: number;
};

function pageMeta(
  total: number,
  size: number,
  p: number,
  totalPages: number,
  groupCount: number,
): PageMeta {
  return {
    page_no: p,
    per_page: size,
    total_pages: totalPages,
    total_rows: total,
    is_last_page: p >= totalPages,
    group_count: groupCount,
  };
}

