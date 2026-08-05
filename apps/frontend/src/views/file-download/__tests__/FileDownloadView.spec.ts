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

import { resetTodofukenCache } from '@/composables/useTodofuken';
import Antd, { message } from 'ant-design-vue';

import FileDownloadView from '@/views/file-download/FileDownloadView.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import {
  buildFileDownloadListResponse,
  buildFileDownloadItem,
  buildFilePreviewResponse,
  buildTodofukenResponse,
  buildFileDownloadUser,
} from '@test/fixtures/file-download.fixture';

// API wrappers — /gen-code-frontend will create these.
vi.mock('@/api/file-download/file-download', () => ({
  listFiles: vi.fn(),
  getFilePreview: vi.fn(),
  downloadFile: vi.fn(),
  downloadFilesAsZip: vi.fn(),
}));

vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// JA 絞り込み用 <BaseJaDropdown> が onMounted で叩く /ja/dropdown をモック。
vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
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
  /** アップロード通知メールのディープリンク (`?file_name=...`) を再現する。 */
  query?: Record<string, string>;
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
  await router.push({ name: 'FileDownload', query: opts.query });
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
  const { listFiles, getFilePreview, downloadFile, downloadFilesAsZip } =
    await import('@/api/file-download/file-download');
  vi.mocked(listFiles).mockResolvedValue(buildFileDownloadListResponse());
  vi.mocked(getFilePreview).mockResolvedValue(buildFilePreviewResponse());
  vi.mocked(downloadFile).mockResolvedValue(
    new Blob(['%PDF-mock-bytes'], { type: 'application/pdf' }),
  );
  vi.mocked(downloadFilesAsZip).mockResolvedValue({
    blob: new Blob(['PK-zip-mock'], { type: 'application/zip' }),
    filename: '一括ダウンロード_20260619153000.zip',
  });

  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue(buildTodofukenResponse());
  // 都道府県は useTodofuken のモジュール共有キャッシュ。テスト間で持ち越すと
  // 2件目以降が「取得済み」になり HTTP 回数の検証が崩れる。
  resetTodofukenCache();

  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, per_page: 50, has_more: false },
  });
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
    const { listFiles } = await import('@/api/file-download/file-download');
    expect(listFiles).toHaveBeenCalledTimes(1);
  });

  it('should fetch the 都道府県 dropdown once when mounted (機能定義 1.3 + COMMON-001)', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should render 都道府県 via the shared BaseTodofukenSelect (SCR-023 と同表記)', async () => {
    // 同じ都道府県を扱う SCR-023 アップロード画面と表記・検索を揃えるため、
    // 画面側で props を上書きしない。実挙動は BaseTodofukenSelect.spec.ts。
    const { wrapper } = await renderView();
    expect(wrapper.findComponent({ name: 'BaseTodofukenSelect' }).exists()).toBe(true);
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
    expect(text).toContain('ダウンロード日時');
    expect(text).toContain('作成者');
    expect(text).toContain('JA名');
    expect(text).toContain('ダウンロード種別');
    expect(text).toContain('ファイル名');
    // 対象年月 列は削除済み。
    expect(text).not.toContain('対象年月');
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
    const { listFiles } = await import('@/api/file-download/file-download');
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
    const { listFiles } = await import('@/api/file-download/file-download');
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

  it('should call listFiles with ja_id filter when a JA is selected in <BaseJaDropdown>', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.ja_id = 10;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 10 }),
    );
  });

  it('should pre-select own JA and disable the JA dropdown for JA-fixed roles (JA_HONTEN)', async () => {
    const { wrapper } = await renderView({
      user: buildFileDownloadUser({ role_code: 'JA_HONTEN', ja_id: 5 }),
    });
    const vm = wrapper.vm as any;
    // 自JA がプリセットされる（情報提供のみ）。
    expect(vm.state.filters.ja_id).toBe(5);
    // BaseJaDropdown は disabled。
    expect(wrapper.findComponent(BaseJaDropdown).props('disabled')).toBe(true);
  });

  // 顧客要件 2026-07: 中央会は「同一都道府県の全JA」を閲覧できる。ja_id を自JAで
  // プリセットしたままだと検索条件が常に `ja_id = 自JA` になり BE のスコープ拡大が
  // 効かないため、中央会は ja_id を固定せず、代わりに都道府県を自県で固定する。
  it('should scope CHUOKAI by its own 都道府県 instead of pinning ja_id', async () => {
    const { wrapper } = await renderView({
      user: buildFileDownloadUser({
        role_code: 'CHUOKAI',
        ja_id: 5,
        todofuken_code: '13',
      }),
    });
    const vm = wrapper.vm as any;
    expect(vm.state.filters.ja_id).toBeNull();
    expect(vm.state.filters.todofuken_code).toBe('13');
    // JA 絞り込みは自由（同県内の JA を任意に絞れる）。候補も自県の全JAへ
    // 広げるため scope='todofuken' を渡す（BE がセッションの県で絞る）。
    const jaDropdown = wrapper.findComponent(BaseJaDropdown);
    expect(jaDropdown.props('disabled')).toBe(false);
    expect(jaDropdown.props('scope')).toBe('todofuken');

    // 初回取得は ja_id 無し・自県の todofuken_code 付きで飛ぶ。
    const { listFiles } = await import('@/api/file-download/file-download');
    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ todofuken_code: '13', ja_id: undefined }),
    );
  });

  // todofuken_code を持たない中央会アカウント（旧データ・未設定）は従来どおり
  // 自JAスコープにフォールバックする（BE も同じ判定）。
  it('should fall back to the own-JA scope for a CHUOKAI without todofuken_code', async () => {
    const { wrapper } = await renderView({
      user: buildFileDownloadUser({
        role_code: 'CHUOKAI',
        ja_id: 5,
        todofuken_code: null,
      }),
    });
    const vm = wrapper.vm as any;
    expect(vm.state.filters.todofuken_code).toBe('');
  });

  it('should keep the JA dropdown editable and NOT pre-select for NICHINO roles', async () => {
    const { wrapper } = await renderView({
      user: buildFileDownloadUser({ role_code: 'NICHINO_ADMIN', ja_id: null }),
    });
    const vm = wrapper.vm as any;
    expect(vm.state.filters.ja_id).toBeNull();
    const jaDropdown = wrapper.findComponent(BaseJaDropdown);
    expect(jaDropdown.props('disabled')).toBe(false);
    // 日農は県拡大の対象外 — 既定スコープのまま。
    expect(jaDropdown.props('scope')).toBe('own');
  });

  it('should not throw when 都道府県 is cleared (undefined) and 検索 is clicked (allow-clear → undefined)', async () => {
    // Reported bug: selecting a 都道府県, searching, then clearing it (×)
    // sets the a-select v-model to `undefined`; onSearch called
    // `todofuken_code.trim()` → TypeError → generic error toast.
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');
    const vm = wrapper.vm as any;

    // Select prefecture #2, search.
    vm.state.filters.todofuken_code = '02';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Clear it (× icon on a-select → undefined), search again.
    vm.state.filters.todofuken_code = undefined;
    vi.mocked(listFiles).mockClear();
    await flushPromises();
    await expect(
      (async () => {
        await wrapper.find('form').trigger('submit');
        await flushPromises();
      })(),
    ).resolves.toBeUndefined();

    // The fix coerces the cleared `undefined` to '' (the buggy `.trim()`
    // threw before the assignment, leaving it `undefined`).
    expect(vm.state.filters.todofuken_code).toBe('');
    expect(message.error).not.toHaveBeenCalled();
    const lastCall = vi.mocked(listFiles).mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;
    if (lastCall) expect(lastCall.todofuken_code).toBeUndefined();
  });

  it('should NOT include file_name in listFiles params when blank (initial fetch)', async () => {
    const { listFiles } = await import('@/api/file-download/file-download');
    await renderView();
    const initialCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(initialCall?.file_name).toBeUndefined();
  });

  it('should NOT include todofuken_code in listFiles params when unset (initial fetch)', async () => {
    const { listFiles } = await import('@/api/file-download/file-download');
    await renderView();
    const initialCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(initialCall?.todofuken_code).toBeUndefined();
  });

  it('should trim file_name whitespace before calling listFiles', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');
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
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockResolvedValue(
      buildFileDownloadListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should still call listFiles when listFiles rejects with 500 (interceptor handles toast)', async () => {
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listFiles)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2b. 論理削除済みファイルの無効化 (deleted_at)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — soft-deleted files disabled (deleted_at)', () => {
  const deletedRow = buildFileDownloadItem({
    file_download_id: 999,
    file_name: 'old_report.pdf',
    deleted_at: '2026-06-01T10:00:00+09:00',
  });
  const liveRow = buildFileDownloadItem({
    file_download_id: 101,
    file_name: 'live_report.pdf',
    deleted_at: null,
  });

  async function renderWithRows() {
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockResolvedValue(
      buildFileDownloadListResponse({
        data: [liveRow, deletedRow],
        meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    return renderView();
  }

  it('disables the selection checkbox for a soft-deleted row but not a live one', async () => {
    const { wrapper } = await renderWithRows();
    const cfg = (wrapper.vm as any).rowSelectionConfig;
    expect(cfg.getCheckboxProps(deletedRow).disabled).toBe(true);
    expect(cfg.getCheckboxProps(liveRow).disabled).toBe(false);
  });

  it('renders a soft-deleted filename as plain 削除済み text, not a preview link', async () => {
    const { wrapper } = await renderWithRows();
    expect(wrapper.text()).toContain('削除済み');
    const linkTexts = wrapper.findAll('a').map((a) => a.text());
    // deleted file → not a clickable link
    expect(linkTexts.some((t) => t.includes('old_report.pdf'))).toBe(false);
    // live previewable file → still a link
    expect(linkTexts.some((t) => t.includes('live_report.pdf'))).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2c. 日農ダウンロード許可フラグ (nichino_download_allowed_flg) による無効化
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — nichino download permission (role 1/2/3)', () => {
  const blockedRow = buildFileDownloadItem({
    file_download_id: 201,
    file_name: 'blocked_report.pdf',
    nichino_download_allowed_flg: false,
  });
  const allowedRow = buildFileDownloadItem({
    file_download_id: 202,
    file_name: 'allowed_report.pdf',
    nichino_download_allowed_flg: true,
  });

  async function renderAs(roleCode: string) {
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockResolvedValue(
      buildFileDownloadListResponse({
        data: [allowedRow, blockedRow],
        meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    return renderView({
      user: buildFileDownloadUser({ role_code: roleCode }),
    });
  }

  it.each([
    {
      desc: 'disables a flag=false row for NICHINO_ADMIN (role 1)',
      role: 'NICHINO_ADMIN',
      blocked: true,
      allowed: false,
    },
    {
      desc: 'disables a flag=false row for CHUOKAI (role 3) — 顧客要件',
      role: 'CHUOKAI',
      blocked: true,
      allowed: false,
    },
    {
      desc: 'does NOT disable a flag=false row for other JA roles (e.g. JA_HONTEN)',
      role: 'JA_HONTEN',
      blocked: false,
      allowed: false,
    },
  ])('$desc', async ({ role, blocked, allowed }) => {
    const { wrapper } = await renderAs(role);
    const cfg = (wrapper.vm as any).rowSelectionConfig;
    expect(cfg.getCheckboxProps(blockedRow).disabled).toBe(blocked);
    expect(cfg.getCheckboxProps(allowedRow).disabled).toBe(allowed);
  });

  it('disables a flag=false row for NICHINO_STAFF (role 2)', async () => {
    const { wrapper } = await renderAs('NICHINO_STAFF');
    const cfg = (wrapper.vm as any).rowSelectionConfig;
    expect(cfg.getCheckboxProps(blockedRow).disabled).toBe(true);
  });

  // 顧客要件 2026-07: 自分が出力したファイルはフラグに関わらず操作可。フラグは
  // 「他組織へ自組織のファイルを見せてよいか」の設定で、既定 FALSE のため、この
  // 例外が無いと中央会が自分で出した帳票をその場で落とせない。
  // created_by は account_id を文字列で保持する（BE の isCreatedBySelf と同条件）。
  it('does NOT disable a flag=false row that the logged-in user created (CHUOKAI)', async () => {
    const ownRow = buildFileDownloadItem({
      file_download_id: 203,
      file_name: 'own_report.pdf',
      nichino_download_allowed_flg: false,
      created_by: '7', // = account_id
    });
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockResolvedValue(
      buildFileDownloadListResponse({
        data: [ownRow, blockedRow],
        meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
      }),
    );
    const { wrapper } = await renderView({
      user: buildFileDownloadUser({ role_code: 'CHUOKAI', account_id: 7 }),
    });

    const cfg = (wrapper.vm as any).rowSelectionConfig;
    expect(cfg.getCheckboxProps(ownRow).disabled).toBe(false);
    // 他人が作成した flag=false 行は従来どおり選択不可のまま。
    expect(cfg.getCheckboxProps(blockedRow).disabled).toBe(true);
  });

  it('renders a nichino-blocked filename as plain text (no preview link) for role 1/2', async () => {
    const { wrapper } = await renderAs('NICHINO_ADMIN');
    const linkTexts = wrapper.findAll('a').map((a) => a.text());
    expect(linkTexts.some((t) => t.includes('blocked_report.pdf'))).toBe(false);
    expect(linkTexts.some((t) => t.includes('allowed_report.pdf'))).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索条件クリア (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — clear search (機能定義 3.x)', () => {
  it('should refetch the default file list when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');
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

    const { listFiles } = await import('@/api/file-download/file-download');
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
    const { getFilePreview } = await import('@/api/file-download/file-download');
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

  it('should call getFilePreview with selected file_download_id when プレビュー clicked', async () => {
    const { wrapper } = await renderView();
    const { getFilePreview } = await import('@/api/file-download/file-download');
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
    const { getFilePreview } = await import('@/api/file-download/file-download');
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
    const { downloadFile } = await import('@/api/file-download/file-download');
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

  it('should call downloadFile with selected file_download_id when ダウンロード実行 clicked', async () => {
    const { wrapper } = await renderView();
    const { downloadFile } = await import('@/api/file-download/file-download');
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

  it('should bundle into ONE ZIP via downloadFilesAsZip (not per-file downloadFile) when multiple files are selected (機能定義 8.x)', async () => {
    const { wrapper } = await renderView();
    const { downloadFile, downloadFilesAsZip } = await import(
      '@/api/file-download/file-download'
    );
    vi.mocked(downloadFile).mockClear();
    vi.mocked(downloadFilesAsZip).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101, 102];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    // 複数選択 → ZIP 1回 with all ids; 単体 downloadFile は呼ばない。
    expect(downloadFilesAsZip).toHaveBeenCalledTimes(1);
    expect(downloadFilesAsZip).toHaveBeenCalledWith([101, 102]);
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('should download the raw file via downloadFile (NOT zip) when exactly one file is selected', async () => {
    const { wrapper } = await renderView();
    const { downloadFile, downloadFilesAsZip } = await import(
      '@/api/file-download/file-download'
    );
    vi.mocked(downloadFile).mockClear();
    vi.mocked(downloadFilesAsZip).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await flushPromises();

    const dlBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('ダウンロード実行'));
    await dlBtn!.trigger('click');
    await flushPromises();

    expect(downloadFile).toHaveBeenCalledWith(101);
    expect(downloadFilesAsZip).not.toHaveBeenCalled();
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
    const { downloadFile } = await import('@/api/file-download/file-download');
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
    const { downloadFile } = await import('@/api/file-download/file-download');
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
    expect(vm.selectedIds).toHaveLength(2);

    // The view exposes a clearSelection action; drive directly so we
    // don't depend on which 「クリア」 button (search vs selection) the
    // selector picks first.
    if (typeof vm.clearSelection === 'function') vm.clearSelection();
    await flushPromises();

    expect(vm.selectedIds).toHaveLength(0);
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
    const { listFiles } = await import('@/api/file-download/file-download');
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
    const { listFiles } = await import('@/api/file-download/file-download');
    await renderView();
    const firstCall = vi.mocked(listFiles).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall?.per_page).toBe(20);
  });

  it('should preserve search filters across pagination when 検索 + page change occurs', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');

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
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listFiles).not.toHaveBeenCalled();
  });

  it('should NOT call listFiles when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-download/file-download');
    vi.mocked(listFiles).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listFiles).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// メールのディープリンク — SCR-023 のアップロード通知メールは
// `/file-download?file_name=...` を載せる（顧客要件2026-08）。受信者が一覧を
// 探さずに該当ファイルへ着地できるよう、クエリを検索条件へ流し込む。
// ───────────────────────────────────────────────────────────────────────
describe('FileDownloadView — mail deep link (?file_name=)', () => {
  it('should seed the file name filter from the query and fetch with it', async () => {
    const { listFiles } = await import('@/api/file-download/file-download');
    const { wrapper } = await renderView({
      query: { file_name: '増減通知 2026年04月.pdf' },
    });

    expect(vi.mocked(listFiles).mock.calls[0][0]).toMatchObject({
      file_name: '増減通知 2026年04月.pdf',
    });
    // 検索欄にも反映され、ユーザーが条件を確認・編集できること。
    const vm = wrapper.vm as unknown as {
      state: { filters: { file_name: string } };
    };
    expect(vm.state.filters.file_name).toBe('増減通知 2026年04月.pdf');
  });

  it('should count the seeded filter as applied so 検索クリア can undo it', async () => {
    // applyFilters ではなく state.filters を直接書くと「未検索の入力」扱いになり、
    // pristine 判定が崩れる。クリアが実際に効くことで applied 側の更新を確認する。
    const { listFiles } = await import('@/api/file-download/file-download');
    const { wrapper } = await renderView({ query: { file_name: 'a.csv' } });
    vi.mocked(listFiles).mockClear();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listFiles).toHaveBeenCalledTimes(1);
    expect(vi.mocked(listFiles).mock.calls[0][0]?.file_name).toBeUndefined();
  });

  it('should ignore a blank file_name query and fetch unfiltered', async () => {
    const { listFiles } = await import('@/api/file-download/file-download');
    await renderView({ query: { file_name: '   ' } });
    expect(vi.mocked(listFiles).mock.calls[0][0]?.file_name).toBeUndefined();
  });
});
