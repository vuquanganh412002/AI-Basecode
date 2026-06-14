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
}

export interface HanbaitenGroup {
  hanbaiten_id: number;
  hanbaiten_name: string;
  hanbaiten_code: string;
  hanbaiten_tel: string;
  hanbaiten_fax: string;
  total_busu: number;
  kanri_shiten_groups: KanriShitenSubGroup[];
}

export interface KanriShitenGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  total_busu: number;
  rows: KanriShitenReportRow[];
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

/** 〒{郵便番号}{市町村郡}{丁目番地}{建物名} を連結（画面項目No.12/25）。 */
function resolveAddress(row: MeiboRawRow): string {
  return `〒${row.haitatsu_yubin_no}${row.haitatsu_shikuchoson}${row.haitatsu_chome_banchi}${row.haitatsu_tatemono_mei}`;
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
      haitatsu_tel: row.haitatsu_renrakusaki_1 ?? '',
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
      haitatsu_tel: row.haitatsu_renrakusaki_1 ?? '',
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
