import { buildMeiboRawRow } from '@test/fixtures/report.factory';
import { buildZougenRawRow } from '@test/fixtures/report-zougen.factory';
import { buildZougenNichinoRawRow } from '@test/fixtures/report-zougen-nichino.factory';
import {
  buildMeiboDocPages,
  estimateMeiboRowHeightPt,
  groupByHanbaiten,
  groupByKanriShiten,
  type MeiboPreviewData,
  type MeiboRawRow,
} from './report.mapper';
import {
  buildZougenDocDefinition,
  paginateZougenSubscribers,
  type ZougenRawRow,
} from './zougen.mapper';
import {
  buildZougenNichinoDocDefinition,
  paginateNichinoSubscribers,
  type ZougenNichinoRawRow,
} from './zougen-nichino.mapper';

// buildMeiboRawRow returns a loose record; cast to the raw-row shape for the mapper.
const mk = (o: Record<string, unknown> = {}): MeiboRawRow =>
  buildMeiboRawRow(o) as unknown as MeiboRawRow;

const zr = (o: Record<string, unknown> = {}): ZougenRawRow =>
  buildZougenRawRow(o) as unknown as ZougenRawRow;

describe('paginateZougenSubscribers / buildZougenDocDefinition — PDFをプレビューと同じ改ページにする', () => {
  // 20購読者（全て増・同一販売店）→ 15購読者/ページ → 2ページ。
  const rows: ZougenRawRow[] = Array.from({ length: 20 }, (_, i) =>
    zr({ dokusya_id: 9300 + i, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
  );

  it('購読者を perPage 単位で分割する（販売店コード, dokusya_id 昇順＝プレビューと同順）', () => {
    const pages = paginateZougenSubscribers(rows, 15);
    expect(pages).toHaveLength(2);
    // 1ページ目=15購読者・2ページ目=5購読者（同一販売店なので各ページ1帳票に集約）。
    expect(pages[0].reduce((n, r) => n + r.zoubu.length, 0)).toBe(15);
    expect(pages[1].reduce((n, r) => n + r.zoubu.length, 0)).toBe(5);
  });

  it('ページ先頭でのみ改ページし、Page表記は ページ番号/総ページ数', () => {
    const doc = buildZougenDocDefinition(rows, '2026-06-01', 15);
    const json = JSON.stringify(doc.content);
    // 改ページは2ページ目の先頭1回のみ（1ページ目は付けない）。
    expect((json.match(/"pageBreak":"before"/g) ?? []).length).toBe(1);
    // Page表記が両ページ分（総ページ数=2）。
    expect(json).toContain('Page：1/2');
    expect(json).toContain('Page：2/2');
  });

  it('販売店+管理支店(combo)ごとに独立ページ・ページ数は販売店ごとに採番（顧客要件 2026-07）', () => {
    // 販売店A(H001) × 管理支店a(30) / 管理支店b(31)、販売店B(H002) × 管理支店c(32)。
    // → 3 combo = 3ページ。販売店A は 1/2・2/2、販売店B は 1/1。
    // zenkai_hanbaiten_id を hanbaiten_id と一致させ、販売店変更(旧店に減)を発生させない。
    const multi: ZougenRawRow[] = [
      zr({ dokusya_id: 8001, dokusya_busu: 3, zenkai_dokusya_busu: 1, hanbaiten_id: 200, hanbaiten_code: 'H001', zenkai_hanbaiten_id: 200, zenkai_hanbaiten_code: 'H001', kanri_shiten_id: 30 }),
      zr({ dokusya_id: 8002, dokusya_busu: 3, zenkai_dokusya_busu: 1, hanbaiten_id: 200, hanbaiten_code: 'H001', zenkai_hanbaiten_id: 200, zenkai_hanbaiten_code: 'H001', kanri_shiten_id: 31 }),
      zr({ dokusya_id: 8003, dokusya_busu: 3, zenkai_dokusya_busu: 1, hanbaiten_id: 201, hanbaiten_code: 'H002', zenkai_hanbaiten_id: 201, zenkai_hanbaiten_code: 'H002', kanri_shiten_id: 32 }),
    ];
    const pages = paginateZougenSubscribers(multi, 15);
    expect(pages).toHaveLength(3);
    for (const p of pages) expect(p).toHaveLength(1); // 1ページ=1 combo

    // 販売店A の2 combo は同一販売店内で 1/2・2/2。
    expect(pages[0][0].hanbaiten_code).toBe('H001');
    expect(pages[0][0].kanri_shiten_id).toBe(30);
    expect(pages[0][0].group_page_no).toBe(1);
    expect(pages[0][0].group_total_pages).toBe(2);
    expect(pages[1][0].hanbaiten_code).toBe('H001');
    expect(pages[1][0].kanri_shiten_id).toBe(31);
    expect(pages[1][0].group_page_no).toBe(2);
    expect(pages[1][0].group_total_pages).toBe(2);
    expect(pages[1][0].is_continued).toBe(true);
    // 販売店B は独立販売店なので 1/1。
    expect(pages[2][0].hanbaiten_code).toBe('H002');
    expect(pages[2][0].group_page_no).toBe(1);
    expect(pages[2][0].group_total_pages).toBe(1);
  });

  it('空配列なら content も空（0件はPDFを生成しない前提）', () => {
    expect(paginateZougenSubscribers([], 15)).toEqual([]);
    expect(buildZougenDocDefinition([], '2026-06-01', 15).content).toEqual([]);
  });

  it('発行日時を渡すと全ページのフッタ右寄せに「発行日時：…」を印字する', () => {
    const doc = buildZougenDocDefinition(rows, '2026-06-01', 15, '2026/06/25 10:58') as any;
    expect(typeof doc.footer).toBe('function');
    const footer = doc.footer(1, 2);
    expect(footer.text).toBe('発行日時：2026/06/25 10:58');
    expect(footer.alignment).toBe('right');
  });

  it('発行日時が空ならフッタを設定しない', () => {
    const doc = buildZougenDocDefinition(rows, '2026-06-01', 15) as any;
    expect(doc.footer).toBeUndefined();
  });
});

describe('paginateNichinoSubscribers / buildZougenNichinoDocDefinition — PDFをプレビューと同じ改ページに', () => {
  const nr = (o: Record<string, unknown> = {}): ZougenNichinoRawRow =>
    buildZougenNichinoRawRow(o) as unknown as ZougenNichinoRawRow;

  // 20購読者（全て増・同一管理支店/販売店）→ 15行/ページ → 2ページ。
  const rows: ZougenNichinoRawRow[] = Array.from({ length: 20 }, (_, i) =>
    nr({ dokusya_id: 9300 + i, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
  );

  it('購読者を perPage 単位で分割する（管理支店コード, 販売店コード, dokusya_id 昇順）', () => {
    const pages = paginateNichinoSubscribers(rows, 15);
    expect(pages).toHaveLength(2);
    // 各ページ＝1管理支店に集約。明細行（販売店行）は 15 / 5。
    expect(pages[0].reduce((n, r) => n + r.rows.length, 0)).toBe(15);
    expect(pages[1].reduce((n, r) => n + r.rows.length, 0)).toBe(5);
  });

  it('ページ先頭でのみ改ページし、ページ数表記は ページ番号/総ページ数', () => {
    const doc = buildZougenNichinoDocDefinition(rows, '2026-03-01', new Map(), 15);
    const json = JSON.stringify(doc.content);
    expect((json.match(/"pageBreak":"before"/g) ?? []).length).toBe(1);
    expect(json).toContain('ページ数：1/2');
    expect(json).toContain('ページ数：2/2');
  });

  it('管理支店ごとの＜備考＞を bikoByKs から差し込む', () => {
    const doc = buildZougenNichinoDocDefinition(rows, '2026-03-01', new Map([[20, 'テスト備考']]), 15);
    expect(JSON.stringify(doc.content)).toContain('テスト備考');
  });

  it('管理支店ごとに独立ページ：perPage に収まっても別管理支店とは同居しない（顧客要件 2026-07）', () => {
    // 管理支店20=3件 / 21=2件。旧仕様は 15行/ページで両者を1ページに同居させたが、
    // グループ単位ページングでは管理支店ごとに別ページ（計2ページ・各1管理支店）。
    const multi: ZougenNichinoRawRow[] = [
      ...Array.from({ length: 3 }, (_, i) =>
        nr({ dokusya_id: 8100 + i, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        nr({ dokusya_id: 8200 + i, kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ),
    ];
    const pages = paginateNichinoSubscribers(multi, 15);
    expect(pages).toHaveLength(2); // 5件でも1ページに詰めない
    for (const p of pages) expect(p).toHaveLength(1); // 各ページ=1管理支店
    expect(pages[0][0].kanri_shiten_code).toBe('1AA3300001');
    expect(pages[1][0].kanri_shiten_code).toBe('1AA3300002');
    // 各グループが1ページに収まる → group_page_no/total は 1/1。
    expect(pages[0][0].group_page_no).toBe(1);
    expect(pages[0][0].group_total_pages).toBe(1);
  });

  it('大きい管理支店は自グループ内で複数ページに続き、per-group 採番になる', () => {
    // 20件・同一管理支店 → 15+5 の2ページ、group_page_no 1/2・2/2。
    const pages = paginateNichinoSubscribers(rows, 15);
    expect(pages).toHaveLength(2);
    expect(pages[0][0].group_page_no).toBe(1);
    expect(pages[0][0].group_total_pages).toBe(2);
    expect(pages[1][0].group_page_no).toBe(2);
    expect(pages[1][0].group_total_pages).toBe(2);
  });

  it('空配列なら content も空（0件はPDFを生成しない前提）', () => {
    expect(paginateNichinoSubscribers([], 15)).toEqual([]);
    expect(buildZougenNichinoDocDefinition([], '2026-03-01', new Map(), 15).content).toEqual([]);
  });
});

describe('estimateMeiboRowHeightPt — A4 高さ見積り', () => {
  it('折返しの多いセルほど高くなり、最低高で下限を保証する', () => {
    const widths = [9, 24, 32, 16, 18, 14, 11];
    const short = estimateMeiboRowHeightPt(['□', 'ア', '東京', 'X', '0', '', '1'], widths, 44);
    const long = estimateMeiboRowHeightPt(
      ['□', '氏名\nかな', '〒100-0001\n' + '東京都千代田区千代田町一丁目'.repeat(4), 'Y', '0', '', '1'],
      widths,
      44,
    );
    expect(short).toBe(44); // 全セル1行 → 最低高 44pt に丸められる
    expect(long).toBeGreaterThan(short); // 折返しで高くなる
  });
});

describe('buildMeiboDocPages — 動的ページング（A4 高さ基準・グループ独立）', () => {
  // 全件グループ済みデータを組み立ててから分割する（production の buildPreview と同じく
  // groupByHanbaiten / groupByKanriShiten でグループ化）。
  const full = (
    type: 'hanbaiten' | 'kanri_shiten',
    rows: MeiboRawRow[],
  ): MeiboPreviewData => {
    const jaName = rows[0]?.ja_name ?? '';
    const jaTel = rows[0]?.ja_tel ?? '';
    if (type === 'hanbaiten') {
      const { hanbaiten_groups, grand_total_busu } = groupByHanbaiten(rows);
      return {
        report_type: 'hanbaiten',
        tekiyo_date: '2026-06-01',
        ja_name: jaName,
        ja_tel: jaTel,
        grand_total_busu,
        hanbaiten_groups,
        kanri_shiten_groups: [],
      };
    }
    const { kanri_shiten_groups, grand_total_busu } = groupByKanriShiten(rows);
    return {
      report_type: 'kanri_shiten',
      tekiyo_date: '2026-06-01',
      ja_name: jaName,
      ja_tel: jaTel,
      grand_total_busu,
      hanbaiten_groups: [],
      kanri_shiten_groups,
    };
  };

  it('販売店(hanbaiten)は各グループを独立ページに割り、大きいグループのみ複数ページに分ける', () => {
    const rows = [
      ...Array.from({ length: 2 }, (_, i) =>
        mk({ dokusya_id: 1000 + i, hanbaiten_id: 1, kanri_shiten_id: 10, dokusya_busu: 1 }),
      ),
      ...Array.from({ length: 40 }, (_, i) =>
        mk({ dokusya_id: 2000 + i, hanbaiten_id: 2, kanri_shiten_id: 10, dokusya_busu: 1 }),
      ),
      mk({ dokusya_id: 3000, hanbaiten_id: 3, kanri_shiten_id: 10, dokusya_busu: 1 }),
    ];
    const pages = buildMeiboDocPages(full('hanbaiten', rows));

    // どのページも単一の販売店グループ（他店と混ざらない）。
    for (const p of pages) {
      expect(p.hanbaiten_groups).toHaveLength(1);
      expect(p.kanri_shiten_groups).toEqual([]);
    }
    const idOf = (p: (typeof pages)[number]) => p.hanbaiten_groups[0].hanbaiten_id;
    expect(pages.filter((p) => idOf(p) === 1)).toHaveLength(1); // A(2件)=1ページ
    expect(pages.filter((p) => idOf(p) === 2).length).toBeGreaterThan(1); // B(40件)=複数
    expect(pages.filter((p) => idOf(p) === 3)).toHaveLength(1); // C(1件)=1ページ
    // B の各ページ: group_page_no は 1..N、is_continued は先頭以外 true、
    // show_total は最終ページのみ true、小計は常にグループ全体(=40)。
    const bPages = pages.filter((p) => idOf(p) === 2);
    bPages.forEach((p, i) => {
      const g = p.hanbaiten_groups[0];
      expect(p.group_page_no).toBe(i + 1);
      expect(p.group_total_pages).toBe(bPages.length);
      expect(g.is_continued).toBe(i > 0);
      expect(g.show_total).toBe(i === bPages.length - 1);
      expect(g.total_busu).toBe(40);
    });
    // B の全ページ明細を連結すると 40件。
    const bRows = bPages.flatMap((p) =>
      p.hanbaiten_groups[0].kanri_shiten_groups.flatMap((s) => s.rows),
    );
    expect(bRows).toHaveLength(40);
  });

  it('管理支店(kanri_shiten)も同様にグループ独立・高さ基準で分割する', () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      mk({ dokusya_id: 4000 + i, kanri_shiten_id: 10, dokusya_busu: 1 }),
    );
    const pages = buildMeiboDocPages(full('kanri_shiten', rows));

    expect(pages.length).toBeGreaterThan(1); // 30件は1ページに収まらない
    for (const p of pages) {
      expect(p.kanri_shiten_groups).toHaveLength(1);
      expect(p.hanbaiten_groups).toEqual([]);
    }
    pages.forEach((p, i) => {
      const g = p.kanri_shiten_groups[0];
      expect(p.group_page_no).toBe(i + 1);
      expect(p.group_total_pages).toBe(pages.length);
      expect(g.is_continued).toBe(i > 0);
      expect(g.show_subtotal).toBe(i === pages.length - 1);
      expect(g.subtotal_busu).toBe(30); // 小計は常にグループ全体
    });
    const allRows = pages.flatMap((p) => p.kanri_shiten_groups[0].rows);
    expect(allRows).toHaveLength(30);
  });

  it('0件なら空配列（ページを生成しない）', () => {
    expect(buildMeiboDocPages(full('hanbaiten', []))).toEqual([]);
    expect(buildMeiboDocPages(full('kanri_shiten', []))).toEqual([]);
  });
});
