// Pure response-shaping for the 増減通知（日本農業新聞）report (ACSMS-SCR-029).
// No Nest DI / repo / service — only flat-row → grouped-DTO transforms +
// pdfmake document definition, importable from anywhere (service + unit tests).

import type {
  Content,
  Margins,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import { ItakuKubun } from '@/common/enums';

/** Flat row returned by the 増減通知 QueryBuilder `.getRawMany()` (api.md §4.5). */
export interface ZougenNichinoRawRow {
  dokusya_rireki_id: number | string;
  // 同一購読者の同日複数履歴を累計するキー（dokusya_id, rireki_no昇順）。
  dokusya_id: number | string;
  hanbaiten_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  itaku_kubun: number | string;
  /** 適格請求書発行事業者番号。空文字なら免税販売店 → 「（免）」を付与。 */
  torihikisaki_no: string | null;
  // 前回販売店（販売店変更の旧店表示・減/増判定用。初回履歴は NULL）。
  zenkai_hanbaiten_id: number | string | null;
  zenkai_hanbaiten_code: string | null;
  zenkai_hanbaiten_name: string | null;
  zenkai_itaku_kubun: number | string | null;
  zenkai_torihikisaki_no: string | null;
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
  /** ページ送りメタ（preview のみ。export PDF は全件で未設定）。 */
  page_no?: number;
  per_page?: number;
  total_pages?: number;
  /** 対象購読者数（COUNT(DISTINCT dokusya_id)。ページングの単位）。 */
  total_rows?: number;
  is_last_page?: boolean;
}

/**
 * preview の既定ページ件数。SCR-028 と同じく SQLページングは **購読者(dokusya_id)
 * 単位**のため、これは「1ページの販売店行数（≒購読者数。大半1行/購読者）」。15。
 * ページングは report.service 側で SQL OFFSET/LIMIT により行う。
 */
export const ZOUGEN_NICHINO_PER_PAGE = 15;

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

interface NichinoRowInput {
  hanbaitenId: number | string;
  hanbaitenCode: string | null;
  hanbaitenName: string | null;
  itakuKubun: number | string | null;
  torihikisakiNo: string | null;
  genzai: number;
  zou: number;
  gen: number;
  shin: number;
}

/** 1購読者の同日履歴（first→last）を累計し、該当販売店の行を生成する。 */
function classifyNichino(
  records: ZougenNichinoRawRow[],
  addRow: (sample: ZougenNichinoRawRow, input: NichinoRowInput) => void,
): void {
  const first = records[0];
  const last = records.at(-1) as ZougenNichinoRawRow;

  const busuBefore = num(first.zenkai_dokusya_busu);
  const busuAfter = num(last.dokusya_busu);
  const storeBefore = first.zenkai_hanbaiten_id == null ? null : num(first.zenkai_hanbaiten_id);
  const storeAfter = num(last.hanbaiten_id);

  if (storeBefore != null && storeBefore !== storeAfter) {
    // 販売店変更: 旧店 減 busuBefore / 新店 増 busuAfter。
    addRow(last, {
      hanbaitenId: first.zenkai_hanbaiten_id as number,
      hanbaitenCode: first.zenkai_hanbaiten_code,
      hanbaitenName: first.zenkai_hanbaiten_name,
      itakuKubun: first.zenkai_itaku_kubun,
      torihikisakiNo: first.zenkai_torihikisaki_no,
      genzai: busuBefore,
      zou: 0,
      gen: busuBefore,
      shin: 0,
    });
    addRow(last, {
      hanbaitenId: last.hanbaiten_id,
      hanbaitenCode: last.hanbaiten_code,
      hanbaitenName: last.hanbaiten_name,
      itakuKubun: last.itaku_kubun,
      torihikisakiNo: last.torihikisaki_no,
      genzai: 0,
      zou: busuAfter,
      gen: 0,
      shin: busuAfter,
    });
    return;
  }

  // 同一販売店: 現在部数=busuBefore / 新部数=busuAfter / net で増減（解約 …→0 含む）。
  addRow(last, {
    hanbaitenId: last.hanbaiten_id,
    hanbaitenCode: last.hanbaiten_code,
    hanbaitenName: last.hanbaiten_name,
    itakuKubun: last.itaku_kubun,
    torihikisakiNo: last.torihikisaki_no,
    genzai: busuBefore,
    zou: busuAfter > busuBefore ? busuAfter - busuBefore : 0,
    gen: busuAfter < busuBefore ? busuBefore - busuAfter : 0,
    shin: busuAfter,
  });
}

/**
 * 管理支店ID 単位で 1 帳票。各購読者(dokusya_id)の同日複数履歴を**累計**してから
 * 現在部数 / 増部数 / 減部数 / 新部数 を算出する（SCR-028 と同方針。抽出は
 * `joho_henko_tekiyo_date = :tekiyo_date`）。
 *   - 日初の前回値 = 現在部数(busuBefore)、日末の現在値 = 新部数(busuAfter)。
 *   - 同一販売店: net で増/減。解約 …→0 は減。
 *   - 販売店変更: 旧店に 減 busuBefore（現在 busuBefore/新 0）、新店に 増 busuAfter
 *     （現在 0/新 busuAfter）。旧店の管理支店は履歴に無いため当日最終レコードの
 *     管理支店に計上する（暫定。SCR-028 と同じ前提）。
 * rows は dokusya_id, rireki_no 昇順で届く前提。`diff_mark` は常に false。
 */
export function groupZougenNichinoReports(
  rows: ZougenNichinoRawRow[],
): ZougenNichinoReport[] {
  // 1) 購読者ごとに同日履歴をまとめる。
  const byDokusya = new Map<string, ZougenNichinoRawRow[]>();
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

  // 2) 管理支店ごとの帳票キャッシュ + 行追加ヘルパ。
  const order: number[] = [];
  const byKs = new Map<number, ZougenNichinoReport>();
  const addRow = (sample: ZougenNichinoRawRow, input: NichinoRowInput): void => {
    const ksId = num(sample.kanri_shiten_id);
    let report = byKs.get(ksId);
    if (!report) {
      report = {
        kanri_shiten_id: ksId,
        kanri_shiten_code: str(sample.kanri_shiten_code),
        kanri_shiten_name: str(sample.kanri_shiten_name),
        ja_name: str(sample.ja_name),
        todofuken_name: str(sample.todofuken_name),
        tanto_busho: str(sample.tanto_busho),
        tanto_name: str(sample.tanto_name),
        tel: str(sample.kanri_shiten_tel),
        fax: str(sample.kanri_shiten_fax),
        rows: [],
        total: { genzai_busu: 0, zou_busu: 0, gen_busu: 0, shin_busu: 0 },
      };
      byKs.set(ksId, report);
      order.push(ksId);
    }
    report.rows.push({
      hanbaiten_id: num(input.hanbaitenId),
      itaku_label: itakuLabel(num(input.itakuKubun)),
      hanbaiten_code: str(input.hanbaitenCode),
      hanbaiten_name: hanbaitenDisplayName(str(input.hanbaitenName), input.torihikisakiNo),
      genzai_busu: input.genzai,
      zou_busu: input.zou,
      gen_busu: input.gen,
      shin_busu: input.shin,
      diff_mark: false,
    });
    report.total.genzai_busu += input.genzai;
    report.total.zou_busu += input.zou;
    report.total.gen_busu += input.gen;
    report.total.shin_busu += input.shin;
  };

  for (const id of dokusyaOrder) {
    classifyNichino(byDokusya.get(id)!, addRow);
  }

  // 3) 出力は 管理支店コード昇順、行内は販売店コード昇順（SQLは dokusya_id 順）。
  const reports = order.map((k) => byKs.get(k) as ZougenNichinoReport);
  reports.sort((a, b) => a.kanri_shiten_code.localeCompare(b.kanri_shiten_code));
  for (const rep of reports) {
    rep.rows.sort((a, b) => a.hanbaiten_code.localeCompare(b.hanbaiten_code));
  }
  return reports;
}

/**
 * 全件 rows を **preview と同じ「1ページ=perPage 購読者」単位**でページに分割する
 * （PDF出力をプレビューと同じ改ページにするため。SCR-028 と同方針）。
 *
 * 購読者の並びは preview の SQL（`ORDER BY MIN(ks.kanri_shiten_code),
 * MIN(h.hanbaiten_code), r.dokusya_id`）と一致させる：① 購読者ごとに（管理支店コード,
 * 販売店コード）の最小値を算出 → ②昇順で整列 → ③perPage ずつに分割 → ④各チャンクの
 * 行を groupZougenNichinoReports で管理支店ブロックに集約。これで PDF の n ページ目 =
 * preview の n ページ目になる。合計は各ページの行から算出する（管理支店がページを
 * またぐ場合はページ内合計）。
 */
export function paginateNichinoSubscribers(
  rows: ZougenNichinoRawRow[],
  perPage: number,
): ZougenNichinoReport[][] {
  const size = perPage > 0 ? perPage : ZOUGEN_NICHINO_PER_PAGE;

  const byDok = new Map<number, ZougenNichinoRawRow[]>();
  for (const r of rows) {
    const id = num(r.dokusya_id);
    const g = byDok.get(id);
    if (g) g.push(r);
    else byDok.set(id, [r]);
  }

  const subs = [...byDok.entries()].map(([id, rs]) => {
    const ksCodes = rs.map((r) => str(r.kanri_shiten_code)).filter((c) => c !== '');
    const hCodes = rs.map((r) => str(r.hanbaiten_code)).filter((c) => c !== '');
    return {
      id,
      ksCode: [...ksCodes].sort((a, b) => a.localeCompare(b))[0] ?? '',
      hCode: [...hCodes].sort((a, b) => a.localeCompare(b))[0] ?? '',
    };
  });
  subs.sort(
    (a, b) =>
      a.ksCode.localeCompare(b.ksCode) ||
      a.hCode.localeCompare(b.hCode) ||
      a.id - b.id,
  );

  const pages: ZougenNichinoReport[][] = [];
  for (let i = 0; i < subs.length; i += size) {
    const ids = new Set(subs.slice(i, i + size).map((s) => s.id));
    const chunkRows = rows.filter((r) => ids.has(num(r.dokusya_id)));
    pages.push(groupZougenNichinoReports(chunkRows));
  }
  return pages;
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
/** 1管理支店ブロック（発行元ヘッダ + 見出し + 明細テーブル + ＜備考＞）。 */
function nichinoReportBlock(
  report: ZougenNichinoReport,
  tekiyo: string,
  biko: string,
  pageNo: number,
  totalPages: number,
  pageBreakBefore: boolean,
): Content[] {
  const kumiaiName = `${formatKanriShitenCode(report.kanri_shiten_code)}: ${report.ja_name}　${report.kanri_shiten_name}`;
  return [
    {
      columns: [
        {
          width: '*',
          fontSize: 8,
          stack: ['日本農業新聞社 業務管理部', 'TEL：03-6281-5800', 'FAX：03-3225-6936'],
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
          text: `Page：${pageNo}/${totalPages}`,
        },
      ],
      margin: mg(0, 0, 0, 8),
      ...(pageBreakBefore ? { pageBreak: 'before' as const } : {}),
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
      margin: mg(0, 10, 0, 20),
    },
  ];
}

/**
 * Build the pdfmake document definition for the 増減通知 PDF — **プレビューと同じ
 * 改ページ**：全件 rows を `perPage`（既定15）購読者単位でページに分割（販売店行が
 * 1ページに収まる目安。SCR-028 と同方針）。各ページ先頭で改ページし、同一ページ内の
 * 複数管理支店ブロックは続けて積む。`bikoByKs` は管理支店IDごとの「＜備考＞」欄。
 * Page表記は ページ番号/総ページ数。PDF の n ページ目 = preview の n ページ目。
 * `PdfExportService.generatePdf(...)` に渡す。
 */
export function buildZougenNichinoDocDefinition(
  rows: ZougenNichinoRawRow[],
  tekiyo: string,
  bikoByKs: Map<number, string>,
  perPage: number = ZOUGEN_NICHINO_PER_PAGE,
): TDocumentDefinitions {
  const pages = paginateNichinoSubscribers(rows, perPage);
  return {
    pageSize: 'A4',
    pageMargins: mg(40, 36, 40, 40),
    content: pages.flatMap((pageReports, pi) =>
      pageReports.flatMap((report, ri) =>
        nichinoReportBlock(
          report,
          tekiyo,
          bikoByKs.get(report.kanri_shiten_id) ?? '',
          pi + 1,
          pages.length,
          pi > 0 && ri === 0,
        ),
      ),
    ),
    defaultStyle: { font: 'IPAexGothic', fontSize: 9 },
  };
}
