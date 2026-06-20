// Pure response-shaping for the 増減通知（日本農業新聞）report (ACSMS-SCR-029).
// No Nest DI / repo / service — only flat-row → grouped-DTO transforms +
// pdfmake document definition, importable from anywhere (service + unit tests).

import type { Margins, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

import { ItakuKubun } from '@/common/enums';

/** Flat row returned by the 増減通知 QueryBuilder `.getRawMany()` (api.md §4.5). */
export interface ZougenNichinoRawRow {
  dokusya_rireki_id: number | string;
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  itaku_kubun: number | string;
  /** 適格請求書発行事業者番号。空文字なら免税販売店 → 「（免）」を付与。 */
  torihikisaki_no: string | null;
  kanri_shiten_id: number | string;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_tel: string | null;
  kanri_shiten_fax: string | null;
  todofuken_name: string | null;
  ja_name: string;
  tanto_busho: string | null;
  tanto_name: string | null;
  // 部数（増減判定）
  dokusya_busu: number | string;
  zenkai_dokusya_busu: number | string | null;
}

// ─── response row shapes (api.md §レスポンスデータ) ─────────────────────
export interface ZougenNichinoReportRow {
  hanbaiten_id: number;
  itaku_label: string; // 「委託」 or ""
  hanbaiten_code: string;
  hanbaiten_name: string;
  genzai_busu: number;
  zou_busu: number;
  gen_busu: number;
  shin_busu: number;
  diff_mark: boolean;
}

export interface ZougenNichinoTotal {
  genzai_busu: number;
  zou_busu: number;
  gen_busu: number;
  shin_busu: number;
}

export interface ZougenNichinoReport {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  ja_name: string;
  todofuken_name: string;
  tanto_busho: string;
  tanto_name: string;
  tel: string;
  fax: string;
  rows: ZougenNichinoReportRow[];
  total: ZougenNichinoTotal;
}

export interface ZougenNichinoPreviewData {
  tekiyo_date: string;
  reports: ZougenNichinoReport[];
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0);
const str = (v: string | null | undefined): string => v ?? '';

/** 委託欄：日農委託(itaku_kubun=2) のみ「委託」、振込/その他は空文字。 */
function itakuLabel(itakuKubun: number): string {
  return itakuKubun === ItakuKubun.NICHINO_ITAKU ? '委託' : '';
}

/** 免税販売店（torihikisaki_no が空）は販売店名の先頭に「（免）」を付与。 */
function hanbaitenDisplayName(name: string, torihikisakiNo: string | null): string {
  return str(torihikisakiNo).trim() === '' ? `（免）${str(name)}` : str(name);
}

/** 管理支店コード10桁を 3-4-3 のハイフン区切りに整形（例: 1AA3300001 → 1AA-3300-001）。 */
export function formatKanriShitenCode(code: string): string {
  const c = str(code);
  return /^.{10}$/.test(c) ? `${c.slice(0, 3)}-${c.slice(3, 7)}-${c.slice(7)}` : c;
}

/**
 * Group the flat rows by 管理支店ID (rows arrive already ordered by
 * 管理支店コード昇順, 販売店コード昇順). Each group = 1 帳票. Per-row 部数は
 * 現在部数=COALESCE(zenkai,0) / 増部数 / 減部数 / 新部数=dokusya_busu を算出する
 * （api.md §4.6）。`diff_mark` は前回出力履歴が無い前提で常に false（履歴比較は
 * 後続SCRで実装）。
 */
export function groupZougenNichinoReports(
  rows: ZougenNichinoRawRow[],
): ZougenNichinoReport[] {
  const order: number[] = [];
  const byKs = new Map<number, ZougenNichinoReport>();

  for (const r of rows) {
    const ksId = num(r.kanri_shiten_id);
    let report = byKs.get(ksId);
    if (!report) {
      report = {
        kanri_shiten_id: ksId,
        kanri_shiten_code: str(r.kanri_shiten_code),
        kanri_shiten_name: str(r.kanri_shiten_name),
        ja_name: str(r.ja_name),
        todofuken_name: str(r.todofuken_name),
        tanto_busho: str(r.tanto_busho),
        tanto_name: str(r.tanto_name),
        tel: str(r.kanri_shiten_tel),
        fax: str(r.kanri_shiten_fax),
        rows: [],
        total: { genzai_busu: 0, zou_busu: 0, gen_busu: 0, shin_busu: 0 },
      };
      byKs.set(ksId, report);
      order.push(ksId);
    }

    const genzai = num(r.zenkai_dokusya_busu); // COALESCE(zenkai, 0)
    const shin = num(r.dokusya_busu);
    const zou = shin > genzai ? shin - genzai : 0;
    const gen = shin < genzai ? genzai - shin : 0;

    report.rows.push({
      hanbaiten_id: num(r.hanbaiten_id),
      itaku_label: itakuLabel(num(r.itaku_kubun)),
      hanbaiten_code: str(r.hanbaiten_code),
      hanbaiten_name: hanbaitenDisplayName(r.hanbaiten_name, r.torihikisaki_no),
      genzai_busu: genzai,
      zou_busu: zou,
      gen_busu: gen,
      shin_busu: shin,
      diff_mark: false,
    });

    report.total.genzai_busu += genzai;
    report.total.zou_busu += zou;
    report.total.gen_busu += gen;
    report.total.shin_busu += shin;
  }

  return order.map((k) => byKs.get(k) as ZougenNichinoReport);
}

// ─── PDF (pdfmake) document definition — ACSMS-SCR-029 §4.4 帳票レイアウト ──
// 管理支店ごとに1枚。発行元（日農）ヘッダ + タイトル + 見出し（適用日/都道府県/
// 組合名/担当）+ 明細テーブル（委託/販売店コード/販売店名/現在/増/減/新）+
// 合計行 + ＜備考＞欄。減部数は「▲」、差異マークは「◆」を付与する。

const HEADER_FILL = '#f1f5f9';
const BORDER_COLOR = '#94a3b8';
const COL_WIDTHS = ['8%', '18%', '34%', '10%', '10%', '10%', '10%'];

const mg = (a: number, b: number, c: number, d: number): Margins => [a, b, c, d];

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

/** 適用日 YYYY-MM-DD → 「YYYY年M月D日より」。 */
function jpDateYori(iso: string): string {
  const [y, mo, d] = str(iso).split('-');
  return y && mo && d ? `${y}年${Number(mo)}月${Number(d)}日より` : str(iso);
}

function hd(text: string): TableCell {
  return { text, bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 8 };
}
function cell(text: string, align: 'left' | 'center' | 'right' = 'left'): TableCell {
  return { text: text ?? '', alignment: align, fontSize: 8 };
}

/** 減部数は「▲」付き、差異マーク行は「◆」を付与した表示文字列を返す。 */
function genDisplay(gen: number): string {
  return gen > 0 ? `▲${gen}` : '0';
}

function detailTable(report: ZougenNichinoReport): TableCell[][] {
  const header: TableCell[] = [
    hd('委託'),
    hd('販売店コード'),
    hd('販売店名'),
    hd('現在部数'),
    hd('増部数'),
    hd('減部数'),
    hd('新部数'),
  ];
  const body: TableCell[][] = [header];
  for (const row of report.rows) {
    const mark = row.diff_mark ? '◆' : '';
    body.push([
      cell(row.itaku_label, 'center'),
      cell(row.hanbaiten_code),
      cell(`${mark}${row.hanbaiten_name}`),
      cell(String(row.genzai_busu), 'right'),
      cell(String(row.zou_busu), 'right'),
      cell(genDisplay(row.gen_busu), 'right'),
      cell(String(row.shin_busu), 'right'),
    ]);
  }
  // 合計行
  body.push([
    { text: '合計', colSpan: 3, bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 8 },
    {},
    {},
    { text: String(report.total.genzai_busu), bold: true, alignment: 'right', fontSize: 8 },
    { text: String(report.total.zou_busu), bold: true, alignment: 'right', fontSize: 8 },
    { text: genDisplay(report.total.gen_busu), bold: true, alignment: 'right', fontSize: 8 },
    { text: String(report.total.shin_busu), bold: true, alignment: 'right', fontSize: 8 },
  ]);
  return body;
}

/**
 * Build the pdfmake document definition for ONE 管理支店's 増減通知 PDF.
 * `biko` is the per-管理支店 remark printed in the 「＜備考＞」欄.
 * `PdfExportService.generatePdf(...)` に渡す。
 */
/** 単一ページ既定（複数ページ出力時のみ呼び出し側が上書きする）。 */
const DEFAULT_PAGE_INFO = { index: 0, total: 1 };

export function buildZougenNichinoDocDefinition(
  report: ZougenNichinoReport,
  tekiyo: string,
  biko: string,
  pageInfo: { index: number; total: number } = DEFAULT_PAGE_INFO,
): TDocumentDefinitions {
  const kumiaiName = `${formatKanriShitenCode(report.kanri_shiten_code)}: ${report.ja_name}　${report.kanri_shiten_name}`;
  return {
    pageSize: 'A4',
    pageMargins: mg(40, 36, 40, 40),
    content: [
      {
        columns: [
          {
            width: '*',
            fontSize: 8,
            stack: [
              '日本農業新聞社 業務管理部',
              'TEL：03-6281-5800',
              'FAX：03-3225-6936',
            ],
          },
          {
            width: 'auto',
            text: '日本農業新聞増減通知',
            bold: true,
            fontSize: 16,
            alignment: 'center',
          },
          {
            width: '*',
            fontSize: 8,
            alignment: 'right',
            text: `Page：${pageInfo.index + 1}/${pageInfo.total}`,
          },
        ],
        margin: mg(0, 0, 0, 8),
      },
      {
        fontSize: 9,
        margin: mg(0, 0, 0, 8),
        stack: [
          `適用日：${jpDateYori(tekiyo)}`,
          `都道府県名：${report.todofuken_name}`,
          `組合名：${kumiaiName}`,
          `担当部署：${report.tanto_busho}　担当者：${report.tanto_name}`,
          `TEL：${report.tel || '-'}　FAX：${report.fax || '-'}`,
        ],
      },
      {
        table: { headerRows: 1, widths: COL_WIDTHS, body: detailTable(report) },
        layout: tableLayout,
      },
      {
        text: `＜備考＞ ${biko}`,
        fontSize: 9,
        margin: mg(0, 10, 0, 0),
      },
    ],
    defaultStyle: { font: 'IPAexGothic', fontSize: 9 },
  };
}
