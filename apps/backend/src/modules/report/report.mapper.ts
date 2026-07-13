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
}

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
  /**
   * 当該ページが属するグループ内でのページ番号 / グループ総ページ数（顧客要件
   * 2026-07: 帳票ヘッダの「ページ数」は販売店/管理支店ごとに 1..N で採番する）。
   * ページャ(ナビゲーション)は従来どおり全体通算 (total_pages) を使う。
   */
  group_page_no?: number;
  group_total_pages?: number;
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

// ─── 動的ページング（A4 高さ基準・顧客要件 2026-07）──────────────────────────
// 明細行の高さ(可変=氏名/住所の折返し)を積算し、A4 の1ページ分に収まる範囲で改ページ
// する。preview と Excel が同じ関数(buildMeiboDocPages)を使うので必ず一致する。
// 見積りは安全側（等倍・ヘッダ分と安全余白を差し引く）で、実印刷でのはみ出しを防ぐ。
const MEIBO_LINE_PT = 14; // font10 の1行あたり高さ(pt)
/**
 * 明細行(販売店別)の最低高(pt) — チェックボックス(font36)ぶん。ページ高さの見積り
 * (splitByHeight)と Excel の実行高(autoFitRowHeight)で同じ値を使わないと改ページ位置が
 * ずれるため、meibo-report.service から import して共有する。
 */
export const MEIBO_HANBAITEN_MIN_ROW_PT = 44;
/**
 * 各 report_type の列幅(Excel width単位)。ページ高さの見積り(estimateMeiboRowHeightPt)と
 * Excel シートの実列幅(fillHanbaiten/KanriSheet の sheet.columns)は必ず一致させる必要が
 * あるため、meibo-report.service はこの配列から sheet.columns を組み立てる（唯一の真実源）。
 */
export const MEIBO_COL_WIDTHS: Record<'hanbaiten' | 'kanri_shiten', number[]> = {
  hanbaiten: [9, 24, 32, 16, 18, 14, 11],
  kanri_shiten: [22, 18, 30, 9, 12, 12, 28],
};
// 明細に使えるページ高さ(pt)。A4縦 印刷可能高(~755pt)から 繰り返しヘッダ(≈130pt) +
// 小計行 + 安全余白を差し引いた値。見積り(MEIBO_LINE_PT=14pt/行)は実印刷(font10≈13pt)
// より大きめ＝安全側なので、物理的に1枚に収まる行を無駄に分割しないよう budget は
// 実印刷可能高に近づける（旧値 520/590 は保守的すぎて空白が目立ったため引上げ）。
const MEIBO_DETAIL_BUDGET_PT: Record<'hanbaiten' | 'kanri_shiten', number> = {
  hanbaiten: 650,
  kanri_shiten: 650,
};

/** 全角=2 / 半角=1 の表示幅。 */
function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += (ch.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
  return w;
}

/** セルの折返しを考慮した行数（明示\n + 列幅からの折返し）。 */
function cellLineCount(text: string, colWidthUnits: number): number {
  // Excel の wrapText は概ね「列幅(=半角0の幅)ぶん」で折返す。全角=2幅換算(displayWidth)
  // なので capacity=列幅そのもの(×1.0)が実折返しに一致する。0.92 は折返しを過剰計上して
  // 行を無駄に分割していたため 1.0 に補正。
  const capacity = Math.max(1, colWidthUnits);
  let lines = 0;
  for (const line of text.split('\n')) {
    lines += Math.max(1, Math.ceil(displayWidth(line) / capacity));
  }
  return lines;
}

/** 明細1行の見積り高さ(pt)。各セルの最大行数 × 1行高、最低高で下限。 */
export function estimateMeiboRowHeightPt(
  cellTexts: string[],
  colWidths: number[],
  minHeightPt = 0,
): number {
  let maxLines = 1;
  cellTexts.forEach((t, i) => {
    const lines = cellLineCount(t, colWidths[i] ?? 10);
    if (lines > maxLines) maxLines = lines;
  });
  return Math.max(maxLines * MEIBO_LINE_PT, minHeightPt);
}

/** `〒{7桁}{住所}` → `〒XXX-XXXX\n{住所}`（高さ見積り・Excel表示と同一整形）。 */
function addrMultiline(addr: string): string {
  const m = /^〒(\d{7})(.*)$/.exec(addr ?? '');
  if (!m) return addr ?? '';
  return `〒${m[1].slice(0, 3)}-${m[1].slice(3)}\n${m[2]}`;
}

/** 販売店別 明細行の表示セル文字列（高さ見積り用・Excel と一致）。 */
function hanbaitenCellTexts(r: HanbaitenReportRow): string[] {
  return [
    '□',
    `${r.shimei}\n${r.shimei_kana}`,
    addrMultiline(r.haitatsu_address),
    r.kanri_shiten_name,
    r.haitatsu_tel,
    r.dokusya_kaishi_date ?? '',
    String(r.dokusya_busu),
  ];
}

/** 管理支店別 明細行の表示セル文字列（高さ見積り用・Excel と一致）。 */
function kanriCellTexts(r: KanriShitenReportRow): string[] {
  return [
    `${r.shimei}\n${r.shimei_kana}`,
    `${r.kumiaiin_code || '-'}\n${r.haitatsu_tel}`,
    `${r.shiten_name}\n${addrMultiline(r.haitatsu_address)}`,
    String(r.dokusya_busu),
    '', // 購読種別ラベル（短いので高さに寄与しない）
    '',
    `${r.dokusya_kaishi_date ?? ''}\n${r.hanbaiten_name}`,
  ];
}

/** 高さ予算に収まるよう行を分割（各ページ最低1行）。 */
function splitByHeight<T>(
  rows: T[],
  heightOf: (r: T) => number,
  budget: number,
): T[][] {
  const pages: T[][] = [];
  let cur: T[] = [];
  let acc = 0;
  for (const r of rows) {
    const h = heightOf(r);
    if (cur.length > 0 && acc + h > budget) {
      pages.push(cur);
      cur = [];
      acc = 0;
    }
    cur.push(r);
    acc += h;
  }
  if (cur.length > 0) pages.push(cur);
  return pages;
}

/**
 * 全件のグループ済みデータから「文書ページ」の配列を作る（動的ページング・顧客要件
 * 2026-07）。各ページ = 1グループのスライス（グループを跨がない）で、行の見積り高さを
 * 積算し A4 1ページ分に収める。preview と Excel が本関数を共有するのでページ構成は必ず
 * 一致する。各ページは単一グループの {@link MeiboPreviewData}（group_page_no /
 * group_total_pages / is_continued / show_total 付き）。
 */
export function buildMeiboDocPages(full: MeiboPreviewData): MeiboPreviewData[] {
  const pages: MeiboPreviewData[] = [];
  const base = {
    report_type: full.report_type,
    tekiyo_date: full.tekiyo_date,
    ja_name: full.ja_name,
    ja_tel: full.ja_tel,
    grand_total_busu: full.grand_total_busu,
  };

  if (full.report_type === 'hanbaiten') {
    const widths = MEIBO_COL_WIDTHS.hanbaiten;
    const budget = MEIBO_DETAIL_BUDGET_PT.hanbaiten;
    for (const hg of full.hanbaiten_groups) {
      const flat = hg.kanri_shiten_groups.flatMap((sg) => sg.rows);
      const slices = splitByHeight(
        flat,
        (r) =>
          estimateMeiboRowHeightPt(
            hanbaitenCellTexts(r),
            widths,
            MEIBO_HANBAITEN_MIN_ROW_PT,
          ),
        budget,
      );
      slices.forEach((slice, i) => {
        // スライス行を管理支店(表示順維持)で再グループ化。
        const subMap = new Map<string, KanriShitenSubGroup>();
        for (const row of slice) {
          const key = String(row.kanri_shiten_name ?? '');
          let sg = subMap.get(key);
          if (!sg) {
            sg = {
              kanri_shiten_id: null,
              kanri_shiten_name: row.kanri_shiten_name ?? '',
              subtotal_busu: 0,
              rows: [],
            };
            subMap.set(key, sg);
          }
          sg.subtotal_busu += row.dokusya_busu;
          sg.rows.push(row);
        }
        pages.push({
          ...base,
          hanbaiten_groups: [
            {
              ...hg,
              total_busu: hg.total_busu, // 小計は常にグループ全体の合計
              kanri_shiten_groups: [...subMap.values()],
              is_continued: i > 0,
              show_total: i === slices.length - 1,
            },
          ],
          kanri_shiten_groups: [],
          group_page_no: i + 1,
          group_total_pages: slices.length,
        });
      });
    }
    return pages;
  }

  const widths = MEIBO_COL_WIDTHS.kanri_shiten;
  const budget = MEIBO_DETAIL_BUDGET_PT.kanri_shiten;
  for (const kg of full.kanri_shiten_groups) {
    const slices = splitByHeight(
      kg.rows,
      (r) => estimateMeiboRowHeightPt(kanriCellTexts(r), widths),
      budget,
    );
    slices.forEach((slice, i) => {
      pages.push({
        ...base,
        hanbaiten_groups: [],
        kanri_shiten_groups: [
          {
            ...kg,
            subtotal_busu: kg.subtotal_busu, // 小計はグループ全体の合計
            rows: slice,
            is_continued: i > 0,
            show_subtotal: i === slices.length - 1,
          },
        ],
        group_page_no: i + 1,
        group_total_pages: slices.length,
      });
    });
  }
  return pages;
}
