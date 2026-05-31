// Screen: ACSMS-SCR-030 — ログ参照画面
//
// Drives src/views/log/LogListView.vue. Every it() maps to a clause in
// docs/design/ACSMS-SCR-030/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-030/index.html (UI structure) +
// docs/design/ACSMS-SCR-030/ACSMS-SCR-030-api.md (API-030-001 / 002 +
// COMMON-005 dropdown).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import LogListView from '@/views/log/LogListView.vue';
import {
  buildLogListResponse,
  buildAccountDropdownResponse,
  buildLogUser,
} from '@test/fixtures/log.fixture';

// API wrappers — /gen-code-frontend will create these.
vi.mock('@/api/log/log', () => ({
  listLogs: vi.fn(),
  exportLogCsv: vi.fn(),
}));

vi.mock('@/api/account/account', () => ({
  // SCR-024 / 025 endpoints are present too but the log view only
  // imports the dropdown — keep the mock surface minimal.
  listAccountDropdown: vi.fn(),
}));

// Spy on antd toasts. Antd's `MessageType` is callable PromiseLike — cast
// noop so the spy compiles once `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// CSV download utilities — spy on URL APIs the view uses for blob → file.
const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();
beforeEach(() => {
  // window.URL is set per-test so each spec sees a fresh mock.
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
});

interface RenderOptions {
  /** Override the default NICHINO_ADMIN user (e.g. revoke log.view). */
  user?: ReturnType<typeof buildLogUser>;
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
      { path: '/log', name: 'LogList', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'LogList' });
  await router.isReady();

  const wrapper = mount(LogListView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildLogUser() },
            // Seed m_code so codes.label('LOG_TYPE' / 'RESULT_STATUS', value)
            // returns the canonical Japanese labels in unit tests.
            codes: {
              all: {
                LOG_TYPE: [
                  { value: 1, label: 'ユーザー操作', label_short: 'ユーザー操作' },
                  { value: 2, label: 'システム', label_short: 'システム' },
                  { value: 3, label: 'エラー', label_short: 'エラー' },
                  { value: 4, label: 'ファイルアップロード', label_short: 'ファイルUP' },
                ],
                RESULT_STATUS: [
                  { value: 1, label: '成功', label_short: '成功' },
                  { value: 2, label: '失敗', label_short: '失敗' },
                  { value: 3, label: '警告', label_short: '警告' },
                ],
              },
            },
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
  const { listLogs, exportLogCsv } = await import('@/api/log/log');
  vi.mocked(listLogs).mockResolvedValue(buildLogListResponse());
  vi.mocked(exportLogCsv).mockResolvedValue(
    new Blob(['"ログID"\n"1"\n'], { type: 'text/csv; charset=utf-8' }),
  );

  const { listAccountDropdown } = await import('@/api/account/account');
  vi.mocked(listAccountDropdown).mockResolvedValue(
    buildAccountDropdownResponse(),
  );
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('LogListView — initial render (機能定義 1.x)', () => {
  it('should render the ログ一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('ログ一覧');
  });

  it('should fetch the log list once when mounted (機能定義 1.4)', async () => {
    await renderView();
    const { listLogs } = await import('@/api/log/log');
    expect(listLogs).toHaveBeenCalledTimes(1);
  });

  it('should fetch the account dropdown once when mounted (COMMON-005)', async () => {
    await renderView();
    const { listAccountDropdown } = await import('@/api/account/account');
    expect(listAccountDropdown).toHaveBeenCalledTimes(1);
  });

  it('should render the four search-condition labels when mounted (機能定義 1.3)', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('期間') && t.includes('開始'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('期間') && t.includes('終了'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('ログ種別'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('ユーザ'))).toBe(true);
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
  });

  it('should render the 検索クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should render the CSV出力 button when mounted', async () => {
    const { wrapper } = await renderView();
    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    expect(csvBtn).toBeDefined();
  });

  it('should render the canonical table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('日時');
    expect(text).toContain('ユーザーID');
    expect(text).toContain('操作');
    expect(text).toContain('結果');
    expect(text).toContain('詳細');
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    // Default fixture returns 2 rows: login_id ja_honten_001 used twice.
    expect(wrapper.text()).toContain('ja_honten_001');
    expect(wrapper.text()).toContain('単価マスタ登録画面');
  });

  it('should render the operation column as "{gamen_name} {operation}" when list resolves', async () => {
    const { wrapper } = await renderView();
    // Per screen-design 項目No.10: 「{gamen_name} {operation}」を結合表示
    expect(wrapper.text()).toContain('単価マスタ登録画面 (ACSMS-SCR-003) CREATE');
  });

  it('should render the result column with the localised label when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('成功');
    expect(wrapper.text()).toContain('失敗');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. ログ検索 (機能定義 2.x) + メッセージ情報
// ───────────────────────────────────────────────────────────────────────
describe('LogListView — search (機能定義 2.x)', () => {
  it('should call listLogs with log_type filter when ログ種別 dropdown changes', async () => {
    const { wrapper } = await renderView();
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockClear();

    // Antd select is portal-rendered → drive via state mutation +
    // form submit (same pattern as other list specs).
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.log_type = 1;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({ log_type: 1 }),
    );
  });

  it('should call listLogs with account_id filter when ユーザ名 dropdown is selected', async () => {
    const { wrapper } = await renderView();
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.account_id = 10;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 10 }),
    );
  });

  it('should call listLogs with date_from + date_to filters when 期間 is provided', async () => {
    const { wrapper } = await renderView();
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.date_from = '2026/04/01 00:00:00';
      vm.state.filters.date_to = '2026/04/17 23:59:59';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        date_from: '2026/04/01 00:00:00',
        date_to: '2026/04/17 23:59:59',
      }),
    );
  });

  it('should NOT include log_type in listLogs params when ログ種別 is unset (default すべて)', async () => {
    const { listLogs } = await import('@/api/log/log');
    await renderView();
    const initialCall = vi.mocked(listLogs).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(initialCall?.log_type).toBeUndefined();
  });

  it('should display ACSMS-MSG-030-001 「開始日」は「終了日」以前... when date_from > date_to (機能定義 2.1)', async () => {
    const { listLogs } = await import('@/api/log/log');
    const { wrapper } = await renderView();
    vi.mocked(listLogs).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.date_from = '2026/04/30 00:00:00';
      vm.state.filters.date_to = '2026/04/01 00:00:00';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(
      '「開始日」は「終了日」以前の日付を入力してください。',
    );
    // FE-side guard — API must NOT be called when validation fails.
    expect(listLogs).not.toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-030-002 検索期間は1年以内... when range exceeds 365 days (機能定義 2.1)', async () => {
    const { listLogs } = await import('@/api/log/log');
    const { wrapper } = await renderView();
    vi.mocked(listLogs).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.date_from = '2024/01/01 00:00:00';
      vm.state.filters.date_to = '2026/04/01 00:00:00';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(
      '検索期間は1年以内で指定してください。',
    );
    expect(listLogs).not.toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-030-003 「検索結果が見つかりませんでした。」 when search returns zero rows (機能定義 2.2)', async () => {
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockResolvedValue(
      buildLogListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should still call listLogs when listLogs rejects with 500 (interceptor handles toast)', async () => {
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listLogs)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索条件クリア (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('LogListView — clear search (機能定義 3.x)', () => {
  it('should refetch the default log list when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockClear();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listLogs).toHaveBeenCalled();
  });

  it('should reset filters to defaults when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.date_from = '2026/04/01 00:00:00';
      vm.state.filters.log_type = 1;
      vm.state.filters.account_id = 10;
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    // After clear, the next API call should not carry filter params.
    const { listLogs } = await import('@/api/log/log');
    const lastCall = vi.mocked(listLogs).mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(lastCall?.date_from).toBeUndefined();
    expect(lastCall?.log_type).toBeUndefined();
    expect(lastCall?.account_id).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. CSV出力 (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('LogListView — CSV export (機能定義 4.x)', () => {
  it('should call exportLogCsv with the current search filters when CSV出力 is clicked', async () => {
    const { wrapper } = await renderView();
    const { exportLogCsv } = await import('@/api/log/log');
    vi.mocked(exportLogCsv).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.log_type = 1;
    await flushPromises();

    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(exportLogCsv).toHaveBeenCalled();
    const callArg = vi.mocked(exportLogCsv).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg).toMatchObject({ log_type: 1 });
  });

  it('should display ACSMS-MSG-030-004 「CSVファイルをダウンロードしました。」 toast when export succeeds', async () => {
    const { wrapper } = await renderView();
    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith(
      'CSVファイルをダウンロードしました。',
    );
  });

  it('should create a Blob object URL for the downloaded CSV when export succeeds', async () => {
    const { wrapper } = await renderView();
    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-030-005 「検索結果が5,000件を超えています...」 when API rejects with EXPORT_LIMIT_EXCEEDED', async () => {
    const { exportLogCsv } = await import('@/api/log/log');
    vi.mocked(exportLogCsv).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'EXPORT_LIMIT_EXCEEDED',
          message: '検索結果が5,000件を超えています。条件を絞り込んでください。',
        },
      },
    });

    const { wrapper } = await renderView();
    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(
      '検索結果が5,000件を超えています。条件を絞り込んでください。',
    );
  });

  it('should still call exportLogCsv when it rejects with 500 (interceptor handles toast)', async () => {
    const { exportLogCsv } = await import('@/api/log/log');
    vi.mocked(exportLogCsv).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(exportLogCsv)).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-030-001 「開始日」... and NOT call exportLogCsv when date_from > date_to on CSV click', async () => {
    const { exportLogCsv } = await import('@/api/log/log');
    const { wrapper } = await renderView();
    vi.mocked(exportLogCsv).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.date_from = '2026/04/30 00:00:00';
      vm.state.filters.date_to = '2026/04/01 00:00:00';
    }
    await flushPromises();

    const csvBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('CSV') && b.text().includes('出力'));
    await csvBtn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(
      '「開始日」は「終了日」以前の日付を入力してください。',
    );
    expect(exportLogCsv).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. ページネーション (機能定義 5.x)
// ───────────────────────────────────────────────────────────────────────
describe('LogListView — pagination (機能定義 5.x)', () => {
  it('should call listLogs with page=2 when the table emits a change to page 2', async () => {
    const { wrapper } = await renderView();
    const { listLogs } = await import('@/api/log/log');
    vi.mocked(listLogs).mockClear();

    // Drive a pagination-style re-fetch by mutating state.page then
    // invoking fetchList directly. Trigger via form submit would go
    // through `onSearch` → `applyFilters` which resets page to 1.
    const vm = wrapper.vm as any;
    vm.state.page = 2;
    await vm.fetchList();
    await flushPromises();

    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('should default to per_page=20 when listLogs is called on mount (機能定義 5.x)', async () => {
    const { listLogs } = await import('@/api/log/log');
    await renderView();
    const firstCall = vi.mocked(listLogs).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall?.per_page).toBe(20);
  });
});
