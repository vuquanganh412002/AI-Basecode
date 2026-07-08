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

// ─── API wrapper — getDokusyaRirekiList is the SCR-013 addition ────────
//
// /gen-code-frontend will add `getDokusyaRirekiList` to
// `src/api/dokusya/dokusya.ts` alongside the existing SCR-011/014 set.
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

  it('should render the メールマガジンフラグ（コード名称） column header when mounted', async () => {
    // COVERS: index.html No.12 — appended （コード名称）
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('メールマガジンフラグ（コード名称）');
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
// 取消(赤伝) — API-013-002 (履歴の取消)
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
