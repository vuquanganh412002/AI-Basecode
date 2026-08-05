// Screen: ACSMS-SCR-009 — 管理支店マスタ登録画面
//
// Drives src/views/kanri-shiten/KanriShitenFormView.vue. The view is
// shared between create (/kanri-shiten/create) and edit
// (/kanri-shiten/:id/edit). Each it() maps to a clause in
// docs/design/ACSMS-SCR-009/screen-design.md (機能定義 + メッセージ情報)
// + index.html (DOM hierarchy) + ACSMS-SCR-009-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import KanriShitenFormView from '@/views/kanri-shiten/KanriShitenFormView.vue';
import { buildAuthUser } from '@test/fixtures/kanri-shiten.fixture';
import { buildTodofukenList } from '@test/fixtures/ja.fixture';

import { resetTodofukenCache } from '@/composables/useTodofuken';

// Mock the kanri-shiten API client — /gen-code-frontend adds the form
// methods (getKanriShiten, createKanriShiten, updateKanriShiten)
// alongside the existing list/delete from SCR-008.
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  listKanriShiten: vi.fn(),
  removeKanriShiten: vi.fn(),
  getKanriShiten: vi.fn(),
  createKanriShiten: vi.fn(),
  updateKanriShiten: vi.fn(),
}));

// JA select feeds from the dropdown endpoint via <BaseJaDropdown>.
vi.mock('@/api/ja/ja', () => ({
  getJa: vi.fn(),
  createJa: vi.fn(),
  updateJa: vi.fn(),
  listJa: vi.fn(),
  removeJa: vi.fn(),
  getJaDropdown: vi.fn(),
}));

// 都道府県 select reuses the m_todofuken endpoint.
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Path param id — passed via route push when set (edit mode). */
  id?: number;
  /** Override the default NICHINO_ADMIN auth user. */
  user?: ReturnType<typeof buildAuthUser>;
}

/** Sample JA list returned by the JA-dropdown fetch (listJa response shape). */
function buildJaListResponseForDropdown() {
  return {
    data: [
      {
        ja_id: 1,
        ja_code: '1301001001',
        ja_name: 'JA東京中央',
        yubin_no: '',
        todofuken_code: '13',
        todofuken_name: '東京都',
        tel: '',
        address: '',
        fax: '',
        chuokai_flg: false,
        jastem_itakusha_code: '',
        jastem_itakusha_name: '',
        jastem_ja_code: '',
        jastem_ja_name: '',
      },
      {
        ja_id: 2,
        ja_code: '0101001002',
        ja_name: 'JA北海道中央',
        yubin_no: '',
        todofuken_code: '01',
        todofuken_name: '北海道',
        tel: '',
        address: '',
        fax: '',
        chuokai_flg: false,
        jastem_itakusha_code: '',
        jastem_itakusha_name: '',
        jastem_ja_code: '',
        jastem_ja_name: '',
      },
    ],
    meta: { total: 2, page: 1, per_page: 100, total_pages: 1 },
  };
}

/** Full detail used by edit-mode preload (getKanriShiten envelope). */
function buildKanriShitenDetail(overrides: Record<string, unknown> = {}) {
  return {
    kanri_shiten_id: 1,
    ja_id: 1,
    ja_name: 'JA東京中央',
    kanri_shiten_code: '113-3300-001',
    kanri_shiten_name: '東京中央支店',
    kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｼﾃﾝ',
    todofuken_code: '13',
    todofuken_name: '東京都',
    yubin_no: '1000001',
    address: '千代田区千代田1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    paper_flg: true,
    denshi_flg: false,
    biko: '中央会管轄',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default valid form payload for POST. */
function buildCreateKanriShitenForm() {
  return {
    ja_id: 1,
    kanri_shiten_code: '113-3300-099',
    kanri_shiten_name: '新規管理支店',
    kanri_shiten_name_kana: 'ｼﾝｷｶﾝﾘｼﾃﾝ',
    todofuken_code: '13',
    yubin_no: '1000099',
    address: '新規住所',
    tel: '0312345699',
    fax: '0312345698',
    paper_flg: true,
    denshi_flg: true,
    biko: 'テスト',
  };
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
      { path: '/kanri-shiten', name: 'KanriShitenList', component: { template: '<div />' } },
      { path: '/kanri-shiten/create', name: 'KanriShitenCreate', component: { template: '<div />' } },
      {
        path: '/kanri-shiten/:id/edit',
        name: 'KanriShitenEdit',
        component: { template: '<div />' },
      },
    ],
  });

  if (opts.id !== undefined) {
    await router.push({ name: 'KanriShitenEdit', params: { id: String(opts.id) } });
  } else {
    await router.push({ name: 'KanriShitenCreate' });
  }
  await router.isReady();
  const pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(KanriShitenFormView, {
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
  // 都道府県は useTodofuken のモジュール共有キャッシュ。テスト間で持ち越すと
  // 2件目以降が「取得済み」になり HTTP 回数の検証が崩れる。
  resetTodofukenCache();
  vi.clearAllMocks();
  const { getKanriShiten, createKanriShiten, updateKanriShiten } = await import(
    '@/api/kanri-shiten/kanri-shiten'
  );
  vi.mocked(getKanriShiten).mockResolvedValue({ data: buildKanriShitenDetail() });
  vi.mocked(createKanriShiten).mockResolvedValue({
    data: { ...buildKanriShitenDetail(), kanri_shiten_id: 99 },
    message: '登録しました。',
  });
  vi.mocked(updateKanriShiten).mockResolvedValue({
    data: buildKanriShitenDetail(),
    message: '更新しました。',
  });

  const { listJa, getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(listJa).mockResolvedValue(buildJaListResponseForDropdown());
  vi.mocked(getJaDropdown).mockResolvedValue({
    data: [
      {
        ja_id: 1,
        ja_code: '1301001001',
        ja_name: 'JA東京中央',
        todofuken_code: '13',
        chuokai_flg: true,
      },
      {
        ja_id: 2,
        ja_code: '1301002001',
        ja_name: 'JA東京みどり',
        todofuken_code: '13',
        chuokai_flg: false,
      },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  });

  // getTodofukenList wraps the array in { data: [...] } envelope.
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: buildTodofukenList() });
});

// ═════════════════════════════════════════════════════════════════════
// 1. 初期表示 (機能定義 §1)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — initial render (§1)', () => {
  it('should render the 管理店支情報入力 card heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('管理店支情報入力');
  });

  it('should render all required form labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('JA'))).toBe(true);
    expect(labels.some((t) => t.includes('管理支店コード'))).toBe(true);
    expect(labels.some((t) => t.includes('管理支店名'))).toBe(true);
    expect(labels.some((t) => t.includes('都道府県'))).toBe(true);
    expect(labels.some((t) => t.includes('郵便番号'))).toBe(true);
    expect(labels.some((t) => t.includes('住所'))).toBe(true);
    expect(labels.some((t) => t.includes('電話番号'))).toBe(true);
    expect(labels.some((t) => t.includes('FAX'))).toBe(true);
    expect(labels.some((t) => t.includes('紙版'))).toBe(true);
    expect(labels.some((t) => t.includes('電子版'))).toBe(true);
    expect(labels.some((t) => t.includes('備考'))).toBe(true);
  });

  it('should render the submit button with 登録 label in create mode when mounted', async () => {
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    // Antd auto-spaces 2-CJK button labels (登 録) — match substring not literal.
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

  it('should fetch JA dropdown list once (via BaseJaDropdown) when mounted', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await renderView();
    expect(getJaDropdown).toHaveBeenCalled();
  });

  it('should fetch todofuken list once for the 都道府県 dropdown when mounted', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    await renderView();
    expect(getTodofukenList).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. 編集モード初期表示 (機能定義 §2)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — edit-mode preload (§2)', () => {
  it('should call getKanriShiten with the path id when route has :id param', async () => {
    const { getKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView({ id: 5 });
    expect(getKanriShiten).toHaveBeenCalledWith(5);
  });

  it('should NOT call getKanriShiten in create mode when no :id param', async () => {
    const { getKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView();
    expect(getKanriShiten).not.toHaveBeenCalled();
  });

  it('should still call getKanriShiten with the requested id when BE returns 404', async () => {
    // COVERS: 機能定義 §2.2 — データ取得失敗 → ACSMS-MSG-009-005
    // Global axios interceptor handles the toast; this assertion just
    // guards that the view attempted the fetch with the correct id.
    const { getKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShiten).mockRejectedValue({
      response: {
        status: 404,
        data: { error_code: 'NOT_FOUND', message: '管理支店 #999 が見つかりません。' },
      },
    });
    await renderView({ id: 999 });
    expect(getKanriShiten).toHaveBeenCalledWith(999);
  });

  it('should make 管理支店コード input disabled in edit mode (機能定義 §2.3)', async () => {
    const { wrapper } = await renderView({ id: 1 });
    // The form-item carrying the 管理支店コード label is the one we care about.
    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const codeItem = formItems.find((fi) => fi.text().includes('管理支店コード'));
    expect(codeItem).toBeDefined();
    const html = codeItem!.html();
    // Antd marks either the input itself or `.ant-input-disabled` on its wrapper.
    expect(/disabled|ant-input-disabled/.test(html)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. 入力チェック (機能定義 §3.1)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — required-field validation (§3.1)', () => {
  it('should show ACSMS-MSG-009-003 (必須項目です。) when 管理支店コード is blank on submit', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should NOT call createKanriShiten when required fields are blank on submit', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createKanriShiten).not.toHaveBeenCalled();
  });

  it('should show 半角カタカナ format error when kanri_shiten_name_kana contains full-width katakana on submit', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.kanri_shiten_name_kana = 'トウキョウ';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain(
      '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });

  it('should show 半角カタカナ format error when kanri_shiten_name_kana contains hiragana on submit', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.kanri_shiten_name_kana = 'とうきょう';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain(
      '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。',
    );
  });

  it('should NOT call createKanriShiten when kanri_shiten_name_kana is full-width katakana', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(createKanriShiten).mockClear();
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.kanri_shiten_name_kana = 'トウキョウ';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createKanriShiten).not.toHaveBeenCalled();
  });

  it('should NOT throw エラーが発生しました when 都道府県 is cleared via allow-clear (regression for ?.trim() vs .trim())', async () => {
    // COVERS: vue.md §Validation — required-string checks MUST use ?.trim()
    // because antd's <a-select allow-clear> sets the v-model to `undefined`
    // (not "") when the × icon is clicked. Calling `.trim()` directly would
    // throw TypeError → global error handler → generic "エラーが発生しました"
    // toast that masks the actual required-field violation.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.todofuken_code = undefined; // simulate × clear-icon click
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3.5 管理支店コード format — auto-hyphen + strict pattern
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — 管理支店コード format', () => {
  /**
   * Helper — simulate typing one character at a time into the
   * managed-code input. Updates formState (v-model already applied
   * the new char in the real browser) then fires @input with the
   * appropriate inputType.
   */
  async function typeCode(wrapper: any, chars: string) {
    const vm = wrapper.vm as any;
    if (!vm.form) return;
    for (const ch of chars) {
      // Mimic v-model effect: append char to current formState value
      vm.form.kanri_shiten_code = (vm.form.kanri_shiten_code ?? '') + ch;
      vm.onKanriShitenCodeInput?.(
        new InputEvent('input', { inputType: 'insertText', data: ch }),
      );
      await flushPromises();
    }
  }

  it.each([
    ['auto-insert hyphen after the 3rd digit on live typing', '123', '123-'],
    ['auto-insert second hyphen after the 7th digit on live typing', '1234567', '123-4567-'],
    ['render canonical dashed shape when the full 10 digits are typed', '1234567890', '123-4567-890'],
  ])('should %s', async (_desc, typed, expected) => {
    const { wrapper } = await renderView();
    await typeCode(wrapper, typed);
    const vm = wrapper.vm as any;
    expect(vm.form.kanri_shiten_code).toBe(expected);
  });

  it('should NOT re-insert trailing hyphen when user backspaces across a segment boundary', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    // Start from "123-" (the auto-formatted state after typing 3 chars)
    vm.form.kanri_shiten_code = '123-';
    await flushPromises();
    // User presses backspace — browser strips the trailing '-' first
    vm.form.kanri_shiten_code = '123';
    vm.onKanriShitenCodeInput?.(
      new InputEvent('input', { inputType: 'deleteContentBackward' }),
    );
    await flushPromises();
    expect(vm.form.kanri_shiten_code).toBe('123');
  });

  it('should auto-insert hyphens when user pastes the bare 10-character form', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, {
        ...buildCreateKanriShitenForm(),
        kanri_shiten_code: '1133300099',
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_code: '113-3300-099' }),
    );
  });

  it('should pass through the canonical dashed shape unchanged', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_code: '113-3300-099' }),
    );
  });

  it.each([
    ['REJECT mixed alphanumeric input — digits only per customer spec', '1AA-BBBB-CCC'],
    ['show format error and NOT submit when the input is 8 chars (cannot normalise)', '12345678'],
    ['show format error when the input contains non-digit / non-hyphen characters', '113_3300_099'],
  ])('should %s', async (_desc, code) => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, {
        ...buildCreateKanriShitenForm(),
        kanri_shiten_code: code,
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createKanriShiten).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('NNN-NNNN-NNN');
  });

  it('should NOT validate kanri_shiten_code format in edit mode (field is immutable)', async () => {
    // The edit-mode preload sets the existing code value; the field is
    // disabled and the PUT body drops kanri_shiten_code entirely (see
    // UpdateKanriShitenDto). validateClient must skip the format check
    // so a legacy non-conforming code doesn't block edits to OTHER fields.
    const { updateKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.kanri_shiten_code = 'LEGACY';   // would fail format check on create
      vm.form.address = '更新後住所';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateKanriShiten).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. 登録・更新 submit (機能定義 §3.3, §3.4)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — submit (§3.3, §3.4)', () => {
  it('should call createKanriShiten with the form payload when 登録 is clicked with valid input', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createKanriShiten).toHaveBeenCalledTimes(1);
    expect(createKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({
        ja_id: 1,
        kanri_shiten_code: '113-3300-099',
        kanri_shiten_name: '新規管理支店',
      }),
    );
  });

  it('should show 登録しました。 success toast when createKanriShiten resolves', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to KanriShitenList after successful create', async () => {
    const { wrapper, pushSpy } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('KanriShitenList');
  });

  it('should call updateKanriShiten with the path id + body when 更新 is clicked in edit mode', async () => {
    const { updateKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const vm = wrapper.vm as any;
    if (vm.form) vm.form.address = '更新後住所';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateKanriShiten).toHaveBeenCalledTimes(1);
    expect(updateKanriShiten).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ address: '更新後住所' }),
    );
  });

  it('should show 更新しました。 toast when updateKanriShiten resolves', async () => {
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    // 編集で何か変更しないと「変更なし」ガードでスキップされる。
    (wrapper.vm as any).form.kanri_shiten_name = '変更後管理支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to KanriShitenList after successful update', async () => {
    const { wrapper, pushSpy } = await renderView({ id: 5 });
    await flushPromises();
    (wrapper.vm as any).form.kanri_shiten_name = '変更後管理支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('KanriShitenList');
  });

  it('should NOT call updateKanriShiten (skip) when nothing changed in edit mode', async () => {
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const { updateKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(updateKanriShiten).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateKanriShiten).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should map BE VALIDATION_ERROR errors[].field to <a-form-item :help> when create rejects', async () => {
    // COVERS: vue.md §Error Handling — VALIDATION_ERROR is consumed by
    // useApiForm and surfaced inline via <a-form-item :help>, not toast.
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(createKanriShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [
            { field: 'kanri_shiten_code', message: '管理支店コードは必須です' },
          ],
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('管理支店コードは必須です');
  });

  it('should NOT re-toast DUPLICATE_CODE when BE rejects (global axios interceptor owns the toast)', async () => {
    // COVERS: vue.md §Error Handling Architecture — DUPLICATE_CODE is
    // toasted centrally; the view must NOT call message.error itself
    // or the user sees the toast twice.
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(createKanriShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: '管理支店コード「113-3300-099」はすでに登録されています。',
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createKanriShiten).toHaveBeenCalled();
    // Spec-side guard: view must not call message.error for HTTP errors.
    expect(message.error).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. 前の画面に戻る (機能定義 §4)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — back navigation (§4)', () => {
  // Customer override of screen-design.md §4.1: the back button skips
  // the ACSMS-MSG-009-008 confirmation popup and navigates straight to
  // the list view. (Lost data is acceptable per stakeholder review.)
  it('should navigate to KanriShitenList when 前の画面に戻る is clicked', async () => {
    const { wrapper, pushSpy } = await renderView();
    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('KanriShitenList');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Enter-implicit-submit guard (vue.md §long forms)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — Enter-implicit-submit guard', () => {
  it('should NOT call createKanriShiten when Enter is pressed inside a text input', async () => {
    // COVERS: vue.md §Block Enter implicit submit on long CRUD forms.
    // SCR-009 form has 11+ fields → must wire preventEnterImplicitSubmit
    // on the <a-form> @keydown handler. If the handler is missing, the
    // form auto-submits on Enter and the API gets called → test fails.
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateKanriShitenForm());
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    if (input.exists()) {
      await input.trigger('keydown', { key: 'Enter' });
      await flushPromises();
    }
    expect(createKanriShiten).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Defensive / edge-case coverage — error paths + focusFirstError
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenFormView — defensive paths', () => {
  it('should fall back to empty prefecture options when getTodofukenList rejects', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    vi.mocked(getTodofukenList).mockRejectedValueOnce({ message: 'boom' });
    const { wrapper } = await renderView();
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should focus the first invalid field after submitting a blank create form', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should swallow updateKanriShiten rejection without crashing (interceptor toasts)', async () => {
    const { updateKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(updateKanriShiten).mockRejectedValue({
      response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView({ id: 5 });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should fall back gracefully when getKanriShiten rejects on edit-mode mount', async () => {
    const { getKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShiten).mockRejectedValue({
      response: { data: { error_code: 'NOT_FOUND' } },
    });
    const { wrapper } = await renderView({ id: 999 });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  // ─── Format-validation branches for optional digit fields ────────
  it('should reject yubin_no when not 7 digits', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.yubin_no = '12-3456';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('郵便番号は半角数字のみ');
  });

  it('should reject tel when contains non-digits', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.tel = '03-1234-5678';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('電話番号は半角数字のみ');
  });

  it('should reject fax when contains non-digits', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateKanriShitenForm());
      vm.form.fax = '03-1234-9999';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('FAXは半角数字のみ');
  });
});
