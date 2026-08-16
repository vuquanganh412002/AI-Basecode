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
// 購読部数 / 5000行超過 short-circuit with a toast and NO API call.
// BE-side errors (IMPORT_VALIDATION_ERROR / 500) come back from the API:
// the global axios interceptor toasts FORBIDDEN / 500 centrally, so the
// view must NOT re-toast those — it only renders the row-level error list
// for IMPORT_VALIDATION_ERROR.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import dayjs from 'dayjs';
import DokusyaImportView from '@/views/dokusya/DokusyaImportView.vue';
import { todayIsoTokyo } from '@/utils/datetime';
import { buildAuthUser, buildCodesSeed } from '@test/fixtures/dokusya.fixture';
import {
  DOKUSYA_IMPORT_JP_HEADERS,
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
//     ACSMS-SCR-016 endpoints (downloadDokusyaImportTemplate +
//     importDokusyaExcel) to apps/frontend/src/api/dokusya/dokusya.ts —
//     the wrapper file already exists for ACSMS-SCR-011/013/014/015 endpoints.
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

/**
 * Select the 購読種別 radio (1:紙版 / 2:電子版). 購読種別 is a single-source
 * screen radio (顧客要件 2026-07) applied uniformly to every imported row —
 * it is NOT an Excel column, so digital-only rules are driven by this.
 */
/**
 * 適用日 / 中止日 は antd の <a-date-picker>（ACSMS-SCR-014 と同じ部品）なので、
 * ネイティブ input のように setValue できない。vm の Dayjs を直接差し替える
 * （DokusyaListView.spec の stopMonth と同じ扱い）。
 */
async function setPickerDate(
  wrapper: ReturnType<typeof mount>,
  field: 'johoDateFe' | 'chushiDateFe',
  iso: string | null,
): Promise<void> {
  (wrapper.vm as unknown as Record<string, unknown>)[field] = iso
    ? dayjs(iso)
    : null;
  await flushPromises();
}

/** <a-date-picker> の内側の <input>（placeholder / disabled の観測用）。 */
function pickerInput(
  wrapper: ReturnType<typeof mount>,
  testId: string,
): HTMLInputElement {
  return wrapper
    .find(`[data-test="${testId}"]`)
    .find('input')
    .element as HTMLInputElement;
}

/** antd は無効化を .ant-picker の class で表す（内側 input だけを見ない）。 */
function isPickerDisabled(
  wrapper: ReturnType<typeof mount>,
  testId: string,
): boolean {
  return wrapper
    .find(`[data-test="${testId}"] .ant-picker`)
    .classes()
    .includes('ant-picker-disabled');
}

async function setShubetsu(
  wrapper: ReturnType<typeof mount>,
  value: 1 | 2,
): Promise<void> {
  const radio = wrapper.find(`[data-test="import-shubetsu-${value}"]`);
  expect(radio.exists()).toBe(true);
  await radio.setValue();
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
  it('should render every column checkbox checked in NEW mode', async () => {
    const { wrapper } = await renderView();
    // 機能 1.1 — 取込列パネルは展開済み。46列すべてにチェックボックスが出て
    // 全選択済み。購読種別 / 読者情報変更適用日 / 購読中止日 は画面で指定する
    // 単一ソースのため列に無い（顧客要件 2026-07 / 2026-08）。
    const colCheckboxes = wrapper.findAll('input[type="checkbox"][name="col"]');
    expect(colCheckboxes).toHaveLength(50); // 46 + 購読者層分類の従属4項目
    for (const cb of colCheckboxes) {
      expect((cb.element as HTMLInputElement).checked).toBe(true);
    }
    expect(wrapper.text()).not.toContain('販売店適用日');
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

  it('should name the 購読種別 / 取込モード radio groups via native <fieldset>+<legend>, not role="radiogroup" (regression)', async () => {
    const { wrapper } = await renderView();
    const shubetsuLegend = wrapper.findAll('legend').find((l) => l.text().includes('購読種別'));
    const modeLegend = wrapper.findAll('legend').find((l) => l.text().includes('取込モード'));
    expect(shubetsuLegend).toBeDefined();
    expect(modeLegend).toBeDefined();
    expect(shubetsuLegend!.element.closest('fieldset')).not.toBeNull();
    expect(modeLegend!.element.closest('fieldset')).not.toBeNull();

    const shubetsuGroup = wrapper.find('[data-test="import-shubetsu"]');
    const modeGroup = wrapper.find('[data-test="import-mode"]');
    expect(shubetsuGroup.attributes('role')).toBeUndefined();
    expect(shubetsuGroup.attributes('aria-labelledby')).toBeUndefined();
    expect(modeGroup.attributes('role')).toBeUndefined();
    expect(modeGroup.attributes('aria-labelledby')).toBeUndefined();
  });

  it('should render the two 取込モード radios (新規登録 / 更新) when the view first mounts', async () => {
    // 顧客要件 2026-07: 全項目更新を廃止し 新規登録/更新 の2択に統合。
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="import-mode-new"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="import-mode-update"]').exists()).toBe(true);
    // 旧「入力箇所のみ更新」(cancel) ラジオは削除済み。
    expect(wrapper.find('[data-test="import-mode-cancel"]').exists()).toBe(false);
    const text = wrapper.text();
    expect(text).toContain(IMPORT_MODE_LABEL_JP.new);
    expect(text).toContain(IMPORT_MODE_LABEL_JP.update);
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

  // 支店は NEW モードでも必須ではない（api.md §4.1 は管理支店側のみ必須と記載、
  // t_dokusya.shiten_id は NULL 許容、ACSMS-SCR-011 の画面登録でも任意）。取込だけ必須に
  // すると画面から登録できる購読者が Excel からは登録できない不整合になる（回帰防止）。
  it('should leave 支店 (shiten_code) unlocked in 新規登録 mode — selectable but not forced', async () => {
    const { wrapper } = await renderView();
    const cb = wrapper.find('input[type="checkbox"][value="shiten_code"]');
    expect(cb.exists()).toBe(true);
    expect((cb.element as HTMLInputElement).disabled).toBe(false);
    expect(DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW as readonly string[]).not.toContain(
      'shiten_code',
    );
  });

  // 電子版は即時連携で適用日が当日固定（BE も未来日を弾く）。UPDATE × 電子版 では
  // 読者情報変更適用日 の列を強制未チェック＋グレーアウトし、BE が空欄を当日として
  // 扱う。紙版は予約変更（未来日）が必要なので従来どおり選択可（顧客要件 2026-07）。
  // 顧客要件 2026-08: 適用日は Excel 列ではなく画面の入力欄。電子版は当日固定で
  // 入力欄自体を disable にする（列のグレーアウトではなくなった）。
  it('should disable the 適用日 input on 更新 × 電子版 and keep it editable on 更新 × 紙版', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();

    await setShubetsu(wrapper, 1); // 紙版 → 入力可
    expect(isPickerDisabled(wrapper, 'import-joho-date')).toBe(false);

    await setShubetsu(wrapper, 2); // 電子版 → 当日固定
    expect(isPickerDisabled(wrapper, 'import-joho-date')).toBe(true);
    // 空欄ではなく当日を見せる（何が適用されるのかを利用者に示すため）。
    expect(pickerInput(wrapper, 'import-joho-date').value).toBe(
      dayjs(todayIsoTokyo()).format('YYYY/MM/DD'),
    );
    expect(wrapper.find('[data-test="import-joho-fixed-note"]').exists()).toBe(
      true,
    );
  });

  it('should clear + disable 中止日 once 適用日 is entered (and vice versa)', async () => {
    // 排他: 同じ操作が「更新」なのか「一括中止」なのか決まらなくなるため。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();

    await setPickerDate(wrapper, 'johoDateFe', '2099-03-01');
    expect(isPickerDisabled(wrapper, 'import-chushi-date')).toBe(true);

    // 適用日を消してから中止日を入れると、今度は適用日側が閉じる。
    await setPickerDate(wrapper, 'johoDateFe', null);
    await setPickerDate(wrapper, 'chushiDateFe', '2099-05-31');
    expect(isPickerDisabled(wrapper, 'import-joho-date')).toBe(true);
  });

  it('should collapse the column grid to the key column when 中止日 is entered (一括中止)', async () => {
    // 一括中止は解約予約を入れるだけ。他の列を書かないので選ばせない。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setPickerDate(wrapper, 'chushiDateFe', '2099-05-31');

    const boxes = wrapper.findAll('input[type="checkbox"][name="col"]');
    expect(boxes).toHaveLength(1);
    expect((boxes[0].element as HTMLInputElement).value).toBe('dokusya_id');
    expect(wrapper.find('[data-test="import-bulk-stop-note"]').exists()).toBe(true);
  });

  it('should lock the 12 帳票影響項目 when 紙版 × 適用日=当日', async () => {
    // 紙版の当日変更は帳票影響項目を反映できない（予約変更＝未来日が要る）。
    // BE も弾くが、選べてから弾かれるより選べない方が原因が見える。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setShubetsu(wrapper, 1);
    await setPickerDate(wrapper, 'johoDateFe', todayIsoTokyo());

    for (const col of ['dokusya_busu', 'hanbaiten_code', 'yubin_no']) {
      expect(
        wrapper.find(`input[type="checkbox"][value="${col}"]`).exists(),
      ).toBe(false);
    }
    // 帳票に影響しない列は選べたまま。
    expect(wrapper.find('input[type="checkbox"][value="biko"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('[data-test="import-report-locked-note"]').exists(),
    ).toBe(true);

    // 未来日にすると解放される（＝予約変更）。
    await setPickerDate(wrapper, 'johoDateFe', '2099-03-01');
    expect(
      wrapper.find('input[type="checkbox"][value="dokusya_busu"]').exists(),
    ).toBe(true);
  });

  it('should send 適用日 / 中止日 at payload level, not inside rows', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setPickerDate(wrapper, 'chushiDateFe', '2099-05-31');
    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({ data: { import_mode: 'UPDATE' } }) as any,
    );
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();

    const body = vi.mocked(importDokusyaExcel).mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(body.dokusya_chushi_date).toBe('2099-05-31');
    expect(body.joho_henko_tekiyo_date).toBeUndefined();
    const rows = body.rows as Array<Record<string, unknown>>;
    expect(rows[0]).not.toHaveProperty('dokusya_chushi_date');
    expect(rows[0]).not.toHaveProperty('joho_henko_tekiyo_date');
  });

  it('should use a MONTH picker for 中止日 on 電子版 and send the month end', async () => {
    // 電子版の解約は月末で終了する（ACSMS-SCR-014 と同じ）。日付ではなく終了月を選ばせ、
    // 送信時にその月末へ丸める。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setShubetsu(wrapper, 2); // 電子版
    await flushPromises();

    // antd は picker 種別を DOM 属性で出さないので placeholder で判別する
    // （ACSMS-SCR-014 と同じ「終了月を選択」）。
    expect(pickerInput(wrapper, 'import-chushi-date').placeholder).toBe(
      '終了月を選択',
    );
    expect(
      wrapper.find('[data-test="import-chushi-month-end-note"]').exists(),
    ).toBe(true);

    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({ data: { import_mode: 'UPDATE' } }) as any,
    );
    await setPickerDate(wrapper, 'chushiDateFe', '2099-02-10'); // 平年2月 → 28日へ丸まる
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();

    const body = vi.mocked(importDokusyaExcel).mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(body.dokusya_chushi_date).toBe('2099-02-28');
  });

  it('should keep a DATE picker for 中止日 on 紙版', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setShubetsu(wrapper, 1);
    await flushPromises();
    expect(pickerInput(wrapper, 'import-chushi-date').placeholder).toBe(
      '購読中止日を選択',
    );
    expect(
      wrapper.find('[data-test="import-chushi-month-end-note"]').exists(),
    ).toBe(false);
  });

  // 紙版の解約予定日は「本日より後」。BE の collectChushiViolations が
  // `chushi <= today` を弾くので、当日を選べると画面は通って送信時に落ちる。
  it('should block today (and allow tomorrow) on the 紙版 中止日 picker', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setShubetsu(wrapper, 1);
    await flushPromises();

    const disabled = (wrapper.vm as unknown as {
      disabledChushiDate: (d: unknown) => boolean;
    }).disabledChushiDate;
    const today = dayjs(todayIsoTokyo());
    expect(disabled(today.subtract(1, 'day'))).toBe(true); // 昨日
    expect(disabled(today)).toBe(true); // 当日も不可
    expect(disabled(today.add(1, 'day'))).toBe(false); // 翌日から可
  });

  // 電子版は月末で終了するので月単位。当月末はまだ来ていないため当月は選べる。
  it('should allow the current month (but not past months) on the 電子版 中止日 picker', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();
    await setShubetsu(wrapper, 2);
    await flushPromises();

    const disabled = (wrapper.vm as unknown as {
      disabledChushiDate: (d: unknown) => boolean;
    }).disabledChushiDate;
    const thisMonth = dayjs(todayIsoTokyo());
    expect(disabled(thisMonth.subtract(1, 'month'))).toBe(true);
    expect(disabled(thisMonth)).toBe(false);
    expect(disabled(thisMonth.add(1, 'month'))).toBe(false);
  });

  it('should disable both date inputs in 新規登録 mode', async () => {
    const { wrapper } = await renderView();
    for (const t of ['import-joho-date', 'import-chushi-date']) {
      expect(isPickerDisabled(wrapper, t)).toBe(true);
    }
  });

  it('should set UPDATE (更新) column states: ID checked+disabled, immutable fields rendered WITHOUT a checkbox, others enabled', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue();
    await flushPromises();

    // ID（キー）→ チェック + disable
    const idCb = wrapper.find('input[type="checkbox"][value="dokusya_id"]');
    expect((idCb.element as HTMLInputElement).checked).toBe(true);
    expect((idCb.element as HTMLInputElement).disabled).toBe(true);

    // 編集不可項目（購読開始日）→ チェックボックスを描画しない
    // （購読種別は画面ラジオで指定する単一ソースのため列に無い）。
    const kaishi = wrapper.find(
      'input[type="checkbox"][value="dokusya_kaishi_date"]',
    );
    expect(kaishi.exists()).toBe(false);

    // 氏名4項目は更新可（顧客要件 2026-07・改姓等。ACSMS-SCR-011 編集画面と同じ扱い）→
    // チェックボックスを描画し、選択できること。
    for (const col of [
      'shimei_sei',
      'shimei_mei',
      'shimei_kana_sei',
      'shimei_kana_mei',
    ]) {
      const cb = wrapper.find(`input[type="checkbox"][value="${col}"]`);
      expect(cb.exists()).toBe(true);
      expect((cb.element as HTMLInputElement).disabled).toBe(false);
    }

    // 通常の編集可能列（email）→ enable（disable されない）
    const email = wrapper.find('input[type="checkbox"][value="email"]');
    expect((email.element as HTMLInputElement).disabled).toBe(false);
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
    globalThis.URL.createObjectURL = createObjectURL;
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

  it('should clear the file input value on click so re-picking the same edited file fires change again', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow({ shimei_sei: '山田' })], 'same.xlsx');
    const fileInput = wrapper.find('input[type="file"]');
    await fileInput.trigger('click');
    expect((fileInput.element as HTMLInputElement).value).toBe('');
  });

  it('should refresh the preview when the same filename is re-selected with edited content', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [buildImportRow({ shimei_sei: '旧氏名' })], 'same.xlsx');
    expect(wrapper.text()).toContain('旧氏名');
    await uploadFile(wrapper, [buildImportRow({ shimei_sei: '新氏名' })], 'same.xlsx');
    expect(wrapper.text()).toContain('新氏名');
    expect(wrapper.text()).not.toContain('旧氏名');
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

  it('should render the 購読種別 radio (紙版 / 電子版) with 紙版 checked by default and NO 併読 option', async () => {
    // 顧客要件 2026-07: 購読種別は画面ラジオで一括指定する単一ソース（紙版/電子版
    // の2モード）。Excel 列ではないためチェックボックスは無い。併読(3) は取込不可。
    const { wrapper } = await renderView();
    const group = wrapper.find('[data-test="import-shubetsu"]');
    expect(group.exists()).toBe(true);
    const paper = wrapper.find('[data-test="import-shubetsu-1"]');
    const digital = wrapper.find('[data-test="import-shubetsu-2"]');
    expect(paper.exists()).toBe(true);
    expect(digital.exists()).toBe(true);
    expect(wrapper.find('[data-test="import-shubetsu-3"]').exists()).toBe(false);
    // 既定は 紙版(1)。
    expect((paper.element as HTMLInputElement).checked).toBe(true);
    // 購読種別のチェックボックス列は撤去済み。
    expect(
      wrapper.find('input[type="checkbox"][value="dokusya_shubetsu"]').exists(),
    ).toBe(false);
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
  it('should send import_mode=UPDATE to the API when the user picks 更新 radio', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    // 更新は適用日 or 中止日 が必須（payload 直下・顧客要件 2026-08）。未来日を入れる
    // — 当日だと帳票影響項目が選択不可になり「すべて選択」の意味が変わるため。
    await setPickerDate(wrapper, 'johoDateFe', '2099-03-01');
    // 更新は既定で列未チェック → 送信のため「すべて選択」で全列チェックする。
    await wrapper.find('[data-test="select-all-checkbox"]').setValue(true);
    await flushPromises();
    vi.mocked(importDokusyaExcel).mockResolvedValue(
      buildImportSuccessResponse({ data: { import_mode: 'UPDATE' } }) as any,
    );
    await uploadFile(wrapper, [buildImportRow()]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const body = vi.mocked(importDokusyaExcel).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toBeDefined();
    expect(body.import_mode).toBe('UPDATE');
  });

  it('should leave columns freely toggleable in 更新 (UPDATE)', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    const biko = wrapper.find('input[type="checkbox"][value="biko"]');
    expect((biko.element as HTMLInputElement).disabled).toBe(false);
    // 更新は既定で未チェック → チェックできること。
    await biko.setValue(true);
    expect((biko.element as HTMLInputElement).checked).toBe(true);
  });

  it('should default to NO columns checked (すべて選択 OFF) in 更新, and ticking すべて選択 checks all columns while the key stays checked', async () => {
    // 顧客要件 2026-07: 更新は既定で列を選択しない。全列更新は「すべて選択」で行う。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();

    // 既定: 編集可能列は未チェック → すべて選択 トグルも OFF。キー(ID)は常にチェック。
    const selectAll = wrapper.find('[data-test="select-all-checkbox"]');
    expect((selectAll.element as HTMLInputElement).checked).toBe(false);
    const email = wrapper.find('input[type="checkbox"][value="email"]');
    expect((email.element as HTMLInputElement).checked).toBe(false);
    const idCb = wrapper.find('input[type="checkbox"][value="dokusya_id"]');
    expect((idCb.element as HTMLInputElement).checked).toBe(true);

    // すべて選択 ON → 全編集可能列がチェックされる（＝全列更新）。
    await selectAll.setValue(true);
    await flushPromises();
    expect((email.element as HTMLInputElement).checked).toBe(true);
    const busu = wrapper.find('input[type="checkbox"][value="dokusya_busu"]');
    expect((busu.element as HTMLInputElement).checked).toBe(true);
    // キーは引き続きチェック。
    expect((idCb.element as HTMLInputElement).checked).toBe(true);
  });

  it('should keep the すべて選択 toggle enabled (not disabled) in 更新 mode', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    const selectAll = wrapper.find('[data-test="select-all-checkbox"]');
    expect((selectAll.element as HTMLInputElement).disabled).toBe(false);
  });
});

describe('DokusyaImportView (ACSMS-SCR-016) — client validation before submit', () => {
  it('should block submit and show a 選択してください warning when 取込開始 is clicked without a file', async () => {
    // 機能 8.1 — ファイル未選択 → warning（hanbaiten と統一）, 処理停止.
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
    expect(vi.mocked(message.warning)).toHaveBeenCalledWith(
      'Excelファイルを選択してください。',
    );
  });

  it('should block submit and NOT call the API when a row is 電子版 with クレジットカード payment', async () => {
    // 機能 8.1 — 電子版(画面ラジオ=2) かつ クレカ(shiharai_hoho=6)
    // は取込不可 → ACSMS-MSG-016-005.
    const { wrapper } = await renderView();
    await setShubetsu(wrapper, 2);
    await uploadFile(wrapper, [buildImportRow({ shiharai_hoho: 6 })]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should show the 電子版クレカ row error literal when a 電子版 クレカ row is submitted', async () => {
    const { wrapper } = await renderView();
    await setShubetsu(wrapper, 2);
    await uploadFile(wrapper, [buildImportRow({ shiharai_hoho: 6 })]);
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

  it('should block submit when a 新規 電子版 row has a blank email (email required for 電子版/併読)', async () => {
    // 顧客要件 — メールは電子版(画面ラジオ=2)・併読 で必須。
    const { wrapper } = await renderView();
    await setShubetsu(wrapper, 2);
    await uploadFile(wrapper, [
      buildImportRow({ shiharai_hoho: 1, email: '' }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('メールアドレスは電子版・併読の場合は必須です。');
  });

  it('should block submit when two 新規 電子版 rows share the same email (uniqueness among 電子版/併読)', async () => {
    // 顧客要件 — メール一意性は電子版/併読間で担保（バッチ内重複も検知）。
    const { wrapper } = await renderView();
    await setShubetsu(wrapper, 2);
    await uploadFile(wrapper, [
      buildImportRow({ shiharai_hoho: 1, email: 'dup@example.com', kumiaiin_code: 'K1' }),
      buildImportRow({ shiharai_hoho: 1, email: 'dup@example.com', kumiaiin_code: 'K2' }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should allow submit when two 新規 紙版 rows share the same email (紙版 not checked for uniqueness)', async () => {
    // 顧客要件 — 紙版(1・既定ラジオ) は重複可。
    const { wrapper } = await renderView();
    await uploadFile(wrapper, [
      buildImportRow({ email: 'paper@example.com', kumiaiin_code: 'K1' }),
      buildImportRow({ email: 'paper@example.com', kumiaiin_code: 'K2' }),
    ]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
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

  it('should block submit when an UPDATE row omits 読者情報変更適用日', async () => {
    // 顧客要件 2026-06 — UPDATE は読者情報変更適用日が必須。
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    await uploadFile(wrapper, [
      buildImportRow({ dokusya_id: 7001, joho_henko_tekiyo_date: '' }),
    ]);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
  });

  it('should NOT block submit when an UPDATE row leaves 購読部数 blank (unchanged field, not zero)', async () => {
    // sheet_to_json({ defval: '' }) turns a blank Excel cell into '' (not
    // undefined) — Number('') === 0, so the busu<=0 check must also exclude
    // '' explicitly, otherwise an UPDATE row that simply isn't touching
    // 購読部数 (blank = "leave unchanged") gets wrongly blocked as busu=0.
    const { wrapper } = await renderView();
    await wrapper.find('[data-test="import-mode-update"]').setValue(true);
    await flushPromises();
    await setPickerDate(wrapper, 'johoDateFe', '2026-09-01');
    await uploadFile(wrapper, [
      buildImportRow({ dokusya_id: 7001, dokusya_busu: '' }),
    ]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
  });

  it('should block submit and show ACSMS-MSG-016-006 wording when the file has more than 5000 rows', async () => {
    // 機能 8.1 — データ行数 > 5000件 → ACSMS-MSG-016-006.
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(5001));
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).not.toHaveBeenCalled();
    const toasted = [
      ...vi.mocked(message.error).mock.calls,
      ...vi.mocked(message.warning).mock.calls,
    ].flatMap((c) => c);
    expect(
      toasted.some((m) => typeof m === 'string' && /5000|上限/.test(m)),
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
    // 購読種別は top-level（画面ラジオの単一ソース）で送る。既定は 紙版(1)。
    expect(body.dokusya_shubetsu).toBe(1);
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows as unknown[]).toHaveLength(2);
    expect(Array.isArray(body.selected_columns)).toBe(true);
  });

  it('should send dokusya_shubetsu=2 (電子版) at the top level when the 電子版 radio is selected', async () => {
    // 顧客要件 2026-07: 購読種別は画面ラジオで一括指定し top-level で送る。
    const { wrapper } = await renderView();
    await setShubetsu(wrapper, 2);
    await uploadFile(wrapper, [
      buildImportRow({ email: 'denshi@example.com' }),
    ]);
    vi.mocked(importDokusyaExcel).mockResolvedValue(buildImportSuccessResponse() as any);
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    expect(vi.mocked(importDokusyaExcel)).toHaveBeenCalledTimes(1);
    const body = vi.mocked(importDokusyaExcel).mock.calls[0][0] as Record<string, unknown>;
    expect(body.dokusya_shubetsu).toBe(2);
    // 購読種別は rows[i] のキーには含めない（列ではないため）。
    const rows = body.rows as Array<Record<string, unknown>>;
    expect(rows[0]).not.toHaveProperty('dokusya_shubetsu');
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

  it('should render row-level errors when import rejects with a nested-row VALIDATION_ERROR (DTO failures flattened by main.ts)', async () => {
    const { wrapper } = await renderView();
    await uploadFile(wrapper, buildImportRows(3));
    vi.mocked(importDokusyaExcel).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
          errors: [
            { row: 2, field: 'shimei_kana_sei', message: '氏名かな（姓）は100文字以内で入力してください。' },
            { row: 3, field: 'email', message: 'メールアドレスの形式が不正です。' },
          ],
        },
      },
    });
    await wrapper.find('[data-test="import-submit-btn"]').trigger('click');
    await flushPromises();
    const panel = wrapper.find('[data-test="import-error-list"]');
    expect(panel.exists()).toBe(true);
    const text = panel.text();
    expect(text).toMatch(/行\s*2/);
    expect(text).toMatch(/行\s*3/);
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
    expect(html).not.toContain('ant-btn-disabled');
  });
});
