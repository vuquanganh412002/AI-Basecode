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
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
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
}

export interface ZougenPreviewData {
  tekiyo_date: string;
  reports: ZougenReport[];
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

function toEntry(r: ZougenRawRow): ZougenEntry {
  return {
    busu: `${num(r.zenkai_dokusya_busu)} → ${num(r.dokusya_busu)}`,
    address: nowAddress(r),
    name: fullName(r),
    delivery_name: deliveryName(r),
    phone: str(r.haitatsu_renrakusaki_1),
    biko: str(r.biko),
  };
}

/**
 * Group the flat rows by 販売店ID＋管理支店ID (rows arrive already ordered by
 * 販売店コード昇順, 管理支店ID昇順) and classify each row into 増部 / 減部 /
 * 住所変更. The three checks are independent per api.md §4.5:
 *   - 増部: dokusya_busu > zenkai_dokusya_busu
 *   - 減部: dokusya_busu < zenkai_dokusya_busu
 *   - 住所変更: 前回配達先住所 ≠ 現配達先住所 → 変更前/変更後 の2行
 */
export function groupZougenReports(rows: ZougenRawRow[]): ZougenReport[] {
  const order: string[] = [];
  const byKey = new Map<string, ZougenReport>();

  for (const r of rows) {
    const key = `${r.hanbaiten_id}__${r.kanri_shiten_id ?? 'none'}`;
    let report = byKey.get(key);
    if (!report) {
      report = {
        hanbaiten_id: num(r.hanbaiten_id),
        hanbaiten_code: str(r.hanbaiten_code),
        hanbaiten_name: str(r.hanbaiten_name),
        kanri_shiten_id: r.kanri_shiten_id == null ? null : num(r.kanri_shiten_id),
        kanri_shiten_name: r.kanri_shiten_name,
        kanri_shiten_tel: r.kanri_shiten_tel,
        kanri_shiten_fax: r.kanri_shiten_fax,
        zoubu: [],
        genbu: [],
        address_change: [],
      };
      byKey.set(key, report);
      order.push(key);
    }

    const busu = num(r.dokusya_busu);
    const zenkai = num(r.zenkai_dokusya_busu);
    if (busu > zenkai) report.zoubu.push(toEntry(r));
    else if (busu < zenkai) report.genbu.push(toEntry(r));

    if (nowAddress(r) !== zenAddress(r)) {
      report.address_change.push(
        {
          label: '変更前',
          address: zenAddress(r),
          name: fullName(r),
          delivery_name: deliveryName(r),
          phone: str(r.haitatsu_renrakusaki_1),
          biko: str(r.biko),
        },
        {
          label: '変更後',
          address: nowAddress(r),
          name: fullName(r),
          delivery_name: deliveryName(r),
          phone: str(r.haitatsu_renrakusaki_1),
          biko: str(r.biko),
        },
      );
    }
  }

  return order.map((k) => byKey.get(k) as ZougenReport);
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
    body.push([
      { text: '変更前', bold: true, alignment: 'center', fontSize: 8 },
      cell(before.address),
      { text: before.name, rowSpan: 2, fontSize: 8 },
      { text: before.delivery_name, rowSpan: 2, fontSize: 8 },
      { text: before.phone, rowSpan: 2, fontSize: 8 },
      { text: before.biko, rowSpan: 2, fontSize: 8 },
    ]);
    body.push([
      { text: '変更後', bold: true, alignment: 'center', fontSize: 8 },
      cell(after?.address ?? ''),
      // rowSpan=2 で覆われるセルはプレースホルダ（空オブジェクト）が必須。
      {},
      {},
      {},
      {},
    ]);
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
  index: number,
  total: number,
  tekiyo: string,
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
      { text: `Page：${index + 1}/${total}`, fontSize: 8, alignment: 'right', width: '*' },
    ],
    margin: m(0, 0, 0, 6),
    ...(index > 0 ? { pageBreak: 'before' as const } : {}),
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
 * 販売店＋管理支店の組み合わせごとに1ページ（販売店コード昇順、`reports`
 * の順）。`PdfExportService.generatePdf(...)` に渡す。
 */
export function buildZougenDocDefinition(
  reports: ZougenReport[],
  tekiyo: string,
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: m(40, 36, 40, 36),
    content: reports.flatMap((r, i) => reportContent(r, i, reports.length, tekiyo)),
    defaultStyle: { font: 'IPAexGothic', fontSize: 9 },
  };
}
