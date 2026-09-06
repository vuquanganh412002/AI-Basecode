// 増減連絡票（販売店）(ACSMS-SCR-028) の純変換（生行→グループ化DTO。DI/repo なし・service + test 共用）。

import type {
  Content,
  ContentColumns,
  Margins,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import { DokusyaShubetsu } from '@/common/enums';

/** getRawMany() の数値カラムは driver により number / 文字列で届くため両対応。 */
type RawNullableNum = number | string | null;

/** 増減連絡票 QueryBuilder .getRawMany() の生行。 */
export interface ZougenRawRow {
  dokusya_rireki_id: number | string;
  // 同一購読者の同日複数履歴を累計するためのキー（dokusya_id, rireki_no昇順）。
  dokusya_id: number | string;
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  // #57976: 廃店(true)を宛先とする報告を作らないための店舗単位フラグ。
  haiten_flg: boolean;
  // 前回販売店（販売店変更の 1減/1増 判定用。初回履歴は NULL）。
  zenkai_hanbaiten_id: RawNullableNum;
  zenkai_hanbaiten_code: string | null;
  zenkai_hanbaiten_name: string | null;
  zenkai_haiten_flg: boolean | null;
  kanri_shiten_id: RawNullableNum;
  kanri_shiten_code: string | null;
  kanri_shiten_name: string | null;
  kanri_shiten_tel: string | null;
  kanri_shiten_fax: string | null;
  // 部数（増減判定）
  dokusya_busu: number | string;
  zenkai_dokusya_busu: RawNullableNum;
  // 購読種別（電子版=2 は住所変更セクションから除外する）
  dokusya_shubetsu: number;
  // 氏名 / 配達先氏名
  shimei_sei: string;
  shimei_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  // 電話番号列: haitatsu_same_flg=true → 購読者(renrakusaki_1)、false → 配達先。
  renrakusaki_1: string;
  haitatsu_renrakusaki_1: string;
  // 同日複数履歴のマージ + フィールド単位の住所変更判定に使う生カラム。
  // haitatsu_same_flg=true → 購読者住所(yubin_no等)、false → 配達先住所(haitatsu_*)。
  haitatsu_same_flg: boolean;
  // 購読者住所（生）
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  // 配達先住所（生）
  haitatsu_yubin_no: string;
  haitatsu_todofuken_code: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  // 前回住所（生。zenkai_shikuchoson/chome/tatemono は表示用に下でも使う）
  zenkai_yubin_no: string | null;
  zenkai_todofuken_code: string | null;
  // 現住所（haitatsu_same_flg で 購読者住所/配達先住所 を選択。SQL 側で解決済み）
  now_todofuken_name: string | null;
  now_shikuchoson: string;
  now_chome_banchi: string;
  now_tatemono_mei: string;
  // 前回配達先住所（td_zen + zenkai_*）
  zen_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  biko: string;
}

// ─── レスポンス行の型（api.md §レスポンスデータ）─────────────────────
export interface ZougenEntry {
  busu: string; // "{前} → {後}"
  address: string;
  name: string;
  delivery_name: string;
  phone: string;
  biko: string;
}

export interface AddressChangeRow {
  label: '変更前' | '変更後';
  address: string;
  name: string;
  delivery_name: string;
  phone: string;
  biko: string;
}

export interface ZougenReport {
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  kanri_shiten_tel: string | null;
  kanri_shiten_fax: string | null;
  zoubu: ZougenEntry[];
  genbu: ZougenEntry[];
  address_change: AddressChangeRow[];
  /** ページ送り: この販売店が前ページから継続（見出しに「(続き)」）。 */
  is_continued?: boolean;
  /** グループ単位ページング（顧客要件 2026-07）: この販売店内でのページ番号 / 総数。 */
  group_page_no?: number;
  group_total_pages?: number;
}

export interface ZougenPreviewData {
  tekiyo_date: string;
  reports: ZougenReport[];
  /** ページ送りメタ（preview のみ。export PDF は全件で未設定）。 */
  page_no?: number;
  per_page?: number;
  total_pages?: number;
  /** 全レコード数（増部+減部の各1件、住所変更は1購読者=1件として数える）。 */
  total_rows?: number;
  is_last_page?: boolean;
  /** 全体の販売店グループ数。 */
  group_count?: number;
  /** 当該ページの販売店内ページ番号 / 総数（帳票ヘッダのページ数表記・販売店単位）。 */
  group_page_no?: number;
  group_total_pages?: number;
}

const num = (v: RawNullableNum | undefined): number => Number(v ?? 0);
const str = (v: string | null | undefined): string => v ?? '';

/** `{都道府県名}{市町村郡}{丁目番地}{ 建物名}` を連結する（建物名は空なら省略）。 */
function joinAddress(
  todofuken: string | null,
  shikuchoson: string | null,
  chomeBanchi: string | null,
  tatemono: string | null,
): string {
  const base = `${str(todofuken)}${str(shikuchoson)}${str(chomeBanchi)}`;
  const tate = str(tatemono);
  return tate ? `${base} ${tate}` : base;
}

const nowAddress = (r: ZougenRawRow): string =>
  joinAddress(
    r.now_todofuken_name,
    r.now_shikuchoson,
    r.now_chome_banchi,
    r.now_tatemono_mei,
  );

const zenAddress = (r: ZougenRawRow): string =>
  joinAddress(
    r.zen_todofuken_name,
    r.zenkai_shikuchoson,
    r.zenkai_chome_banchi,
    r.zenkai_tatemono_mei,
  );

const fullName = (r: ZougenRawRow): string => `${str(r.shimei_sei)} ${str(r.shimei_mei)}`;
/**
 * 配達先読者名列の値。
 * haitatsu_same_flg=true（配達先＝購読者本人）→ 購読者氏名(shimei_*)、
 * false → 配達先氏名(haitatsu_shimei_*) を採用する。
 */
const deliveryName = (r: ZougenRawRow): string =>
  r.haitatsu_same_flg
    ? `${str(r.shimei_sei)} ${str(r.shimei_mei)}`
    : `${str(r.haitatsu_shimei_sei)} ${str(r.haitatsu_shimei_mei)}`;
/**
 * 電話番号列の値。
 * haitatsu_same_flg=true → 購読者連絡先(renrakusaki_1)、
 * false → 配達先連絡先(haitatsu_renrakusaki_1) を採用する。
 */
const deliveryPhone = (r: ZougenRawRow): string =>
  str(r.haitatsu_same_flg ? r.renrakusaki_1 : r.haitatsu_renrakusaki_1);

/** 1購読者の同日変動を表す entry を、表示は last 行（その日の最終状態）から作る。 */
function entryFrom(last: ZougenRawRow, busuLabel: string): ZougenEntry {
  return {
    busu: busuLabel,
    address: nowAddress(last),
    name: fullName(last),
    delivery_name: deliveryName(last),
    phone: deliveryPhone(last),
    biko: str(last.biko),
  };
}

type GetReport = (
  hanbaitenId: number | string,
  hanbaitenCode: string | null,
  hanbaitenName: string | null,
  sample: ZougenRawRow,
) => ZougenReport;

/**
 * 同一適用日・同一購読者の複数履歴（rmin=rireki_no最小 / rmax=最大）を 1件の
 * マージレコード `rc` に畳み込んだ結果。
 *   - 非 zenkai フィールド（現状態・表示用）は rmax から。
 *   - zenkai_*（日初の前回状態）は rmin から。null のときは rmin の現在値へ
 *     フォールバックする（要件: 1履歴の新規購読者を増・住所変更として誤検知しない）。
 *
 * 住所フィールドのフォールバックは haitatsu_same_flg を見て
 * 購読者住所(rmin.X) / 配達先住所(rmin.haitatsu_X) を選ぶ。
 * `zenkaiAddrPresent`=false のとき 変更前住所は rmin の現住所文字列を使う。
 */
interface MergedRecord {
  rc: ZougenRawRow; // 表示・現状態は rmax ベース
  busuBefore: number;
  storeBefore: number | null;
  storeBeforeCode: string | null;
  storeBeforeName: string | null;
  /** #57976: 前回販売店の廃店フラグ。true のときはその店を宛先とする報告を作らない。 */
  storeBeforeHaitenFlg: boolean;
  /** 前回住所がフィールド由来（true）か、フォールバック（false=日初の現住所）か。 */
  zenkaiAddrPresent: boolean;
  /** 変更前住所の文字列（フォールバック時は rmin の現住所）。 */
  addrBefore: string;
}

/** rmin/rmax から rc とマージ済みの前回値を組み立てる。 */
function mergeSameDay(records: ZougenRawRow[]): MergedRecord {
  const rmin = records[0];
  const rmax = records.at(-1) as ZougenRawRow;

  // 部数の前回値: zenkai があればそれ、なければ 0（新規＝0→現部数 の増として扱う）。
  // 顧客確認: zenkai=null(新規/CREATE) の前回部数は 0 とし、増減連絡票の増部に
  // 0→現部数 で出力する（rmin の現部数へフォールバックすると新規が増部から消える）。
  const busuBefore =
    rmin.zenkai_dokusya_busu == null ? 0 : num(rmin.zenkai_dokusya_busu);

  // 前回販売店: zenkai があればそれ、なければ rmin の現販売店（販売店変更なし扱い）。
  const storeBefore =
    rmin.zenkai_hanbaiten_id == null ? num(rmin.hanbaiten_id) : num(rmin.zenkai_hanbaiten_id);
  const storeBeforeCode =
    rmin.zenkai_hanbaiten_id == null ? rmin.hanbaiten_code : rmin.zenkai_hanbaiten_code;
  const storeBeforeName =
    rmin.zenkai_hanbaiten_id == null ? rmin.hanbaiten_name : rmin.zenkai_hanbaiten_name;
  // #57976: 前回販売店の廃店フラグ。変更なし(zenkai無し)のときは rmin 自身の店舗値。
  const storeBeforeHaitenFlg =
    rmin.zenkai_hanbaiten_id == null
      ? Boolean(rmin.haiten_flg)
      : Boolean(rmin.zenkai_haiten_flg);

  // 前回住所がフィールド由来か（zenkai_shikuchoson を代表に判定）。
  const zenkaiAddrPresent = rmin.zenkai_shikuchoson != null;
  // 変更前住所の文字列: zenkai があれば前回都道府県名(zen_todofuken_name)+zenkai_*、
  // なければ rmin の現住所文字列（フォールバック）。
  const addrBefore = zenkaiAddrPresent ? zenAddress(rmin) : nowAddress(rmin);

  return {
    rc: rmax,
    busuBefore,
    storeBefore,
    storeBeforeCode,
    storeBeforeName,
    storeBeforeHaitenFlg,
    zenkaiAddrPresent,
    addrBefore,
  };
}

/**
 * 住所フィールド X の前回値を rmin から解決する（フィールド単位）。
 *   zenkai_X があればそれ、なければ haitatsu_same_flg=true→購読者値 / false→配達先値。
 */
function zenkaiAddrField(
  rmin: ZougenRawRow,
  zenkaiVal: string | null,
  subscriberVal: string,
  deliveryVal: string,
): string {
  if (zenkaiVal != null) return zenkaiVal;
  return rmin.haitatsu_same_flg ? subscriberVal : deliveryVal;
}

/** 現住所フィールド X（haitatsu_same_flg=true→購読者値 / false→配達先値）。 */
function nowAddrField(rc: ZougenRawRow, subscriberVal: string, deliveryVal: string): string {
  return rc.haitatsu_same_flg ? subscriberVal : deliveryVal;
}

/**
 * 同日複数履歴をマージした rc から、フィールド単位で住所変更を検知する。
 * 検知は郵便番号を含む全フィールドの比較（表示文字列には郵便番号は含めない）。
 */
function addressChangedFromRc(merged: MergedRecord, records: ZougenRawRow[]): boolean {
  const rmin = records[0];
  const { rc } = merged;

  // 各フィールドの「前回値」と「現在値」を同じ系（購読者/配達先）で比較する。
  const fields: Array<{
    zenkai: string | null;
    sub: string;
    del: string;
    nowSub: string;
    nowDel: string;
  }> = [
    {
      zenkai: rmin.zenkai_yubin_no,
      sub: str(rmin.yubin_no),
      del: str(rmin.haitatsu_yubin_no),
      nowSub: str(rc.yubin_no),
      nowDel: str(rc.haitatsu_yubin_no),
    },
    {
      zenkai: rmin.zenkai_todofuken_code,
      sub: str(rmin.todofuken_code),
      del: str(rmin.haitatsu_todofuken_code),
      nowSub: str(rc.todofuken_code),
      nowDel: str(rc.haitatsu_todofuken_code),
    },
    {
      zenkai: rmin.zenkai_shikuchoson,
      sub: str(rmin.shikuchoson),
      del: str(rmin.haitatsu_shikuchoson),
      nowSub: str(rc.shikuchoson),
      nowDel: str(rc.haitatsu_shikuchoson),
    },
    {
      zenkai: rmin.zenkai_chome_banchi,
      sub: str(rmin.chome_banchi),
      del: str(rmin.haitatsu_chome_banchi),
      nowSub: str(rc.chome_banchi),
      nowDel: str(rc.haitatsu_chome_banchi),
    },
    {
      zenkai: rmin.zenkai_tatemono_mei,
      sub: str(rmin.tatemono_mei),
      del: str(rmin.haitatsu_tatemono_mei),
      nowSub: str(rc.tatemono_mei),
      nowDel: str(rc.haitatsu_tatemono_mei),
    },
  ];

  return fields.some((f) => {
    const before = zenkaiAddrField(rmin, f.zenkai, f.sub, f.del);
    const after = nowAddrField(rc, f.nowSub, f.nowDel);
    return before !== after;
  });
}

/**
 * 1購読者の同日履歴を rmin/rmax でマージし、増部/減部/住所変更へ振り分ける。
 * 増減・販売店変更・住所変更すべてマージ済み rc を基準にする。
 */
function classifyDayChange(records: ZougenRawRow[], getReport: GetReport): void {
  const merged = mergeSameDay(records);
  const { rc } = merged;

  const busuBefore = merged.busuBefore;
  const busuAfter = num(rc.dokusya_busu);
  const storeBefore = merged.storeBefore;
  const storeAfter = num(rc.hanbaiten_id);
  // #57976: 廃店(haiten_flg=true)は「その店を宛先とする報告を作らない」——行自体は
  // 常に処理し、店舗ごとにこのフラグで報告作成の可否だけを判定する。旧店側の報告は
  // 新店が廃店かどうかに関係なく作る（逆も同様）。
  const storeBeforeOpen = !merged.storeBeforeHaitenFlg;
  const storeAfterOpen = !rc.haiten_flg;

  if (storeBefore != null && storeBefore !== storeAfter) {
    // ── 販売店変更: 旧店 減 busuBefore / 新店 増 busuAfter ──
    if (storeBeforeOpen) {
      getReport(storeBefore, merged.storeBeforeCode, merged.storeBeforeName, rc).genbu.push(
        entryFrom(rc, `${busuBefore} → 0`),
      );
    }
    if (storeAfterOpen) {
      getReport(rc.hanbaiten_id, rc.hanbaiten_code, rc.hanbaiten_name, rc).zoubu.push(
        entryFrom(rc, `0 → ${busuAfter}`),
      );
    }
  } else if (busuAfter > busuBefore) {
    if (storeAfterOpen) {
      getReport(rc.hanbaiten_id, rc.hanbaiten_code, rc.hanbaiten_name, rc).zoubu.push(
        entryFrom(rc, `${busuBefore} → ${busuAfter}`),
      );
    }
  } else if (busuAfter < busuBefore) {
    if (storeAfterOpen) {
      getReport(rc.hanbaiten_id, rc.hanbaiten_code, rc.hanbaiten_name, rc).genbu.push(
        entryFrom(rc, `${busuBefore} → ${busuAfter}`),
      );
    }
  }

  // ── 住所変更（フィールド単位で比較。前回がフォールバック=実質「無し」のときは
  //    新住所と一致するので検知されない＝新規購読者ではノイズを出さない）──
  // 電子版(DokusyaShubetsu.DIGITAL=2)は配達先住所を持たないため、住所が変わっても
  // 住所変更セクションには載せない（増部/減部には従来どおり計上する）。
  // #57976: 住所変更は現販売店(rc.hanbaiten_id)宛の報告なので、廃店なら作らない。
  if (
    storeAfterOpen &&
    Number(rc.dokusya_shubetsu) !== DokusyaShubetsu.DIGITAL &&
    addressChangedFromRc(merged, records)
  ) {
    const addrAfter = nowAddress(rc);
    const common = {
      name: fullName(rc),
      delivery_name: deliveryName(rc),
      phone: deliveryPhone(rc),
      biko: str(rc.biko),
    };
    getReport(rc.hanbaiten_id, rc.hanbaiten_code, rc.hanbaiten_name, rc).address_change.push(
      { label: '変更前', address: merged.addrBefore, ...common },
      { label: '変更後', address: addrAfter, ...common },
    );
  }
}

/**
 * 同一購読者(dokusya_id)の「その日の変動」を**累計**してから 増部 / 減部 /
 * 住所変更 に分類する。rows は dokusya_id 昇順・rireki_no 昇順で届く前提。
 *
 * 累計の考え方（要件 change_notification_concept.md §増減連絡票）:
 *   - その日の **最初の履歴**（rireki_no 最小）の前回値 = 日初の状態
 *     （前回部数 busuBefore / 前回販売店 storeBefore / 前回住所）。
 *   - その日の **最後の履歴**（rireki_no 最大）の現在値 = 日末の状態
 *     （現部数 busuAfter / 現販売店 storeAfter / 現住所 + 表示用の氏名等）。
 *   → 同日に 1→3→5 と動いても 1→5 として1件で反映。解約(…→0)も同様に減として反映。
 *
 * 分類:
 *   - 販売店変更（storeBefore ≠ storeAfter）: 旧販売店に **減 busuBefore**、
 *     新販売店に **増 busuAfter**（要件「前回販売店と販売店を比較して1増1減」）。
 *   - 同一販売店: net = busuAfter − busuBefore → 正なら増、負なら減（0は出力なし）。
 *   - 住所変更: 前回住所(非空) ≠ 現住所 → 変更前/変更後（初回=前回住所空は出さない）。
 *
 * 注意（要確認）: 旧販売店の 管理支店 は履歴に保持されないため、暫定的に当日最終
 * レコードの kanri_shiten をそのまま使う（多くは同一管理支店内の移動）。
 *
 * `hanbaitenFilter` 指定時（顧客要件2026-08）: 出力を選択した販売店の分類結果だけに
 * 絞る。販売店変更（転出/転入）で対になる旧店/新店のうち、選ばれていない側は
 * 出力しない ——「72を選んだら72だけ、73を選んだら73だけ」。行の取得自体は
 * service 側の EXISTS 判定で同日の全履歴を含めて取っているため、絞り込み前の
 * 集約(rmin/rmax)は常に正しい状態で行われ、ここでは表示する店舗だけを間引く。
 */
export function groupZougenReports(
  rows: ZougenRawRow[],
  hanbaitenFilter?: number[],
): ZougenReport[] {
  // 1) 購読者ごとに同日履歴をまとめる（rows は dokusya_id, rireki_no 昇順）。
  const byDokusya = new Map<string, ZougenRawRow[]>();
  const dokusyaOrder: string[] = [];
  for (const r of rows) {
    const id = String(r.dokusya_id);
    let g = byDokusya.get(id);
    if (!g) {
      g = [];
      byDokusya.set(id, g);
      dokusyaOrder.push(id);
    }
    g.push(r);
  }

  // 2) 販売店＋管理支店ごとの ZougenReport を必要に応じて生成。
  const order: string[] = [];
  const byKey = new Map<string, ZougenReport>();
  const getReport = (
    hanbaitenId: number | string,
    hanbaitenCode: string | null,
    hanbaitenName: string | null,
    sample: ZougenRawRow,
  ): ZougenReport => {
    const key = `${hanbaitenId}__${sample.kanri_shiten_id ?? 'none'}`;
    let rep = byKey.get(key);
    if (!rep) {
      rep = {
        hanbaiten_id: num(hanbaitenId),
        hanbaiten_code: str(hanbaitenCode),
        hanbaiten_name: str(hanbaitenName),
        kanri_shiten_id: sample.kanri_shiten_id == null ? null : num(sample.kanri_shiten_id),
        kanri_shiten_name: sample.kanri_shiten_name,
        kanri_shiten_tel: sample.kanri_shiten_tel,
        kanri_shiten_fax: sample.kanri_shiten_fax,
        zoubu: [],
        genbu: [],
        address_change: [],
      };
      byKey.set(key, rep);
      order.push(key);
    }
    return rep;
  };

  for (const id of dokusyaOrder) {
    classifyDayChange(byDokusya.get(id)!, getReport);
  }

  // 3) 出力は 販売店コード昇順・管理支店ID昇順（SQLは dokusya_id 順のため再整列）。
  let reports = order
    .map((k) => byKey.get(k) as ZougenReport)
    .sort(
      (a, b) =>
        a.hanbaiten_code.localeCompare(b.hanbaiten_code) ||
        (a.kanri_shiten_id ?? 0) - (b.kanri_shiten_id ?? 0),
    );

  // 4) 販売店フィルタ指定時は選択した店舗の分類結果のみ残す（顧客要件2026-08）。
  if (hanbaitenFilter && hanbaitenFilter.length > 0) {
    const filterSet = new Set(hanbaitenFilter);
    reports = reports.filter((r) => filterSet.has(r.hanbaiten_id));
  }

  return reports;
}

// ─── ページ送り（文書ページ単位。名簿 SCR-026 と同方針）────────────────────
/**
 * preview の既定ページ件数。SQLページングは **購読者(dokusya_id)単位**のため、
 * これは「1ページの購読者数」（≒レコード数。大半1レコード/購読者）。
 * A4縦の1ページに収まる行数を実測のうえ 15→20 へ引き上げた（顧客要件2026-08-26）。
 * ページングは report.service 側で SQL OFFSET/LIMIT により行う（メモリ内ではない）。
 */
export const ZOUGEN_PER_PAGE = 20;

/**
 * 1つの帳票(販売店+管理支店の combo)を perPage レコードずつのページに分割する。
 * レコード= 増部 + 減部 + 住所変更の各行。増部→減部→住所変更 の順に詰める
 * （大半の combo は size 以下で1ページ。大きい combo のみ複数ページに続く）。
 */
function splitReport(r: ZougenReport, size: number): ZougenReport[] {
  const total = r.zoubu.length + r.genbu.length + r.address_change.length;
  if (total <= size) return [{ ...r }];
  const pages: ZougenReport[] = [];
  let zi = 0;
  let gi = 0;
  let ai = 0;
  while (zi < r.zoubu.length || gi < r.genbu.length || ai < r.address_change.length) {
    let budget = size;
    const zoubu = r.zoubu.slice(zi, zi + Math.min(budget, r.zoubu.length - zi));
    zi += zoubu.length;
    budget -= zoubu.length;
    const genbu = r.genbu.slice(gi, gi + Math.min(budget, r.genbu.length - gi));
    gi += genbu.length;
    budget -= genbu.length;
    // 住所変更は [変更前, 変更後] の2行1組（classifyDayChange が常にペアで push）。
    // 端数(奇数)でスライスするとページ境界でペアが分断され、FE
    // （ZougenHanbaitenReportView.addressChangePairs）や PDF（addressSection）の
    // 連番インデックスによるペアリングがズレ、別の購読者の行と誤って
    // 組み合わさる（報告バグ）。ペア単位でしか切り出さない — 端数は次ページへ。
    const remaining = r.address_change.length - ai;
    let pairBudget = Math.min(budget, remaining);
    pairBudget -= pairBudget % 2;
    // size が極端に小さい（例: per_page=1、DTO上は許容範囲）場合、この回で
    // zoubu/genbu も0件・pairBudget も0になり得て無限ループの危険がある。
    // その場合のみ1組を強制的に切り出す（そのページだけ size を1件超過するが、
    // ペア分断や無限ループよりはるかに軽微）。
    if (pairBudget === 0 && zoubu.length === 0 && genbu.length === 0 && remaining > 0) {
      pairBudget = 2;
    }
    const address_change = r.address_change.slice(ai, ai + pairBudget);
    ai += address_change.length;
    pages.push({ ...r, zoubu, genbu, address_change });
  }
  return pages;
}

/**
 * 全件 rows を **販売店+管理支店(combo)ごとに独立したページ**へ分割する（顧客要件
 * 2026-07・SCR-026/029 と同方針）。1ページ=1 combo。1販売店が複数の管理支店を持つ
 * ので combo は「販売店+管理支店」単位＝各 combo は最低1ページ。ページ番号 k/N は
 * **販売店(hanbaiten_id)ごと**に採番する（例: 販売店A×管理支店a→1/2, 販売店A×管理支店b
 * →2/2）。combo が大きい場合は自 combo 内で perPage レコードずつ複数ページに続く。
 * preview と PDF が本関数を共有するのでページ構成は必ず一致する。
 */
export function paginateZougenSubscribers(
  rows: ZougenRawRow[],
  perPage: number,
  hanbaitenFilter?: number[],
): ZougenReport[][] {
  const size = perPage > 0 ? perPage : ZOUGEN_PER_PAGE;
  // combo(=各 report)は販売店コード昇順→管理支店ID昇順。販売店ごとにページ列をまとめる。
  const reports = groupZougenReports(rows, hanbaitenFilter);
  const storeOrder: number[] = [];
  const storePages = new Map<number, ZougenReport[]>();
  for (const r of reports) {
    if (!storePages.has(r.hanbaiten_id)) {
      storePages.set(r.hanbaiten_id, []);
      storeOrder.push(r.hanbaiten_id);
    }
    storePages.get(r.hanbaiten_id)!.push(...splitReport(r, size));
  }
  const pages: ZougenReport[][] = [];
  for (const storeId of storeOrder) {
    const list = storePages.get(storeId)!;
    list.forEach((rp, i) => {
      pages.push([
        {
          ...rp,
          group_page_no: i + 1,
          group_total_pages: list.length,
          is_continued: i > 0, // 販売店の2ページ目以降は「(続き)」。
        },
      ]);
    });
  }
  return pages;
}

// ─── PDF (pdfmake) document definition — ACSMS-SCR-028 §4.4 帳票レイアウト ──
// docs/design/ACSMS-SCR-028/index.html に準拠：タイトル中央 + Page、販売店/
// 管理支店ヘッダ、適用日 + 定型文、増部/減部/住所変更の3表（住所変更は
// 1購読者2行＝変更前/変更後、氏名等は rowSpan=2）。

const HEADER_FILL = '#f1f5f9';
const BORDER_COLOR = '#94a3b8';
const COL_WIDTHS = ['8%', '30%', '15%', '15%', '15%', '17%'];

const m = (a: number, b: number, c: number, d: number): Margins => [a, b, c, d];

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => BORDER_COLOR,
  vLineColor: () => BORDER_COLOR,
  paddingTop: () => 3,
  paddingBottom: () => 3,
  paddingLeft: () => 4,
  paddingRight: () => 4,
};

/** 適用日 YYYY-MM-DD → 「YYYY年M月D日」。 */
export function jpDate(iso: string): string {
  const [y, mo, d] = (iso ?? '').split('-');
  return y && mo && d ? `${y}年${Number(mo)}月${Number(d)}日` : (iso ?? '');
}

function hd(text: string): TableCell {
  return { text, bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 8 };
}
function cell(text: string, align: 'left' | 'center' = 'left'): TableCell {
  return { text: text ?? '', alignment: align, fontSize: 8 };
}
function emptyRow(): TableCell[] {
  return Array.from({ length: 6 }, () => ({ text: ' ', margin: m(0, 6, 0, 6) }));
}

function entrySection(title: string, nameHeader: string, entries: ZougenEntry[]): Content {
  const body: TableCell[][] = [
    [hd('部数'), hd('住所'), hd(nameHeader), hd('配達先読者名'), hd('電話番号'), hd('備考')],
    ...entries.map((e) => [
      cell(e.busu, 'center'),
      cell(e.address),
      cell(e.name),
      cell(e.delivery_name),
      cell(e.phone),
      cell(e.biko),
    ]),
    emptyRow(),
  ];
  return {
    stack: [
      { text: title, bold: true, fontSize: 10, margin: m(0, 8, 0, 2) },
      { table: { headerRows: 1, widths: COL_WIDTHS, body }, layout: tableLayout },
    ],
  };
}

function addressSection(rows: AddressChangeRow[]): Content {
  const body: TableCell[][] = [
    [hd(''), hd('住所'), hd('氏名'), hd('配達先読者名'), hd('電話番号'), hd('備考')],
  ];
  for (let i = 0; i < rows.length; i += 2) {
    const before = rows[i];
    const after = rows[i + 1];
    body.push(
      [
        { text: '変更前', bold: true, alignment: 'center', fontSize: 8 },
        cell(before.address),
        { text: before.name, rowSpan: 2, fontSize: 8 },
        { text: before.delivery_name, rowSpan: 2, fontSize: 8 },
        { text: before.phone, rowSpan: 2, fontSize: 8 },
        { text: before.biko, rowSpan: 2, fontSize: 8 },
      ],
      [
        { text: '変更後', bold: true, alignment: 'center', fontSize: 8 },
        cell(after?.address ?? ''),
        // rowSpan=2 で覆われるセルはプレースホルダ（空オブジェクト）が必須。
        {},
        {},
        {},
        {},
      ],
    );
  }
  body.push(emptyRow());
  return {
    stack: [
      { text: '住所変更', bold: true, fontSize: 10, margin: m(0, 8, 0, 2) },
      { table: { headerRows: 1, widths: COL_WIDTHS, body }, layout: tableLayout },
    ],
  };
}

function reportContent(
  r: ZougenReport,
  pageNo: number,
  totalPages: number,
  tekiyo: string,
  pageBreakBefore: boolean,
): Content[] {
  const titleRow: ContentColumns = {
    columns: [
      { text: '', width: '*' },
      {
        text: '日本農業新聞増減連絡票',
        bold: true,
        fontSize: 16,
        alignment: 'center',
        width: 'auto',
      },
      { text: `Page：${pageNo}/${totalPages}`, fontSize: 8, alignment: 'right', width: '*' },
    ],
    margin: m(0, 0, 0, 6),
    ...(pageBreakBefore ? { pageBreak: 'before' as const } : {}),
  };

  const sellerRow: ContentColumns = {
    columns: [
      {
        // 販売店名＋御中を1行目、TEL・FAX をそれぞれ別行で表示する。
        width: '*',
        stack: [
          { text: `${r.hanbaiten_name}　御中`, bold: true, fontSize: 11 },
          { text: `TEL：${r.kanri_shiten_tel || '-'}`, fontSize: 8, margin: m(0, 2, 0, 0) },
          { text: `FAX：${r.kanri_shiten_fax || '-'}`, fontSize: 8 },
        ],
      },
      {
        width: 'auto',
        alignment: 'left',
        fontSize: 8,
        stack: [
          r.kanri_shiten_name || '（管理支店）',
          // 部署／担当者は帳票上で手書き記入する空欄（下線）。
          '＿＿＿＿＿＿ 部／ 担当：＿＿＿＿＿＿',
          `TEL：${r.kanri_shiten_tel || '-'}`,
          `FAX：${r.kanri_shiten_fax || '-'}`,
        ],
      },
    ],
    margin: m(0, 6, 0, 4),
  };

  return [
    titleRow,
    sellerRow,
    {
      text: `適用日：${jpDate(tekiyo)}　下記の通り購読者が変更になりますのでお知らせします`,
      fontSize: 9,
      margin: m(0, 2, 0, 8),
    },
    entrySection('増部', '新規氏名', r.zoubu),
    entrySection('減部', '中止氏名', r.genbu),
    addressSection(r.address_change),
  ];
}

/**
 * 増減連絡票（販売店）PDF の pdfmake document definition を組む。
 *
 * **プレビューと同じ改ページ**：販売店+管理支店(combo)ごとに独立ページ（顧客要件
 * 2026-07・SCR-026/029 と同方針）。各ページ先頭で改ページ（`pageBreak: 'before'`）。
 * ページ数表記は販売店ごとに 1..N（`paginateZougenSubscribers`）。combo が大きい場合は
 * 自 combo 内で perPage レコードずつ複数ページに続く。PDF の n ページ目 = preview の n
 * ページ目。`PdfExportService.generatePdf(...)` に渡す。
 */
export function buildZougenDocDefinition(
  rows: ZougenRawRow[],
  tekiyo: string,
  perPage: number = ZOUGEN_PER_PAGE,
  issuedAt = '',
  hanbaitenFilter?: number[],
): TDocumentDefinitions {
  const pages = paginateZougenSubscribers(rows, perPage, hanbaitenFilter);
  return {
    pageSize: 'A4',
    pageMargins: m(40, 36, 40, 36),
    content: pages.flatMap((pageReports, pi) =>
      pageReports.flatMap((r) =>
        // ページ数は販売店ごとに 1..N（顧客要件 2026-07）。1ページ=1 combo。
        reportContent(r, r.group_page_no ?? 1, r.group_total_pages ?? 1, tekiyo, pi > 0),
      ),
    ),
    // 発行日時を全ページのフッタ右寄せに印字する（プレビュー押下時刻）。
    ...(issuedAt
      ? {
          footer: (): Content => ({
            text: `発行日時：${issuedAt}`,
            alignment: 'right',
            fontSize: 8,
            margin: m(40, 0, 40, 0),
          }),
        }
      : {}),
    defaultStyle: { font: 'IPAexGothic', fontSize: 9 },
  };
}
