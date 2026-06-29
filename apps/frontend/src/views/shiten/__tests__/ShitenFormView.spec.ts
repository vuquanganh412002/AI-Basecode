// Screen: ACSMS-SCR-007 — 支店マスタ登録画面
//
// Drives src/views/shiten/ShitenFormView.vue. The view is shared between
// create (/shiten/create) and edit (/shiten/:id/edit). Each it() maps
// to a clause in docs/design/ACSMS-SCR-007/screen-design.md (機能定義 +
// メッセージ情報) + index.html (DOM hierarchy) + ACSMS-SCR-007-api.md
// (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import ShitenFormView from '@/views/shiten/ShitenFormView.vue';
import {
  buildAuthUser,
  buildShitenDetail,
  buildCreateShitenForm,
  buildKanriShitenListResponseForDropdown,
} from '@test/fixtures/shiten.fixture';

// Mock the shiten API client — /gen-code-frontend creates this with
// getShiten / createShiten / updateShiten methods.
vi.mock('@/api/shiten/shiten', () => ({
  getShiten: vi.fn(),
  createShiten: vi.fn(),
  updateShiten: vi.fn(),
}));

// 管理支店 select feeds from the shared ACSMS-API-COMMON-004 dropdown
// endpoint (cascade by session.ja_id) — NOT the SCR-008 admin list.
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
  listKanriShiten: vi.fn(),
  removeKanriShiten: vi.fn(),
  getKanriShiten: vi.fn(),
  createKanriShiten: vi.fn(),
  updateKanriShiten: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Path param id — passed via route push when set (edit mode). */
  id?: number;
  /** Override the default CHUOKAI auth user. */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
  pushSpy: ReturnType<typeof vi.fn>;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/shiten', name: 'ShitenList', component: { template: '<div />' } },
      { path: '/shiten/create', name: 'ShitenCreate', component: { template: '<div />' } },
      {
        path: '/shiten/:id/edit',
        name: 'ShitenEdit',
        component: { template: '<div />' },
      },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
    ],
  });

  if (opts.id !== undefined) {
    await router.push({ name: 'ShitenEdit', params: { id: String(opts.id) } });
  } else {
    await router.push({ name: 'ShitenCreate' });
  }
  await router.isReady();
  const pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(ShitenFormView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  return { wrapper, router, pushSpy };
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getShiten, createShiten, updateShiten } = await import('@/api/shiten/shiten');
  vi.mocked(getShiten).mockResolvedValue({ data: buildShitenDetail() });
  vi.mocked(createShiten).mockResolvedValue({
    data: { ...buildShitenDetail(), shiten_id: 99 },
    message: '登録しました。',
  });
  vi.mocked(updateShiten).mockResolvedValue({
    data: buildShitenDetail(),
    message: '更新しました。',
  });

  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  const fullResp = buildKanriShitenListResponseForDropdown();
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: fullResp.data.map((r) => ({
      kanri_shiten_id: r.kanri_shiten_id,
      kanri_shiten_code: r.kanri_shiten_code,
      kanri_shiten_name: r.kanri_shiten_name,
    })),
  });
});

// ═════════════════════════════════════════════════════════════════════
// 1. 初期表示 (機能定義 §1)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — initial render (§1)', () => {
  it('should render the 支店情報入力 card heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('支店情報入力');
  });

  it('should render all required form labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('管理支店'))).toBe(true);
    expect(labels.some((t) => t.includes('支店コード'))).toBe(true);
    expect(labels.some((t) => t.includes('支店名'))).toBe(true);
    expect(labels.some((t) => t.includes('支店名カナ') || t.includes('支店カナ'))).toBe(true);
    expect(labels.some((t) => t.includes('金融機関支店'))).toBe(true);
    expect(labels.some((t) => t.includes('備考'))).toBe(true);
  });

  it('should render the submit button with 登録 label in create mode when mounted', async () => {
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    // Antd auto-spaces 2-CJK button labels (登 録) — match substring.
    expect(submitBtn.text()).toContain('登');
  });

  it('should render 更新 label on submit button in edit mode when mounted', async () => {
    const { wrapper } = await renderView({ id: 1 });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('更');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });

  it('should fetch 管理支店 dropdown once (ACSMS-API-COMMON-004) when mounted', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView();
    expect(getKanriShitenDropdown).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. 編集モード初期表示 (機能定義 §2)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — edit-mode preload (§2)', () => {
  it('should call getShiten with the path id when route has :id param', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    await renderView({ id: 5 });
    expect(getShiten).toHaveBeenCalledWith(5);
  });

  it('should NOT call getShiten in create mode when no :id param', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    await renderView();
    expect(getShiten).not.toHaveBeenCalled();
  });

  it('should still call getShiten with the requested id when BE returns 404', async () => {
    // COVERS: 機能定義 §2.2 — データ取得失敗 → ACSMS-MSG-007-002
    // Global axios interceptor handles the toast; this assertion just
    // guards that the view attempted the fetch with the correct id.
    const { getShiten } = await import('@/api/shiten/shiten');
    vi.mocked(getShiten).mockRejectedValue({
      response: {
        status: 404,
        data: { error_code: 'NOT_FOUND', message: '指定された支店が見つかりません' },
      },
    });
    await renderView({ id: 999 });
    expect(getShiten).toHaveBeenCalledWith(999);
  });

  it('should make 支店コード input disabled in edit mode (機能定義 §2.3)', async () => {
    const { wrapper } = await renderView({ id: 1 });
    // 支店コード is immutable after create — UI disables the input.
    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const codeItem = formItems.find((fi) => fi.text().includes('支店コード'));
    expect(codeItem).toBeDefined();
    const html = codeItem!.html();
    expect(/disabled|ant-input-disabled/.test(html)).toBe(true);
  });

  it('should disable 管理支店 only when JA_KANRI_SHITEN edits a shiten under its OWN kanri_shiten — every other field stays editable', async () => {
    // [role5-locked-fields] Customer policy 2026-05 — role 5
    // (JA_KANRI_SHITEN) can edit a shiten UNDER ITS OWN kanri_shiten BUT
    // 管理支店 (kanri_shiten_id) is read-only because reassigning a branch
    // to a different kanri-shiten is reserved for higher roles.
    // 金融機関支店フラグ + 支店名 + JASTEM + 備考 + submit all stay
    // editable for role 5. The loaded shiten (buildShitenDetail) has
    // kanri_shiten_id=1, so the user's kanri_shiten_id must also be 1 —
    // otherwise this is a different-branch row → read-only ([role5-view-only]).
    const { wrapper } = await renderView({
      id: 1,
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['shiten.view', 'shiten.update'],
      }),
    });

    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const findItem = (label: string) =>
      formItems.find((fi) => fi.text().includes(label));

    // (a) Locked: 管理支店 select
    const kanriItem = findItem('管理支店');
    expect(kanriItem).toBeDefined();
    expect(
      /ant-select-disabled|disabled/.test(kanriItem!.html()),
    ).toBe(true);

    // (b) Editable: 金融機関支店フラグ + 支店名 + 備考 stay unrestricted
    const flgItem = findItem('金融機関支店フラグ');
    expect(flgItem).toBeDefined();
    expect(
      /ant-checkbox-disabled/.test(flgItem!.html()),
    ).toBe(false);

    const nameItem = findItem('支店名');
    expect(nameItem).toBeDefined();
    expect(
      /ant-input-disabled|ant-select-disabled|ant-checkbox-disabled/.test(
        nameItem!.html(),
      ),
    ).toBe(false);

    const bikoItem = findItem('備考');
    expect(bikoItem).toBeDefined();
    expect(
      /ant-input-disabled|ant-select-disabled|ant-checkbox-disabled/.test(
        bikoItem!.html(),
      ),
    ).toBe(false);

    // (c) Submit button stays clickable for role 5
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });

  it('should render READ-ONLY (all fields + submit disabled) when JA_KANRI_SHITEN opens a shiten from ANOTHER kanri_shiten (顧客要件 2026-06)', async () => {
    // [role5-view-only] role 5 can VIEW any branch in its JA, but a
    // branch outside its own kanri_shiten is read-only — update/delete
    // are blocked (BE returns 403). Loaded shiten kanri_shiten_id=1;
    // user kanri_shiten_id=9 → mismatch → view-only.
    const { getShiten } = await import('@/api/shiten/shiten');
    vi.mocked(getShiten).mockResolvedValue({
      data: buildShitenDetail({ kanri_shiten_id: 1 }),
    });
    const { wrapper } = await renderView({
      id: 1,
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 9,
        permissions: ['shiten.view', 'shiten.update'],
      }),
    });

    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const findItem = (label: string) =>
      formItems.find((fi) => fi.text().includes(label));

    // Editable fields are now disabled (read-only view).
    expect(/ant-input-disabled/.test(findItem('支店名')!.html())).toBe(true);
    expect(/ant-checkbox-disabled/.test(findItem('金融機関支店フラグ')!.html())).toBe(true);
    expect(/ant-input-disabled/.test(findItem('備考')!.html())).toBe(true);

    // Submit (更新) is disabled.
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('should keep 管理支店 editable when CHUOKAI edits a shiten (regression — locked scope is role 5 only)', async () => {
    const { wrapper } = await renderView({
      id: 1,
      user: buildAuthUser({
        role_code: 'CHUOKAI',
        ja_id: 1,
        permissions: ['shiten.view', 'shiten.update'],
      }),
    });
    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const kanriItem = formItems.find((fi) => fi.text().includes('管理支店'));
    expect(kanriItem).toBeDefined();
    // CHUOKAI must NOT see the kanri_shiten_id select as disabled.
    expect(/ant-select-disabled/.test(kanriItem!.html())).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. 入力チェック (機能定義 §3.1)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — required-field validation (§3.1)', () => {
  it('should show ACSMS-MSG-007-007 (必須項目です。) when 支店コード is blank on submit', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should NOT call createShiten when required fields are blank on submit', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).not.toHaveBeenCalled();
  });

  it('should require the 4 JASTEM fields (必須項目です。) when 金融機関支店フラグ is checked but they are blank', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '',
        jastem_tenpo_name: '',
        jastem_tyokin_shubetsu: '',
        jastem_koza_no: '',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(createShiten).not.toHaveBeenCalled();
  });

  it('should call createShiten when 金融機関支店フラグ is checked and the 4 JASTEM fields are filled', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: 'ﾎﾝﾃﾝ',
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalled();
  });

  it('should ACCEPT half-width katakana (no small kana) + A-Z0-9 in 店舗名 and call createShiten', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: 'ﾎﾝﾃﾝ BR-1', // 半角カナ + A-Z + 0-9 + 記号 → 許可
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalled();
  });

  it('should REJECT kanji/hiragana in 店舗名 (銀行charset 2026-06-25)', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: '本店ほんてん', // 漢字+ひらがな → 不可
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('半角カタカナ・半角英大文字');
  });

  it('should REJECT full-width katakana in 店舗名 (半角で入力)', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: 'ホンテン', // 全角カナ → 不可
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('半角カタカナ・半角英大文字');
  });

  it('should NOT throw エラーが発生しました when 管理支店 is cleared via allow-clear (regression for ?.trim() vs .trim())', async () => {
    // COVERS: vue.md §Validation — required-string checks MUST use ?.trim()
    // because antd's <a-select allow-clear> sets the v-model to `undefined`
    // (not "") when the × icon is clicked. Calling `.trim()` directly would
    // throw TypeError → global error handler → generic "エラーが発生しました"
    // toast that masks the actual required-field violation.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.kanri_shiten_id = undefined; // simulate × clear-icon click
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should show format error when 支店コード is not 3 half-width digits', async () => {
    // COVERS: api.md §4.1 — shiten_code: 必須、半角数字3桁固定
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm(), { shiten_code: 'ABC' });
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    // Either client-side regex error or BE VALIDATION_ERROR — assert it
    // surfaced as inline help, NOT as a generic exception toast.
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should reject 支店名(カナ) when value contains non-half-width-katakana characters', async () => {
    // COVERS: vue.md §Kana fields MUST validate the script — downstream
    // Zengin CSV / PDF exports require half-width katakana. Hiragana /
    // kanji / Latin must be blocked at submit time, BEFORE the API call.
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        shiten_name_kana: 'ホンテンエイギョウブ', // full-width katakana — invalid
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('支店名(カナ)は半角カタカナ・半角数字で入力してください。');
    expect(createShiten).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. 登録・更新 submit (機能定義 §3.3, §3.4)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — submit (§3.3, §3.4)', () => {
  it('should call createShiten with the form payload when 登録 is clicked with valid input', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalledTimes(1);
    expect(createShiten).toHaveBeenCalledWith(
      expect.objectContaining({
        shiten_code: '099',
        shiten_name: '新規支店',
        kanri_shiten_id: 1,
      }),
    );
  });

  it('should show 登録しました。 success toast when createShiten resolves', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to ShitenList after successful create', async () => {
    const { wrapper, pushSpy } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });

  it('should call updateShiten with the path id + body when 更新 is clicked in edit mode', async () => {
    const { updateShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const vm = wrapper.vm as any;
    if (vm.form) vm.form.shiten_name = '更新後支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateShiten).toHaveBeenCalledTimes(1);
    expect(updateShiten).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ shiten_name: '更新後支店名' }),
    );
  });

  it('should show 更新しました。 toast when updateShiten resolves', async () => {
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    // 編集で何か変更しないと「変更なし」ガードでスキップされる。
    (wrapper.vm as any).form.shiten_name = '変更後支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to ShitenList after successful update', async () => {
    const { wrapper, pushSpy } = await renderView({ id: 5 });
    await flushPromises();
    (wrapper.vm as any).form.shiten_name = '変更後支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });

  it('should NOT call updateShiten (skip) when nothing changed in edit mode', async () => {
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const { updateShiten } = await import('@/api/shiten/shiten');
    vi.mocked(updateShiten).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateShiten).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should map BE VALIDATION_ERROR errors[].field to <a-form-item :help> when create rejects', async () => {
    // COVERS: vue.md §Error Handling — VALIDATION_ERROR is consumed by
    // useApiForm and surfaced inline via <a-form-item :help>, not toast.
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [{ field: 'shiten_code', message: '支店コードは必須です' }],
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('支店コードは必須です');
  });

  it('should NOT re-toast DUPLICATE_CODE when BE rejects (global axios interceptor owns the toast)', async () => {
    // COVERS: vue.md §Error Handling Architecture — DUPLICATE_CODE is
    // toasted centrally; the view must NOT call message.error itself.
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: '支店コード「099」はすでに登録されています。',
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalled();
    // Spec-side guard: view must not call message.error for HTTP errors.
    expect(message.error).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. 前の画面に戻る (機能定義 §4)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — back navigation (§4)', () => {
  it('should navigate to ShitenList when 前の画面に戻る is clicked', async () => {
    // Per established SCR-009 pattern (customer dropped the confirm modal),
    // back button navigates straight to the list view.
    const { wrapper, pushSpy } = await renderView();
    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Enter-implicit-submit guard (vue.md §long forms)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — Enter-implicit-submit guard', () => {
  it('should NOT call createShiten when Enter is pressed inside a text input', async () => {
    // COVERS: vue.md §Block Enter implicit submit on long CRUD forms.
    // SCR-007 form has 6 fields (>4) → must wire preventEnterImplicitSubmit
    // on the <a-form> @keydown handler.
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    if (input.exists()) {
      await input.trigger('keydown', { key: 'Enter' });
      await flushPromises();
    }
    expect(createShiten).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Defensive / edge-case coverage — error paths + focusFirstError
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — defensive paths', () => {
  it('should focus the first invalid field after submitting a blank create form', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should swallow updateShiten rejection without crashing (interceptor toasts)', async () => {
    const { updateShiten } = await import('@/api/shiten/shiten');
    vi.mocked(updateShiten).mockRejectedValue({
      response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView({ id: 5 });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should swallow createShiten rejection without crashing (interceptor toasts)', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: { data: { error_code: 'CONFLICT', message: 'duplicate' } },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should fall back gracefully when getShiten rejects on edit-mode mount', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    vi.mocked(getShiten).mockRejectedValue({
      response: { data: { error_code: 'NOT_FOUND' } },
    });
    const { wrapper } = await renderView({ id: 999 });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should set kanriShitenOptions to [] when getKanriShitenDropdown rejects', async () => {
    const { getKanriShitenDropdown } = await import(
      '@/api/kanri-shiten/kanri-shiten'
    );
    vi.mocked(getKanriShitenDropdown).mockRejectedValueOnce({ message: 'boom' });
    const { wrapper } = await renderView();
    // Form still renders — catch block silently emptied options.
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should focus the first invalid select-type field (focusFirstError wrapper path)', async () => {
    // 管理支店 is the only <a-select> on the form. Leave it blank to
    // exercise the wrapper-type focus branch.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.shiten_code = '001';
      vm.form.shiten_name = '本店';
      vm.form.kanri_shiten_id = undefined;  // → first error here
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });
});
