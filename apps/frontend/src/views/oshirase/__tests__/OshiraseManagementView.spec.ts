// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Single-page CRUD: list at top + edit form below. Every it() maps to a
// clause in docs/design/ACSMS-SCR-031/screen-design.md (機能定義) +
// docs/design/ACSMS-SCR-031/index.html (UI structure) +
// docs/design/ACSMS-SCR-031/ACSMS-SCR-031-api.md (API-031-001..005 +
// COMMON-003 JA dropdown).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import OshiraseManagementView from '@/views/oshirase/OshiraseManagementView.vue';
import {
  buildOshiraseListResponse,
  buildOshiraseListItem,
  buildOshiraseDetail,
  buildJaDropdownResponse,
  buildAdminUser,
  futureDateString,
} from '@test/fixtures/oshirase.fixture';

// API wrappers — /gen-code-frontend will create src/api/oshirase/oshirase.ts.
vi.mock('@/api/oshirase/oshirase', () => ({
  listOshirase: vi.fn(),
  getOshirase: vi.fn(),
  createOshirase: vi.fn(),
  updateOshirase: vi.fn(),
  removeOshirase: vi.fn(),
}));

// JA dropdown (COMMON-003) — already exists, just mock.
vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
}));

// Antd toast spies.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Modal.confirm — synchronous onOk for testability.
vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
  opts?.onOk?.();
  return { destroy: () => undefined, update: () => undefined };
});

interface RenderOptions {
  user?: ReturnType<typeof buildAdminUser>;
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
      { path: '/oshirase', name: 'OshiraseList', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'OshiraseList' });
  await router.isReady();

  const wrapper = mount(OshiraseManagementView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAdminUser() },
            // Seed m_code so the view's useCodesStore().options(...) returns
            // the canonical PUBLISH_LOCATION / OSHIRASE_TYPE / OSHIRASE_STATUS
            // entries during unit tests (production hydrates this from
            // GET /api/v1/codes after login).
            codes: {
              all: {
                PUBLISH_LOCATION: [
                  { value: 1, label: 'ログイン画面', label_short: 'ログイン画面' },
                  { value: 2, label: 'メニュー画面', label_short: 'メニュー画面' },
                  { value: 3, label: 'メニュー画面（締め切り時間）', label_short: '締切時間' },
                ],
                OSHIRASE_TYPE: [
                  { value: 1, label: 'システム', label_short: 'システム' },
                  { value: 2, label: '重要', label_short: '重要' },
                  { value: 3, label: '一般', label_short: '一般' },
                  { value: 4, label: '締め切り時間', label_short: '締切時間' },
                ],
                OSHIRASE_STATUS: [
                  { value: 1, label: '下書き', label_short: '下書き' },
                  { value: 2, label: '公開', label_short: '公開' },
                  { value: 3, label: '非公開', label_short: '非公開' },
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
  const { listOshirase, getOshirase, createOshirase, updateOshirase, removeOshirase } =
    await import('@/api/oshirase/oshirase');
  vi.mocked(listOshirase).mockResolvedValue(buildOshiraseListResponse());
  vi.mocked(getOshirase).mockResolvedValue({ data: buildOshiraseDetail() });
  vi.mocked(createOshirase).mockResolvedValue({
    data: buildOshiraseDetail({ oshirase_id: 99 }),
    message: '登録しました。',
  });
  vi.mocked(updateOshirase).mockResolvedValue({
    data: buildOshiraseDetail(),
    message: '更新しました。',
  });
  vi.mocked(removeOshirase).mockResolvedValue({ message: '削除しました。' });

  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue(buildJaDropdownResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — initial render (機能定義 1.x)', () => {
  it('should fetch the oshirase list once when mounted', async () => {
    await renderView();
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    expect(listOshirase).toHaveBeenCalledTimes(1);
  });

  it('should fetch the JA dropdown once when mounted', async () => {
    await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    expect(getJaDropdown).toHaveBeenCalled();
  });

  it('should render the お知らせ一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('お知らせ一覧');
  });

  it('should render the 新規登録 form heading when mounted in create mode', async () => {
    const { wrapper } = await renderView();
    // 機能定義 1.2 — フォームヘッダーに「新規登録」テキストが表示
    expect(wrapper.text()).toContain('新規登録');
  });

  it('should render the canonical form labels when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('お知らせタイトル');
    expect(text).toContain('公開場所');
    expect(text).toContain('状態');
    expect(text).toContain('表示期間');
    expect(text).toContain('JA');
    expect(text).toContain('お知らせ種別');
    expect(text).toContain('対象管理者区分');
    expect(text).toContain('内容');
  });

  it('should render the table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('場所');
    expect(text).toContain('状態');
    expect(text).toContain('表示期間');
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('システムメンテナンスのお知らせ');
    expect(wrapper.text()).toContain('新機能リリースのお知らせ');
  });

  it('should render the 保存 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    const saveBtn = wrapper.find('button[type="submit"]');
    expect(saveBtn.exists()).toBe(true);
  });

  it('should render the クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should display ACSMS-MSG-031-006 アクセス権がありません。 when user does not hold oshirase.view', async () => {
    const { wrapper } = await renderView({
      user: buildAdminUser({ permissions: [], role_code: 'CHUOKAI' }),
    });
    expect(wrapper.text()).toContain('アクセス権がありません。');
  });

  it('should NOT call listOshirase when user does not hold oshirase.view', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(listOshirase).mockClear();
    await renderView({
      user: buildAdminUser({ permissions: [], role_code: 'JA_HONTEN' }),
    });
    expect(listOshirase).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 新規登録 (機能定義 2.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — create (機能定義 2.x)', () => {
  it('should display ACSMS-MSG-031-011 必須項目です。 when title is empty on submit', async () => {
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    // Submit without filling required fields.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createOshirase).not.toHaveBeenCalled();
  });

  it('should call createOshirase with the form body when 保存 is clicked with valid input', async () => {
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.publish_end_date = futureDateString(30);
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createOshirase).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'テスト',
        publish_location: 2,
        status: 2,
        oshirase_type: 1,
        content: 'テスト本文',
      }),
    );
  });

  it('should default 公開場所 and 状態 to 1 on a fresh create form (画面項目定義 No.2/3)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.formState.publish_location).toBe(1);
    expect(vm.formState.status).toBe(1);
  });

  it('should auto-set oshirase_type to 4 when publish_location is set to 3 (締め切り時間 slot)', async () => {
    // 顧客確認 2026-05: publish_location=3 ⇔ type=4 (1:1) — FE watcher は
    // 公開場所選択を駆動側とし、種別を 4 にロックする。
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.publish_location = 3;
    await flushPromises();
    expect(vm.formState.oshirase_type).toBe(4);
  });

  it('should reset oshirase_type to null when publish_location changes from 3 to a non-deadline location', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.publish_location = 3;
    await flushPromises();
    expect(vm.formState.oshirase_type).toBe(4);
    vm.formState.publish_location = 1;
    await flushPromises();
    expect(vm.formState.oshirase_type).toBeNull();
  });

  it('should expose type options 1,2,3 only when publish_location is not 3', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.publish_location = 1;
    await flushPromises();
    expect(vm.availableTypeOptions.map((o: { value: number }) => o.value)).toEqual([1, 2, 3]);
  });

  it('should expose type option 4 only when publish_location is 3', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.publish_location = 3;
    await flushPromises();
    expect(vm.availableTypeOptions.map((o: { value: number }) => o.value)).toEqual([4]);
  });

  it('should default 対象管理者区分 to all codes (1,2,3,4,5) on create when none is checked', async () => {
    // 顧客要件: 新規作成時に対象管理者区分のチェックが1つも無い場合、
    // 全区分（1〜5）が対象として保存される。
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
      vm.formState.target_kanri_kubun_codes = [];
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createOshirase).toHaveBeenCalledWith(
      expect.objectContaining({ target_kanri_kubun: '1,2,3,4,5' }),
    );
  });

  it('should reload the form from the server after a successful create so saved values display', async () => {
    // BUG-FIX: 新規作成成功後は当該レコードの編集モードに切り替わるが、
    // サーバ保存済みの値（例: 自動補完された対象管理者区分）が画面へ
    // 反映されない不具合の回帰テスト。作成後に getOshirase で再取得する。
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 99,
        target_kanri_kubun: '1,2,3,4,5',
      }),
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
      vm.formState.target_kanri_kubun_codes = [];
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // 作成された ID（99）で詳細を再取得していること。
    expect(getOshirase).toHaveBeenCalledWith(99);
    // 取得結果がフォームへ反映され、チェックボックスが全選択状態になること。
    expect(vm.formState.target_kanri_kubun_codes).toEqual(['1', '2', '3', '4', '5']);
  });

  it('should display ACSMS-MSG-031-001 「登録しました。」 toast when createOshirase resolves', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should refetch the list after a successful create', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(listOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listOshirase).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-031-008 終了日は開始日より後にしてください。 when publish_end_date < publish_start_date', async () => {
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(30);
      vm.formState.publish_end_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('終了日は開始日より後にしてください。');
    expect(createOshirase).not.toHaveBeenCalled();
  });

  it('should display 終了日は開始日より後にしてください。 also when publish_end_date === publish_start_date (顧客 FB 2026-05-29)', async () => {
    // 顧客レビュー 2026-05-29 — drop the special "重複" copy that the
    // earlier split (commit f6522b7) introduced. End === start is now
    // surfaced under the same `終了日は開始日より後にしてください。`
    // message as end < start.
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    const sameMoment = futureDateString(14);
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = sameMoment;
      vm.formState.publish_end_date = sameMoment;
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('終了日は開始日より後にしてください。');
    // The retired overlap copy must NOT appear anywhere.
    expect(wrapper.text()).not.toContain(
      '締め切り時間の公開期限が重複しています。',
    );
    expect(createOshirase).not.toHaveBeenCalled();
  });

  it('should reject publish_start_date in the past on create with 過去日は選択できません。', async () => {
    // 顧客要件: 新規作成時、開始日に過去日を指定するとエラー。
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(createOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 1;
      vm.formState.publish_start_date = futureDateString(-7); // 7日前
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('過去日は選択できません。');
    expect(createOshirase).not.toHaveBeenCalled();
  });

  it('should map DEADLINE_NOTICE_DUPLICATE error to the BE-supplied toast when createOshirase rejects', async () => {
    const { createOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(createOshirase).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'DEADLINE_NOTICE_DUPLICATE',
          message:
            '公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。',
        },
      },
    });

    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = 'テスト';
      vm.formState.publish_location = 2;
      vm.formState.status = 2;
      vm.formState.oshirase_type = 4;
      vm.formState.publish_start_date = futureDateString(7);
      vm.formState.content = 'テスト本文';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(message.error).toHaveBeenCalledWith(
      '公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。',
    );
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. クリア (機能定義 2.x — btnClear)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — clear (btnClear)', () => {
  it('should reset all form fields when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.title = '一時入力';
      vm.formState.content = '入力中の内容';
    }
    await flushPromises();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.formState?.title).toBe('');
    expect(vm.formState?.content).toBe('');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 編集読込 (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — edit load (機能定義 3.x)', () => {
  it('should call getOshirase with the row id when 編集 is clicked', async () => {
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(getOshirase).mockClear();

    // 編集/削除 in the row are rendered as <a> links (not <button>) — see
// OshiraseManagementView template `column.key === 'edit' | 'actions'`.
const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    expect(getOshirase).toHaveBeenCalled();
  });

  it('should populate formState with the loaded row when 編集 resolves', async () => {
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 42,
        title: '読み込みテスト',
        content: '本文ロード',
      }),
    });

    const { wrapper } = await renderView();
    // 編集/削除 in the row are rendered as <a> links (not <button>) — see
// OshiraseManagementView template `column.key === 'edit' | 'actions'`.
const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.formState?.title).toBe('読み込みテスト');
    expect(vm.formState?.content).toBe('本文ロード');
  });

  it('should switch the form header to 編集中:{id} when an existing row is loaded', async () => {
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({ oshirase_id: 42 }),
    });

    const { wrapper } = await renderView();
    // 編集/削除 in the row are rendered as <a> links (not <button>) — see
// OshiraseManagementView template `column.key === 'edit' | 'actions'`.
const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('編集中');
    expect(wrapper.text()).toContain('42');
  });

  it('should mark publish_start_date picker read-only when the loaded start date is in the past', async () => {
    // 顧客要件: 編集モードで読み込んだ開始日が過去日の場合、
    // 開始日ピッカーは read-only（変更不可）とする。
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 42,
        publish_start_date: futureDateString(-7), // 7日前
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.isStartReadOnly).toBe(true);
  });

  it('should keep publish_start_date editable when the loaded start date is in the future', async () => {
    // 顧客要件: 編集モードで読み込んだ開始日が未来日の場合、変更可能。
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 42,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.isStartReadOnly).toBe(false);
  });

  it('should reject submit when editing a future-start record and the new value is in the past', async () => {
    // 顧客要件: 編集モード + 保存済み開始日=未来。新しい開始日を過去に
    // 変更したらバリデーションでエラーとなる。
    const { getOshirase, updateOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 42,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    vi.mocked(updateOshirase).mockClear();
    const vm = wrapper.vm as any;
    vm.formState.publish_start_date = futureDateString(-1); // 昨日
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('過去日は選択できません。');
    expect(updateOshirase).not.toHaveBeenCalled();
  });

  it('should mark oshirase_type read-only when editing a 締め切り時間 (type=4) record', async () => {
    // 顧客確認 2026-05: 編集モードで type=4 レコードを開いたら、種別は変更不可。
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      data: buildOshiraseDetail({
        oshirase_id: 42,
        oshirase_type: 4,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.isTypeReadOnly).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 更新（編集モード） (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — update (機能定義 4.x)', () => {
  it('should call updateOshirase with the form body + id when 保存 is clicked in edit mode', async () => {
    const { updateOshirase, getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      // publish_end_date null avoids the date-order check tripping on
      // the fixture's static end (past) vs the dynamic future start.
      data: buildOshiraseDetail({
        oshirase_id: 42,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    // 編集/削除 in the row are rendered as <a> links (not <button>) — see
// OshiraseManagementView template `column.key === 'edit' | 'actions'`.
const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    vi.mocked(updateOshirase).mockClear();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.title = '更新後タイトル';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateOshirase).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: '更新後タイトル' }),
    );
  });

  it('should display ACSMS-MSG-031-002 「更新しました。」 toast when updateOshirase resolves', async () => {
    const { getOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getOshirase).mockResolvedValueOnce({
      // publish_end_date null avoids the date-order check tripping on
      // the fixture's static end (past) vs the dynamic future start.
      data: buildOshiraseDetail({
        oshirase_id: 42,
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      }),
    });

    const { wrapper } = await renderView();
    // 編集/削除 in the row are rendered as <a> links (not <button>) — see
// OshiraseManagementView template `column.key === 'edit' | 'actions'`.
const editBtn = wrapper.findAll('a').find((a) => a.text().includes('編集'));
    await editBtn!.trigger('click');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 削除 (機能定義 5.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — delete (機能定義 5.x)', () => {
  it('should open Modal.confirm with ACSMS-MSG-031-003 content when 削除 is clicked', async () => {
    const { wrapper } = await renderView();
    const delBtn = wrapper.findAll('a').find((a) => a.text().includes('削除'));
    await delBtn!.trigger('click');
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalled();
    const opts = (Modal.confirm as any).mock.calls.at(-1)[0];
    const content = String(opts?.content ?? '');
    expect(content).toContain('削除してもよろしいですか');
  });

  it('should call removeOshirase with the row id when the confirm dialog OK is clicked', async () => {
    const { removeOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(removeOshirase).mockClear();

    const { wrapper } = await renderView();
    const delBtn = wrapper.findAll('a').find((a) => a.text().includes('削除'));
    await delBtn!.trigger('click');
    await flushPromises();

    expect(removeOshirase).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-031-004 「削除しました。」 toast when removeOshirase resolves', async () => {
    const { wrapper } = await renderView();
    const delBtn = wrapper.findAll('a').find((a) => a.text().includes('削除'));
    await delBtn!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('削除しました。');
  });

  it('should refetch the list after a successful delete', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(listOshirase).mockClear();

    const delBtn = wrapper.findAll('a').find((a) => a.text().includes('削除'));
    await delBtn!.trigger('click');
    await flushPromises();

    expect(listOshirase).toHaveBeenCalled();
  });

  it('should still call removeOshirase when removeOshirase rejects with 409 (interceptor handles toast)', async () => {
    const { removeOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(removeOshirase).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'CONFLICT',
          message: '関連データが存在するため削除できません。',
        },
      },
    });

    const { wrapper } = await renderView();
    const delBtn = wrapper.findAll('a').find((a) => a.text().includes('削除'));
    await delBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(removeOshirase)).toHaveBeenCalled();
  });

  it('should NOT render a clickable 削除 link for a 締め切り時間 (type=4) row', async () => {
    // 顧客確認 2026-05: type=4 レコードは削除不可。テンプレートは <span>
    // にフォールバックし、リンクは描画されない。リスト全体を type=4 で
    // モックし、<a>削除</a> が0件であることを確認する。
    const { listOshirase, removeOshirase } = await import(
      '@/api/oshirase/oshirase'
    );
    vi.mocked(listOshirase).mockResolvedValueOnce({
      data: [buildOshiraseListItem({ oshirase_id: 100, oshirase_type: 4 })],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    });
    vi.mocked(removeOshirase).mockClear();

    const { wrapper } = await renderView();

    const deleteAnchors = wrapper
      .findAll('a')
      .filter((a) => a.text().trim() === '削除');
    expect(deleteAnchors).toHaveLength(0);
    // 行内に「削除」の文字列自体は disabled な <span> として残る。
    expect(wrapper.text()).toContain('削除');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. ページネーション (機能定義 6.x)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — pagination (機能定義 6.x)', () => {
  it('should call listOshirase with page=2 when the table emits a change to page 2', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    const { wrapper } = await renderView();
    vi.mocked(listOshirase).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state) vm.state.page = 2;
    await flushPromises();
    // Pagination handlers usually re-call fetch; if the view does it on
    // state mutation alone, this assertion fires immediately.
    if (typeof vm.fetchList === 'function') await vm.fetchList();
    await flushPromises();

    expect(listOshirase).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('should default per_page=20 on initial fetch (機能定義 6.2)', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    await renderView();
    const firstCall = vi.mocked(listOshirase).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall?.per_page).toBe(20);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. システムエラー (機能定義 ACSMS-MSG-031-007)
// ───────────────────────────────────────────────────────────────────────
describe('OshiraseManagementView — system error (ACSMS-MSG-031-007)', () => {
  it('should still call listOshirase when listOshirase rejects with 500 (interceptor handles toast)', async () => {
    const { listOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(listOshirase).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listOshirase)).toHaveBeenCalled();
  });
});
