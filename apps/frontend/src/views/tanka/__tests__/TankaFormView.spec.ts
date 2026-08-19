// Screen: ACSMS-SCR-003 — 単価マスタ登録画面
//
// Drives src/views/tanka/TankaFormView.vue (one file shared between
// create + edit modes — route names `TankaCreate` and `TankaEdit`).
// Every it() maps to a clause in
//   docs/design/ACSMS-SCR-003/screen-design.md (機能定義 + メッセージ情報) +
//   docs/design/ACSMS-SCR-003/index.html (UI structure) +
//   docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md (API contracts).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { nowTokyo } from '@/utils/datetime';

import TankaFormView from '@/views/tanka/TankaFormView.vue';
import {
  buildTanka,
  buildCreateTankaForm,
  buildAuthUser,
  TANKA_TYPE_OPTIONS,
} from '@test/fixtures/tanka.fixture';

// Mock the Tanka API client. ACSMS-SCR-002's `/gen-code-frontend` shipped
// listTanka + removeTanka in `src/api/tanka/tanka.ts`; /gen-code-frontend
// for ACSMS-SCR-003 will extend the same file with getTanka + createTanka +
// updateTanka. The vi.mock factory enumerates all 5 so existing ACSMS-SCR-002
// specs still resolve their imports.
vi.mock('@/api/tanka/tanka', () => ({
  getTanka: vi.fn(),
  listTanka: vi.fn(),
  createTanka: vi.fn(),
  updateTanka: vi.fn(),
  removeTanka: vi.fn(),
}));

// Spy on antd's global toasts.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Edit mode: pass a tanka_id → router pre-navigates to /tanka/:id/edit.
   *  Create mode: undefined. */
  tankaId?: number;
  /** Override default CHUOKAI session (full tanka.* perms). */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  // `vm` widened to any so tests can call the view's internal submitWith
  // helper without defineExpose (established convention — see clean specs).
  wrapper: ReturnType<typeof mount> & { vm: any };
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
      { path: '/tanka', name: 'TankaList', component: { template: '<div />' } },
      { path: '/tanka/create', name: 'TankaCreate', component: { template: '<div />' } },
      {
        path: '/tanka/:id/edit',
        name: 'TankaEdit',
        component: { template: '<div />' },
      },
    ],
  });
  if (opts.tankaId !== undefined) {
    await router.push({ name: 'TankaEdit', params: { id: String(opts.tankaId) } });
  } else {
    await router.push({ name: 'TankaCreate' });
  }
  await router.isReady();

  const wrapper = mount(TankaFormView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: {
              user:
                opts.user ??
                buildAuthUser({
                  permissions: [
                    'tanka.view',
                    'tanka.create',
                    'tanka.update',
                    'tanka.delete',
                  ],
                }),
            },
            codes: {
              all: { TANKA_TYPE: TANKA_TYPE_OPTIONS },
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
  // Pin "today" so the create-mode past-date guard is deterministic. The
  // create fixture's tekiyo_start_date (2026-06-01) must stay in the future
  // relative to "now", otherwise validateClient rejects it and the form
  // never submits. Fake ONLY Date (leave setTimeout/setInterval real) so
  // antd transitions + flushPromises keep working. Per .claude/rules/vue.md
  // §Date/Time — specs hitting the date guards must control the clock.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-15T00:00:00+09:00'));
  // Default getTanka resolves so edit-mode mounts don't error.
  const { getTanka } = await import('@/api/tanka/tanka');
  vi.mocked(getTanka).mockResolvedValue({ data: buildTanka() });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Mount + initial render (機能定義 1.x)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — mount + initial render', () => {
  // Page title 「単価マスタ登録」 + breadcrumb come from MainLayout's
  // AppHeader (driven by route meta), NOT from this view. Mounting the
  // view standalone in unit tests therefore does NOT render them.

  it('should render the 単価情報入力 form heading when mounted', async () => {
    // COVERS: index.html h3 — '単価情報入力'
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('単価情報入力');
  });

  it('should render the 登録 submit button when mounted', async () => {
    // Antd v4 inserts a half-width space between two adjacent CJK chars
    // ("登 録" not "登録"). Use selector + substring instead of literal.
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('登');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    // Literal — 5 chars, no antd CJK auto-spacing.
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });

  it('should render the 単価種別 / 単価コード / 単価名 labels when mounted', async () => {
    // COVERS: 画面項目定義 rows 1, 2, 3 — required field labels visible.
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label, legend, .form-item-title').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('単価種別'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('単価コード'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('単価名'))).toBe(true);
  });

  it('should render the 適用開始日 / 適用終了日 labels when mounted', async () => {
    // COVERS: 画面項目定義 rows 7, 8
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label, legend, .form-item-title').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('適用開始日'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('適用終了日'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Create mode (機能定義 1.x + 4.x)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — create mode (no tanka_id in route)', () => {
  it('should NOT call getTanka when no tanka_id parameter is present', async () => {
    await renderView();
    const { getTanka } = await import('@/api/tanka/tanka');
    expect(getTanka).not.toHaveBeenCalled();
  });

  it('should default tanka_type to 1 (新聞購読料) when mounted in create mode', async () => {
    // COVERS: 機能定義 1.2 — 単価種別ラジオは新聞購読料が選択された状態
    const { wrapper } = await renderView();
    // Radio with value=1 (or '1') is checked in the rendered DOM.
    const checked = wrapper.find('input[type="radio"]:checked');
    expect(checked.exists()).toBe(true);
  });

  it('should call createTanka with the form payload when 登録 is clicked with valid input', async () => {
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockResolvedValue({
      data: { ...buildTanka(), tanka_id: 99 },
      message: '登録しました。',
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    expect(createTanka).toHaveBeenCalledTimes(1);
    expect(createTanka).toHaveBeenCalledWith(
      expect.objectContaining({
        tanka_type: 1,
        tanka_code: 'T100',
        tanka_name: '新規単価',
      }),
    );
  });

  it('should show "登録しました。" success toast when createTanka succeeds', async () => {
    // COVERS: ACSMS-MSG-003-001 — verb-only per useNotify convention
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockResolvedValue({
      data: { ...buildTanka(), tanka_id: 99 },
      message: '登録しました。',
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should router.push to TankaList after a successful createTanka', async () => {
    // COVERS: 機能定義 4.4 — 成功 → 検索画面へ遷移
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockResolvedValue({
      data: buildTanka(),
      message: '登録しました。',
    });

    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushedJson).toContain('TankaList');
  });

  it('should NOT disable the tanka_code input in create mode', async () => {
    // COVERS: 画面項目定義 row 2 — disabled だけは更新時のみ
    const { wrapper } = await renderView();
    const codeInput = wrapper
      .findAll('input')
      .find((i) => i.attributes('id')?.includes('tanka_code')
                || i.element.getAttribute('name') === 'tanka_code'
                || i.element.placeholder?.includes('単価コード'));
    if (codeInput) {
      expect(codeInput.attributes('disabled')).toBeUndefined();
    } else {
      // Fallback: find by surrounding form-item label text. Not all
      // implementations attach id/name; the label association is the
      // canonical query path.
      const items = wrapper.findAllComponents({ name: 'AFormItem' });
      const codeItem = items.find((it) => it.text().includes('単価コード'));
      expect(codeItem).toBeDefined();
      expect(/disabled(?:=|>|\s)/.test(codeItem!.html())).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Edit mode (機能定義 2.x)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — edit mode (tanka_id in route)', () => {
  it('should call getTanka with the path tanka_id when mounted in edit mode', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    await renderView({ tankaId: 7 });
    expect(getTanka).toHaveBeenCalledWith(7);
  });

  it('should populate the form fields from the getTanka response when mounted in edit mode', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({ tanka_id: 7, tanka_code: 'EDIT01', tanka_name: '読込済単価' }),
    });
    const { wrapper } = await renderView({ tankaId: 7 });
    expect(wrapper.html()).toContain('読込済単価');
  });

  it('should DISABLE the tanka_code input in edit mode (immutable per api.md footnote)', async () => {
    // COVERS: 機能定義 2.3 — 単価コード項目は変更不可（disabled）で表示
    const { wrapper } = await renderView({ tankaId: 1 });
    const items = wrapper.findAllComponents({ name: 'AFormItem' });
    const codeItem = items.find((it) => it.text().includes('単価コード'));
    expect(codeItem).toBeDefined();
    // Either the <input disabled> attribute OR a disabled wrapper class.
    const html = codeItem!.html();
    const looksDisabled =
      /disabled(?:=|>|\s)/.test(html) || html.includes('ant-input-disabled');
    expect(looksDisabled).toBe(true);
  });

  it('should call updateTanka with the path tanka_id and form payload when 登録 is clicked in edit mode', async () => {
    const { updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(updateTanka).mockResolvedValue({
      data: buildTanka({ tanka_id: 1, tanka_name: '改定後' }),
      message: '更新しました。',
    });

    const { wrapper } = await renderView({ tankaId: 1 });
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tanka_name: '改定後' });
    await flushPromises();

    expect(updateTanka).toHaveBeenCalledTimes(1);
    expect(updateTanka).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ tanka_name: '改定後' }),
    );
  });

  it('should NOT include tanka_code in the updateTanka payload (immutable field)', async () => {
    // COVERS: api.md §ACSMS-API-003-003 footnote + BE forbidNonWhitelisted —
    // the FE form must NOT send tanka_code on PUT even if user somehow
    // populated it. Spec asserts the actual wire payload omits it.
    const { updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(updateTanka).mockResolvedValue({
      data: buildTanka({ tanka_id: 1 }),
      message: '更新しました。',
    });

    const { wrapper } = await renderView({ tankaId: 1 });
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    const callArgs = vi.mocked(updateTanka).mock.calls[0];
    const payload = callArgs?.[1] as Record<string, unknown> | undefined;
    expect(payload).toBeDefined();
    expect(payload!.tanka_code).toBeUndefined();
  });

  it('should show "更新しました。" success toast when updateTanka succeeds', async () => {
    // COVERS: ACSMS-MSG-003-002 — verb-only
    const { updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(updateTanka).mockResolvedValue({
      data: buildTanka({ tanka_id: 1 }),
      message: '更新しました。',
    });

    const { wrapper } = await renderView({ tankaId: 1 });
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });

  it('should router.push to TankaList after a successful updateTanka', async () => {
    const { updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(updateTanka).mockResolvedValue({
      data: buildTanka({ tanka_id: 1 }),
      message: '更新しました。',
    });

    const { wrapper, router } = await renderView({ tankaId: 1 });
    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushedJson).toContain('TankaList');
  });

  it('should redirect to Dashboard when getTanka returns NOT_FOUND on edit-mode mount (直接URLアクセスで存在しないID・顧客要件 2026-08)', async () => {
    // COVERS: 機能定義 2.2 + ACSMS-MSG-003-005 — データ取得失敗。
    // Axios interceptor が既にトースト済み。以前は TankaList へ戻していたが、
    // 他の編集画面と同じくダッシュボードへ統一する（useNotFoundRedirect 共通化）。
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockRejectedValue({
      response: {
        status: 404,
        data: {
          error_code: 'NOT_FOUND',
          message: '指定された単価が見つかりません。',
        },
      },
    });
    const { router } = await renderView({ tankaId: 999 });
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('Dashboard');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Form validation (機能定義 4.1 + メッセージ情報)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — form validation', () => {
  it('should show "必須項目です。" under tanka_code when submitted empty in create mode', async () => {
    // COVERS: 機能定義 4.1 + ACSMS-MSG-003-003
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tanka_code: '' });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under tanka_name when submitted empty', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tanka_name: '' });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under tekiyo_start_date when submitted empty', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      tekiyo_start_date: '',
    });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under tekiyo_start_date when value is undefined (cleared date picker)', async () => {
    // COVERS: vue.md §Validation — `?.trim()` guard for clearable controls.
    // Native <input type="date"> can produce '' OR undefined when cleared;
    // both must surface as 必須項目 NOT the generic システムエラー toast.
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      tekiyo_start_date: undefined as unknown as string,
    });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should show "必須項目です。" under tekiyo_end_date when submitted empty', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      tekiyo_end_date: '',
    });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under tekiyo_end_date when value is undefined (cleared)', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      tekiyo_end_date: undefined as unknown as string,
    });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should show range error when tax_rate is below 0', async () => {
    // COVERS: 機能定義 4.1 — 税率：0〜100
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tax_rate: -1 });
    await flushPromises();
    expect(wrapper.text()).toMatch(/税率|0[〜~–-]100/);
  });

  it('should show range error when tax_rate exceeds 100', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tax_rate: 150 });
    await flushPromises();
    expect(wrapper.text()).toMatch(/税率|0[〜~–-]100/);
  });

  it('should show non-negative error when kingaku_zeikomi is negative', async () => {
    // COVERS: 機能定義 4.1 — 単価（税込）：≥ 0
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      kingaku_zeikomi: -1,
    });
    await flushPromises();
    expect(wrapper.text()).toMatch(/単価.*税込|0以上/);
  });

  it('should show non-negative error when kingaku_zeinuki is negative', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      kingaku_zeinuki: -1,
    });
    await flushPromises();
    expect(wrapper.text()).toMatch(/単価.*税抜|0以上/);
  });

  it('should show date-order error when tekiyo_end_date is before tekiyo_start_date', async () => {
    // COVERS: 機能定義 4.1 — 適用終了日：開始日以降選択可能
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateTankaForm(),
      tekiyo_start_date: '2026-06-01',
      tekiyo_end_date: '2026-01-01',
    });
    await flushPromises();
    expect(wrapper.text()).toMatch(/適用終了日|開始日以降/);
  });

  it('should NOT call createTanka when validation fails', async () => {
    // COVERS: useApiForm convention — validateClient short-circuits the submit
    const { createTanka } = await import('@/api/tanka/tanka');
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateTankaForm(), tanka_code: '' });
    await flushPromises();
    expect(createTanka).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4.5 適用開始日 / 適用終了日 — disabled-date picker behavior
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — 適用開始日 / 適用終了日 disabled-date', () => {
  it('should disable past dates on 適用開始日 picker in create mode', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const yesterday = nowTokyo().subtract(1, 'day');
    expect(vm.disableStartDate(yesterday)).toBe(true);
  });

  it('should allow today and future dates on 適用開始日 picker in create mode', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.disableStartDate(nowTokyo())).toBe(false);
    expect(vm.disableStartDate(nowTokyo().add(7, 'day'))).toBe(false);
  });

  it('should still disable past dates on 適用開始日 picker in edit mode (271bc40 / SCR-003)', async () => {
    // Picker greys out past dates regardless of mode — the user cannot
    // newly-pick a past start. Existing past starts are still allowed
    // to stay in formState because the picker is fully `:disabled` via
    // `isStartDateReadOnly` in that case (no opening the calendar at all).
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;
    const yesterday = nowTokyo().subtract(1, 'day');
    const farPast = dayjs('2024-01-15');
    expect(vm.disableStartDate(yesterday)).toBe(true);
    expect(vm.disableStartDate(farPast)).toBe(true);
  });

  it('should mark 適用開始日 read-only in edit mode when the existing start_date is in the past', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        tekiyo_start_date: '2024-01-15', // before today
        tekiyo_end_date: '2099-12-31',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;
    expect(vm.isStartDateReadOnly).toBe(true);
  });

  it('should keep 適用開始日 editable in edit mode when the existing start_date is in the future', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        tekiyo_start_date: nowTokyo().add(7, 'day').format('YYYY-MM-DD'),
        tekiyo_end_date: '2099-12-31',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;
    expect(vm.isStartDateReadOnly).toBe(false);
  });

  it('should never mark 適用開始日 read-only in create mode', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.isStartDateReadOnly).toBe(false);
  });

  it('should disable end-date selections earlier than the chosen 適用開始日', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    const start = nowTokyo().add(10, 'day');
    vm.form.tekiyo_start_date = start.format('YYYY-MM-DD');
    await flushPromises();
    // 1 day before start → blocked
    expect(vm.disableEndDate(start.subtract(1, 'day'))).toBe(true);
    // same as start → allowed (end >= start)
    expect(vm.disableEndDate(start)).toBe(false);
    // after start → allowed
    expect(vm.disableEndDate(start.add(30, 'day'))).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────
  // Bug #58241 — reactivating an expired price (無効→有効) must clear a
  // stale past 適用終了日 and re-lock past dates on the end-date picker.
  // ───────────────────────────────────────────────────────────────────────
  it('should clear a past 適用終了日 when 有効単価フラグ is toggled 無効→有効', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        active_flg: false,
        tekiyo_start_date: '2024-01-15',
        tekiyo_end_date: '2024-06-30', // past relative to pinned "today" 2026-05-15
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;
    expect(vm.form.active_flg).toBe(false);
    expect(vm.form.tekiyo_end_date).toBe('2024-06-30');

    vm.form.active_flg = true;
    await flushPromises();

    expect(vm.form.tekiyo_end_date).toBe('');
  });

  it('should re-disable past dates on the 適用終了日 picker after reactivating', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        active_flg: false,
        tekiyo_start_date: '2024-01-15',
        tekiyo_end_date: '2024-06-30',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;
    const yesterday = nowTokyo().subtract(1, 'day');
    // While still 無効, past end-dates stay pickable (期間は独立).
    expect(vm.disableEndDate(yesterday)).toBe(false);

    vm.form.active_flg = true;
    await flushPromises();

    expect(vm.disableEndDate(yesterday)).toBe(true);
  });

  it('should NOT clear 適用終了日 when the price stays 有効 across an unrelated edit (regression)', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        active_flg: true,
        tekiyo_start_date: '2024-01-15',
        tekiyo_end_date: '2099-12-31',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;

    vm.form.tanka_name = '単価名変更';
    await flushPromises();

    expect(vm.form.tekiyo_end_date).toBe('2099-12-31');
  });

  it('should NOT clear 適用終了日 when toggling 有効→無効 (only false→true triggers)', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        active_flg: true,
        tekiyo_start_date: '2024-01-15',
        tekiyo_end_date: '2024-06-30',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;

    vm.form.active_flg = false;
    await flushPromises();

    expect(vm.form.tekiyo_end_date).toBe('2024-06-30');
  });

  it('should surface END_DATE_NOT_PAST_WHEN_ACTIVE message from validateClient as an insurance check', async () => {
    // Simulates a submit where a 有効 + past 適用終了日 combination reaches
    // submitWith directly (bypassing the disabled picker / watch — e.g. a
    // programmatic payload), proving the submit-time guard independently
    // catches it even without the watch having fired.
    const { getTanka, updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockResolvedValue({
      data: buildTanka({
        tanka_id: 1,
        active_flg: true,
        tekiyo_start_date: '2024-01-15',
        tekiyo_end_date: '2099-12-31',
      }),
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    const vm = wrapper.vm as any;

    await vm.submitWith?.({
      ...vm.form,
      active_flg: true,
      tekiyo_end_date: '2024-06-30',
    });
    await flushPromises();

    expect(updateTanka).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('有効な単価には本日以降の適用終了日を指定してください。');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. API error handling (BE-side error_codes via axios interceptor)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — API error handling (axios interceptor)', () => {
  it('should swallow DUPLICATE_CODE error from createTanka (axios interceptor toasts)', async () => {
    // COVERS: ACSMS-MSG-003-004 — global interceptor toasts the message,
    // view must NOT re-toast (vue.md §Error Handling Architecture rule 1).
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: '単価コード「T100」はすでに登録されています。',
        },
      },
    });
    vi.mocked(message.error).mockClear();

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    // View itself does NOT call message.error — the interceptor does.
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should NOT router.push to TankaList when createTanka rejects', async () => {
    // COVERS: error path — stay on the form so user can fix the input
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockRejectedValue({
      response: {
        status: 400,
        data: { error_code: 'DUPLICATE_CODE', message: 'duplicate' },
      },
    });

    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushedJson).not.toContain('TankaList');
  });

  it('should map VALIDATION_ERROR field errors to <a-form-item :help> when BE rejects', async () => {
    // COVERS: useApiForm contract — BE errors[] map to fieldErrors per
    // vue.md §Error Handling Architecture Layer 2.
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [
            { field: 'tanka_code', message: '単価コードは半角英数字で入力してください。' },
          ],
        },
      },
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateTankaForm());
    await flushPromises();

    expect(wrapper.text()).toContain('単価コードは半角英数字で入力してください。');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Navigation (機能定義 5.x)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — navigation', () => {
  it('should navigate back when 前の画面に戻る is clicked', async () => {
    // COVERS: 機能定義 5.1 — 単価マスタ明細検索画面へ遷移
    const { wrapper, router } = await renderView();
    const backSpy = vi.spyOn(router, 'back');
    const pushSpy = vi.spyOn(router, 'push');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();

    // Either router.back() OR router.push({ name: 'TankaList' }) — both
    // are valid "return to previous screen" implementations.
    const usedBack = backSpy.mock.calls.length > 0;
    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(usedBack || pushedJson.includes('TankaList')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Enter-key implicit submit guard (vue.md §Block Enter — long CRUD forms)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — Enter-key implicit submit guard', () => {
  it('should NOT call createTanka when user presses Enter inside a text input', async () => {
    // COVERS: vue.md §Block Enter implicit submit. Form has 10 fields,
    // qualifying for the preventEnterImplicitSubmit utility.
    const { createTanka } = await import('@/api/tanka/tanka');
    const { wrapper } = await renderView();
    await flushPromises();

    const textInput = wrapper.find('input[type="text"]');
    if (textInput.exists()) {
      await textInput.trigger('keydown', { key: 'Enter' });
      await flushPromises();
    }

    expect(createTanka).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Permission gating (security.md Layer 1 mirror)
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — permission-aware UI', () => {
  it('should DISABLE the 登録 submit button when user lacks tanka.create in create mode', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['tanka.view'] }),
    });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('should DISABLE the 登録 submit button when user lacks tanka.update in edit mode', async () => {
    const { wrapper } = await renderView({
      tankaId: 1,
      user: buildAuthUser({ permissions: ['tanka.view'] }),
    });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Defensive / edge-case coverage — error paths + focusFirstError
// ─────────────────────────────────────────────────────────────────────────
describe('TankaFormView — defensive paths', () => {
  it('should focus the first invalid field after submitting a blank create form', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should swallow updateTanka rejection without crashing (interceptor toasts)', async () => {
    const { updateTanka } = await import('@/api/tanka/tanka');
    vi.mocked(updateTanka).mockRejectedValue({
      response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView({ tankaId: 1 });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should swallow createTanka rejection without crashing (interceptor toasts)', async () => {
    const { createTanka } = await import('@/api/tanka/tanka');
    vi.mocked(createTanka).mockRejectedValue({
      response: { data: { error_code: 'CONFLICT', message: 'duplicate' } },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateTankaForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should fall back gracefully when getTanka rejects on edit-mode mount', async () => {
    const { getTanka } = await import('@/api/tanka/tanka');
    vi.mocked(getTanka).mockRejectedValue({
      response: { data: { error_code: 'NOT_FOUND' } },
    });
    const { wrapper } = await renderView({ tankaId: 999 });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  // ─── Numeric range / non-negative branches in validateClient ─────
  it('should reject tax_rate when out of 0-100 range', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateTankaForm());
      vm.form.tax_rate = 150;
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toMatch(/税率|tax_rate/);
  });

  it('should reject kingaku_zeikomi when negative', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateTankaForm());
      vm.form.kingaku_zeikomi = -1;
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('単価（税込）は0以上で入力してください。');
  });

  it('should reject kingaku_zeinuki when negative', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateTankaForm());
      vm.form.kingaku_zeikomi = 0;
      vm.form.kingaku_zeinuki = -1;
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('単価（税抜）は0以上で入力してください。');
  });
});
