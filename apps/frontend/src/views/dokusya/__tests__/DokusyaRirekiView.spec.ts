//
// Screen: ACSMS-SCR-013 — 購読者履歴情報画面
//
// Drives src/views/dokusya/DokusyaRirekiView.vue. Every it() maps to a
// clause in docs/design/ACSMS-SCR-013/screen-design.md (機能定義 +
// メッセージ情報) + docs/design/ACSMS-SCR-013/index.html (UI structure)
// + docs/design/ACSMS-SCR-013/ACSMS-SCR-013-api.md (API contract).
//
// The view is a READ-ONLY paginated history list scoped to a dokusya_id
// taken from the route param `:id`. It fetches via the new
// `getDokusyaRirekiList` wrapper function (ACSMS-API-013-001), renders the
// 履歴一覧 table, resolves m_code columns (mail_magazine_flg, …) to labels
// via useCodesStore, paginates (20/page default, max 100), and offers a
// 前の画面に戻る button that returns to the previous screen
// (購読者情報登録画面) without a confirm dialog (screen-design 2.1).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import DokusyaRirekiView from '@/views/dokusya/DokusyaRirekiView.vue';
import {
  buildDokusyaRirekiListResponse,
  buildDokusyaRirekiRow,
  buildCodesSeed,
  buildAuthUser,
} from '@test/fixtures/dokusya.fixture';

// ─── API wrapper — getDokusyaRirekiList is the ACSMS-SCR-013 addition ────────
//
// /gen-code-frontend will add `getDokusyaRirekiList` to
// `src/api/dokusya/dokusya.ts` alongside the existing ACSMS-SCR-011/014 set.
// The mock re-stubs the whole module so the view's imports resolve.
vi.mock('@/api/dokusya/dokusya', () => ({
  getDokusya: vi.fn(),
  createDokusya: vi.fn(),
  updateDokusya: vi.fn(),
  approveDokusya: vi.fn(),
  rejectDokusya: vi.fn(),
  getDokusyaHistory: vi.fn(),
  listDokusya: vi.fn(),
  removeDokusya: vi.fn(),
  exportDokusyaExcel: vi.fn(),
  getDokusyaRirekiList: vi.fn(),
  torikeshiDokusyaRireki: vi.fn(),
}));

// Antd global toasts — return undefined via cast so the spy compiles
// once @ts-nocheck is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Route param `:id` (dokusya_id). Defaults to 100. */
  dokusyaId?: number | string;
  /** Override the default CHUOKAI session. */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
      { path: '/dokusya', name: 'DokusyaList', component: { template: '<div />' } },
      {
        path: '/dokusya/:id/edit',
        name: 'DokusyaEdit',
        component: { template: '<div />' },
      },
      {
        path: '/dokusya/:id/rireki',
        name: 'DokusyaRireki',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({
    name: 'DokusyaRireki',
    params: { id: String(opts.dokusyaId ?? 100) },
  });
  await router.isReady();

  const wrapper = mount(DokusyaRirekiView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
            codes: { all: buildCodesSeed() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
  vi.mocked(getDokusyaRirekiList).mockResolvedValue(buildDokusyaRirekiListResponse());
});

// ════════════════════════════════════════════════════════════════════════
// Initial render + fetch (機能定義 1 画面初期表示)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — initial render (機能定義 1)', () => {
  it('should mount without error when user has dokusya.view permission', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.exists()).toBe(true);
  });

  it('should call getDokusyaRirekiList once on mount with the route dokusya_id', async () => {
    // COVERS: 機能定義 1.1 — dokusya_id を受け取り履歴データを取得
    await renderView({ dokusyaId: 100 });
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    expect(getDokusyaRirekiList).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getDokusyaRirekiList).mock.calls[0]?.[0]).toBe(100);
  });

  it('should call getDokusyaRirekiList with default pagination + sort params when mounted', async () => {
    // COVERS: api.md §4.1 — page=1 / per_page=20 / sort_by=rireki_no / sort_order=desc
    await renderView();
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    const params = vi.mocked(getDokusyaRirekiList).mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(params).toMatchObject({
      page: 1,
      per_page: 20,
      sort_by: 'rireki_no',
      sort_order: 'desc',
    });
  });

  it('should render the 履歴一覧 section title when mounted (index.html)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('履歴一覧');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Table columns + rows (画面項目定義 履歴一覧)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — history table (画面項目定義)', () => {
  it('should render the history column headers when mounted', async () => {
    // COVERS: index.html 履歴一覧 — column headers
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('履歴番号');
    expect(text).toContain('管理支店');
    expect(text).toContain('支店名');
    expect(text).toContain('組合員コード');
    expect(text).toContain('購読者名');
    expect(text).toContain('配達先氏名');
  });

  it('should render the メールマガジンフラグ column header when mounted', async () => {
    // COVERS: index.html No.12 — 列名は「メールマガジンフラグ」（（コード名称）は付けない・顧客要件）
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('メールマガジンフラグ');
    expect(wrapper.text()).not.toContain('メールマガジンフラグ（コード名称）');
  });

  it('should render rows from the API response when getDokusyaRirekiList resolves', async () => {
    // COVERS: §4.6 — data rows render
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('K00012345');
    expect(text).toContain('山田');
    expect(text).toContain('東京中央管理支店');
    expect(text).toContain('丸の内販売店');
  });

  it('should resolve mail_magazine_flg to its m_code label via useCodesStore when rendering', async () => {
    // COVERS: api.md §m_code note — code value → label via useCodesStore
    // mail_magazine_flg=1 → '配信する' (buildCodesSeed MAIL_MAGAZINE_FLG)
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('配信する');
  });

  it('renders the new SCR-013 columns + resolves 購読種別/支払い方法/新聞単価 (顧客要件)', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    // 追加した列ヘッダ。
    expect(text).toContain('購読種別');
    expect(text).toContain('新聞単価');
    expect(text).toContain('初回購読開始日');
    expect(text).toContain('増部日');
    expect(text).toContain('減部日');
    expect(text).toContain('支払い方法');
    expect(text).toContain('郵送区分');
    expect(text).toContain('購読料支払いサイクル');
    // セル: 購読種別=紙版(DOKUSYA_SHUBETSU=1)、支払い方法=口座引落(SHIHARAI_HOHO=1)、
    // 新聞単価=単価名 + 金額（tanka_name='新聞購読料' + formatYen(3500)）。
    expect(text).toContain('紙版');
    expect(text).toContain('口座引落');
    expect(text).toContain('新聞購読料');
  });

  // COVERS: 顧客要件 2026-07 — 履歴番号の直後に 購読種別 → 電子版読者種別 →
  // 電子申込承認ステータス を並べる。電子版読者種別は m_code、承認ステータスは
  // m_code に無いため constants/denshi-shonin-status-labels.ts で解決する。
  it('renders 電子版読者種別 / 電子申込承認ステータス right after 購読種別', async () => {
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_shubetsu: 2, // 電子版
            denshi_dokusya_shubetsu: 1, // 有料
            denshi_shonin_status: 1, // 承認済み
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    const text = wrapper.text();
    // 列ヘッダ。
    expect(text).toContain('電子版読者種別');
    expect(text).toContain('電子申込承認ステータス');
    // セル値: m_code / 定数マップの両方でラベル解決されること。
    expect(text).toContain('有料');
    expect(text).toContain('承認済み');

    // 列順: 履歴番号 → 購読種別 → 電子版読者種別 → 電子申込承認ステータス → 手続種別。
    const headers = wrapper.findAll('thead th').map((th) => th.text());
    const idx = (label: string): number => headers.findIndex((h) => h === label);
    expect(idx('購読種別')).toBe(idx('履歴番号') + 1);
    expect(idx('電子版読者種別')).toBe(idx('購読種別') + 1);
    expect(idx('電子申込承認ステータス')).toBe(idx('電子版読者種別') + 1);
    expect(idx('手続種別')).toBe(idx('電子申込承認ステータス') + 1);
  });

  // 紙版は電子版連携が無いため 2 列とも null → 空欄（'Web申込以外' も出さない…
  // ではなく承認ステータスは 'Web申込以外' を表示する。ACSMS-SCR-011 絞り込みと同じ文言）。
  it('shows blank 電子版読者種別 and Web申込以外 for a 紙版 row', async () => {
    const { wrapper } = await renderView(); // 既定 fixture = 紙版・両列 null
    expect(wrapper.text()).toContain('Web申込以外');
  });

  it('shows 増部日 (読者情報変更適用日) when 部数 increased vs 前回', async () => {
    // 部数 2 > 前回 1 → 増部日に 読者情報変更適用日 を表示（顧客要件 2026-08。
    // 購読開始日は途中の部数変更では動かないため、増減が効く日と食い違う）。
    // 他の日付列と重複しない一意な日付にして「表示された」ことを検証する。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 2,
            zenkai_dokusya_busu: 1,
            joho_henko_tekiyo_date: '2027-09-09',
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('2027/09/09');
  });

  it('hides 増部日/減部日 when 部数 unchanged vs 前回 (顧客要件)', async () => {
    // 部数 2 == 前回 2 かつ 前回≠null → 増部日・減部日とも空欄。
    // 参照元の joho は「変更適用日」列にも出るので「出ない」では検証できない。
    // 出現回数で見る: 増減なし = その列の1回だけ。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 2,
            zenkai_dokusya_busu: 2,
            // 増減日の参照元は joho。変化なしなのでこの日付は出ないはず。
            joho_henko_tekiyo_date: '2027-09-09',
            dokusya_kaishi_date: '2026-04-01',
            shoki_dokusya_kaishi_date: '2024-04-01',
            dokusya_chushi_date: null,
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    expect(wrapper.text().split('2027/09/09').length - 1).toBe(1);
  });

  it('shows 減部日 (読者情報変更適用日) when 部数 decreased vs 前回', async () => {
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 1,
            zenkai_dokusya_busu: 3,
            joho_henko_tekiyo_date: '2027-09-09',
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('2027/09/09');
  });

  it('hides 増部日 even when 部数 increased, when the row is 取消(赤伝)済み (顧客要件 No.86 ケース4)', async () => {
    // 取消済み行（対象行・打ち消し行とも）は増減の実績として扱わないため、
    // 部数の大小に関わらず増部日・減部日を常に空欄にする。ここでは対象行
    // （誤って8部で登録: busu=8>zenkai=4）を想定 — torikeshi_flg=false なら
    // 通常は増部日に joho を表示するはずの数値だが、取消済みなので出ない。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 8,
            zenkai_dokusya_busu: 4,
            joho_henko_tekiyo_date: '2026-09-01',
            torikeshi_flg: true,
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    // joho は「変更適用日」列に1回だけ出る。増部日にも出れば2回になる。
    const occurrences = wrapper.text().split('2026/09/01').length - 1;
    expect(occurrences).toBe(1); // 変更適用日のみ（増部日は空欄）
  });

  it('hides 減部日 even when 部数 decreased, when the row is 取消(赤伝)の打ち消し行 (顧客要件 No.86 ケース4)', async () => {
    // 打ち消し行（busu=4<zenkai=8）も同様に torikeshi_flg=true なら常に空欄。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 4,
            zenkai_dokusya_busu: 8,
            joho_henko_tekiyo_date: '2026-09-01',
            torikeshi_flg: true,
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    const occurrences = wrapper.text().split('2026/09/01').length - 1;
    expect(occurrences).toBe(1); // 変更適用日のみ（減部日は空欄）
  });

  it('shows ONLY 増部日 (not 減部日) when 前回部数=null — 新規作成・再購読の初回行 (顧客要件)', async () => {
    // 前回部数 null（新規作成 / 再購読の初回行 = 0→N の増加）は増部として扱い、
    // 増部日のみに適用日を表示する。減部日は空欄（両方は出さない）。
    // joho は「変更適用日」列にも出るため、増部日と合わせて2回。
    // 減部日にも出れば3回になるので、この回数で「増部のみ」を担保できる。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({
            dokusya_busu: 2,
            zenkai_dokusya_busu: null,
            joho_henko_tekiyo_date: '2027-09-09',
            dokusya_kaishi_date: '2026-04-01',
            shoki_dokusya_kaishi_date: '2024-04-01',
            dokusya_chushi_date: null,
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    const occurrences = wrapper.text().split('2027/09/09').length - 1;
    expect(occurrences).toBe(2); // 変更適用日 + 増部日
  });

  it('should NOT crash and still render the table when a nullable join (kanri_shiten_name) is null', async () => {
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          {
            ...buildDokusyaRirekiListResponse().data[0],
            kanri_shiten_name: null,
            shiten_name: null,
            hanbaiten_name: null,
          },
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toContain('K00012345');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Empty + error states (メッセージ情報)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — empty + error states (メッセージ情報)', () => {
  it('should render ACSMS-MSG-013-001 「履歴データが存在しません。」 when data is empty', async () => {
    // COVERS: 機能定義 1.3 — データなし → ACSMS-MSG-013-001
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('履歴データが存在しません。');
  });

  it('should still mount and not re-throw when getDokusyaRirekiList rejects (global interceptor toasts)', async () => {
    // COVERS: 機能定義 1.3 — システムエラー時は ACSMS-MSG-013-002 を
    // 中央のインターセプタが表示。view は fetch を握り潰す
    // (.claude/rules/vue.md §List view rules #5)。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockRejectedValue({
      error_code: 'INTERNAL_SERVER_ERROR',
      message: 'システムエラーが発生しました。しばらくしてから再度お試しください。',
    });
    const { wrapper } = await renderView();
    expect(wrapper.exists()).toBe(true);
    expect(getDokusyaRirekiList).toHaveBeenCalled();
  });

  it('should redirect to Dashboard when getDokusyaRirekiList rejects with NOT_FOUND (bogus dokusya_id in URL)', async () => {
    // URL 直打ちで存在しない dokusya_id を指定した場合、空の一覧のまま留まら
    // せずダッシュボードへ戻す（他 7 編集画面と同じ useNotFoundRedirect 標準
    // 挙動 — 顧客要件 2026-08）。BE の一般メッセージは axios interceptor が
    // 既にトースト済みのためここでは追加トーストしない。
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          error_code: 'NOT_FOUND',
          message: '指定された購読者が見つかりません。',
        },
      },
    });
    const { wrapper, router } = await renderView({ dokusyaId: 9999 });
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('Dashboard');
    expect(wrapper.exists()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Pagination + sort (機能定義 3 ページネーション)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — pagination + sort (機能定義 3)', () => {
  it('should re-fetch with page 2 when the table pagination changes', async () => {
    // COVERS: 機能定義 3.1 — 別ページ押下でそのページを取得
    const { wrapper } = await renderView();
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockClear();

    const aTable = wrapper.findComponent({ name: 'ATable' });
    expect(aTable.exists()).toBe(true);
    aTable.vm.$emit('change', { current: 2, pageSize: 20 }, {}, {});
    await flushPromises();

    expect(getDokusyaRirekiList).toHaveBeenCalled();
    const params = vi.mocked(getDokusyaRirekiList).mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(params).toMatchObject({ page: 2 });
  });

  it('should re-fetch with sort_by=created_at sort_order=asc when the 作成日時 column header is clicked', async () => {
    const { wrapper } = await renderView();
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusyaRirekiList).mockClear();

    const aTable = wrapper.findComponent({ name: 'ATable' });
    aTable.vm.$emit(
      'change',
      { current: 1, pageSize: 20 },
      {},
      { field: 'created_at', columnKey: 'created_at', order: 'ascend' },
    );
    await flushPromises();

    expect(getDokusyaRirekiList).toHaveBeenCalled();
    const params = vi.mocked(getDokusyaRirekiList).mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(params).toMatchObject({ sort_by: 'created_at', sort_order: 'asc' });
  });
});

// ════════════════════════════════════════════════════════════════════════
// Back navigation (機能定義 2 戻る操作)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — back navigation (機能定義 2)', () => {
  it('should navigate back to the previous screen when 前の画面に戻る is clicked', async () => {
    // COVERS: 機能定義 2.1 — 確認ダイアログ無しで購読者情報登録画面に戻る
    const { wrapper, router } = await renderView();
    const backSpy = vi.spyOn(router, 'back');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');

    expect(backSpy).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════
// 取消(赤伝) — ACSMS-API-013-002 (履歴の取消)
// ════════════════════════════════════════════════════════════════════════
describe('DokusyaRirekiView — 取消(赤伝)', () => {
  it('should render a 取消 button per row, enabled only when can_torikeshi=true', async () => {
    // data[0].can_torikeshi=true (tail), data[1].can_torikeshi=false.
    vi.mocked(
      (await import('@/api/dokusya/dokusya')).getDokusyaRirekiList,
    ).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({ dokusya_rireki_id: 42, rireki_no: 3, can_torikeshi: true }),
          buildDokusyaRirekiRow({ dokusya_rireki_id: 41, rireki_no: 2, can_torikeshi: false }),
        ],
      } as never),
    );
    const { wrapper } = await renderView();

    const btns = wrapper.findAll('[data-test="torikeshi-btn"]');
    expect(btns).toHaveLength(2);
    expect(btns[0].attributes('disabled')).toBeUndefined(); // can_torikeshi=true → enabled
    expect(btns[1].attributes('disabled')).toBeDefined(); // can_torikeshi=false → disabled
  });

  it('should DISABLE every 取消 button when the user lacks dokusya.update', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['dokusya.view'] }),
    });
    const btns = wrapper.findAll('[data-test="torikeshi-btn"]');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => expect(b.attributes('disabled')).toBeDefined());
  });

  it('should gray out a row whose torikeshi_flg=true, and not the other rows (顧客要件)', async () => {
    vi.mocked(
      (await import('@/api/dokusya/dokusya')).getDokusyaRirekiList,
    ).mockResolvedValue(
      buildDokusyaRirekiListResponse({
        data: [
          buildDokusyaRirekiRow({ dokusya_rireki_id: 42, rireki_no: 3, torikeshi_flg: true }),
          buildDokusyaRirekiRow({ dokusya_rireki_id: 41, rireki_no: 2, torikeshi_flg: false }),
        ],
      } as never),
    );
    const { wrapper } = await renderView();

    const torikeshiRow = wrapper.find('tr[data-row-key="42"]');
    const normalRow = wrapper.find('tr[data-row-key="41"]');
    expect(torikeshiRow.classes()).toContain('dokusya-rireki-row-torikeshi');
    expect(normalRow.classes()).not.toContain('dokusya-rireki-row-torikeshi');
  });

  it('should open the reason dialog when an enabled 取消 button is clicked', async () => {
    const { wrapper } = await renderView();
    const modal = wrapper.findComponent({ name: 'AModal' });
    expect(modal.props('open')).toBe(false);

    await wrapper.find('[data-test="torikeshi-btn"]').trigger('click');
    await flushPromises();
    expect(modal.props('open')).toBe(true);
  });

  it('should NOT call the API when the reason is empty (FE validation)', async () => {
    const { torikeshiDokusyaRireki } = await import('@/api/dokusya/dokusya');
    const { wrapper } = await renderView();

    await wrapper.find('[data-test="torikeshi-btn"]').trigger('click');
    await flushPromises();
    // Confirm with empty reason → blocked by validateReason.
    await wrapper.findComponent({ name: 'AModal' }).vm.$emit('ok');
    await flushPromises();

    expect(vi.mocked(torikeshiDokusyaRireki)).not.toHaveBeenCalled();
  });

  it('should call torikeshiDokusyaRireki with (dokusyaId, rireki_id, reason) then refetch on confirm', async () => {
    const api = await import('@/api/dokusya/dokusya');
    vi.mocked(api.torikeshiDokusyaRireki).mockResolvedValue({ message: '取消しました。' });
    const { wrapper } = await renderView({ dokusyaId: 100 });

    // data[0] = dokusya_rireki_id 42, rireki_no 3 (tail, can_torikeshi=true).
    await wrapper.find('[data-test="torikeshi-btn"]').trigger('click');
    await flushPromises();
    await wrapper
      .findComponent({ name: 'ATextarea' })
      .vm.$emit('update:value', '誤入力のため取消');
    await wrapper.findComponent({ name: 'AModal' }).vm.$emit('ok');
    await flushPromises();

    expect(vi.mocked(api.torikeshiDokusyaRireki)).toHaveBeenCalledWith(
      100,
      42,
      '誤入力のため取消',
    );
    // List is refetched after a successful 取消 (initial mount + after confirm).
    expect(vi.mocked(api.getDokusyaRirekiList).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
