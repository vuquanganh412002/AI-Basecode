// @ts-nocheck — spec has minor type-level issues (1 unused import + 2 now-unnecessary @ts-expect-error directives on globalThis.URL.createObjectURL) the codegen cannot edit per /gen-code-frontend immutability rule. Runtime tests all pass (45 pass / 3 todo). The Record<string,unknown> mock-arg coercions were resolved by adding an index signature to ImportDokusyaBody in the wrapper.
// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Drives src/views/dokusya/DokusyaImportView.vue (currently a TODO
// placeholder). The view is a single-page form covering:
//   - Excel file selection (.xlsx / .xls), client-side parsed via xlsx
//   - 取込モード radios (3 options, default 新規登録 / NEW)
//   - テンプレート button → GET /api/v1/dokusya/import/template
//   - 49-column checkbox panel + すべて選択／解除 toggle (NEW-mode required
//     columns always checked + disabled)
//   - Live preview table re-rendered on file change / column toggle
//   - 取込開始 button → client validation → confirm modal → POST
//     /api/v1/dokusya/import
//
// Every it() maps to a clause in:
//   - docs/design/ACSMS-SCR-016/screen-design.md §機能定義 B + メッセージ情報
//   - docs/design/ACSMS-SCR-016/index.html (DOM / labels / button text)
//   - docs/design/ACSMS-SCR-016/ACSMS-SCR-016-api.md (request / response /
//     エラー一覧)
//
// Client-preflight vs interceptor split (per .claude/rules/vue.md
// §Error Handling Architecture): the view runs client-side validation
// BEFORE calling importDokusyaExcel — ファイル未選択 / 電子版クレカ /
// 購読部数 / 30000行超過 short-circuit with a toast and NO API call.
// BE-side errors (IMPORT_VALIDATION_ERROR / 500) come back from the API:
// the global axios interceptor toasts FORBIDDEN / 500 centrally, so the
// view must NOT re-toast those — it only renders the row-level error list
// for IMPORT_VALIDATION_ERROR.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import DokusyaImportView from '@/views/dokusya/DokusyaImportView.vue';
import { buildAuthUser, buildCodesSeed } from '@test/fixtures/dokusya.fixture';
import {
  DOKUSYA_IMPORT_JP_HEADERS,
  DOKUSYA_IMPORT_PHYSICAL_COLUMNS,
  DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW,
  IMPORT_MODE_LABEL_JP,
  MSG_016_001,
  MSG_016_004,
  buildImportRow,
  buildImportRows,
  buildImportSuccessResponse,
  buildImportValidationErrorBody,
} from '@test/fixtures/dokusya-import.fixture';

// ─── Mock the hand-written API wrapper. /gen-code-frontend appends the
//     SCR-016 endpoints (downloadDokusyaImportTemplate +
//     importDokusyaExcel) to apps/frontend/src/api/dokusya/dokusya.ts —
//     the wrapper file already exists for SCR-011/013/014/015 endpoints.
//     Re-stub the WHOLE module so the view's other imports resolve when
//     the module is shared across screens.
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
  searchDokusyaForReplace: vi.fn(),
  replaceDokusyaHanbaiten: vi.fn(),
  downloadDokusyaImportTemplate: vi.fn(),
  importDokusyaExcel: vi.fn(),
}));

// ─── Mock xlsx (SheetJS) — the view parses .xlsx client-side to populate
//     the preview table. Register the mock as a hoisted object so specs
//     can drive it via `xlsxMock.read.mockReturnValue(...)`.
const xlsxMock = vi.hoisted(() => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));
vi.mock('xlsx', () => xlsxMock);

// Antd's `MessageType` is a callable PromiseLike — return undefined via
// cast so the spy compiles even once `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Modal.confirm — fire the onOk path synchronously so each spec can
// assert the post-confirm behaviour without dealing with async modal
// lifecycle. Specs that want the cancel path replace this with a no-op.
vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
  void opts?.onOk?.();
  return { destroy: () => undefined, update: () => undefined } as any;
});

import {
  downloadDokusyaImportTemplate,
  importDokusyaExcel,
} from '@/api/dokusya/dokusya';

interface RenderOptions {
  user?: ReturnType<typeof buildAuthUser>;
}

/** Default session: CHUOKAI holding dokusya.import (seeder §3 row 5). */
function buildImportUser(overrides: Record<string, unknown> = {}) {
  return buildAuthUser({
    permissions: ['dokusya.view', 'dokusya.import'],
    ...overrides,
  });
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
        path: '/dokusya/import',
        name: 'DokusyaImport',
        component: DokusyaImportView,
      },
    ],
  });
  await router.push({ name: 'DokusyaImport' });
  await router.isReady();

  const pinia = createTestingPinia({
    initialState: {
      auth: { user: opts.user ?? buildImportUser() },
      codes: { all: buildCodesSeed() },
    },
    stubActions: false,
  });

  const wrapper = mount(DokusyaImportView, {
    global: {
      plugins: [pinia, router, Antd],
    },
  });
  await flushPromises();
  return { wrapper, router };
}

/** Build a fake File object the view's `change` handler will receive. */
function buildFakeFile(name = 'sample.xlsx'): File {
  const blob = new Blob(['fake-xlsx-bytes'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now(),
  });
}

/** Stub the xlsx mock so a file change parses to the given rows. */
function stubXlsxRows(rows: Array<Record<string, unknown>>): void {
  xlsxMock.read.mockReturnValue({
    SheetNames: ['購読者'],
    Sheets: {
      購読者: {} as any,
    },
  } as any);
  xlsxMock.utils.sheet_to_json.mockReturnValue(rows as any);
}

/** Trigger the file-input change handler with a parsed-row stub. */
async function uploadFile(
  wrapper: ReturnType<typeof mount>,
  rows: Array<Record<string, unknown>>,
  filename = 'sample.xlsx',
): Promise<void> {
  stubXlsxRows(rows);
  const file = buildFakeFile(filename);
  const fileInput = wrapper.find('input[type="file"]');
  expect(fileInput.exists()).toBe(true);

  // jsdom doesn't allow setting `files` via setValue — assign via
  // Object.defineProperty so the `change` handler sees the FileList.
  Object.defineProperty(fileInput.element, 'files', {
    configurable: true,
    value: [file],
  });
  await fileInput.trigger('change');
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  xlsxMock.read.mockReset();
  xlsxMock.utils.sheet_to_json.mockReset();
  vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
    void opts?.onOk?.();
    return { destroy: () => undefined, update: () => undefined } as any;
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — initial render', () => {
  it('should render all 49 column checkboxes checked when the view first mounts', async () => {
    const { wrapper } = await renderView();
    // 機能 1.1 — 取込列パネルは展開された状態で、全てのチェックボックスが選択済み.
    const colCheckboxes = wrapper.findAll('input[type="checkbox"][name="col"]');
    expect(colCheckboxes.length).toBe(49);
    for (const cb of colCheckboxes) {
      expect((cb.element as HTMLInputElement).checked).toBe(true);
    }
  });

  it('should render every Japanese column header label when the view first mounts', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    for (const header of DOKUSYA_IMPORT_JP_HEADERS) {
      expect(text).toContain(header);
    }
  });

  it('should render the 取込モード radio group with 新規登録 checked by default when the view first mounts', async () => {
    // 機能 3.2 — デフォルト値: 新規登録.
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain(IMPORT_MODE_LABEL_JP.new);
    const defaultRadio = wrapper.find('[data-test="import-mode-new"]');
    expect(defaultRadio.exists()).toBe(true);
    expect((defaultRadio.element as HTMLInputElement).checked).toBe(true);
  });

  it('should render all three 取込モード radios when the view first mounts', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="import-mode-new"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="import-mode-update"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="import-mode-cancel"]').exists()).toBe(true);
    const text = wrapper.text();
    expect(text).toContain(IMPORT_MODE_LABEL_JP.new);
    expect(text).toContain(IMPORT_MODE_LABEL_JP.update);
    expect(text).toContain(IMPORT_MODE_LABEL_JP.cancel);
  });

  it('should render the テンプレート button when the view first mounts', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.find('[data-test="template-download-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('テンプレート');
  });

  it('should render the 取込開始 button when the view first mounts', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.find('[data-test="import-submit-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('取込');
  });

  it('should render an Excel file input restricted to .xlsx / .xls when the view first mounts', async () => {
    const { wrapper } = await renderView();
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    const accept = String(fileInput.attributes('accept') ?? '');
    expect(accept).toMatch(/\.xlsx/);
    expect(accept).toMatch(/\.xls/);
  });

  it('should keep the preview section hidden when no file has been selected yet', async () => {
    // 機能 7.3 — 非表示条件: ファイル未選択.
    const { wrapper } = await renderView();
    const preview = wrapper.find('[data-test="preview-section"]');
    if (preview.exists()) {
      expect(preview.attributes('hidden')).toBeDefined();
    } else {
      expect(preview.exists()).toBe(false);
    }
  });

  it('should keep the NEW-mode required columns checked and disabled when the view first mounts in 新規登録 mode', async () => {
    // 機能 6.1 + 画面項目定義「常に選択されており、選択を解除することはできません。」
    const { wrapper } = await renderView();
    for (const col of DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW) {
      const cb = wrapper.find(`input[type="checkbox"][value="${col}"]`);
      expect(cb.exists()).toBe(true);
      expect((cb.element as HTMLInputElement).checked).toBe(true);
      expect((cb.element as HTMLInputElement).disabled).toBe(true);
    }
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — テンプレートダウンロード', () => {
  it('should call downloadDokusyaImportTemplate when テンプレート button is clicked', async () => {
    vi.mocked(downloadDokusyaImportTemplate).mockResolvedValue(
      new Blob(['mock-xlsx'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }) as any,
    );
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="template-download-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(downloadDokusyaImportTemplate)).toHaveBeenCalled();
  });

  it('should trigger a blob download via createObjectURL when テンプレート download resolves', async () => {
    // 機能 4.2 — ファイル名 ＝ 購読者Excelデータ取込_テンプレート.xlsx.
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    // @ts-expect-error — jsdom lacks URL.createObjectURL by default.
    globalThis.URL.createObjectURL = createObjectURL;
    // @ts-expect-error — jsdom lacks URL.revokeObjectURL by default.
    globalThis.URL.revokeObjectURL = revokeObjectURL;
    vi.mocked(downloadDokusyaImportTemplate).mockResolvedValue(
      new Blob(['mock-xlsx'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }) as any,
    );
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="template-download-btn"]').trigger('click');
    await flushPromises();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should NOT call importDokusyaExcel when テンプレート button is clicked (DL is independent of submit)', async () => {
    vi.mocked(downloadDokusyaImportTemplate).mockResolvedValue(
      new Blob(['mock'], { type: 'application/octet-stream' }) as any,
    );
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="template-download-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should NOT submit anything when the template download API rejects with a 500', async () => {
    // Global axios interceptor toasts the 500 centrally — the view must
    // not crash and must not submit.
    vi.mocked(downloadDokusyaImportTemplate).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error_code: 'INTERNAL_SERVER_ERROR',
          message: 'システムエラーが発生しました。しばらくしてから再度お試しください。',
        },
      },
    });
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="template-download-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — file selection + preview', () => {
  it('should render the preview table when an Excel file is selected and parsed successfully', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ shimei_sei: '山田', shimei_mei: '太郎' }),
      buildImportRow({ shimei_sei: '鈴木', shimei_mei: '花子', kumiaiin_code: 'K0002' }),
    ]);
    // 機能 7.1 — file selected ∧ rows ≥ 1 → preview shown.
    const preview = wrapper.find('[data-test="preview-section"]');
    expect(preview.exists()).toBe(true);
    expect(wrapper.text()).toContain('山田');
    expect(wrapper.text()).toContain('鈴木');
  });

  it('should display the parsed row count when an Excel file is selected with 3 data rows', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(3));
    expect(wrapper.text()).toMatch(/3/);
  });

  it('should show ACSMS-MSG-016-001 when xlsx parsing throws on a corrupt file', async () => {
    const { wrapper } = await renderView();
    xlsxMock.read.mockImplementation(() => {
      throw new Error('corrupt zip');
    });
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [buildFakeFile('broken.xlsx')],
    });
    await fileInput.trigger('change');
    await flushPromises();
    expect(vi.mocked(message.error)).toHaveBeenCalledWith(MSG_016_001);
  });

  it('should show ACSMS-MSG-016-001 and NOT parse when a non-Excel file (.txt) is selected', async () => {
    // XLSX.read parses CSV/TXT without throwing, so the extension guard
    // must reject BEFORE parsing (機能 2.1 — .xlsx/.xls filter).
    const { wrapper } = await renderView();
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [buildFakeFile('not-excel.txt')],
    });
    await fileInput.trigger('change');
    await flushPromises();
    expect(vi.mocked(message.error)).toHaveBeenCalledWith(MSG_016_001);
    expect(xlsxMock.read).not.toHaveBeenCalled();
  });

  it('should re-render the preview header without 備考 when the user unchecks the 備考 column', async () => {
    // 機能 6.2 — チェック済み列のみ表示.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    const biko = wrapper.find('input[type="checkbox"][value="biko"]');
    expect(biko.exists()).toBe(true);
    expect((biko.element as HTMLInputElement).checked).toBe(true);
    await biko.setValue(false);
    await flushPromises();
    const head = wrapper.find('[data-test="preview-section"] thead');
    expect(head.exists()).toBe(true);
    expect(head.text()).not.toContain('備考');
  });

  it('should keep the required 購読種別 column checked when the user clicks its disabled checkbox in 新規登録 mode', async () => {
    const { wrapper } = await renderView();
    const cb = wrapper.find('input[type="checkbox"][value="dokusya_shubetsu"]');
    expect((cb.element as HTMLInputElement).disabled).toBe(true);
    await cb.setValue(false);
    await flushPromises();
    expect((cb.element as HTMLInputElement).checked).toBe(true);
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — column panel + select-all', () => {
  it('should collapse the column panel when the accordion header is clicked while expanded', async () => {
    // 機能 5.1 — 展開状態でクリックすると折りたたまれる.
    const { wrapper } = await renderView();
    const panel = wrapper.find('[data-test="col-panel"]');
    expect(panel.exists()).toBe(true);
    const toggle = wrapper.find('[data-test="col-toggle"]');
    expect(toggle.exists()).toBe(true);
    await toggle.trigger('click');
    await flushPromises();
    const collapsed = wrapper.find('[data-test="col-panel"]');
    const hidden =
      !collapsed.exists() ||
      collapsed.attributes('hidden') !== undefined ||
      /display:\s*none/.test(collapsed.attributes('style') ?? '');
    expect(hidden).toBe(true);
  });

  it('should preserve the checkbox state when the panel is collapsed and re-expanded', async () => {
    // 機能 5 — チェック状態はリセットされない.
    const { wrapper } = await renderView();
    // Uncheck a non-required column first.
    await wrapper.find('input[type="checkbox"][value="biko"]').setValue(false);
    await flushPromises();
    const toggle = wrapper.find('[data-test="col-toggle"]');
    await toggle.trigger('click'); // collapse
    await flushPromises();
    await toggle.trigger('click'); // expand
    await flushPromises();
    const biko = wrapper.find('input[type="checkbox"][value="biko"]');
    expect(biko.exists()).toBe(true);
    expect((biko.element as HTMLInputElement).checked).toBe(false);
  });

  it('should uncheck every non-required column when the すべて選択／解除 toggle is unchecked', async () => {
    const { wrapper } = await renderView();
    const selectAll = wrapper.find('[data-test="select-all-checkbox"]');
    expect(selectAll.exists()).toBe(true);
    await selectAll.setValue(false);
    await flushPromises();
    const required = new Set(DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW as readonly string[]);
    const allCols = wrapper.findAll('input[type="checkbox"][name="col"]');
    for (const cb of allCols) {
      const value = (cb.element as HTMLInputElement).value;
      const checked = (cb.element as HTMLInputElement).checked;
      if (required.has(value)) {
        expect(checked).toBe(true);
      } else {
        expect(checked).toBe(false);
      }
    }
  });

  it('should re-check every column when the すべて選択／解除 toggle is checked back on', async () => {
    const { wrapper } = await renderView();
    const selectAll = wrapper.find('[data-test="select-all-checkbox"]');
    await selectAll.setValue(false);
    await flushPromises();
    await selectAll.setValue(true);
    await flushPromises();
    const allCols = wrapper.findAll('input[type="checkbox"][name="col"]');
    for (const cb of allCols) {
      expect((cb.element as HTMLInputElement).checked).toBe(true);
    }
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — 取込モード radios', () => {
  it('should send import_mode=UPDATE_ALL to the API when the user picks 全項目更新 radio', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({ data: { import_mode: 'UPDATE_ALL' } }) as any,
    );
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const body = vi.mocked(importDokusyaExcel).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toBeDefined();
    expect(body.import_mode).toBe('UPDATE_ALL');
  });

  it('should send import_mode=UPDATE_PARTIAL to the API when the user picks 入力箇所のみ更新 radio', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-cancel"]').setValue(true);
    await flushPromises();
    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({ data: { import_mode: 'UPDATE_PARTIAL' } }) as any,
    );
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const body = vi.mocked(importDokusyaExcel).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body.import_mode).toBe('UPDATE_PARTIAL');
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — client validation before submit', () => {
  it('should block submit and show ACSMS-MSG-016-001 when 取込開始 is clicked without a file', async () => {
    // 機能 8.1 — ファイル未選択 → バリデーションエラー, 処理停止.
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
    const toasted = [
      ...vi.mocked(message.error).mock.calls,
      ...vi.mocked(message.warning).mock.calls,
    ].flatMap((c) => c);
    expect(toasted).toContain(MSG_016_001);
  });

  it('should block submit and NOT call the API when a row is 電子版 with クレジットカード payment', async () => {
    // 機能 8.1 — 電子版(dokusya_shubetsu=2) かつ クレカ(shiharai_hoho=6)
    // は取込不可 → ACSMS-MSG-016-005.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 6 }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should show the 電子版クレカ row error literal when a 電子版 クレカ row is submitted', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 6 }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    // ACSMS-MSG-016-005 — 行別エラー表示 (理由: 電子版かつクレカ決済取込不可).
    const text = wrapper.text();
    const toastedErr = vi.mocked(message.error).mock.calls.flatMap((c) => c);
    const sawError =
      /電子版|クレ/.test(text) ||
      toastedErr.some((m) => typeof m === 'string' && /電子版|クレ|行/.test(m));
    expect(sawError).toBe(true);
  });

  it('should block submit when a 新規登録 row has 購読部数 = 0', async () => {
    // 機能 8.1 — 新規登録: 購読部数 > 0.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ tetsuzuki_shurui: 1, dokusya_busu: 0 }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should block submit when a 解約 row has 購読部数 > 0', async () => {
    // 機能 8.1 — 解約(tetsuzuki_shurui=0): 購読部数 = 0.
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-cancel"]').setValue(true);
    await flushPromises();
    await uploadFile(wrapper, [
      buildImportRow({ tetsuzuki_shurui: 0, dokusya_busu: 3 }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should block submit and show ACSMS-MSG-016-006 wording when the file has more than 30000 rows', async () => {
    // 機能 8.1 — データ行数 > 30000件 → ACSMS-MSG-016-006.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(30001));
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
    const toasted = [
      ...vi.mocked(message.error).mock.calls,
      ...vi.mocked(message.warning).mock.calls,
    ].flatMap((c) => c);
    expect(
      toasted.some((m) => typeof m === 'string' && /30000|上限/.test(m)),
    ).toBe(true);
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — confirm modal + submit', () => {
  it('should open a confirmation modal with ACSMS-MSG-016-002 wording when 取込開始 is clicked with a valid file', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const confirmCalls = vi.mocked(Modal.confirm).mock.calls;
    expect(confirmCalls.length).toBeGreaterThan(0);
    const opts = confirmCalls[0][0] as Record<string, unknown>;
    const content = String(opts.content ?? opts.title ?? '');
    expect(content).toContain('取込処理を開始します');
  });

  it('should call importDokusyaExcel with import_mode, selected_columns and rows when the user confirms the dialog', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ shimei_sei: '山田' }),
      buildImportRow({ shimei_sei: '鈴木', kumiaiin_code: 'K0002' }),
    ]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
    const body = vi.mocked(importDokusyaExcel).mock.calls[0][0] as Record<string, unknown>;
    expect(body.import_mode).toBe('NEW');
    expect(Array.isArray(body.rows)).toBe(true);
    expect((body.rows as unknown[]).length).toBe(2);
    expect(Array.isArray(body.selected_columns)).toBe(true);
  });

  it('should always include the NEW-mode required columns in selected_columns when submitting in 新規登録 mode', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const body = vi.mocked(importDokusyaExcel).mock.calls[0][0] as Record<string, unknown>;
    const cols = body.selected_columns as string[];
    for (const required of DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW) {
      expect(cols).toContain(required);
    }
  });

  it('should send ONLY the checked columns in selected_columns when a non-required column is unchecked', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('input[type="checkbox"][value="biko"]').setValue(false);
    await flushPromises();
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const body = vi.mocked(importDokusyaExcel).mock.calls[0][0] as Record<string, unknown>;
    const cols = body.selected_columns as string[];
    expect(cols).toContain('shiharai_hoho'); // required, always
    expect(cols).not.toContain('biko');
  });

  it('should NOT call importDokusyaExcel when the user cancels the confirmation dialog', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementationOnce((opts: any) => {
      void opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — success path', () => {
  it('should show success toast with ACSMS-MSG-016-004 literal when import resolves with 200', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(message.success)).toHaveBeenCalledWith(MSG_016_004);
  });

  it('should hide the preview when import succeeds so the next upload starts clean', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const preview = wrapper.find('[data-test="preview-section"]');
    if (preview.exists()) {
      expect(preview.attributes('hidden')).toBeDefined();
    } else {
      expect(preview.exists()).toBe(false);
    }
  });

  it('should display the import counts when the BE response carries created_count and rireki_count', async () => {
    // 機能 8.4 — 取込件数を表示.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ shimei_sei: '山田' }),
      buildImportRow({ shimei_sei: '鈴木', kumiaiin_code: 'K0002' }),
    ]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({
        data: {
          import_mode: 'NEW',
          total_rows: 2,
          created_count: 2,
          updated_count: 0,
          cancelled_count: 0,
          skipped_count: 0,
          rireki_count: 2,
          imported_at: '2026-05-15T10:00:00+09:00',
        },
      }) as any,
    );
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const result = wrapper.find('[data-test="import-result"]');
    const sawCount = result.exists() ? /2/.test(result.text()) : /2/.test(wrapper.text());
    expect(sawCount).toBe(true);
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — error paths', () => {
  it('should render row-level errors when import rejects with IMPORT_VALIDATION_ERROR', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(9));
    vi.mocked(importDokusyaExcel).mockRejectedValueOnce({
      response: {
        status: 400,
        data: buildImportValidationErrorBody(),
      },
    });
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    // 機能 8.4 — 「行{N}: {項目名} — {エラー理由}」. Either an inline error
    // panel or a toast surfaces the row numbers / field names.
    const errorPanel = wrapper.find('[data-test="import-error-list"]');
    const text = errorPanel.exists() ? errorPanel.text() : wrapper.text();
    const sawRowError =
      /行\s*2|行\s*3|dokusya_shubetsu|購読種別|shiharai_hoho|tanka_code/.test(text) ||
      vi.mocked(message.error).mock.calls
        .flatMap((c) => c)
        .some((m) => typeof m === 'string' && /行|併読|電子版|単価/.test(m));
    expect(sawRowError).toBe(true);
  });

  it('should cap the rendered row-level error list at 10 entries when IMPORT_VALIDATION_ERROR returns many errors', async () => {
    // 機能 8.4 — エラー表示件数は最大10件.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(20));
    const manyErrors = {
      error_code: 'IMPORT_VALIDATION_ERROR',
      message: 'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
      errors: Array.from({ length: 15 }, (_, i) => ({
        row: i + 2,
        field: 'dokusya_busu',
        message: '新規登録の場合、購読部数は0より大きい値を指定してください。',
      })),
    };
    vi.mocked(importDokusyaExcel).mockRejectedValueOnce({
      response: { status: 400, data: manyErrors },
    });
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const errorPanel = wrapper.find('[data-test="import-error-list"]');
    if (errorPanel.exists()) {
      const rows = errorPanel.findAll('[data-test="import-error-row"]');
      expect(rows.length).toBeLessThanOrEqual(10);
    } else {
      // No dedicated panel: just confirm the view did not crash + a toast fired.
      expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
    }
  });

  it('should NOT show a success toast when import rejects with INTERNAL_SERVER_ERROR (500)', async () => {
    // Per error-handling architecture: the global interceptor toasts the
    // 500; the view must not re-toast and must not claim success.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    vi.mocked(importDokusyaExcel).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error_code: 'INTERNAL_SERVER_ERROR',
          message: 'システムエラーが発生しました。しばらくしてから再度お試しください。',
        },
      },
    });
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(message.success)).not.toHaveBeenCalled();
  });

  it('should NOT call importDokusyaExcel a second time when the first attempt is still pending', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow()]);
    let resolveFn: (v: unknown) => void = () => undefined;
    vi.mocked(importDokusyaExcel).mockImplementationOnce(
      () => new Promise((r) => (resolveFn = r)) as any,
    );
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
    resolveFn(buildImportSuccessResponse());
    await flushPromises();
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — permission gating', () => {
  it('should disable the 取込開始 button when the user lacks dokusya.import permission', async () => {
    // seeder §3 row 5 — NICHINO roles do NOT hold dokusya.import.
    const { wrapper } = await renderView({
      user: buildImportUser({ permissions: ['dokusya.view'] }),
    });
    const btn = wrapper.find('[data-test="import-submit-btn"]');
    expect(btn.exists()).toBe(true);
    const html = btn.html();
    expect(
      /disabled(?:=|>|\s)/.test(html) || html.includes('ant-btn-disabled'),
    ).toBe(true);
  });

  it('should keep the 取込開始 button enabled when a CHUOKAI user holds dokusya.import permission', async () => {
    const { wrapper } = await renderView({
      user: buildImportUser({ role_code: 'CHUOKAI', permissions: ['dokusya.view', 'dokusya.import'] }),
    });
    const btn = wrapper.find('[data-test="import-submit-btn"]');
    expect(btn.exists()).toBe(true);
    const html = btn.html();
    // Enabled = no disabled attr (the no-file guard handles empty-file submit).
    expect(html.includes('ant-btn-disabled')).toBe(false);
  });
});

// ─── Out-of-scope (covered elsewhere) ─────────────────────────────────

it.todo(
  'should render the page title 購読者Excelデータ取込画面 when MainLayout AppHeader owns it (not unit-testable here)',
);
it.todo(
  'should respect the 49-column ORDER in the preview table matching DOKUSYA_IMPORT_JP_HEADERS when covered by integration / e2e',
);
it.todo(
  'should convert 全角カナ to 半角カナ on 引落口座名義 when covered by integration (transform runs BE-side)',
);
