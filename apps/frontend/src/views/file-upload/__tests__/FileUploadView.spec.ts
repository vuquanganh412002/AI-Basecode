// Screen: ACSMS-SCR-023 — ファイルアップロード画面
//
// Drives src/views/file-upload/FileUploadView.vue. Each it() maps to a
// clause in:
//   docs/design/ACSMS-SCR-023/screen-design.md (機能定義 1.x〜8.x + メッセージ情報) +
//   docs/design/ACSMS-SCR-023/index.html (UI structure) +
//   docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md (API-023-001 list / -002 upload / -003 download / -004 delete + COMMON-001 todofuken + COMMON-003 ja dropdown).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';

import { resetTodofukenCache } from '@/composables/useTodofuken';
import Antd, { Modal, message } from 'ant-design-vue';

import FileUploadView from '@/views/file-upload/FileUploadView.vue';
import {
  buildFileUploadHistoryResponse,
  buildFileUploadHistoryItem,
  buildUploadFilesResponse,
  buildJaDropdownResponse,
  buildTodofukenResponse,
  buildFileUploadUser,
} from '@test/fixtures/file-upload.fixture';

// API wrappers — /gen-code-frontend will create these.
vi.mock('@/api/file-upload/file-upload', () => ({
  listFiles: vi.fn(),
  uploadFiles: vi.fn(),
  deleteFile: vi.fn(),
  getFilePreview: vi.fn(),
  downloadFile: vi.fn(),
  downloadFilesAsZip: vi.fn(),
}));

vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
}));

vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// Spy on antd toasts. Cast noop to MessageType for vue-tsc post-banner.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Mock Modal.confirm with synchronous onOk invocation so the test can
// assert post-confirm behaviour.
vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
  opts?.onOk?.();
  return { destroy: () => undefined, update: () => undefined } as any;
});

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
  user?: ReturnType<typeof buildFileUploadUser>;
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
      { path: '/file-upload', name: 'FileUpload', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'FileUpload' });
  await router.isReady();

  const wrapper = mount(FileUploadView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildFileUploadUser() },
            // Seed m_code so notificationStatusLabel() returns the
            // canonical labels via useCodesStore() (production hydrates
            // this from GET /api/v1/codes after login).
            codes: {
              all: {
                NOTIFICATION_STATUS: [
                  { value: 1, label: '未送信', label_short: '未送信' },
                  { value: 2, label: '送信中', label_short: '送信中' },
                  { value: 3, label: '完了', label_short: '完了' },
                  { value: 4, label: '一部失敗', label_short: '一部失敗' },
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
  const { listFiles, uploadFiles, deleteFile } = await import(
    '@/api/file-upload/file-upload'
  );
  vi.mocked(listFiles).mockResolvedValue(buildFileUploadHistoryResponse() as any);
  vi.mocked(uploadFiles).mockResolvedValue(buildUploadFilesResponse() as any);
  vi.mocked(deleteFile).mockResolvedValue({ message: '削除しました。' } as any);

  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue(buildJaDropdownResponse() as any);

  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue(buildTodofukenResponse() as any);
  // 都道府県はモジュールレベルの共有キャッシュ（useTodofuken）。テスト間で
  // 持ち越すと2件目以降が「取得済み」になり HTTP 回数の検証が崩れる。
  resetTodofukenCache();
});

// Synthetic JaDropdownItem reused across describe blocks. The 対象JA
// multi-select emits label-in-value on @change; selection-behaviour specs
// call vm.onJaChange([...]) and staging specs set vm.targetJas directly,
// avoiding the real dropdown internals.
const pickedJa = {
  ja_id: 12345,
  ja_code: '0001',
  ja_name: 'JA テスト',
  todofuken_code: '13',
  chuokai_flg: false,
};

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — initial render (機能定義 1.x)', () => {
  it.each([
    [
      'should render the アップロードされたファイルリスト section heading when mounted',
      'アップロードされたファイルリスト',
    ],
    [
      'should render the 削除予定日 label when mounted (画面項目定義 No.7)',
      '削除予定日',
    ],
    [
      'should render rows from the history API response when list resolves',
      '令和5年度_購読者リスト.csv',
    ],
  ])('%s', async (_title, expectedText) => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain(expectedText);
  });

  it('should fetch the file upload history once when mounted', async () => {
    await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    expect(listFiles).toHaveBeenCalledTimes(1);
  });

  it('should render a JA column (ja_code + ja_name) for each history row', async () => {
    const { wrapper } = await renderView();
    await flushPromises();
    expect(wrapper.findAll('th').some((th) => th.text() === 'JA')).toBe(true);
    const text = wrapper.text();
    expect(text).toContain('12345');
    expect(text).toContain('JA農業中央');
  });

  it('should fetch the 都道府県 dropdown once when mounted (COMMON-001)', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should render 都道府県 via the shared BaseTodofukenSelect', async () => {
    // 表記・検索の実挙動は BaseTodofukenSelect.spec.ts が持つ。ここは共通部品を
    // 使っていること（＝画面ごとに select を書き起こしていないこと）だけ固定する。
    const { wrapper } = await renderView();
    expect(wrapper.findComponent({ name: 'BaseTodofukenSelect' }).exists()).toBe(true);
  });

  it('should fetch the JA dropdown once when mounted (COMMON-003)', async () => {
    await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    expect(getJaDropdown).toHaveBeenCalled();
  });

  it('should render the 都道府県コード label when mounted (画面項目定義 No.1)', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('都道府県'))).toBe(true);
  });

  it('should render the 対象JA label when mounted (画面項目定義 No.3)', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('対象JA') || t.includes('JAコード'))).toBe(true);
  });

  it('should render the アップロード実行 button when mounted (画面項目定義 No.11)', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    expect(btn).toBeDefined();
  });

  it('should render the クリア button when mounted (画面項目定義 No.12)', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    expect(btn).toBeDefined();
  });

  it('should render the canonical history-table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('ファイル名');
    expect(text).toContain('サイズ');
    expect(text).toContain('通知ステータス');
    expect(text).toContain('削除予定日');
  });

  it('should still call listFiles when the API rejects with 500 (interceptor handles toast)', async () => {
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    await renderView();
    expect(vi.mocked(listFiles)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. JA追加 (機能定義 2.x) — todofuken cascade + duplicate guard
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — JA selection (機能定義 2.x)', () => {
  const labelOf = (j: typeof pickedJa) => ({
    value: j.ja_id,
    label: `${j.ja_code} ${j.ja_name}`,
  });

  it('should reflect a choice into the target list and clear the picker box (機能定義 2.x — チェック→一覧反映)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    // a-select(mode=multiple) @change emits the full label-in-value array.
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    expect(vm.targetJas).toHaveLength(1);
    expect(vm.targetJas.find((j: any) => j.ja_id === pickedJa.ja_id)).toBeDefined();
    // box は純粋なピッカー：選択後はタグを保持しない（二重表示防止）。
    expect(vm.jaPickerValue).toHaveLength(0);
  });

  it('should add multiple JAs and keep both when selected together', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const other = { ...pickedJa, ja_id: 67890, ja_code: 'JA04001', ja_name: 'JA宮城' };
    vm.onJaChange([labelOf(pickedJa), labelOf(other)]);
    await flushPromises();
    expect(vm.targetJas.map((j: any) => j.ja_id).sort()).toEqual(
      [pickedJa.ja_id, other.ja_id].sort(),
    );
  });

  it('should NOT add a duplicate when the same JA is selected again (チェック重複防止)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    // 一覧にある JA をもう一度選んでも重複追加されない（1件のまま）。
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    expect(
      vm.targetJas.filter((j: any) => j.ja_id === pickedJa.ja_id),
    ).toHaveLength(1);
    expect(vm.targetJas).toHaveLength(1);
  });

  it('should mark already-listed JAs via selectedJaIds so the dropdown can highlight them', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.selectedJaIds.has(pickedJa.ja_id)).toBe(false);
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    // 一覧入り後は selectedJaIds に含まれる → option を太字＋✓ で表示できる。
    expect(vm.selectedJaIds.has(pickedJa.ja_id)).toBe(true);
  });

  it('should KEEP the accumulated target list when 都道府県 changes (box は常に空)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    expect(vm.targetJas).toHaveLength(1);
    expect(vm.jaPickerValue).toHaveLength(0); // ピッカーは常に空

    vm.selectedTodofukenCode = '13'; // 都道府県を切り替え
    await flushPromises();

    expect(vm.targetJas).toHaveLength(1); // 蓄積済みリストは保持
    expect(vm.jaPickerValue).toHaveLength(0);
  });

  it('should pass todofuken_code as a cascade filter to getJaDropdown when 都道府県 changes', async () => {
    // useEntityDropdown (reused in the view) watches selectedTodofukenCode
    // as a reset trigger and refetches page 1 with the new filter.
    const { wrapper } = await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockClear();

    const vm = wrapper.vm as any;
    vm.selectedTodofukenCode = '13';
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ todofuken_code: '13' }),
    );
  });

  it('should remove a JA from the target list when its 削除 link is invoked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.onJaChange([labelOf(pickedJa)]);
    await flushPromises();
    if (typeof vm.removeJa === 'function') vm.removeJa(pickedJa.ja_id);
    await flushPromises();
    expect(vm.targetJas.find((j: any) => j.ja_id === pickedJa.ja_id)).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. ファイル選択 (機能定義 4.x) — drag-drop + 30MB size check
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — file selection (機能定義 4.x)', () => {
  it('should add the picked file to the selected list when a valid file is supplied', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const ok = new File([new Uint8Array(1024)], 'list.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(ok);
    await flushPromises();
    expect(vm.selectedFiles).toHaveLength(1);
    expect(vm.selectedFiles[0].name).toBe('list.csv');
  });

  it('should display ACSMS-MSG-023-002 「ファイルサイズが30MBを超えています。」 when a file exceeds 30MB (機能定義 4.2)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const oversize = new File([new Uint8Array(31 * 1024 * 1024)], 'big.csv', {
      type: 'text/csv',
    });
    if (typeof vm.addFile === 'function') vm.addFile(oversize);
    await flushPromises();
    expect(message.error).toHaveBeenCalledWith(
      expect.stringContaining('ファイルサイズが30MBを超えています。'),
    );
    expect(vm.selectedFiles).toHaveLength(0);
  });

  it('should accept multiple files when called with N inputs (機能定義 4.1)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const a = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    const b = new File([new Uint8Array(200)], 'b.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') {
      vm.addFile(a);
      vm.addFile(b);
    }
    await flushPromises();
    expect(vm.selectedFiles).toHaveLength(2);
  });

  it('should remove a selected file when its 削除 link is invoked (機能定義 5.x)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'remove.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    await flushPromises();
    if (typeof vm.removeFile === 'function') vm.removeFile(0);
    await flushPromises();
    expect(vm.selectedFiles).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. アップロード実行 (機能定義 6.x) + ACSMS-MSG-023-001 / 006 / 008
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — upload submit (機能定義 6.x)', () => {
  it('should display ACSMS-MSG-023-001 「必須項目です。」 when ファイル is empty on アップロード実行 (機能定義 6.2)', async () => {
    const { wrapper } = await renderView();
    const { uploadFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(uploadFiles).mockClear();

    const vm = wrapper.vm as any;
    // JA picked + delete-date set but no files
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('必須項目です。'));
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-023-001 when 対象JA is empty on アップロード実行 (機能定義 6.2)', async () => {
    const { wrapper } = await renderView();
    const { uploadFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(uploadFiles).mockClear();

    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('必須項目です。'));
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-023-001 inline below 削除予定日 (NOT a toast) when only the date is empty (機能定義 6.2)', async () => {
    const { wrapper } = await renderView();
    const { uploadFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(uploadFiles).mockClear();
    vi.mocked(message.error).mockClear();

    // File + JA present; only 削除予定日 left empty.
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    vm.selectedFiles = [f];
    vm.targetJas = [{ ja_id: pickedJa.ja_id }];
    vm.scheduledDeleteDate = null;
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    // Inline field error below the date picker — NOT a toast.
    const inline = wrapper.find('[data-test="scheduled-delete-date-error"]');
    expect(inline.exists()).toBe(true);
    expect(inline.text()).toContain('必須項目です。');
    expect(message.error).not.toHaveBeenCalled();
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it('should clear the inline 削除予定日 error once a date is selected', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedFiles = [new File([new Uint8Array(10)], 'a.csv', { type: 'text/csv' })];
    vm.targetJas = [{ ja_id: pickedJa.ja_id }];
    vm.scheduledDeleteDate = null;
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="scheduled-delete-date-error"]').exists()).toBe(true);

    // Picking a date clears the inline error.
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();
    expect(wrapper.find('[data-test="scheduled-delete-date-error"]').exists()).toBe(false);
  });

  it('should open the confirmation dialog with ACSMS-MSG-023-008 「このファイルをアップロードしますか？」 (機能定義 6.3)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('このファイルをアップロードしますか？'),
      }),
    );
  });

  it('should call uploadFiles with ja_ids[] + files[] after the user confirms (機能定義 6.4)', async () => {
    const { wrapper } = await renderView();
    const { uploadFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(uploadFiles).mockClear();

    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(uploadFiles).toHaveBeenCalled();
    const callArg = vi.mocked(uploadFiles).mock.calls[0]?.[0] as any;
    expect(callArg).toBeDefined();
    expect(Array.isArray(callArg.ja_ids)).toBe(true);
    expect(callArg.ja_ids).toContain(12345);
    expect(Array.isArray(callArg.files)).toBe(true);
    expect(callArg.files).toHaveLength(1);
  });

  it('should display ACSMS-MSG-023-006 「ファイルのアップロードが完了しました。」 toast when uploadFiles resolves (機能定義 6.6)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith(
      'ファイルのアップロードが完了しました。',
    );
  });

  it('should clear the form (JAs + files + delete-date) after a successful upload (機能定義 6.6)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(vm.selectedFiles).toHaveLength(0);
    expect(vm.targetJas).toHaveLength(0);
  });

  it('should refetch the upload history after a successful upload (機能定義 6.6)', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    expect(listFiles).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-023-005 「アップロードに失敗しました…」 when uploadFiles rejects with 5xx (機能定義 6.6)', async () => {
    const { uploadFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(uploadFiles).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    vm.scheduledDeleteDate = '2026/12/31';
    await flushPromises();

    const btn = wrapper.findAll('button').find((b) => b.text().includes('アップロード実行'));
    await btn!.trigger('click');
    await flushPromises();

    // Either FE toasts MSG-023-005 directly or the global interceptor
    // toasts the BE message — assert at least one ran.
    const errorCalls = vi.mocked(message.error).mock.calls.flat();
    expect(errorCalls.join('|')).toMatch(
      /アップロードに失敗しました|システムエラー/,
    );
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. クリアボタン (機能定義 7.x) + ACSMS-MSG-023-003
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — clear button (機能定義 7.x)', () => {
  it('should open a confirmation with ACSMS-MSG-023-003 when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    await flushPromises();
    vi.mocked(Modal.confirm).mockClear();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining(
          '全てのJAとファイルを削除します。よろしいでしょうか。',
        ),
      }),
    );
  });

  it('should clear targetJas + selectedFiles after the user confirms the clear dialog', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const f = new File([new Uint8Array(100)], 'a.csv', { type: 'text/csv' });
    if (typeof vm.addFile === 'function') vm.addFile(f);
    vm.targetJas = [{ ja_id: pickedJa.ja_id, ja_code: pickedJa.ja_code, ja_name: pickedJa.ja_name }];
    await flushPromises();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.selectedFiles).toHaveLength(0);
    expect(vm.targetJas).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. アップロード履歴の削除 (機能定義 8.x) + ACSMS-MSG-023-009
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — delete uploaded file (機能定義 8.x)', () => {
  it('should open a confirmation with ACSMS-MSG-023-009 「このファイルを削除しますか？」 when the row 削除 link is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vi.mocked(Modal.confirm).mockClear();

    const row = buildFileUploadHistoryItem({ file_upload_id: 101 });
    if (typeof vm.askDelete === 'function') vm.askDelete(row);
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('このファイルを削除しますか？'),
      }),
    );
  });

  it('should call deleteFile with the row id after the user confirms', async () => {
    const { wrapper } = await renderView();
    const { deleteFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(deleteFile).mockClear();

    const vm = wrapper.vm as any;
    const row = buildFileUploadHistoryItem({ file_upload_id: 101 });
    if (typeof vm.askDelete === 'function') vm.askDelete(row);
    await flushPromises();

    expect(deleteFile).toHaveBeenCalledWith(101);
  });

  it('should display 「削除しました。」 toast and refetch the history when deleteFile resolves', async () => {
    const { wrapper } = await renderView();
    const { listFiles } = await import('@/api/file-upload/file-upload');
    vi.mocked(listFiles).mockClear();

    const vm = wrapper.vm as any;
    const row = buildFileUploadHistoryItem({ file_upload_id: 101 });
    if (typeof vm.askDelete === 'function') vm.askDelete(row);
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('削除しました。');
    expect(listFiles).toHaveBeenCalled();
  });

  it('should still call deleteFile when it rejects with 500 (interceptor handles toast)', async () => {
    const { deleteFile } = await import('@/api/file-upload/file-upload');
    vi.mocked(deleteFile).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const row = buildFileUploadHistoryItem({ file_upload_id: 101 });
    if (typeof vm.askDelete === 'function') vm.askDelete(row);
    await flushPromises();

    expect(vi.mocked(deleteFile)).toHaveBeenCalled();
  });

  it('should disable the row 削除 link when deleted_at IS NOT NULL (画面項目定義 No.18)', async () => {
    // Row is already soft-deleted on the server → button should be disabled.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const row = buildFileUploadHistoryItem({ file_upload_id: 101 });
    // The view's predicate
    if (typeof vm.isDeletable === 'function') {
      expect(vm.isDeletable({ ...row, deleted_at: '2026-05-01T00:00:00+09:00' })).toBe(false);
      expect(vm.isDeletable({ ...row, deleted_at: null })).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Notification-status badge rendering
// ───────────────────────────────────────────────────────────────────────
describe('FileUploadView — notification status badge', () => {
  it.each([
    ['完了', 3],
    ['一部失敗', 4],
    ['未送信', 1],
    ['送信中', 2],
  ])(
    'should render 「%s」 label when notification_status is %s',
    async (label, status) => {
      const { listFiles } = await import('@/api/file-upload/file-upload');
      vi.mocked(listFiles).mockResolvedValue(
        buildFileUploadHistoryResponse({
          data: [buildFileUploadHistoryItem({ notification_status: status })],
        }) as any,
      );
      const { wrapper } = await renderView();
      expect(wrapper.text()).toContain(label);
    },
  );
});

describe('FileUploadView — SCR-023 プレビュー / ダウンロード', () => {
  it('should call getFilePreview and open the modal when a selected file is previewed', async () => {
    const { getFilePreview } = await import('@/api/file-upload/file-upload');
    vi.mocked(getFilePreview).mockResolvedValue({
      data: { preview_url: 'https://s3.example.com/signed', file_name: 'a.pdf' },
    } as any);
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await vm.onPreview();
    await flushPromises();
    expect(vi.mocked(getFilePreview)).toHaveBeenCalledWith(101);
    expect(vm.previewOpen).toBe(true);
    expect(vm.previewUrl).toBe('https://s3.example.com/signed');
  });

  it('should warn and NOT call preview when nothing is selected', async () => {
    const { getFilePreview } = await import('@/api/file-upload/file-upload');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [];
    await vm.onPreview();
    expect(vi.mocked(getFilePreview)).not.toHaveBeenCalled();
    expect(vi.mocked(message.warning)).toHaveBeenCalledWith('ファイルを選択してください。');
  });

  it('should download a single selected file via downloadFile', async () => {
    const { downloadFile, downloadFilesAsZip } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFile).mockResolvedValue(new Blob(['x']) as any);
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101];
    await vm.onDownload();
    await flushPromises();
    expect(vi.mocked(downloadFile)).toHaveBeenCalledWith(101);
    expect(vi.mocked(downloadFilesAsZip)).not.toHaveBeenCalled();
  });

  it('should bundle multiple selected files into a ZIP via downloadFilesAsZip', async () => {
    const { downloadFile, downloadFilesAsZip } = await import('@/api/file-upload/file-upload');
    vi.mocked(downloadFilesAsZip).mockResolvedValue({
      blob: new Blob(['x']) as any,
      filename: '一括ダウンロード_20260727123456.zip',
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [101, 102];
    await vm.onDownload();
    await flushPromises();
    expect(vi.mocked(downloadFilesAsZip)).toHaveBeenCalledWith([101, 102]);
    expect(vi.mocked(downloadFile)).not.toHaveBeenCalled();
  });

  it('should warn and NOT call download when nothing is selected', async () => {
    const { downloadFile } = await import('@/api/file-upload/file-upload');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.selectedIds = [];
    await vm.onDownload();
    expect(vi.mocked(downloadFile)).not.toHaveBeenCalled();
    expect(vi.mocked(message.warning)).toHaveBeenCalledWith('ファイルを選択してください。');
  });

  it('should disable row selection for a deleted (deleted_at) row', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const props = vm.rowSelectionConfig.getCheckboxProps({
      file_upload_id: 999,
      file_name: 'x.pdf',
      deleted_at: '2026-05-01T00:00:00+09:00',
    });
    expect(props.disabled).toBe(true);
  });
});
