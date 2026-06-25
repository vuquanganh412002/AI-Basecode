import { buildMeiboRawRow } from '@test/fixtures/report.factory';
import { buildZougenRawRow } from '@test/fixtures/report-zougen.factory';
import { buildZougenNichinoRawRow } from '@test/fixtures/report-zougen-nichino.factory';
import { buildMeiboPreview, type MeiboRawRow } from './report.mapper';
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

describe('buildMeiboPreview — fallback (ウィンドウ集計列なし)', () => {
  it('treats the given rows as a single page (legacy / unit path)', () => {
    const rows = [
      mk({ dokusya_id: 1, hanbaiten_id: 1, kanri_shiten_id: 10, dokusya_busu: 2 }),
      mk({ dokusya_id: 2, hanbaiten_id: 1, kanri_shiten_id: 10, dokusya_busu: 1 }),
    ];
    const out = buildMeiboPreview('hanbaiten', '2026-06-01', rows, 1, 50);

    expect(out.total_rows).toBe(2);
    expect(out.total_pages).toBe(1);
    expect(out.page_no).toBe(1);
    expect(out.is_last_page).toBe(true);
    expect(out.grand_total_busu).toBe(3);
    expect(out.hanbaiten_groups[0].total_busu).toBe(3);
    // フラグはウィンドウ列が無いので未設定（FE は !== false で「表示」扱い）
    expect(out.hanbaiten_groups[0].is_continued).toBeUndefined();
    expect(out.hanbaiten_groups[0].show_total).toBeUndefined();
  });

  it('handles zero rows (empty preview, single page)', () => {
    const out = buildMeiboPreview('hanbaiten', '2026-06-01', [], 1, 50);
    expect(out.total_rows).toBe(0);
    expect(out.total_pages).toBe(1);
    expect(out.is_last_page).toBe(true);
    expect(out.hanbaiten_groups).toHaveLength(0);
  });
});

describe('buildMeiboPreview — SQLページング (ウィンドウ集計列あり, hanbaiten)', () => {
  // 販売店1・管理支店10 に全5件。各行に全件ウィンドウ集計を付与。
  const winRow = (rn: number): MeiboRawRow =>
    mk({
      dokusya_id: 100 + rn,
      hanbaiten_id: 1,
      hanbaiten_name: '販売店A',
      kanri_shiten_id: 10,
      kanri_shiten_name: '支所A',
      dokusya_busu: 1,
      _total_rows: 5,
      _grand_busu: 5,
      _hg_busu: 5,
      _hg_rn: rn,
      _hg_count: 5,
      _sg_busu: 5,
      _sg_rn: rn,
      _sg_count: 5,
    });

  it('page 2/3: continuation flagged, subtotal hidden, totals from window aggregates', () => {
    const out = buildMeiboPreview('hanbaiten', '2026-06-01', [winRow(3), winRow(4)], 2, 2);

    expect(out.total_rows).toBe(5);
    expect(out.total_pages).toBe(3);
    expect(out.page_no).toBe(2);
    expect(out.is_last_page).toBe(false);
    expect(out.grand_total_busu).toBe(5);

    const hg = out.hanbaiten_groups[0];
    expect(hg.total_busu).toBe(5); // 全件値（ページ分の2ではない）
    expect(hg.is_continued).toBe(true); // _hg_rn 3 > 1
    expect(hg.show_total).toBe(false); // 最終行(rn5)はこのページにない

    const sg = hg.kanri_shiten_groups[0];
    expect(sg.rows).toHaveLength(2);
    expect(sg.subtotal_busu).toBe(5);
    expect(sg.is_continued).toBe(true);
    expect(sg.show_subtotal).toBe(false);
  });

  it('last page 3/3: group ends → subtotal/total shown, is_last_page', () => {
    const out = buildMeiboPreview('hanbaiten', '2026-06-01', [winRow(5)], 3, 2);

    expect(out.page_no).toBe(3);
    expect(out.is_last_page).toBe(true);
    const hg = out.hanbaiten_groups[0];
    expect(hg.show_total).toBe(true); // _hg_rn 5 == _hg_count 5
    expect(hg.kanri_shiten_groups[0].show_subtotal).toBe(true);
  });
});

describe('buildMeiboPreview — SQLページング (ウィンドウ集計列あり, kanri_shiten)', () => {
  const winRow = (rn: number): MeiboRawRow =>
    mk({
      dokusya_id: 200 + rn,
      kanri_shiten_id: 10,
      kanri_shiten_name: '支所A',
      dokusya_busu: 1,
      _total_rows: 3,
      _grand_busu: 3,
      _kg_busu: 3,
      _kg_rn: rn,
      _kg_count: 3,
    });

  it('flags 継続/小計 across pages and keeps full subtotal', () => {
    const p1 = buildMeiboPreview('kanri_shiten', '2026-06-01', [winRow(1), winRow(2)], 1, 2);
    expect(p1.total_pages).toBe(2);
    expect(p1.kanri_shiten_groups[0].is_continued).toBe(false);
    expect(p1.kanri_shiten_groups[0].show_subtotal).toBe(false);

    const p2 = buildMeiboPreview('kanri_shiten', '2026-06-01', [winRow(3)], 2, 2);
    expect(p2.kanri_shiten_groups[0].is_continued).toBe(true);
    expect(p2.kanri_shiten_groups[0].show_subtotal).toBe(true);
    expect(p2.kanri_shiten_groups[0].show_total).toBe(true);
    expect(p2.kanri_shiten_groups[0].subtotal_busu).toBe(3);
    expect(p2.is_last_page).toBe(true);
  });
});

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

  it('ページ先頭でのみ改ページし、Page表記は ページ番号/総ページ数', () => {
    const doc = buildZougenNichinoDocDefinition(rows, '2026-03-01', new Map(), 15);
    const json = JSON.stringify(doc.content);
    expect((json.match(/"pageBreak":"before"/g) ?? []).length).toBe(1);
    expect(json).toContain('Page：1/2');
    expect(json).toContain('Page：2/2');
  });

  it('管理支店ごとの＜備考＞を bikoByKs から差し込む', () => {
    const doc = buildZougenNichinoDocDefinition(rows, '2026-03-01', new Map([[20, 'テスト備考']]), 15);
    expect(JSON.stringify(doc.content)).toContain('テスト備考');
  });

  it('空配列なら content も空（0件はPDFを生成しない前提）', () => {
    expect(paginateNichinoSubscribers([], 15)).toEqual([]);
    expect(buildZougenNichinoDocDefinition([], '2026-03-01', new Map(), 15).content).toEqual([]);
  });
});
