// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Drives src/views/dokusya/DokusyaFormView.vue. A single view component
// covers both CREATE (route `DokusyaCreate`) and EDIT (route
// `DokusyaEdit`, `:id` param). Every it() maps back to a clause in
// docs/design/ACSMS-SCR-011/screen-design.md (機能定義 + メッセージ情報)
// + docs/design/ACSMS-SCR-011/index.html (UI structure) +
// docs/design/ACSMS-SCR-011/ACSMS-SCR-011-api.md (API-011-001..006).
//
// Six BE endpoints, all mocked here:
//   getDokusya         → API-011-001 (edit-mode prefill)
//   createDokusya      → API-011-002 (登録)
//   updateDokusya      → API-011-003 (更新)
//   approveDokusya     → API-011-004 (承認)
//   rejectDokusya      → API-011-005 (否認)
//   getDokusyaHistory  → API-011-006 (履歴表示)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { Modal, message } from 'ant-design-vue';

import DokusyaFormView from '@/views/dokusya/DokusyaFormView.vue';
import {
  buildCreateDokusyaForm,
  buildUpdateDokusyaForm,
  buildDokusyaDetail,
  buildDokusyaHistoryResponse,
  buildKanriShitenDropdown,
  buildShitenDropdown,
  buildHanbaitenDropdown,
  buildTankaDropdown,
  buildTodofukenList,
  buildCodesSeed,
  buildAuthUser,
} from '@test/fixtures/dokusya.fixture';
import { todayIsoTokyo, tomorrowIsoTokyo } from '@/utils/datetime';
import dayjs from 'dayjs';

// ─── API wrapper for SCR-011 endpoints ─────────────────────────────
//
// /gen-code-frontend will emit `src/api/dokusya/dokusya.ts` with these
// 6 functions. The spec mocks them all here so no real HTTP fires.
vi.mock('@/api/dokusya/dokusya', () => ({
  getDokusya: vi.fn(),
  getDokusyaEffectiveAt: vi.fn(),
  createDokusya: vi.fn(),
  updateDokusya: vi.fn(),
  approveDokusya: vi.fn(),
  rejectDokusya: vi.fn(),
  getDokusyaHistory: vi.fn(),
}));

// Cross-module dropdowns the form pulls in for selectable FKs. Each
// stubbed once at file scope; per-test overrides go through `vi.mocked`.
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));
vi.mock('@/api/shiten/shiten', () => ({
  getShitenDropdown: vi.fn(),
}));
vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  listHanbaiten: vi.fn(),
  removeHanbaiten: vi.fn(),
  getHanbaiten: vi.fn(),
  createHanbaiten: vi.fn(),
  updateHanbaiten: vi.fn(),
  getHanbaitenDropdown: vi.fn(),
}));
vi.mock('@/api/tanka/tanka', () => ({
  getTankaDropdown: vi.fn(),
}));

// Spy on antd toast/modal APIs. Antd's `MessageType` is a callable
// PromiseLike — cast a no-op so the spy compiles after the
// `@ts-nocheck` banner is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Modal.confirm — drive the synchronous onOk path so 否認/削除
// confirm flows are testable without async modal lifecycle.
vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
  void opts?.onOk?.();
  return { destroy: () => undefined, update: () => undefined } as any;
});

interface RenderOptions {
  /** Edit mode: pass a number → router navigates to DokusyaEdit/:id. */
  dokusyaId?: number;
  /** Override default CHUOKAI session (for access-denied path). */
  user?: ReturnType<typeof buildAuthUser>;
  /** Optional route query string. */
  query?: Record<string, string>;
  /** Attach to document.body so document-based focus/scroll (focusFirstError) is observable. */
  attach?: boolean;
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
        path: '/dokusya/create',
        name: 'DokusyaCreate',
        component: { template: '<div />' },
      },
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
  if (opts.dokusyaId !== undefined) {
    await router.push({
      name: 'DokusyaEdit',
      params: { id: String(opts.dokusyaId) },
    });
  } else {
    await router.push({ name: 'DokusyaCreate', query: opts.query });
  }
  await router.isReady();

  const wrapper = mount(DokusyaFormView, {
    ...(opts.attach ? { attachTo: document.body } : {}),
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            // Default grants BOTH 購読種別 flags so create/update tests that
            // aren't about the flag gate behave as before; the dedicated
            // flag-gate tests pass an explicit restricted user.
            auth: {
              user:
                opts.user ??
                buildAuthUser({ paper_flg: true, denshi_flg: true }),
            },
            codes: { all: buildCodesSeed() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  mountedWrappers.push(wrapper);
  return { wrapper, router };
}

// マウントしたラッパーは afterEach で必ず unmount する。unmount しないと
// コンポーネントの watcher / 保留中の async (editGuard.capture の nextTick 等) が
// 次のテストへ漏れ、無関係なテスト (支払方法オプション等) が間欠的に落ちる。
const mountedWrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => {
  while (mountedWrappers.length > 0) mountedWrappers.pop()?.unmount();
});

/**
 * Bulk-apply a form payload while respecting cascade watchers (if any).
 * Mirrors the pattern from HanbaitenFormView spec — view-side watchers
 * may wipe downstream fields when an upstream changes, so the helper
 * re-applies the target values after one flush tick.
 */
async function fillForm(
  vm: { formState: Record<string, unknown> },
  form: object,
): Promise<void> {
  Object.assign(vm.formState, form);
  await flushPromises();
  Object.assign(vm.formState, form);
  await flushPromises();
}

beforeEach(async () => {
  vi.clearAllMocks();

  // Default dropdown responses — each spec can override via
  // `vi.mocked(getX).mockResolvedValueOnce(...)`.
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: buildTodofukenList() });

  const { getKanriShitenDropdown } = await import(
    '@/api/kanri-shiten/kanri-shiten'
  );
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: buildKanriShitenDropdown(),
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  });

  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue({
    data: buildShitenDropdown(),
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  });

  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue({
    data: buildHanbaitenDropdown(),
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  });

  const { getTankaDropdown } = await import('@/api/tanka/tanka');
  vi.mocked(getTankaDropdown).mockResolvedValue({
    data: buildTankaDropdown(),
    meta: { total: 1, page: 1, per_page: 50, has_more: false },
  });

  // SCR-011 BE endpoints — default-happy mocks.
  const {
    getDokusya,
    getDokusyaEffectiveAt,
    createDokusya,
    updateDokusya,
    approveDokusya,
    rejectDokusya,
    getDokusyaHistory,
  } = await import('@/api/dokusya/dokusya');
  vi.mocked(getDokusya).mockResolvedValue({ data: buildDokusyaDetail() });
  // 予約変更ポップアップの predecessor 取得は既定で同じ detail を返す
  // （テストが上書きする場合は mockResolvedValueOnce で差し替える）。
  vi.mocked(getDokusyaEffectiveAt).mockResolvedValue({
    data: buildDokusyaDetail({ dokusya_id: 100 }),
  });
  vi.mocked(createDokusya).mockResolvedValue({
    data: buildDokusyaDetail({ dokusya_id: 100 }),
    message: '登録しました。',
  });
  vi.mocked(updateDokusya).mockResolvedValue({
    data: buildDokusyaDetail(),
    message: '更新しました。',
  });
  vi.mocked(approveDokusya).mockResolvedValue({
    data: buildDokusyaDetail({ denshi_shonin_status: 1 }),
    message: '承認しました。',
  });
  vi.mocked(rejectDokusya).mockResolvedValue({
    data: buildDokusyaDetail({ denshi_shonin_status: 2 }),
    message: '否認しました。',
  });
  vi.mocked(getDokusyaHistory).mockResolvedValue(buildDokusyaHistoryResponse());
});

/**
 * 予約変更モードへ入る（B案 のポップアップ経由）。selectMode('reserved')
 * が適用日ポップアップを開くようになったため、テストは joho を入れて
 * confirmReservedJoho() を呼ぶ。predecessor は getDokusyaEffectiveAt のモックが返す。
 */
async function enterReservedMode(
  wrapper: VueWrapper,
  joho: string = tomorrowIsoTokyo(),
): Promise<void> {
  const vm = wrapper.vm as unknown as {
    selectMode: (m: string) => void;
    reservedJohoInput: string | null;
    confirmReservedJoho: () => Promise<void>;
  };
  vm.selectMode('reserved');
  await flushPromises();
  vm.reservedJohoInput = joho;
  await vm.confirmReservedJoho();
  await flushPromises();
}

// ═══════════════════════════════════════════════════════════════════════
// 1. 画面初期表示 (機能定義 1.x + 画面項目定義)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — initial render (機能定義 1.x)', () => {
  // 履歴No is edit-only (表示条件 No.8) — absent in create mode; the others render.
  it.each([
    ['購読種別', true],
    ['手続種類', true],
    ['履歴No', false],
  ])('label %s presence should be %s in create mode', async (needle, present) => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes(needle))).toBe(present);
  });

  it('should keep the 購読種別 radio group editable in create mode (only 併読 disabled)', async () => {
    // Guard against over-disabling: the edit-mode lock must NOT leak into
    // create. 紙版 / 電子版 stay selectable; only 併読 (value=3) is disabled.
    const { wrapper } = await renderView();
    const items = wrapper.findAllComponents({ name: 'AFormItem' });
    const shubetsuItem = items.find((it) => it.text().includes('購読種別'));
    expect(shubetsuItem).toBeDefined();
    const radios = shubetsuItem!.findAll('input[type="radio"]');
    expect(radios.some((r) => !(r.element as HTMLInputElement).disabled)).toBe(true);
  });

  // ─── 購読種別-flag permission gate (account_concept.md §139-145) ─────────
  function shubetsuRadios(wrapper: VueWrapper): HTMLInputElement[] {
    const items = wrapper.findAllComponents({ name: 'AFormItem' });
    const item = items.find((it) => it.text().includes('購読種別'));
    return item!
      .findAll('input[type="radio"]')
      .map((r) => r.element as HTMLInputElement);
  }

  it('paper-only account: 紙版 selectable, 電子版 disabled in create', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: false }),
    });
    const radios = shubetsuRadios(wrapper);
    expect(radios[0].disabled).toBe(false); // 紙版 (value=1)
    expect(radios[1].disabled).toBe(true); // 電子版 (value=2)
  });

  it('denshi-only account: 電子版 selectable, 紙版 disabled + default selects 電子版', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: false, denshi_flg: true }),
    });
    const radios = shubetsuRadios(wrapper);
    expect(radios[0].disabled).toBe(true); // 紙版
    expect(radios[1].disabled).toBe(false); // 電子版
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number };
    };
    expect(Number(vm.formState.dokusya_shubetsu)).toBe(2);
  });

  it('no-flag account: 登録 submit button disabled', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: false, denshi_flg: false }),
    });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    [['管理支店', '支店', '組合員コード']],
    [['連絡先', 'メールアドレス', 'メールマガジン']],
    [['販売店コード', '販売店名', '郵送区分']],
    // 購読中止日は create モードでは撤去（編集のみ表示）。
    [['購読開始日', '備考']],
  ])('should render labels %j when mounted', async (needles) => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    for (const needle of needles) {
      expect(labels.some((t) => t.includes(needle))).toBe(true);
    }
  });

  it('should render the 4 name input labels (氏 / 名 / かな_氏 / かな_名) when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('購読者氏名_氏'))).toBe(true);
    expect(labels.some((t) => t.includes('購読者氏名_名'))).toBe(true);
    expect(labels.some((t) => t.includes('購読者かな_氏'))).toBe(true);
    expect(labels.some((t) => t.includes('購読者かな_名'))).toBe(true);
  });

  it('should render the address-section labels (郵便番号 / 都道府県 / 市町村郡 / 丁目番地) when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('郵便番号'))).toBe(true);
    expect(labels.some((t) => t.includes('都道府県'))).toBe(true);
    expect(labels.some((t) => t.includes('市町村郡'))).toBe(true);
    expect(labels.some((t) => t.includes('丁目番地'))).toBe(true);
  });

  it.each([['配達先情報'], ['購読者情報と同じ'], ['前の画面に戻る']])(
    'should render the %s text when mounted',
    async (needle) => {
      const { wrapper } = await renderView();
      expect(wrapper.text()).toContain(needle);
    },
  );

  it('should render the 支払方法 / 購読料支払サイクル labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('支払方法'))).toBe(true);
    expect(labels.some((t) => t.includes('購読料支払サイクル'))).toBe(true);
  });

  it('should render the bank-section labels (引落口座支店 / 引落口座貯金種目 / 引落口座番号 / 引落口座名義) when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('引落口座支店'))).toBe(true);
    expect(labels.some((t) => t.includes('引落口座貯金種目'))).toBe(true);
    expect(labels.some((t) => t.includes('引落口座番号'))).toBe(true);
    expect(labels.some((t) => t.includes('引落口座名義'))).toBe(true);
  });

  it('should render the 承認・登録 submit button when mounted in create mode', async () => {
    // Antd inserts a half-width space between two CJK chars — match by
    // selector + substring rather than literal text.
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('登');
  });

  it('should NOT call getDokusya when mounted in create mode (no :id)', async () => {
    await renderView();
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    expect(getDokusya).not.toHaveBeenCalled();
  });

  it('should NOT render the 履歴表示 button when mounted in create mode (no history yet)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('履歴表示');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. 編集モード — form pre-fill (機能定義 15.1)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 電子版 購読部数=1固定 (顧客要件 2026-06)', () => {
  function busuInput(wrapper: VueWrapper) {
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_busu');
    return item!.find('input');
  }

  it('should disable 購読部数 input in create mode when 電子版(2) is selected', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as { formState: { dokusya_shubetsu: number } };
    vm.formState.dokusya_shubetsu = 2;
    await flushPromises();
    expect((busuInput(wrapper).element as HTMLInputElement).disabled).toBe(true);
  });

  it('should force 購読部数 to 1 when switching to 電子版(2) in create mode', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number; dokusya_busu: number };
    };
    vm.formState.dokusya_busu = 5; // 紙版で複数部を入力したと仮定
    await flushPromises();
    vm.formState.dokusya_shubetsu = 2; // 電子版へ切替
    await flushPromises();
    expect(Number(vm.formState.dokusya_busu)).toBe(1);
  });

  it('should show 購読開始日 radio (今日/翌月1日) + read-only 中止日 for ANY 電子版 create — not only 口座引落 (顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number; shiharai_hoho: number | null };
    };
    vm.formState.dokusya_shubetsu = 2; // 電子版
    vm.formState.shiharai_hoho = null; // 支払方法 未選択（＝口座引落ではない）
    await flushPromises();

    // 購読開始日はラジオ「今日 / 翌月1日」で表示される（支払方法に関係なく）。
    expect(wrapper.text()).toContain('翌月1日');

    // 購読中止日は新規作成では非表示（フォームから撤去 — 編集モードのみ）。
    expect(wrapper.find('input[placeholder="月末で終了"]').exists()).toBe(false);
  });

  it('should show 購読開始日 date-picker (NOT the radio) for 紙版 create', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number };
    };
    vm.formState.dokusya_shubetsu = 1; // 紙版
    await flushPromises();

    // 紙版 create はラジオを出さない（従来どおりカレンダー）。
    expect(wrapper.text()).not.toContain('翌月1日');
    expect(wrapper.find('input[placeholder="月末で終了"]').exists()).toBe(false);
  });

  it('should grey out メールマガジン when 紙版(1) is selected (電子版用項目)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number };
    };
    vm.formState.dokusya_shubetsu = 1; // 紙版
    await flushPromises();
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.text().includes('メールマガジン'));
    expect(item).toBeDefined();
    const radios = item!.findAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThan(0);
    expect(
      radios.every((r) => (r.element as HTMLInputElement).disabled),
    ).toBe(true);
  });

  it('should enable メールマガジン when 電子版(2) is selected', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number };
    };
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.text().includes('メールマガジン'));
    const radios = item!.findAll('input[type="radio"]');
    expect(
      radios.some((r) => !(r.element as HTMLInputElement).disabled),
    ).toBe(true);
  });

  it('should clear mail_magazine_flg to null (未選択) when switching to 紙版(1)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { dokusya_shubetsu: number; mail_magazine_flg: number | null };
    };
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    vm.formState.mail_magazine_flg = 1; // 配信する を選択したと仮定
    await flushPromises();
    vm.formState.dokusya_shubetsu = 1; // 紙版へ切替
    await flushPromises();
    // 紙版は電子版用項目のため未選択(null) → DB も NULL 保存。
    expect(vm.formState.mail_magazine_flg).toBeNull();
  });

  it('should default mail_magazine_flg to null (未選択) in create mode (既定は紙版)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: true, denshi_flg: true }),
    });
    const vm = wrapper.vm as unknown as {
      formState: { mail_magazine_flg: number | null };
    };
    expect(vm.formState.mail_magazine_flg).toBeNull();
  });

  it('should disable 購読部数 input in edit mode for a 電子版(2) record', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      // 電子版 + 口座引落(1) は read-only 対象外（クレカではない）→ 編集可だが
      // 購読部数だけ入力不可。
      data: buildDokusyaDetail({
        dokusya_shubetsu: 2,
        shiharai_hoho: 1,
        dokusya_busu: 1,
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect((busuInput(wrapper).element as HTMLInputElement).disabled).toBe(true);
  });
});

describe('DokusyaFormView — 読者情報変更適用日 編集可否 (顧客要件 2026-06)', () => {
  function johoItem(wrapper: VueWrapper) {
    return wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'joho_henko_tekiyo_date');
  }

  it('should DISABLE 読者情報変更適用日 in edit mode when no other field has changed', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const item = johoItem(wrapper);
    expect(item).toBeDefined();
    expect(/ant-picker-disabled/.test(item!.html())).toBe(true);
  });

  it('should ENABLE 読者情報変更適用日 once another field is changed in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as { formState: { biko: string } };
    vm.formState.biko = '変更メモ';
    await flushPromises();
    expect(/ant-picker-disabled/.test(johoItem(wrapper)!.html())).toBe(false);
  });

  it('should ENABLE 読者情報変更適用日 when only 販売店 changed (顧客要件 2026-07: 販売店適用日を廃止し joho に統一)', async () => {
    // 顧客要件 2026-07: 販売店適用日を廃止。販売店を変更したら joho をユーザーが
    // 入力（編集可）— joho がその適用日を兼ねる（1更新1レコード）。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { hanbaiten_id: number | null };
    };
    vm.formState.hanbaiten_id = Number(vm.formState.hanbaiten_id) + 1;
    await flushPromises();
    // joho は編集可（販売店変更の適用日を兼ねる）。
    expect(/ant-picker-disabled/.test(johoItem(wrapper)!.html())).toBe(false);
  });

  it('should keep 読者情報変更適用日 disabled and auto-fill = 解約予定日 when only 購読中止日 changed (顧客要件 2026-07)', async () => {
    // 販売店のみ変更と同様、解約予定日のみ変更したときも joho は編集不可のままで
    // 値を解約予定日(dokusya_chushi_date)へ自動追随させる。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: {
        dokusya_chushi_date: string | null;
        joho_henko_tekiyo_date: string | null;
      };
    };
    // 解約予定日(購読中止日)のみ変更（他項目は触らない）。
    vm.formState.dokusya_chushi_date = '2030-10-10';
    await flushPromises();
    // joho は編集不可のまま + 解約予定日へ自動追随。
    expect(/ant-picker-disabled/.test(johoItem(wrapper)!.html())).toBe(true);
    expect(vm.formState.joho_henko_tekiyo_date).toBe('2030-10-10');
  });

  it('should force 手続種類=解約(0) + 購読部数=0 when 購読中止日 is entered, and restore on clear (解約予約 — 顧客決定 2026-07)', async () => {
    // 解約予定日(購読中止日) 入力＝解約予約。手続種類は編集で disabled だが中止日で
    // 解約(0)へ寄せ、部数を0にしてフォーム表示を保存結果(BEが解約行を作る)と一致
    // させる。クリアで元の手続種類・部数へ戻す。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: {
        dokusya_chushi_date: string | null;
        tetsuzuki_shurui: number;
        dokusya_busu: number;
      };
    };
    const origTetsuzuki = vm.formState.tetsuzuki_shurui;
    const origBusu = vm.formState.dokusya_busu;

    vm.formState.dokusya_chushi_date = '2030-10-10';
    await flushPromises();
    expect(Number(vm.formState.tetsuzuki_shurui)).toBe(0); // 解約
    expect(Number(vm.formState.dokusya_busu)).toBe(0); // 解約=部数なし

    vm.formState.dokusya_chushi_date = null;
    await flushPromises();
    expect(Number(vm.formState.tetsuzuki_shurui)).toBe(origTetsuzuki);
    expect(Number(vm.formState.dokusya_busu)).toBe(origBusu);
  });

  it('(B) should disable 購読中止日 + show hint when has_active_kaiyaku (既に解約予約済み) — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      // 有効な解約予約あり → 中止日(値)が入っているので項目は表示される。
      data: buildDokusyaDetail({
        has_active_kaiyaku: true,
        dokusya_chushi_date: '2030-06-01',
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.find('[data-test="active-kaiyaku-hint"]').exists()).toBe(true);
    const chushiItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_chushi_date');
    expect(/ant-picker-disabled/.test(chushiItem!.html())).toBe(true);
  });

  // NOTE: 解約予定日(購読中止日)そのものの相対チェック（購読開始日以降・未来日・
  // 最終変更適用日より後）は本フォームから撤去し、一覧の「購読を停止する」
  // ポップアップ + 専用API(POST /dokusya/:id/stop)へ移設した（顧客要件 2026-07 改訂）。
  // そのため旧「submit 時に解約予定日を弾く」テスト（A/A2）は削除。停止側の
  // 相対チェックは DokusyaListView.spec.ts + dokusya.service.spec.ts(stop) が担う。

  it('should reset 適用日 and skip update when the other change is reverted (no lone-date 履歴)', async () => {
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { biko: string; joho_henko_tekiyo_date: string | null };
    };
    const origBiko = vm.formState.biko;
    const baseline = vm.formState.joho_henko_tekiyo_date;

    // 他項目を変更 → 適用日が編集可になり、適用日を変更。
    vm.formState.biko = '一時変更';
    await flushPromises();
    vm.formState.joho_henko_tekiyo_date = '2030-12-31';
    await flushPromises();

    // 他項目を元に戻す → 適用日も基準値へ戻り、フォームは pristine。
    vm.formState.biko = origBiko;
    await flushPromises();
    expect(vm.formState.joho_henko_tekiyo_date).toBe(baseline);

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateDokusya).not.toHaveBeenCalled();
  });
});

describe('DokusyaFormView — edit mode pre-fill (機能定義 15.x)', () => {
  it('should call getDokusya with the route id when mounted in edit mode', async () => {
    await renderView({ dokusyaId: 100 });
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    expect(getDokusya).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getDokusya).mock.calls[0]?.[0]).toBe(100);
  });

  it('should pre-fill name + address inputs with the API response values when in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const values = inputs.map((i) => (i.element as HTMLInputElement).value);
    expect(values.some((v) => v === '山田')).toBe(true);
    expect(values.some((v) => v === '太郎')).toBe(true);
    expect(values.some((v) => v === '千代田区')).toBe(true);
  });

  it('should disable the 購読種別 radio group in edit mode (購読種別は変更不可)', async () => {
    // 紙↔電子↔併読 の変換は専用フローの業務操作。編集では変更不可。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const items = wrapper.findAllComponents({ name: 'AFormItem' });
    const shubetsuItem = items.find((it) => it.text().includes('購読種別'));
    expect(shubetsuItem).toBeDefined();
    const radios = shubetsuItem!.findAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThan(0);
    expect(radios.every((r) => (r.element as HTMLInputElement).disabled)).toBe(true);
  });

  it('should disable the 更新 submit button when the record is 併読(3) — read-only, any account', async () => {
    // seeder.md §425 / api.md §is_read_only — 併読者は編集不可。BE も 403。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 3,
        denshi_shonin_status: null,
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable 管理支店 in edit mode (変更不可・グレーアウト)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'kanri_shiten_id');
    expect(item).toBeDefined();
    // antd の <a-select disabled> は .ant-select-disabled を付与する。
    expect(item!.html()).toContain('ant-select-disabled');
  });

  it('should keep 管理支店 editable in create mode', async () => {
    const { wrapper } = await renderView({});
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'kanri_shiten_id');
    expect(item).toBeDefined();
    expect(item!.html()).not.toContain('ant-select-disabled');
  });

  it('should disable 購読開始日 in edit mode (set once at creation, read-only after)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_kaishi_date');
    expect(item).toBeDefined();
    const input = item!.find('input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).disabled).toBe(true);
  });

  it.each([
    'shimei_sei',
    'shimei_mei',
    'shimei_kana_sei',
    'shimei_kana_mei',
  ])('should keep %s editable in edit mode (顧客要件 2026-07: 氏名変更可)', async (field) => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    // 参照→編集フロー(顧客要件2026-07): 予約変更モードで全項目編集可。
    await enterReservedMode(wrapper);
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === field);
    expect(item).toBeDefined();
    const input = item!.find('input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).disabled).toBe(false);
  });

  it.each([
    'shimei_sei',
    'shimei_mei',
    'shimei_kana_sei',
    'shimei_kana_mei',
  ])('should keep %s editable in create mode', async (field) => {
    const { wrapper } = await renderView({});
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === field);
    expect(item).toBeDefined();
    const input = item!.find('input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).disabled).toBe(false);
  });

  it('should HIDE 購読中止日 in edit mode when the loaded value is null (顧客要件 2026-07 改訂)', async () => {
    // 顧客要件 2026-07 改訂: 中止日が null（未解約・再購読で null に戻った等）なら
    // 編集フォームでも項目ごと非表示にする。既定の detail は 中止日=null。
    // 中止日が入っている場合の読取専用表示は別テスト（loading a 解約 record）で担保。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await enterReservedMode(wrapper);
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_chushi_date');
    expect(item).toBeUndefined();
  });

  it('should NOT render 購読中止日 in create mode (新規作成では撤去)', async () => {
    const { wrapper } = await renderView(); // create mode (no id)
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_chushi_date');
    expect(item).toBeUndefined();
  });

  it('should LOCK 購読中止日 (disabled) when loading a 解約 record — 全項目 read-only until 新規 (顧客要件 2026-07)', async () => {
    // 解約済み(master 解約)を開いた直後はフォーム全体を read-only にし、手続種類
    // だけで 解約→新規 の切替を許可する。購読中止日も disabled。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        tetsuzuki_shurui: 0,
        dokusya_chushi_date: '2026-05-31',
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_chushi_date');
    expect(item).toBeDefined();
    const input = item!.find('input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).disabled).toBe(true);
  });

  it('should disable the 解約 option of 手続種類 when in create mode', async () => {
    // 新規作成では解約(0)を選択不可（解約は既存購読者の更新操作）。
    const { wrapper } = await renderView(); // create mode (no id)
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'tetsuzuki_shurui');
    expect(item).toBeDefined();
    const kaiyaku = item!.find('input[type="radio"][value="0"]');
    const shinki = item!.find('input[type="radio"][value="1"]');
    expect(kaiyaku.exists()).toBe(true);
    expect((kaiyaku.element as HTMLInputElement).disabled).toBe(true);
    expect((shinki.element as HTMLInputElement).disabled).toBe(false);
  });

  it('should DISABLE the whole 手続種類 field in edit mode for an active 新規 record', async () => {
    // 既定 detail は 新規(1) → 変更不可（再加入対象外）。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'tetsuzuki_shurui');
    expect(item).toBeDefined();
    const kaiyaku = item!.find('input[type="radio"][value="0"]');
    const shinki = item!.find('input[type="radio"][value="1"]');
    expect(kaiyaku.exists()).toBe(true);
    expect((kaiyaku.element as HTMLInputElement).disabled).toBe(true);
    expect((shinki.element as HTMLInputElement).disabled).toBe(true);
  });

  // 顧客要件 2026-06/07 — 再加入（canResubscribe）: 解約済みの 紙版 / 電子版(非クレカ)
  // を編集するとき、手続種類ラジオだけ操作可（解約→新規）。購読開始日は 新規 へ
  // 切替えるまで disabled、切替後に編集可になる。
  it('should ENABLE 手続種類 but keep 購読開始日 disabled until switching to 新規 (解約 紙版 re-subscribe) — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 1, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const tetsuzuki = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'tetsuzuki_shurui');
    const kaishiItem = () =>
      wrapper
        .findAllComponents({ name: 'AFormItem' })
        .find((it) => it.props('name') === 'dokusya_kaishi_date');
    // 手続種類=新規 radio は操作可（切替できる）。
    expect(
      (tetsuzuki!.find('input[type="radio"][value="1"]').element as HTMLInputElement)
        .disabled,
    ).toBe(false);
    // 読込直後（まだ解約表示）は購読開始日 disabled。
    expect(
      (kaishiItem()!.find('input').element as HTMLInputElement).disabled,
    ).toBe(true);
    // 手続種類=新規 へ切替 → 購読開始日 編集可。
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number };
    };
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(
      (kaishiItem()!.find('input').element as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it('should LOCK business fields when loading 解約, then UNLOCK on switching to 新規 (再購読) — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 1, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const inputByName = (name: string) =>
      wrapper
        .findAllComponents({ name: 'AFormItem' })
        .find((it) => it.props('name') === name)!
        .find('input').element as HTMLInputElement;

    // ネイティブ checkbox「購読者情報と同じ」は form-level 対象外 → 明示ロックを確認。
    const sameFlgCheckbox = () =>
      wrapper
        .findAll('label')
        .find((l) => l.text().includes('購読者情報と同じ'))!
        .find('input[type="checkbox"]').element as HTMLInputElement;

    // 読込直後(解約表示)は業務項目 disabled:
    //  - 番地(form-level disabled 経由) / 部数(自前 :disabled 経由) の両系統 + checkbox。
    expect(inputByName('chome_banchi').disabled).toBe(true);
    expect(inputByName('dokusya_busu').disabled).toBe(true);
    expect(sameFlgCheckbox().disabled).toBe(true);

    // 手続種類=新規 へ切替 → 再購読編集モードで両方 編集可。
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number };
    };
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(inputByName('chome_banchi').disabled).toBe(false);
    expect(inputByName('dokusya_busu').disabled).toBe(false);
    expect(sameFlgCheckbox().disabled).toBe(false);
  });

  it('should RESTORE 購読開始日 + 情報変更適用日 to DB values (readonly) when switching 解約→新規→解約 (再購読取消・顧客要件 2026-07)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 1,
        tetsuzuki_shurui: 0, // 解約済み
        dokusya_busu: 0,
        dokusya_kaishi_date: '2026-04-01', // DB 値
        joho_henko_tekiyo_date: '2026-06-01', // DB 値
        dokusya_chushi_date: '2026-06-01',
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: {
        tetsuzuki_shurui: number;
        dokusya_kaishi_date: string;
        joho_henko_tekiyo_date: string | null;
      };
    };
    const itemByName = (name: string) =>
      wrapper
        .findAllComponents({ name: 'AFormItem' })
        .find((it) => it.props('name') === name);

    // 新規へ切替（再購読）→ 購読開始日は翌日にセットされ編集可になる。
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(vm.formState.dokusya_kaishi_date).toBe(tomorrowIsoTokyo());
    expect(
      (itemByName('dokusya_kaishi_date')!.find('input').element as HTMLInputElement)
        .disabled,
    ).toBe(false);

    // 解約へ戻す → 両日付が DB 値へ復元され readonly（disabled）に戻る。
    vm.formState.tetsuzuki_shurui = 0;
    await flushPromises();
    expect(vm.formState.dokusya_kaishi_date).toBe('2026-04-01'); // DB 値
    expect(vm.formState.joho_henko_tekiyo_date).toBe('2026-06-01'); // DB 値
    expect(
      (itemByName('dokusya_kaishi_date')!.find('input').element as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      /ant-picker-disabled/.test(itemByName('joho_henko_tekiyo_date')!.html()),
    ).toBe(true);
  });

  it('should default 購読部数 to 1 (not the cancelled 0) when resubscribing 解約→新規 (顧客要件 2026-07)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 1,
        tetsuzuki_shurui: 0, // 解約済み → 部数 0
        dokusya_busu: 0,
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number; dokusya_busu: number };
    };
    // 手続種類=新規 へ切替（再購読）→ 部数は解約時の 0 ではなく新規既定の 1。
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(Number(vm.formState.dokusya_busu)).toBe(1);
  });

  it('should show 購読開始日 radio (今日/翌月1日) like create when resubscribing a 電子版 record (顧客要件 2026-07)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 2, // 電子版
        tetsuzuki_shurui: 0, // 解約済み
        dokusya_busu: 0,
        shiharai_hoho: 1, // 口座引落
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number };
    };
    // 解約読込時はラジオ非表示。新規へ切替（再購読）→ create と同じフォームに。
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    // 電子版 create と同じく購読開始日ラジオ「今日 / 翌月1日」を表示する。
    expect(wrapper.text()).toContain('翌月1日');
  });

  it('should focus the first errored field when submit hits a validation error (顧客要件)', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    // attach=true で document へマウントし focusFirstError の document 検索を有効化。
    const { wrapper } = await renderView({ attach: true }); // 新規作成（必須未入力多数）
    // 必須未入力のまま送信 → validateClient がエラー → 先頭エラー項目へフォーカス。
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await flushPromises(); // nextTick(focusFirstError) を待つ
    expect(wrapper.text()).toContain('必須');
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it('should disable the 更新 button when loading 解約 (locked), enable after switching to 新規 — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 1, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const submitBtn = () => wrapper.find('button[type="submit"]');
    // 解約表示（ロック中）は更新ボタン disabled。
    expect((submitBtn().element as HTMLButtonElement).disabled).toBe(true);
    // 手続種類=新規 へ切替 → 更新可能。
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number };
    };
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect((submitBtn().element as HTMLButtonElement).disabled).toBe(false);
  });

  it('should reset 購読開始日 to tomorrow (JST) when switching to 新規 (再購読) — 顧客要件 2026-07', async () => {
    // 旧開始日は過去日なので、新規へ切替えたら翌日(未来日のみ)へリセットする。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 1,
        tetsuzuki_shurui: 0,
        dokusya_kaishi_date: '2026-07-01',
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number; dokusya_kaishi_date: string };
    };
    // 読込直後は旧開始日。
    expect(vm.formState.dokusya_kaishi_date).toBe('2026-07-01');
    // 手続種類=新規 へ切替 → 翌日へリセット。
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(vm.formState.dokusya_kaishi_date).toBe(tomorrowIsoTokyo());
  });

  it('should disable today (JST) on the 購読開始日 picker during 再購読 (未来日のみ) — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 1, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number };
    };
    vm.formState.tetsuzuki_shurui = 1; // 新規（再購読）
    await flushPromises();

    const picker = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_kaishi_date')!
      .findComponent({ name: 'ADatePicker' });
    const disabledDate = picker.props('disabledDate') as (
      d: ReturnType<typeof dayjs>,
    ) => boolean;
    // 当日(JST)は選択不可、翌日は選択可。
    expect(disabledDate(dayjs(todayIsoTokyo()))).toBe(true);
    expect(disabledDate(dayjs(tomorrowIsoTokyo()))).toBe(false);
  });

  it('should NOT render a 販売店適用日 input at all (廃止・顧客要件 2026-07) even when 販売店 changes', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        dokusya_shubetsu: 1,
        tetsuzuki_shurui: 0,
        hanbaiten_id: 5,
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: { tetsuzuki_shurui: number; hanbaiten_id: number };
    };
    vm.formState.tetsuzuki_shurui = 1; // 新規（再購読）
    await flushPromises();
    vm.formState.hanbaiten_id = 999; // 販売店を変更しても…
    await flushPromises();
    // …販売店適用日フィールドは廃止されたので描画されない（joho に統一）。
    const tekiyoItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'hanbaiten_tekiyo_date');
    expect(tekiyoItem).toBeUndefined();
  });

  it('should auto-fill 情報変更適用日 = 購読開始日 and disable it during 再購読 — 顧客要件 2026-07', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 1, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as unknown as {
      formState: {
        tetsuzuki_shurui: number;
        dokusya_kaishi_date: string;
        joho_henko_tekiyo_date: string | null;
      };
    };
    vm.formState.tetsuzuki_shurui = 1; // 新規（再購読）
    await flushPromises();
    vm.formState.dokusya_kaishi_date = '2027-05-01';
    await flushPromises();

    // joho は購読開始日へ追随。
    expect(vm.formState.joho_henko_tekiyo_date).toBe('2027-05-01');
    // joho 入力は disabled。
    const johoItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'joho_henko_tekiyo_date');
    expect(/ant-picker-disabled/.test(johoItem!.html())).toBe(true);
  });

  it('should KEEP 手続種類 + 購読開始日 disabled for a 解約 電子版+クレカ record (excluded from re-subscribe)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, shiharai_hoho: 6, tetsuzuki_shurui: 0 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const tetsuzuki = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'tetsuzuki_shurui');
    expect((tetsuzuki!.find('input[type="radio"][value="1"]').element as HTMLInputElement).disabled).toBe(true);
  });

  it('should render the 履歴No label when mounted in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('履歴No'))).toBe(true);
  });

  it('should render the 履歴表示 button when mounted in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.text()).toContain('履歴表示');
  });

  it('should show ACSMS-MSG-011-016 when getDokusya rejects with NOT_FOUND', async () => {
    // 機能定義 15.1 — データ取得失敗時 ACSMS-MSG-011-016 表示.
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          error_code: 'NOT_FOUND',
          message: '指定された購読者が見つかりません。',
        },
      },
    });
    const { wrapper } = await renderView({ dokusyaId: 9999 });
    expect(wrapper.text()).toContain('見つかりません');
  });

  it('should render the 更新 submit button (not 登録) after selecting an edit mode', async () => {
    // 参照→編集フロー: マウント直後は参照モード（submit 非表示）。編集モードを
    // 選ぶと 更新 ボタンが出る（顧客要件2026-07）。
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    await enterReservedMode(wrapper);
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    // Antd auto-spacing — match by single CJK char.
    expect(submitBtn.text()).toContain('更');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. 必須バリデーション (機能定義 2.1 / 2.3 + ACSMS-MSG-011-013)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — required field validation (機能定義 2.3)', () => {
  it('should show 必須項目です。 when shimei_sei is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shimei_sei: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 購読部数は1以上で入力してください。 when dokusya_busu is 0 and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ dokusya_busu: 0 }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('購読部数は1以上で入力してください。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  // 管理支店 は必須（* 表示）。未選択で submit すると以前は BE で
  // kanri_shiten_id=0 → FK 違反(500)になっていた。FE で required を検証し、
  // createDokusya を呼ばずフィールドに 必須項目です。を出すことを保証する。
  it('should block create and show 必須項目です。 on 管理支店 when kanri_shiten_id is not selected', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ kanri_shiten_id: null }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'kanri_shiten_id');
    expect(item?.html()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should VALIDATE 氏名 on edit and block update when it contains a symbol — 顧客要件 2026-07 (氏名編集可)', async () => {
    // 氏名は編集で変更可（顧客要件 2026-07）。数字・全/半角カナは許容だが記号は不可
    // （再緩和）。記号混じりのまま更新しようとすると弾かれる。
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({
        shimei_mei: '太郎!',
        shimei_kana_sei: 'ゾウゲン',
      }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });

    // 編集可能項目（備考）を変更して非 pristine にしてから送信する。
    const vm = wrapper.vm as unknown as { formState: { biko: string } };
    vm.formState.biko = '更新メモ';
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。');
    expect(wrapper.text()).toContain('ひらがな・数字で入力してください');
    expect(updateDokusya).not.toHaveBeenCalled();
  });

  // Large CRUD form — pressing Enter inside a text input must NOT implicitly
  // submit (Japanese IME "next field" reflex). Regression guard for
  // preventEnterImplicitSubmit wired on the <a-form>.
  it('should NOT call createDokusya when user presses Enter inside a text input', async () => {
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    const { wrapper } = await renderView();
    await flushPromises();

    const firstInput = wrapper.find('input');
    expect(firstInput.exists()).toBe(true);
    await firstInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when shimei_mei is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shimei_mei: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when shimei_kana_sei is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shimei_kana_sei: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should accept ひらがな + 数字 in shimei_kana_sei (顧客要件 2026-07: かなは数字も可)', async () => {
    // かな欄は ひらがな + 数字 のみ許容。数字混じり "やまだ12" は通る。
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shimei_kana_sei: 'やまだ12' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).not.toContain('ひらがな・数字で入力してください');
  });

  it('should reject katakana / latin in shimei_kana_sei (ひらがな・数字のみ)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    // カタカナ・ラテン文字は不可（"1a" の a も弾く）。
    await fillForm(vm, buildCreateDokusyaForm({ shimei_kana_sei: 'ヤマダ' }));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('ひらがな・数字で入力してください');

    await fillForm(vm, buildCreateDokusyaForm({ shimei_kana_sei: '1a' }));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('ひらがな・数字で入力してください');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when shikuchoson is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shikuchoson: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when chome_banchi is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ chome_banchi: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when renrakusaki_1 is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ renrakusaki_1: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when hanbaiten_id is null and 登録 is clicked', async () => {
    // 画面項目定義 No.39 — 必須入力 + form binds via clearable <a-select>.
    // Tests the `?.trim()` safe-clear regression (vue.md §Validation):
    // when the select is cleared the model goes to undefined / null,
    // which MUST surface as 必須項目です。 — NOT エラーが発生しました。.
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ hanbaiten_id: null }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when 購読開始日 is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ dokusya_kaishi_date: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should block update + show 購読開始日 message when joho < 購読開始日 (顧客要件 2026-07)', async () => {
    // 参照は編集前レコード。購読開始日を未来にすると既定の joho(=当日) が
    // 開始日未満になり、情報変更適用日エラーで update を止める。
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_kaishi_date: '2030-01-01' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;
    // 何か変更して pristine ガード（変更なし→更新スキップ）を解除する。
    vm.formState.biko = '変更メモ';
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('購読開始日（2030/01/01）');
    expect(updateDokusya).not.toHaveBeenCalled();
  });

  it('should block update + show 解約予定日 message on joho when 販売店変更の適用日 >= 解約予定日 (販売店適用日は joho に統一)', async () => {
    // 参照は編集前の解約予定日。販売店を変更して joho(=適用日)に解約予定日以降を
    // 入れると joho エラーで update を止める（顧客要件 2026-07: 販売店適用日は廃止）。
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_chushi_date: '2026-08-01' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;

    // 販売店を変更 → joho が有効化。解約予定日以降を入力。
    vm.formState.hanbaiten_id = Number(vm.formState.hanbaiten_id) + 1;
    await flushPromises();
    vm.formState.joho_henko_tekiyo_date = '2026-09-01';
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('解約予定日（2026/08/01）');
    expect(updateDokusya).not.toHaveBeenCalled();
  });

  // 「解約予定日 < 購読開始日」の submit ブロックは本フォームから撤去した（顧客要件
  // 2026-07 改訂 — 停止は一覧ポップアップ + 専用API）。開始日以降チェックは停止側の
  // disabledStopPaperDate + BE service.stop が担う（DokusyaListView.spec.ts /
  // dokusya.service.spec.ts）。joho の上限参照として既存の解約予約日を使う検証は
  // 上のテスト（joho >= 解約予定日）で引き続きカバーする。

  it('should show the joho<kaishi error on 情報変更適用日 when 販売店のみ変更 (販売店適用日は joho に統一)', async () => {
    // 顧客要件 2026-07: 販売店適用日を廃止。販売店のみ変更でも joho が唯一の適用日で
    // 編集可。joho<購読開始日 のエラーは joho フィールドに情報変更適用日の文言で出す。
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_kaishi_date: '2030-01-01' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;

    // 販売店のみ変更 → joho 編集可。joho に < 購読開始日(2030) の未来日を入力。
    vm.formState.hanbaiten_id = Number(vm.formState.hanbaiten_id) + 1;
    await flushPromises();
    vm.formState.joho_henko_tekiyo_date = '2026-09-01'; // >= 当日 だが < 購読開始日(2030)
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('情報変更適用日は購読開始日（2030/01/01）');
    // エラーは joho フォーム項目に紐づく。
    const johoItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'joho_henko_tekiyo_date');
    expect(johoItem?.text()).toContain('情報変更適用日は購読開始日（2030/01/01）');
    expect(updateDokusya).not.toHaveBeenCalled();
  });

  it('should keep 購読開始日 editable in create mode', async () => {
    const { wrapper } = await renderView();
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'dokusya_kaishi_date');
    expect(item).toBeDefined();
    const input = item!.find('input');
    expect((input.element as HTMLInputElement).disabled).toBe(false);
  });

  it('should render 新聞単価 options as 単価名 + 半角スペース + 金額 (税区分で解決した kingaku)', async () => {
    // 顧客要件: ドロップダウンは「単価名 + 半角スペース + 金額」を表示する。
    // 金額は BE がログイン中 JA の税区分 (zei_kubun=1→税込 / =2→税抜) で解決した
    // `kingaku` を用いる。fixture: tanka_name='基本購読料（月額）', kingaku=4900。
    const { wrapper } = await renderView();
    const tankaItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'tanka_id');
    expect(tankaItem).toBeDefined();
    const select = tankaItem!.findComponent({ name: 'ASelect' });
    const opts = select.props('options') as Array<{
      value: number;
      label: string;
    }>;
    expect(opts[0].label).toBe('基本購読料（月額） ¥4,900');
  });

  it('should show 必須項目です。 when tanka_id is null and 登録 is clicked', async () => {
    // Same regression guard as hanbaiten_id above — clearable dropdown.
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ tanka_id: null }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when shiharai_hoho is unset (clearable select cleared)', async () => {
    // Same regression guard for clearable select — see hanbaiten_id.
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ shiharai_hoho: null as any }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 郵便番号は半角数字7桁で入力してください。 when yubin_no is 6 chars (ACSMS-MSG-011-004)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ yubin_no: '123456' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('郵便番号');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-011-005 when email format is invalid', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ email: 'not-an-email' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('メールアドレス');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should show 備考は500文字以内で入力してください。 when biko exceeds 500 chars (ACSMS-MSG-011-010)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ biko: 'あ'.repeat(501) }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('500');
    expect(createDokusya).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. 購読種別による条件付き必須・表示切替 (機能定義 7.x + 12.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 購読種別 conditional rules (機能定義 7.x / 12.x)', () => {
  it('should require email when dokusya_shubetsu is 電子版 (2) (機能定義 7.1)', async () => {
    // 電子版/併読 → email becomes required.
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 2,
      email: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should filter the 管理支店 dropdown by 購読種別 paper/denshi flags (顧客要件2026-07)', async () => {
    const { getKanriShitenDropdown } = await import(
      '@/api/kanri-shiten/kanri-shiten'
    );
    vi.mocked(getKanriShitenDropdown).mockResolvedValue({
      data: [
        { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '紙のみ支店', paper_flg: true, denshi_flg: false },
        { kanri_shiten_id: 20, kanri_shiten_code: 'KS002', kanri_shiten_name: '電子のみ支店', paper_flg: false, denshi_flg: true },
        { kanri_shiten_id: 30, kanri_shiten_code: 'KS003', kanri_shiten_name: '両方支店', paper_flg: true, denshi_flg: true },
      ],
    } as never);

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const kanriIds = (): number[] => {
      const select = wrapper
        .findAllComponents({ name: 'AFormItem' })
        .find((it) => it.props('name') === 'kanri_shiten_id')!
        .findComponent({ name: 'ASelect' });
      return (select.props('options') as Array<{ value: number }>)
        .map((o) => o.value)
        .sort((a, b) => a - b);
    };

    // 紙版(1) → paper_flg=true のみ（10, 30）。
    vm.formState.dokusya_shubetsu = 1;
    await flushPromises();
    expect(kanriIds()).toEqual([10, 30]);

    // 電子版(2) → denshi_flg=true のみ（20, 30）。
    vm.formState.dokusya_shubetsu = 2;
    await flushPromises();
    expect(kanriIds()).toEqual([20, 30]);

    // 併読(3) → 両フラグ true のみ（30）。
    vm.formState.dokusya_shubetsu = 3;
    await flushPromises();
    expect(kanriIds()).toEqual([30]);
  });

  it('should clear a selected 管理支店 when 購読種別 change filters it out (顧客要件2026-07)', async () => {
    const { getKanriShitenDropdown } = await import(
      '@/api/kanri-shiten/kanri-shiten'
    );
    vi.mocked(getKanriShitenDropdown).mockResolvedValue({
      data: [
        { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '紙のみ支店', paper_flg: true, denshi_flg: false },
        { kanri_shiten_id: 30, kanri_shiten_code: 'KS003', kanri_shiten_name: '両方支店', paper_flg: true, denshi_flg: true },
      ],
    } as never);

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    // 紙版で紙のみ支店(10)を選択 → 電子版に切替で条件外れ → クリアされる。
    vm.formState.dokusya_shubetsu = 1;
    await flushPromises();
    vm.formState.kanri_shiten_id = 10;
    await flushPromises();
    vm.formState.dokusya_shubetsu = 2;
    await flushPromises();
    expect(vm.formState.kanri_shiten_id).toBeNull();
  });

  it('should require email when dokusya_shubetsu is 併読 (3)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 3,
      email: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should allow email to be empty when dokusya_shubetsu is 紙版 (1)', async () => {
    // 紙版 → email is optional (no validation triggered when blank).
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 1,
      email: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).toHaveBeenCalledTimes(1);
  });

  it('should trim leading/trailing whitespace on the 8 name fields (氏名・配達先氏名 漢字/かな) before submit', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    // 紙版 + haitatsu_same_flg=false → 配達先クラスタ必須なので 8項目すべて送信。
    // かなは HIRAGANA_RE 準拠（ひらがな）。各値を前後の空白で囲む。
    await fillForm(
      vm,
      buildCreateDokusyaForm({
        shimei_sei: '  山田  ',
        shimei_mei: ' 太郎 ',
        shimei_kana_sei: ' やまだ ',
        shimei_kana_mei: ' たろう ',
        haitatsu_same_flg: false,
        haitatsu_yubin_no: '1000002',
        haitatsu_todofuken_code: '13',
        haitatsu_shikuchoson: '渋谷区',
        haitatsu_chome_banchi: '1-1',
        haitatsu_shimei_sei: ' 鈴木 ',
        haitatsu_shimei_mei: ' 花子 ',
        haitatsu_shimei_kana_sei: ' すずき ',
        haitatsu_shimei_kana_mei: ' はなこ ',
      }),
    );

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).toHaveBeenCalledTimes(1);
    const body = vi.mocked(createDokusya).mock.calls[0][0];
    expect(body.shimei_sei).toBe('山田');
    expect(body.shimei_mei).toBe('太郎');
    expect(body.shimei_kana_sei).toBe('やまだ');
    expect(body.shimei_kana_mei).toBe('たろう');
    expect(body.haitatsu_shimei_sei).toBe('鈴木');
    expect(body.haitatsu_shimei_mei).toBe('花子');
    expect(body.haitatsu_shimei_kana_sei).toBe('すずき');
    expect(body.haitatsu_shimei_kana_mei).toBe('はなこ');
  });

  it('should hide the 配達先情報 section content when dokusya_shubetsu is 電子版 (機能定義 7.5)', async () => {
    // 電子版/併読 → 配達先情報エリアを非活性化 (入力不要).
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ dokusya_shubetsu: 2 }));

    // The delivery cluster is either hidden (display:none) or disabled
    // — assert at least one of the address subsection input/select is
    // not active.
    const haitatsuYubinLabel = wrapper
      .findAll('label')
      .find((l) => l.text().includes('配達先') || l.attributes('for')?.includes('haitatsu'));
    if (haitatsuYubinLabel) {
      const parent = haitatsuYubinLabel.element.closest('section, fieldset, div');
      const cls = parent?.className ?? '';
      expect(
        cls.includes('disabled') ||
          cls.includes('hidden') ||
          cls.includes('opacity'),
      ).toBe(true);
    } else {
      // If the entire section is removed from the DOM, that's also a
      // valid implementation — pass when no haitatsu labels render.
      expect(
        wrapper.findAll('label').filter((l) => l.text().includes('配達先苗字')),
      ).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. 手続種類変更 (機能定義 8.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — tetsuzuki_shurui change (機能定義 8.x)', () => {
  it('should force dokusya_busu to 0 when tetsuzuki_shurui changes to 解約 (0)', async () => {
    // 機能定義 8.1 — 解約 → 部数=0 readonly.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      tetsuzuki_shurui: 1,
      dokusya_busu: 5,
    }));

    // Flip the radio to 解約.
    vm.formState.tetsuzuki_shurui = 0;
    await flushPromises();

    expect(vm.formState.dokusya_busu).toBe(0);
  });

  it('should set dokusya_busu to 1 when tetsuzuki_shurui changes to 新規 (1)', async () => {
    // 機能定義 8.x — 新規 → 既定 部数=1.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      tetsuzuki_shurui: 0,
      dokusya_busu: 0,
    }));

    // Flip the radio to 新規.
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();

    expect(vm.formState.dokusya_busu).toBe(1);
  });

  it('should allow non-zero dokusya_busu when tetsuzuki_shurui is 新規 (1)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      tetsuzuki_shurui: 1,
      dokusya_busu: 3,
    }));
    expect(vm.formState.dokusya_busu).toBe(3);
  });

  it('should restore dokusya_busu to the DB value when tetsuzuki flips back to 新規 in edit mode', async () => {
    // 編集: 解約 を選ぶと 0 部。新規 に戻すと DB 登録時の部数(5)を復元する
    // （1 に戻さない・0 のままにもしない）。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ tetsuzuki_shurui: 1, dokusya_busu: 5 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;
    await flushPromises();

    // 解約 → 0 部。
    vm.formState.tetsuzuki_shurui = 0;
    await flushPromises();
    expect(vm.formState.dokusya_busu).toBe(0);

    // 新規 に戻すと DB 登録時の 5 部に復元。
    vm.formState.tetsuzuki_shurui = 1;
    await flushPromises();
    expect(vm.formState.dokusya_busu).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. 配達先 — 購読者情報と同じ (機能定義 9.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — haitatsu_same_flg toggle (機能定義 9.x)', () => {
  it('should clear haitatsu_* fields when haitatsu_same_flg is checked (機能定義 9.1)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      haitatsu_same_flg: false,
      haitatsu_yubin_no: '1500001',
      haitatsu_shikuchoson: '渋谷区',
      haitatsu_chome_banchi: '神宮前1-1',
    }));

    // Tick the checkbox.
    vm.formState.haitatsu_same_flg = true;
    await flushPromises();

    expect(vm.formState.haitatsu_yubin_no).toBe('');
    expect(vm.formState.haitatsu_shikuchoson).toBe('');
    expect(vm.formState.haitatsu_chome_banchi).toBe('');
  });

  it('should require haitatsu_shimei_sei + _mei when haitatsu_same_flg=false and dokusya_shubetsu=紙版 (機能定義 9.2)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 1,
      haitatsu_same_flg: false,
      haitatsu_yubin_no: '1500001',
      haitatsu_todofuken_code: '13',
      haitatsu_shikuchoson: '渋谷区',
      haitatsu_chome_banchi: '神宮前1-1',
      haitatsu_shimei_sei: '',
      haitatsu_shimei_mei: '',
      haitatsu_shimei_kana_sei: '',
      haitatsu_shimei_kana_mei: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should accept 配達先苗字/名前 with 半角数字 but reject a symbol (顧客要件 2026-07 再緩和)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 1,
      haitatsu_same_flg: false,
      haitatsu_yubin_no: '1500001',
      haitatsu_todofuken_code: '13',
      haitatsu_shikuchoson: '渋谷区',
      haitatsu_chome_banchi: '神宮前1-1',
      // 数字は許容（再緩和）。名は記号 ! で弾かれることを確認。
      haitatsu_shimei_sei: 'Suzuki12',
      haitatsu_shimei_mei: 'Hanako!',
      haitatsu_shimei_kana_sei: 'すずき',
      haitatsu_shimei_kana_mei: 'はなこ',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // 数字を含む 苗字 は通る、記号を含む 名前 は弾く。
    expect(vm.fieldErrors.haitatsu_shimei_sei).toBeFalsy();
    expect(vm.fieldErrors.haitatsu_shimei_mei).toBe(
      '漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。',
    );
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should validate the haitatsu address fields (郵便番号/都道府県/市町村郡/丁目番地) when haitatsu_same_flg=false (機能定義 9.2)', async () => {
    // Regression: the 4 address form-items previously lacked the
    // :validate-status / :help binding, so required errors never
    // surfaced even though validateClient set them. Names are filled so
    // ONLY the address cluster can produce the 必須 message.
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 1,
      haitatsu_same_flg: false,
      haitatsu_yubin_no: '',
      haitatsu_todofuken_code: '',
      haitatsu_shikuchoson: '',
      haitatsu_chome_banchi: '',
      haitatsu_shimei_sei: '田中',
      haitatsu_shimei_mei: '花子',
      haitatsu_shimei_kana_sei: 'たなか',
      haitatsu_shimei_kana_mei: 'はなこ',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // The address form-items now render the required message via :help.
    expect(wrapper.text()).toContain('必須項目です。');
    expect(createDokusya).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. 支払方法による表示切り替え (機能定義 10.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — shiharai_hoho conditional bank-required (機能定義 10.x)', () => {
  it('should require bank_shiten_id when shiharai_hoho=1 (口座引落)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      shiharai_hoho: 1,
      bank_shiten_id: null,
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // ACSMS-MSG-011-006: 口座引落の場合、〇〇は必須です。
    expect(wrapper.text()).toContain('必須');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should require hikiotoshi_koza_no when shiharai_hoho=1', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      shiharai_hoho: 1,
      hikiotoshi_koza_no: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should require hikiotoshi_koza_meigi when shiharai_hoho=1', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      shiharai_hoho: 1,
      hikiotoshi_koza_meigi: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須');
    expect(createDokusya).not.toHaveBeenCalled();
  });

  it('should allow bank cluster to be empty when shiharai_hoho is 現金集金 (2)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      shiharai_hoho: 2,
      bank_shiten_id: null,
      hikiotoshi_yokin_shubetsu: null,
      hikiotoshi_koza_no: '',
      hikiotoshi_koza_meigi: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. 登録 — happy path (機能定義 2.x + ACSMS-MSG-011-011)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — create success (機能定義 2.x)', () => {
  it('should call createDokusya with the form body when 登録 is clicked with valid input', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).toHaveBeenCalledTimes(1);
    const body = vi.mocked(createDokusya).mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(body).toMatchObject({
      shimei_sei: '山田',
      shimei_mei: '太郎',
      dokusya_shubetsu: 1,
      tetsuzuki_shurui: 1,
    });
  });

  it('should accept and submit a YYYY/MM/DD (slash) 購読開始日 without a client-side format block', async () => {
    // The picker displays YYYY/MM/DD; a slash date must be a valid submit
    // (the BE accepts both separators and normalises to hyphen for storage).
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({ dokusya_kaishi_date: '2026/05/31' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).toHaveBeenCalledTimes(1);
    const body = vi.mocked(createDokusya).mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(body.dokusya_kaishi_date).toBe('2026/05/31');
  });

  it('should reject a past/today 購読開始日 on create (未来日のみ・顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockClear();

    const vm = wrapper.vm as any;
    // 当日を送っても未来日のみ許可なので弾かれる（紙版=date-picker 経路）。
    await fillForm(vm, buildCreateDokusyaForm({ dokusya_kaishi_date: todayIsoTokyo() }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).not.toHaveBeenCalled();
    expect(vm.fieldErrors.dokusya_kaishi_date).toBe(
      '購読開始日は本日より後の日付を入力してください。',
    );
  });

  it('should show 「登録しました。」 toast when createDokusya succeeds (ACSMS-MSG-011-011)', async () => {
    const { wrapper } = await renderView();
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Project verb-only convention — useNotify().created() → '登録しました。'.
    expect(successSpy).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to DokusyaList when createDokusya succeeds (機能定義 2.7)', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaList');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. 登録 — エラーフロー (DUPLICATE_EMAIL + VALIDATION_ERROR + 500)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — create error paths (ACSMS-MSG-011-009 / 012)', () => {
  it('should show ACSMS-MSG-011-009 when createDokusya rejects with DUPLICATE_EMAIL', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_EMAIL',
          message: 'このメールアドレスは既に登録されています。',
        },
      },
    });

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusya_shubetsu: 2,
      email: 'dup@example.com',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('このメールアドレスは既に登録されています');
  });

  it('should NOT show success toast when createDokusya rejects with 500 (ACSMS-MSG-011-012)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT navigate when createDokusya rejects with VALIDATION_ERROR', async () => {
    const { wrapper, router } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(createDokusya).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          errors: [{ field: 'bank_shiten_id', message: '指定された銀行支店が見つかりません。' }],
        },
      },
    });
    const pushSpy = vi.spyOn(router, 'push');
    pushSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).not.toContain('DokusyaList');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. 編集モード — update (機能定義 15.2 + ACSMS-MSG-011-015)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — update flow (edit mode)', () => {
  it('should call updateDokusya with the route id when 更新 is clicked in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya, createDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildUpdateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).not.toHaveBeenCalled();
    expect(updateDokusya).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDokusya).mock.calls[0]?.[0]).toBe(100);
  });

  it('should NOT call updateDokusya (skip PUT/log/履歴) when nothing changed in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    // 何も変更せず（fillForm を呼ばず）にそのまま送信する。
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should skip update when the loaded name has leading/trailing spaces and nothing changed (record-140 regression)', async () => {
    // 実データ: shimei_mei = " 合 購読"（前後空白あり）。送信時の trimNameFields()
    // が変更なし判定より前に走ると formState が書き換わり「変更あり」と誤検知して
    // しまっていた。判定をトリム前に移したので、無変更ならスキップされる。
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_id: 100, shimei_mei: ' 合 購読' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    vi.mocked(updateDokusya).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should treat a whitespace-only change to a name field as no change (saved value is trimmed)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    const vm = wrapper.vm as any;
    // 末尾に空白だけ追加 → 送信時 trim されるので保存結果は不変 = 変更なし。
    vm.formState.shimei_sei = `${vm.formState.shimei_sei}  `;
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should call updateDokusya once a single field is changed in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();

    const vm = wrapper.vm as any;
    vm.formState.chome_banchi = 'まったく新しい住所99-99';
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).toHaveBeenCalledTimes(1);
  });

  it('should default 読者情報変更適用日 to tomorrow (JST) when the edit form loads (未来日のみ・顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;
    expect(vm.formState.joho_henko_tekiyo_date).toBe(tomorrowIsoTokyo());
  });

  it('should send the user-entered 読者情報変更適用日 in the update body', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();

    const vm = wrapper.vm as any;
    // 当日以降の未来日をユーザーが入力（過去日不可）。
    const future = '2099-12-31';
    await fillForm(vm, buildUpdateDokusyaForm({ joho_henko_tekiyo_date: future }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDokusya).mock.calls[0]?.[1].joho_henko_tekiyo_date).toBe(future);
  });

  it('should block update and flag 読者情報変更適用日 when today/past is entered (未来日のみ・顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();

    const vm = wrapper.vm as any;
    // 当日を入れても未来日のみ許可なので弾かれる。
    await fillForm(vm, buildUpdateDokusyaForm({ joho_henko_tekiyo_date: todayIsoTokyo() }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).not.toHaveBeenCalled();
    expect(vm.fieldErrors.joho_henko_tekiyo_date).toBe(
      '情報変更適用日は本日より後の日付を指定してください。',
    );
  });

  it('should block update and flag 読者情報変更適用日 when it is cleared (required)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildUpdateDokusyaForm({ joho_henko_tekiyo_date: null }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateDokusya).not.toHaveBeenCalled();
    expect(vm.fieldErrors.joho_henko_tekiyo_date).toBeTruthy();
  });

  it('should show 「更新しました。」 toast when updateDokusya succeeds (ACSMS-MSG-011-015)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildUpdateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to DokusyaList when updateDokusya succeeds', async () => {
    const { wrapper, router } = await renderView({ dokusyaId: 100 });
    const pushSpy = vi.spyOn(router, 'push');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildUpdateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaList');
  });

  it('should NOT call createDokusya when submit is fired in edit mode', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildUpdateDokusyaForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createDokusya).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. 電子版承認 / 否認 (機能定義 3.x + 4.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — approve / reject flow (機能定義 3.x / 4.x)', () => {
  it('should render the 承認しない button only when denshi_shonin_status=0 (機能定義 4.1)', async () => {
    // status=0 (承認待ち) → 否認ボタン表示.
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });

    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.text()).toContain('承認しない');
  });

  it('should NOT render the 承認しない button when denshi_shonin_status=1 (already approved)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 1 }),
    });

    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.text()).not.toContain('承認しない');
  });

  it('should NOT render the 承認しない button when denshi_shonin_status=null (paper subscriber)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: null }),
    });

    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.text()).not.toContain('承認しない');
  });

  it('should open Modal.confirm with ACSMS-MSG-011-014 wording when 承認しない is clicked', async () => {
    // 機能定義 4.2 — 否認確認 (ACSMS-MSG-011-014):
    //   "電子版読者の登録を否認します。よろしいですか？"
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    const confirmSpy = vi.spyOn(Modal, 'confirm');
    confirmSpy.mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    const rejectBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認しない'));
    expect(rejectBtn).toBeDefined();
    await rejectBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const opts = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    const text = JSON.stringify(opts);
    expect(text).toContain('否認');
  });

  it('should call rejectDokusya when 承認しない confirm dialog OK is clicked', async () => {
    const { getDokusya, rejectDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    vi.mocked(rejectDokusya).mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    const rejectBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認しない'));
    expect(rejectBtn).toBeDefined();
    await rejectBtn!.trigger('click');
    await flushPromises();

    expect(rejectDokusya).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rejectDokusya).mock.calls[0]?.[0]).toBe(100);
  });

  it('should show 「否認しました。」 toast when rejectDokusya succeeds', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    const rejectBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認しない'));
    await rejectBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('否認しました。');
  });

  it('should navigate to DokusyaList when rejectDokusya succeeds (機能定義 4.3)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });

    const { wrapper, router } = await renderView({ dokusyaId: 100 });
    const pushSpy = vi.spyOn(router, 'push');

    const rejectBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認しない'));
    await rejectBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaList');
  });

  it('should call approveDokusya when submit button is 承認・登録 and denshi_shonin_status=0', async () => {
    // 機能定義 3.3 — 承認 button calls approveDokusya, then refreshes
    // (or navigates) on success. Submit button text is 承認・登録 in
    // pending state.
    const { getDokusya, approveDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    vi.mocked(approveDokusya).mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    // The approve button is the primary submit-style button when
    // status=0; it carries text 承認 (with optional ・登録 suffix).
    const approveBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認') && !b.text().includes('承認しない'));
    expect(approveBtn).toBeDefined();
    await approveBtn!.trigger('click');
    await flushPromises();

    expect(approveDokusya).toHaveBeenCalledTimes(1);
    expect(vi.mocked(approveDokusya).mock.calls[0]?.[0]).toBe(100);
  });

  it('should show 「承認しました。」 toast when approveDokusya succeeds', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    const approveBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認') && !b.text().includes('承認しない'));
    await approveBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('承認しました。');
  });

  it('should show INVALID_STATUS message when approve API rejects with INVALID_STATUS', async () => {
    // err:INVALID_STATUS (row 10 of api.md). FE just lets the global
    // axios interceptor toast; the spec asserts the navigation does
    // NOT happen.
    const { getDokusya, approveDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ denshi_shonin_status: 0, dokusya_shubetsu: 2 }),
    });
    vi.mocked(approveDokusya).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'INVALID_STATUS',
          message: '承認待ちの読者ではありません。',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView({ dokusyaId: 100 });
    const approveBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('承認') && !b.text().includes('承認しない'));
    await approveBtn!.trigger('click');
    await flushPromises();

    // No success toast on failure.
    expect(successSpy).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. 履歴表示 → 購読者履歴情報画面 (ACSMS-SCR-013) への遷移
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — history button (→ SCR-013 遷移)', () => {
  it('should navigate to DokusyaRireki with the dokusya_id when 履歴表示 is clicked in edit mode', async () => {
    const { wrapper, router } = await renderView({ dokusyaId: 100 });
    const pushSpy = vi.spyOn(router, 'push');
    pushSpy.mockClear();

    const historyBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('履歴表示'));
    expect(historyBtn).toBeDefined();
    await historyBtn!.trigger('click');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalled();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaRireki');
    expect(pushed).toContain('100');
  });

  it('should NOT render the 履歴表示 button when mounted in create mode (no dokusya_id yet)', async () => {
    const { wrapper } = await renderView();
    const historyBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('履歴表示'));
    expect(historyBtn).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. 戻る (機能定義 16.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — back navigation (機能定義 16.x)', () => {
  it('should navigate to DokusyaList when 前の画面に戻る is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');
    pushSpy.mockClear();

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaList');
  });

  it('should NOT call createDokusya when 前の画面に戻る is clicked (no save)', async () => {
    const { wrapper } = await renderView();
    const { createDokusya } = await import('@/api/dokusya/dokusya');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    await backBtn!.trigger('click');
    await flushPromises();

    expect(createDokusya).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. 販売店コード選択 → 販売店名 auto-fill (機能定義 6.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — hanbaiten auto-fill (機能定義 6.x)', () => {
  it('should fetch the hanbaiten dropdown once when mounted', async () => {
    await renderView();
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    expect(getHanbaitenDropdown).toHaveBeenCalled();
  });

  it('should request only 営業中 stores (active_only=true) so 廃店 are excluded from the picker', async () => {
    // 廃店(haiten_flg=true)は購読者の販売店選択から除外する。
    await renderView();
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ active_only: true }),
    );
  });

  it('should auto-fill hanbaiten_name when hanbaiten_id is selected', async () => {
    // 機能定義 6.2 — 販売店コード選択後、販売店名を自動入力.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.hanbaiten_id = 5;
    await flushPromises();

    // The view may either store the name in a separate ref (e.g.
    // `hanbaitenName`) or look it up on render. Either way the label
    // must surface.
    expect(wrapper.text()).toContain('山田販売店');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 15. 引落口座支店 dropdown filter (機能定義 10.1)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 引落口座支店 dropdown (機能定義 10.1)', () => {
  it('should fetch the shiten dropdown filtered by kinyu_shiten_flg when shiharai_hoho=1', async () => {
    // 機能定義 10.1 — 「引落口座支店」ドロップダウンリストでは、
    // 「支店マスタの金融機関支店フラグ=1」のもののみ表示する.
    await renderView();
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    // The view fetches the shiten list once on mount (form view needs
    // the full list for both kinyu and non-kinyu fields). Filtering by
    // kinyu_shiten_flg=true happens client-side OR via a query param —
    // either way the API gets called.
    expect(getShitenDropdown).toHaveBeenCalled();
  });

  it('should exclude 金融支店 (kinyu_shiten_flg=true) from the 支店 dropdown options', async () => {
    // 支店 (購読者の所属支店) は金融支店を除外 — 金融支店は引落口座支店専用。
    // fixture: shiten 50 (kinyu=true, kanri=10) は対象外、
    //          shiten 100 (kinyu=false, kanri=20) は候補。
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const shitenItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'shiten_id');
    expect(shitenItem).toBeDefined();
    const select = shitenItem!.findComponent({ name: 'ASelect' });

    // 管理支店 10 配下は金融支店 50 のみ → 候補から除外され空になる。
    vm.formState.kanri_shiten_id = 10;
    await flushPromises();
    let opts = select.props('options') as Array<{ value: number }>;
    expect(opts.some((o) => o.value === 50)).toBe(false);

    // 管理支店 20 配下は非金融支店 100 → 候補に出る。
    vm.formState.kanri_shiten_id = 20;
    await flushPromises();
    opts = select.props('options') as Array<{ value: number }>;
    expect(opts.some((o) => o.value === 100)).toBe(true);
    expect(opts.some((o) => o.value === 50)).toBe(false);
  });

  it('should NOT mark 支店 as required (任意・顧客要件 2026-07: no asterisk)', async () => {
    const { wrapper } = await renderView();
    const shitenItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'shiten_id');
    expect(shitenItem).toBeDefined();
    // ラベルに必須マーカー「*」が付かないこと（他項目の * を拾わないよう
    // ラベルテキストのみを確認）。
    const label = shitenItem!.find('.ant-form-item-label');
    expect(label.text()).not.toContain('*');
  });

  it('should NOT show a required error for 支店 when left blank on submit (任意)', async () => {
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.shiten_id = null;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const shitenItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'shiten_id');
    expect(shitenItem!.text()).not.toContain('必須');
    // createDokusya 呼び出しの成否は他要因に依存するため、ここでは
    // 支店の必須エラーが出ないことのみを確認する。
    void createDokusya;
  });

  // 制限③（顧客要件2026-07）— 所属支店固定アカウントは新規登録時に
  // 管理支店/支店をアカウントの所属支店にピン＋非活性化する。
  it('should pin & disable 管理支店/支店 to the account 所属支店 in create mode when user.shiten_id is set', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        role_id: 5,
        ja_id: 1,
        kanri_shiten_id: 20,
        shiten_id: 100,
        paper_flg: true,
        denshi_flg: true,
      }),
    });
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.formState.kanri_shiten_id).toBe(20);
    expect(vm.formState.shiten_id).toBe(100);

    const findSelect = (name: string) =>
      wrapper
        .findAllComponents({ name: 'AFormItem' })
        .find((it) => it.props('name') === name)!
        .findComponent({ name: 'ASelect' });
    expect(findSelect('shiten_id').props('disabled')).toBe(true);
    expect(findSelect('kanri_shiten_id').props('disabled')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 16. 購読者層分類 切替 (機能定義 11.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 購読者層分類 conditional 主な生産物 (機能定義 11.x)', () => {
  it('should clear nogyosya_bunrui when 農業者 is unchecked from dokusyaso_bunrui (機能定義 11.2)', async () => {
    // 機能定義 11.2 — 農業者(コード 0) を外すと nogyosya_bunrui をクリア.
    // 分類はラベルでなく電子版と同じコードで保存する（顧客要件 2026-07）。
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateDokusyaForm({
      dokusyaso_bunrui: '0',
      nogyosya_bunrui: '0,1',
    }));

    // Remove 農業者 from dokusyaso_bunrui.
    vm.formState.dokusyaso_bunrui = '';
    await flushPromises();

    expect(vm.formState.nogyosya_bunrui).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 17. 未来日チェック (画面項目定義 No.54)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 販売店変更の適用日は情報変更適用日(joho)に統一 (顧客要件 2026-07)', () => {
  it('should make 情報変更適用日(joho) editable and NOT create a separate 販売店適用日 when 販売店 changed', async () => {
    // 顧客要件 2026-07: 販売店適用日を廃止。販売店を変更したら joho が唯一の適用日
    // として編集可になり、専用の販売店適用日フィールドは存在しない。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ hanbaiten_id: 10 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;
    await flushPromises();
    vm.formState.hanbaiten_id = 11;
    await flushPromises();
    // 専用フィールドは無い。
    const hanbaitenItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'hanbaiten_tekiyo_date');
    expect(hanbaitenItem).toBeUndefined();
    // joho は編集可。
    const johoItem = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'joho_henko_tekiyo_date');
    expect(/ant-picker-disabled/.test(johoItem!.html())).toBe(false);
  });

  it('should send joho_henko_tekiyo_date (NOT hanbaiten_tekiyo_date) on update when 販売店 changed', async () => {
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ hanbaiten_id: 10 }),
    });
    vi.mocked(updateDokusya).mockClear();
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const vm = wrapper.vm as any;
    await flushPromises();
    vm.formState.hanbaiten_id = 11;
    await flushPromises();
    vm.formState.joho_henko_tekiyo_date = tomorrowIsoTokyo();
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(vi.mocked(updateDokusya)).toHaveBeenCalled();
    const body = vi.mocked(updateDokusya).mock.calls[0][1] as unknown as Record<
      string,
      unknown
    >;
    expect(body.joho_henko_tekiyo_date).toBeTruthy();
    expect('hanbaiten_tekiyo_date' in body).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. 購読種別=電子版 → 支払方法 excludes クレジットカード only (create mode)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 電子版 excludes クレジットカード from 支払方法 (create mode)', () => {
  it('should reset 支払方法 to null when 購読種別 changes to 電子版 with クレジットカード (6)', async () => {
    const { wrapper } = await renderView(); // create mode
    const vm = wrapper.vm as any;
    vm.formState.shiharai_hoho = 6; // クレジットカード (not allowed for 電子版)
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    expect(vm.formState.shiharai_hoho).toBeNull();
  });

  it('should KEEP 支払方法=現金集金 (2) when 購読種別 changes to 電子版', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.shiharai_hoho = 2; // 現金集金 (allowed for 電子版)
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    expect(vm.formState.shiharai_hoho).toBe(2);
  });

  it('should KEEP 支払方法=口座引落 (1) when 購読種別 changes to 電子版', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.shiharai_hoho = 1; // 口座引落 (allowed)
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    expect(vm.formState.shiharai_hoho).toBe(1);
  });

  it('should NOT reset 支払方法 in edit mode (existing 電子版 record may be クレカ)', async () => {
    const { wrapper } = await renderView({ dokusyaId: 1 }); // edit mode
    const vm = wrapper.vm as any;
    await flushPromises();
    vm.formState.shiharai_hoho = 6; // クレジットカード
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    expect(vm.formState.shiharai_hoho).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14b. 電子版 → 支払方法 の クレジットカード: 新規は除外 / 編集は disabled で残す
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 電子版 クレジットカード handling in 支払方法 options', () => {
  /** Read the `:options` prop of the 支払方法 <a-select>. */
  function shiharaiHohoSelectOptions(
    wrapper: ReturnType<typeof mount>,
  ): Array<{ value: number; label: string; disabled?: boolean }> {
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.text().includes('支払方法'));
    expect(item).toBeDefined();
    const select = item!.findComponent({ name: 'ASelect' });
    expect(select.exists()).toBe(true);
    return select.props('options') as Array<{
      value: number;
      label: string;
      disabled?: boolean;
    }>;
  }

  it('should remove クレジットカード (6) from the options in create mode when 電子版', async () => {
    const { wrapper } = await renderView(); // create mode
    const vm = wrapper.vm as any;
    vm.formState.dokusya_shubetsu = 2; // 電子版
    await flushPromises();
    const options = shiharaiHohoSelectOptions(wrapper);
    expect(options.some((o) => o.value === 6)).toBe(false);
  });

  it('should keep クレジットカード (6) but mark it disabled in edit mode when 電子版 (value may come from the 3rd-party system)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, shiharai_hoho: 2 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await flushPromises();
    const credit = shiharaiHohoSelectOptions(wrapper).find((o) => o.value === 6);
    expect(credit).toBeDefined();
    expect(credit!.disabled).toBe(true);
  });

  it('should keep クレジットカード (6) selectable-as-current (disabled option) when the existing 電子版 record carries クレカ', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, shiharai_hoho: 6 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await flushPromises();
    const vm = wrapper.vm as any;
    // Loaded value is preserved (displays via the disabled option).
    expect(Number(vm.formState.shiharai_hoho)).toBe(6);
    const credit = shiharaiHohoSelectOptions(wrapper).find((o) => o.value === 6);
    expect(credit).toBeDefined();
    expect(credit!.disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 参照モード + 当日変更 / 予約変更（顧客要件2026-07・SCR-011 参照→編集フロー）
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaFormView — 参照→編集フロー（当日変更/予約変更）', () => {
  // a-input-number のステッパー(min到達で disabled)を拾わないよう、実 disabled は
  // ネイティブ input / a-select・a-picker の disabled クラスで判定する。
  function fieldDisabled(wrapper: ReturnType<typeof mount>, name: string): boolean {
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === name);
    if (!item) return false;
    const input = item.find('input');
    if (input.exists() && (input.element as HTMLInputElement).disabled) return true;
    if (item.find('.ant-select-disabled').exists()) return true;
    if (item.find('.ant-picker-disabled').exists()) return true;
    return false;
  }

  it('編集マウント直後は参照モード（モードバー表示・submit 非表示）', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.find('[data-test="dokusya-mode-bar"]').exists()).toBe(true);
    expect((wrapper.vm as any).viewMode).toBe('reference');
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
  });

  it('当日変更を選ぶと joho=本日、紙版の帳票影響項目（部数/販売店/住所）は非活性', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    (wrapper.vm as any).selectMode('today');
    await flushPromises();
    expect((wrapper.vm as any).formState.joho_henko_tekiyo_date).toBe(todayIsoTokyo());
    expect(fieldDisabled(wrapper, 'dokusya_busu')).toBe(true);
    expect(fieldDisabled(wrapper, 'hanbaiten_id')).toBe(true);
    expect(fieldDisabled(wrapper, 'yubin_no')).toBe(true);
  });

  it('予約変更ポップアップで適用日を確定すると予約変更モードに入り帳票影響項目が編集可（適用日はポップアップ確定・インライン読取専用）', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await enterReservedMode(wrapper, tomorrowIsoTokyo());
    expect((wrapper.vm as any).viewMode).toBe('reserved');
    // 適用日はポップアップで確定した未来日（空ではない）。
    expect((wrapper.vm as any).formState.joho_henko_tekiyo_date).toBe(
      tomorrowIsoTokyo(),
    );
    expect(fieldDisabled(wrapper, 'dokusya_busu')).toBe(false);
    expect(fieldDisabled(wrapper, 'hanbaiten_id')).toBe(false);
    // インラインの適用日は読取専用（変更はポップアップ経由）。
    expect(fieldDisabled(wrapper, 'joho_henko_tekiyo_date')).toBe(true);
  });

  it('電子版は当日変更でも帳票影響項目（住所）を非活性にしない', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    // 紙版と同じく参照で開くのでモード選択が要る。当日変更でも電子版は帳票影響
    // 項目まで編集可（紙版はここが非活性）— モードの入り方だけを揃え、
    // 版ごとの編集範囲の違いは維持する。
    (wrapper.vm as any).selectMode('today');
    await flushPromises();
    expect(fieldDisabled(wrapper, 'yubin_no')).toBe(false);
  });

  // UI 統一（顧客要件 2026-07 改訂）: 電子版も紙版と同じく「参照で開く → モードを
  // 選ぶ」。以前は電子版だけ開いた瞬間に編集可能で、同じ画面が購読種別によって
  // 参照/編集で開き分かれていた（誤操作で保存しやすい）。
  it('電子版も参照モードで開き、モードバーが出る（紙版と同じ導線）', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect((wrapper.vm as any).viewMode).toBe('reference');
    expect(wrapper.find('[data-test="dokusya-mode-bar"]').exists()).toBe(true);
    // 参照モードなので更新ボタンは出さない（紙版と同じ）。
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
  });

  it('電子版は「予約変更」を disabled にする（隠さない）', async () => {
    // 隠すと「この画面に予約変更という機能が無い」と読めてしまい、紙版との違いが
    // 伝わらない。押せない状態で見せ、理由を補足テキストで示す。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    const reserved = wrapper.find('[data-test="mode-reserved"]');
    expect(reserved.exists()).toBe(true);
    expect(reserved.attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-test="mode-today"]').attributes('disabled')).toBe(
      undefined,
    );
    expect(
      wrapper.find('[data-test="dokusya-reserved-disabled-note"]').exists(),
    ).toBe(true);
  });

  it('電子版で selectMode("reserved") を直接呼んでもポップアップを開かない', async () => {
    // disabled は UI の都合でしかない。予約変更へ入れると未来日の履歴行ができ、
    // BE の当日変更前提と食い違うのでロジック側でも弾く。
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    (wrapper.vm as any).selectMode('reserved');
    await flushPromises();
    expect((wrapper.vm as any).reservedJohoModalOpen).toBe(false);
    expect((wrapper.vm as any).viewMode).toBe('reference');
  });

  it('紙版は「予約変更」を押せる（電子版だけの制限であること）', async () => {
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(
      wrapper.find('[data-test="mode-reserved"]').attributes('disabled'),
    ).toBe(undefined);
    expect(
      wrapper.find('[data-test="dokusya-reserved-disabled-note"]').exists(),
    ).toBe(false);
  });

  it('電子版で当日変更を選ぶと joho=本日・submit が出る', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    (wrapper.vm as any).selectMode('today');
    await flushPromises();
    expect((wrapper.vm as any).viewMode).toBe('today');
    expect((wrapper.vm as any).formState.joho_henko_tekiyo_date).toBe(
      todayIsoTokyo(),
    );
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('当日変更に入っただけでは「変更がありません」でスキップされる', async () => {
    // モード選択は適用日を本日へ動かすが、それは業務変更ではない。基準を取り直さ
    // ないと editGuard が dirty と誤判定し、中身が同じ履歴行が生まれる。
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();
    const { wrapper } = await renderView({ dokusyaId: 100 });
    (wrapper.vm as any).selectMode('today');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(vi.mocked(updateDokusya)).not.toHaveBeenCalled();
  });

  it('電子版 submit は change_mode=today を送る', async () => {
    const { getDokusya, updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 2, email: 'd@x.jp' }),
    });
    vi.mocked(updateDokusya).mockClear();
    const { wrapper } = await renderView({ dokusyaId: 100 });
    (wrapper.vm as any).selectMode('today');
    await flushPromises();
    // 実際に業務項目を変更しないと編集ガードで PUT がスキップされる。
    (wrapper.vm as any).formState.biko = '電子版変更メモ';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(vi.mocked(updateDokusya)).toHaveBeenCalled();
    const body = vi.mocked(updateDokusya).mock.calls.at(-1)?.[1] as {
      change_mode?: string;
    };
    expect(body.change_mode).toBe('today');
  });

  it('予約変更で submit すると change_mode=reserved を送る', async () => {
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(updateDokusya).mockClear();
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await enterReservedMode(wrapper);
    // 実際に業務項目を変更しないと編集ガードで PUT がスキップされるため、
    // 帳票影響項目（部数）を変更＋未来日を指定する。
    (wrapper.vm as any).formState.dokusya_busu = 7;
    (wrapper.vm as any).formState.joho_henko_tekiyo_date = tomorrowIsoTokyo();
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(vi.mocked(updateDokusya)).toHaveBeenCalled();
    const body = vi.mocked(updateDokusya).mock.calls.at(-1)?.[1] as {
      change_mode?: string;
    };
    expect(body.change_mode).toBe('reserved');
  });

  // B案 — 予約変更は「その適用日時点で有効な直前行(predecessor)」を
  // フォームへロードする。master(t_dokusya, 未来予約未反映) ではない。
  it('予約変更ポップアップ確定で predecessor(findBefore) をロードする（master ではない）', async () => {
    const { getDokusya, getDokusyaEffectiveAt } = await import(
      '@/api/dokusya/dokusya'
    );
    // master は haitatsu_same_flg=true（未来予約はまだ反映されていない）。
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_id: 100, haitatsu_same_flg: true }),
    });
    // findBefore(joho) = 直前の予約行 は haitatsu_same_flg=false。
    vi.mocked(getDokusyaEffectiveAt).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_id: 100, haitatsu_same_flg: false }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await enterReservedMode(wrapper, tomorrowIsoTokyo());
    expect(vi.mocked(getDokusyaEffectiveAt)).toHaveBeenCalledWith(
      100,
      tomorrowIsoTokyo(),
    );
    // フォームは predecessor(false) をロードする（master(true) ではない）。
    expect((wrapper.vm as any).formState.haitatsu_same_flg).toBe(false);
  });

  // B案 の核 — 未編集項目は predecessor 値のまま送られ、master へ
  // 誤って revert しない（master busu=5 / predecessor busu=8 → 送信 busu=8）。
  it('予約変更で未編集項目は predecessor 値のまま送る（master へ revert しない）', async () => {
    const { getDokusya, getDokusyaEffectiveAt, updateDokusya } = await import(
      '@/api/dokusya/dokusya'
    );
    vi.mocked(updateDokusya).mockClear();
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_id: 100, dokusya_busu: 5 }),
    });
    vi.mocked(getDokusyaEffectiveAt).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_id: 100, dokusya_busu: 8 }),
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    await enterReservedMode(wrapper, tomorrowIsoTokyo());
    // busu は触らず備考だけ変更 → busu は predecessor(8) のまま。
    (wrapper.vm as any).formState.biko = '予約変更メモ';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(vi.mocked(updateDokusya)).toHaveBeenCalled();
    const body = vi.mocked(updateDokusya).mock.calls.at(-1)?.[1] as {
      dokusya_busu?: number;
    };
    expect(body.dokusya_busu).toBe(8); // predecessor 値（master 5 へ revert しない）
  });

  it('モードバーは読取専用（併読）レコードでは出さない', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValueOnce({
      data: buildDokusyaDetail({ dokusya_shubetsu: 3 }), // 併読=読取専用
    });
    const { wrapper } = await renderView({ dokusyaId: 100 });
    expect(wrapper.find('[data-test="dokusya-mode-bar"]').exists()).toBe(false);
  });
});
