// Screen: ACSMS-SCR-022 — ファイルダウンロード画面
//
// Drives src/views/file-download/FileDownloadView.vue. Every it() maps
// to a clause in
//   docs/design/ACSMS-SCR-022/screen-design.md (機能定義 1.x〜8.x + メッセージ情報) +
//   docs/design/ACSMS-SCR-022/index.html (UI structure) +
//   docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md
//     (API-022-001 list / -002 preview / -003 download + COMMON-001 todofuken).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import FileDownloadView from '@/views/file-download/FileDownloadView.vue';
import {
  buildFileUploadListResponse,
  buildFilePreviewResponse,
  buildTodofukenResponse,
  buildFileDownloadUser,
} from '@test/fixtures/file-download.fixture';

// API wrappers — /gen-code-frontend will create these.
vi.mock('@/api/file-upload/file-upload', () => ({
  listFiles: vi.fn(),
  getFilePreview: vi.fn(),
  downloadFile: vi.fn(),
}));

vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// Spy on antd toasts. Antd's `MessageType` is callable PromiseLike — cast
// noop so the spy compiles once `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Blob download utilities — spy on URL APIs the view uses for file save.
const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();
beforeEach(() => {
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
  /** Override the default NICHINO_ADMIN user (e.g. revoke file.download). */
  user?: ReturnType<typeof buildFileDownloadUser>;
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
      { path: '/file-download', name: 'FileDownload', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'FileDownload' });
  await router.isReady();

  const wrapper = mount(FileDownloadView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildFileDownloadUser() },
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
  const { listFiles, getFilePreview, downloadFile } = await import(
    '@/api/file-upload/file-upload'
  );
  vi.mocked(listFiles).mockResolvedValue(buildFileUploadListResponse());
  vi.mocked(getFilePreview).mockResolvedValue(buildFilePreviewResponse());
  vi.mocked(downloadFile).mockResolvedValue(
    new Blob(['%PDF-mock-bytes'], { type: 'application/pdf' }),
  );

  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue(buildTodofukenResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — initial render (機能定義 1.x)', () => {
  it('should render the ファイル一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('ファイル一覧');
  });

  it('should fetch the file list once when mounted (機能定義 1.1)', async () => {
    await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    expect(listFiles).toHaveBeenCalledTimes(1);
  });

  it('should fetch the 都道府県 dropdown once when mounted (機能定義 1.3 + COMMON-001)', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should render the ファイル名 + 都道府県 search labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('ファイル名'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('都道府県'))).toBe(true);
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
  });

  it('should render the クリア button (search-clear) when mounted (機能定義 3.x)', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should render the プレビュー button when mounted (機能定義 4.x)', async () => {
    const { wrapper } = await renderView();
    const previewBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('プレビュー'));
    expect(previewBtn).toBeDefined();
  });

  it('should render the ダウンロード実行 button when mounted (機能定義 5.x)', async () => {
    const { wrapper } = await renderView();
    const downloadBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    expect(downloadBtn).toBeDefined();
  });

  it('should render the canonical table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('アップロード日時');
    expect(text).toContain('作成者');
    expect(text).toContain('ファイル名');
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('zougen_tsuchi_202604.pdf');
    expect(wrapper.text()).toContain('日農 管理者');
  });

  it('should render the second row (global file with ja_id=null) when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('kouza_furikae_20260506.csv');
    expect(wrapper.text()).toContain('日農 担当者');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. ファイル検索 (機能定義 2.x) + ACSMS-MSG-022-001
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — search (機能定義 2.x)', () => {
  it('should call listFiles with file_name filter when ファイル名 input is filled', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.file_name = 'zougen';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ file_name: 'zougen' }),
    );
  });

  it('should call listFiles with todofuken_code filter when 都道府県 dropdown is selected', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.todofuken_code = '13';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ todofuken_code: '13' }),
    );
  });

  it('should NOT include file_name in listFiles params when blank (initial fetch)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    await renderView();
    const initialCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(initialCall?.file_name).toBeUndefined();
  });

  it('should NOT include todofuken_code in listFiles params when unset (initial fetch)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    await renderView();
    const initialCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(initialCall?.todofuken_code).toBeUndefined();
  });

  it('should trim file_name whitespace before calling listFiles', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.file_name = '  zougen  ';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ file_name: 'zougen' }),
    );
  });

  it('should display ACSMS-MSG-022-001 「検索結果が見つかりませんでした。」 when search returns zero rows (機能定義 2.3)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockResolvedValue(
      buildFileUploadListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should still call listFiles when listFiles rejects with 500 (interceptor handles toast)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listFiles)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索条件クリア (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — clear search (機能定義 3.x)', () => {
  it('should refetch the default file list when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    // Make the screen non-pristine so 検索クリア resets+refetches (a pristine
    // screen is now a no-op — see useTableQuery.isPristine).
    (wrapper.vm as unknown as { state: { filters: { file_name: string } } })
      .state.filters.file_name = 'x';

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listFiles).toHaveBeenCalled();
  });

  it('should reset filters to defaults when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.file_name = 'zougen';
      vm.state.filters.todofuken_code = '13';
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    const { listFiles } = await import('@/api/file-upload/file-upload');
    const lastCall = vi.mocked(listFiles).mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(lastCall?.file_name).toBeUndefined();
    expect(lastCall?.todofuken_code).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. ファイルプレビュー (機能定義 4.x) + ACSMS-MSG-022-002 / 003
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — preview (機能定義 4.x)', () => {
  it('should disable プレビュー button (and defense-in-depth ACSMS-MSG-022-002 guard) when no selection', async () => {
    // UX (機能定義 4.x): the button is `:disabled="!canPreviewSelected"`
    // so click events never fire when nothing is selected. The handler
    // also has a `message.warning('ファイルを選択してください。')` early-
    // return as defense-in-depth — call it directly to exercise that
    // path too.
    const { getFilePreview } = await import('@/api/file-upload/file-upload');
    const { wrapper } = await renderView();
    vi.mocked(getFilePreview).mockClear();

    const previewBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('プレビュー'));
    expect(previewBtn).toBeDefined();
    expect((previewBtn!.element as HTMLButtonElement).disabled).toBe(true);

    // Defense-in-depth: handler still guards. Call it via the exposed
    // vm so the guard fires (the disabled button intentionally swallows
    // user clicks before this can run in real UX).
    const vm = wrapper.vm as unknown as { onPreview?: () => Promise<void> };
    if (vm.onPreview) {
      await vm.onPreview();
      expect(message.warning).toHaveBeenCalledWith('ファイルを選択してください。');
    }
    expect(getFilePreview).not.toHaveBeenCalled();
  });

  it('should call getFilePreview with selected file_upload_id when プレビュー clicked', async () => {
    const { wrapper } = await renderView();
    const { getFilePreview } = await import('@/api/file-upload/file-upload');
    vi.mocked(getFilePreview).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const previewBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('プレビュー'));
    await previewBtn!.trigger('click');
    await flushPromises();

    expect(getFilePreview).toHaveBeenCalledWith(101);
  });

  it('should open the preview modal with the presigned URL when getFilePreview resolves', async () => {
    const { wrapper } = await renderView();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const previewBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('プレビュー'));
    await previewBtn!.trigger('click');
    await flushPromises();

    expect(vm.previewOpen).toBe(true);
    expect(vm.previewUrl).toContain('zougen_tsuchi_202604.pdf');
  });

  it('should display ACSMS-MSG-022-003 「ファイルが存在していません。」 when getFilePreview rejects with NOT_FOUND', async () => {
    const { getFilePreview } = await import('@/api/file-upload/file-upload');
    vi.mocked(getFilePreview).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error_code: 'NOT_FOUND', message: '指定されたファイルが見つかりません。' },
      },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const previewBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('プレビュー'));
    await previewBtn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith('ファイルが存在していません。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. ファイルダウンロード (機能定義 5.x) + ACSMS-MSG-022-002 / 003 / 005
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — download (機能定義 5.x)', () => {
  it('should disable ダウンロード実行 button (and defense-in-depth ACSMS-MSG-022-002 guard) when no selection', async () => {
    // UX (機能定義 5.x): button is `:disabled="selectedIds.length === 0"`
    // so click never fires the handler. The handler has the same
    // `message.warning('ファイルを選択してください。')` early-return as
    // defense-in-depth — call it directly to exercise the guard.
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    const { wrapper } = await renderView();
    vi.mocked(downloadFile).mockClear();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    expect(dlBtn).toBeDefined();
    expect((dlBtn!.element as HTMLButtonElement).disabled).toBe(true);

    const vm = wrapper.vm as unknown as { onDownload?: () => Promise<void> };
    if (vm.onDownload) {
      await vm.onDownload();
      expect(message.warning).toHaveBeenCalledWith('ファイルを選択してください。');
    }
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('should call downloadFile with selected file_upload_id when ダウンロード実行 clicked', async () => {
    const { wrapper } = await renderView();
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFile).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(downloadFile).toHaveBeenCalledWith(101);
  });

  it('should call downloadFile once per selected file when multiple checkboxes are checked', async () => {
    const { wrapper } = await renderView();
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFile).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101, 102];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(downloadFile).toHaveBeenCalledTimes(2);
  });

  it('should create a Blob object URL for the downloaded file when downloadFile resolves', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-022-005 「ダウンロードが完了しました。」 toast when downloadFile succeeds', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('ダウンロードが完了しました。');
  });

  it('should display ACSMS-MSG-022-003 「ファイルが存在していません。」 when downloadFile rejects with NOT_FOUND', async () => {
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFile).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error_code: 'NOT_FOUND', message: '指定されたファイルが見つかりません。' },
      },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith('ファイルが存在していません。');
  });

  it('should still call downloadFile when it rejects with 500 (interceptor handles toast)', async () => {
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFile).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(downloadFile)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 選択解除 + プレビュークリア (機能定義 6.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — clear selection (機能定義 6.x)', () => {
  it('should clear selectedIds when the footer クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101, 102];
    await flushPromises();
    expect(vm.selectedIds.length).toBe(2);

    // The view exposes a clearSelection action; drive directly so we
    // don't depend on which 「クリア」 button (search vs selection) the
    // selector picks first.
    if (typeof vm.clearSelection === 'function') vm.clearSelection();
    await flushPromises();

    expect(vm.selectedIds.length).toBe(0);
  });

  it('should close the preview modal when the footer クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.previewOpen = true;
    vm.previewUrl = 'blob:mock-url';
    await flushPromises();

    if (typeof vm.clearSelection === 'function') vm.clearSelection();
    await flushPromises();

    expect(vm.previewOpen).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. ページネーション (機能定義 7.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — pagination (機能定義 7.x)', () => {
  it('should call listFiles with page=2 when the table emits a change to page 2', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    vm.state.page = 2;
    await vm.fetchList();
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('should default to per_page=20 when listFiles is called on mount (機能定義 7.x)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    await renderView();
    const firstCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall?.per_page).toBe(20);
  });

  it('should preserve search filters across pagination when 検索 + page change occurs', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');

    // First apply a search filter
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.file_name = 'zougen';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    vi.mocked(listFiles).mockClear();
    vm.state.page = 2;
    await vm.fetchList();
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ file_name: 'zougen', page: 2 }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. ファイル選択（チェックボックス） (機能定義 8.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — multi-selection (機能定義 8.x)', () => {
  it('should accept multiple file ids in selectedIds when more than one row is checked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101, 102];
    await flushPromises();
    expect(vm.selectedIds).toEqual([101, 102]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — empty 検索 is a no-op', () => {
  it('should NOT call listFiles when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listFiles).not.toHaveBeenCalled();
  });

  it('should NOT call listFiles when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listFiles).not.toHaveBeenCalled();
  });
});
