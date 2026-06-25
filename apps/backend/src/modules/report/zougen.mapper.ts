// Pure response-shaping for the 増減連絡票（販売店）report (ACSMS-SCR-028).
// No Nest DI / repo / service — only flat-row → grouped-DTO transforms,
// importable from anywhere (service + unit tests).

import type {
  Content,
  ContentColumns,
  Margins,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

/** Flat row returned by the 増減連絡票 QueryBuilder `.getRawMany()`. */
export interface ZougenRawRow {
  dokusya_rireki_id: number | string;
  // 同一購読者の同日複数履歴を累計するためのキー（dokusya_id, rireki_no昇順）。
  dokusya_id: number | string;
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  // 前回販売店（販売店変更の 1減/1増 判定用。初回履歴は NULL）。
  zenkai_hanbaiten_id: number | string | null;
  zenkai_hanbaiten_code: string | null;
  zenkai_hanbaiten_name: string | null;
  kanri_shiten_id: number | string | null;
  kanri_shiten_name: string | null;
  kanri_shiten_tel: string | null;
  kanri_shiten_fax: string | null;
  // 部数（増減判定）
  dokusya_busu: number | string;
  zenkai_dokusya_busu: number | string | null;
  // 氏名 / 配達先氏名
  shimei_sei: string;
  shimei_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_renrakusaki_1: string;
  // 現配達先住所（td_now + haitatsu_*）
  now_todofuken_name: string | null;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  // 前回配達先住所（td_zen + zenkai_*）
  zen_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  biko: string;
}

// ─── response row shapes (api.md §レスポンスデータ) ─────────────────────
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
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0);
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
    r.haitatsu_shikuchoson,
    r.haitatsu_chome_banchi,
    r.haitatsu_tatemono_mei,
  );

const zenAddress = (r: ZougenRawRow): string =>
  joinAddress(
    r.zen_todofuken_name,
    r.zenkai_shikuchoson,
    r.zenkai_chome_banchi,
    r.zenkai_tatemono_mei,
  );

const fullName = (r: ZougenRawRow): string => `${str(r.shimei_sei)} ${str(r.shimei_mei)}`;
const deliveryName = (r: ZougenRawRow): string =>
  `${str(r.haitatsu_shimei_sei)} ${str(r.haitatsu_shimei_mei)}`;

/** 1購読者の同日変動を表す entry を、表示は last 行（その日の最終状態）から作る。 */
function entryFrom(last: ZougenRawRow, busuLabel: string): ZougenEntry {
  return {
    busu: busuLabel,
    address: nowAddress(last),
    name: fullName(last),
    delivery_name: deliveryName(last),
    phone: str(last.haitatsu_renrakusaki_1),
    biko: str(last.biko),
  };
}

type GetReport = (
  hanbaitenId: number | string,
  hanbaitenCode: string | null,
  hanbaitenName: string | null,
  sample: ZougenRawRow,
) => ZougenReport;

/** 1購読者の同日履歴（first→last）を累計し、増部/減部/住所変更へ振り分ける。 */
function classifyDayChange(records: ZougenRawRow[], getReport: GetReport): void {
  const first = records[0];
  const last = records.at(-1) as ZougenRawRow;

  const busuBefore = num(first.zenkai_dokusya_busu);
  const busuAfter = num(last.dokusya_busu);
  const storeBefore = first.zenkai_hanbaiten_id == null ? null : num(first.zenkai_hanbaiten_id);
  const storeAfter = num(last.hanbaiten_id);

  if (storeBefore != null && storeBefore !== storeAfter) {
    // ── 販売店変更: 旧店 減 busuBefore / 新店 増 busuAfter ──
    getReport(
      first.zenkai_hanbaiten_id as number,
      first.zenkai_hanbaiten_code,
      first.zenkai_hanbaiten_name,
      last,
    ).genbu.push(entryFrom(last, `${busuBefore} → 0`));
    getReport(last.hanbaiten_id, last.hanbaiten_code, last.hanbaiten_name, last).zoubu.push(
      entryFrom(last, `0 → ${busuAfter}`),
    );
  } else if (busuAfter > busuBefore) {
    getReport(last.hanbaiten_id, last.hanbaiten_code, last.hanbaiten_name, last).zoubu.push(
      entryFrom(last, `${busuBefore} → ${busuAfter}`),
    );
  } else if (busuAfter < busuBefore) {
    getReport(last.hanbaiten_id, last.hanbaiten_code, last.hanbaiten_name, last).genbu.push(
      entryFrom(last, `${busuBefore} → ${busuAfter}`),
    );
  }

  // ── 住所変更（前回住所が空＝初回のときは出さない）──
  const addrBefore = zenAddress(first);
  const addrAfter = nowAddress(last);
  if (addrBefore !== '' && addrBefore !== addrAfter) {
    const common = {
      name: fullName(last),
      delivery_name: deliveryName(last),
      phone: str(last.haitatsu_renrakusaki_1),
      biko: str(last.biko),
    };
    getReport(last.hanbaiten_id, last.hanbaiten_code, last.hanbaiten_name, last).address_change.push(
      { label: '変更前', address: addrBefore, ...common },
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
 */
export function groupZougenReports(rows: ZougenRawRow[]): ZougenReport[] {
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
  return order
    .map((k) => byKey.get(k) as ZougenReport)
    .sort(
      (a, b) =>
        a.hanbaiten_code.localeCompare(b.hanbaiten_code) ||
        (a.kanri_shiten_id ?? 0) - (b.kanri_shiten_id ?? 0),
    );
}

// ─── ページ送り（文書ページ単位。名簿 SCR-026 と同方針）────────────────────
/**
 * preview の既定ページ件数。SQLページングは **購読者(dokusya_id)単位**のため、
 * これは「1ページの購読者数」（≒レコード数。大半1レコード/購読者）。名簿と同じ 15。
 * ページングは report.service 側で SQL OFFSET/LIMIT により行う（メモリ内ではない）。
 */
export const ZOUGEN_PER_PAGE = 15;

/**
 * 全件 rows を **preview と同じ「1ページ=perPage 購読者」単位**でページに分割する
 * （PDF出力をプレビューと同じ改ページにするため）。
 *
 * 購読者の並びは preview の SQL（`ORDER BY MIN(h.hanbaiten_code), r.dokusya_id`）と
 * 一致させる：① 購読者ごとに現販売店コードの最小値を算出 → ②（販売店コード, dokusya_id）
 * 昇順で整列 → ③ perPage ずつに分割 → ④ 各チャンクの行を groupZougenReports で
 * 販売店ブロックに集約。これで PDF の n ページ目 = preview の n ページ目になる。
 */
export function paginateZougenSubscribers(
  rows: ZougenRawRow[],
  perPage: number,
): ZougenReport[][] {
  const size = perPage > 0 ? perPage : ZOUGEN_PER_PAGE;

  const byDok = new Map<number, ZougenRawRow[]>();
  for (const r of rows) {
    const id = num(r.dokusya_id);
    const g = byDok.get(id);
    if (g) g.push(r);
    else byDok.set(id, [r]);
  }

  const subs = [...byDok.entries()].map(([id, rs]) => {
    const codes = rs.map((r) => str(r.hanbaiten_code)).filter((c) => c !== '');
    const storeCode = [...codes].sort((a, b) => a.localeCompare(b))[0] ?? '';
    return { id, storeCode };
  });
  subs.sort((a, b) => a.storeCode.localeCompare(b.storeCode) || a.id - b.id);

  const pages: ZougenReport[][] = [];
  for (let i = 0; i < subs.length; i += size) {
    const ids = new Set(subs.slice(i, i + size).map((s) => s.id));
    const chunkRows = rows.filter((r) => ids.has(num(r.dokusya_id)));
    pages.push(groupZougenReports(chunkRows));
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
function jpDate(iso: string): string {
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
        width: '*',
        text: [
          { text: `${r.hanbaiten_name}　御中　`, bold: true, fontSize: 11 },
          {
            text: `TEL：${r.kanri_shiten_tel || '-'}　FAX：${r.kanri_shiten_fax || '-'}`,
            fontSize: 8,
          },
        ],
      },
      {
        width: 'auto',
        alignment: 'right',
        fontSize: 8,
        stack: [
          r.kanri_shiten_name || '（管理支店）',
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
      text: `${jpDate(tekiyo)}　下記の通り購読者が変更になりますのでお知らせします`,
      fontSize: 9,
      margin: m(0, 2, 0, 8),
    },
    entrySection('増部', '新規氏名', r.zoubu),
    entrySection('減部', '中止氏名', r.genbu),
    addressSection(r.address_change),
  ];
}

/**
 * Build the pdfmake document definition for the 増減連絡票（販売店）PDF.
 *
 * **プレビューと同じ改ページ**：1ページ＝`perPage`（既定15）購読者単位で区切る
 * （`paginateZougenSubscribers`）。各ページ先頭で改ページ（`pageBreak: 'before'`）し、
 * 同一ページ内の複数販売店ブロックは続けて積む。Page表記は `ページ番号/総ページ数`。
 * これで PDF の n ページ目 = preview の n ページ目になる。
 * `PdfExportService.generatePdf(...)` に渡す。
 */
export function buildZougenDocDefinition(
  rows: ZougenRawRow[],
  tekiyo: string,
  perPage: number = ZOUGEN_PER_PAGE,
  issuedAt = '',
): TDocumentDefinitions {
  const pages = paginateZougenSubscribers(rows, perPage);
  return {
    pageSize: 'A4',
    pageMargins: m(40, 36, 40, 36),
    content: pages.flatMap((pageReports, pi) =>
      pageReports.flatMap((r, ri) =>
        reportContent(r, pi + 1, pages.length, tekiyo, pi > 0 && ri === 0),
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
