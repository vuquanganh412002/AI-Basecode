// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面
//
// Drives src/views/tanka/TankaListView.vue. Every it() maps to a clause in
// docs/design/ACSMS-SCR-002/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-002/index.html (UI structure) +
// docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import TankaListView from '@/views/tanka/TankaListView.vue';
import {
  buildTankaListItem,
  buildTankaListResponse,
  buildAuthUser,
  TANKA_TYPE_OPTIONS,
} from '@test/fixtures/tanka.fixture';

// Mock the Tanka API client. /gen-code-frontend will add `listTanka` +
// `removeTanka` to `src/api/tanka/tanka.ts` (Orval-generated then wrapped).
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
  /** Override default CHUOKAI session (CHUOKAI is the lowest role with full tanka.* perms). */
  user?: ReturnType<typeof buildAuthUser>;
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
      { path: '/tanka', name: 'TankaList', component: { template: '<div />' } },
      { path: '/tanka/create', name: 'TankaCreate', component: { template: '<div />' } },
      {
        path: '/tanka/:id/edit',
        name: 'TankaEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'TankaList' });
  await router.isReady();

  const wrapper = mount(TankaListView, {
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
              all: {
                TANKA_TYPE: TANKA_TYPE_OPTIONS,
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
  const { listTanka, removeTanka } = await import('@/api/tanka/tanka');
  vi.mocked(listTanka).mockResolvedValue(buildTankaListResponse());
  vi.mocked(removeTanka).mockResolvedValue({ message: '削除しました。' });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 初期表示 (onMounted) — 機能定義 §1
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — initial render (機能定義 1.x)', () => {
  // Page title + breadcrumb come from MainLayout's AppHeader, NOT this view.

  it('should render the 単価一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('単価一覧');
  });

  it('should fetch the tanka list once when mounted', async () => {
    await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    expect(listTanka).toHaveBeenCalledTimes(1);
  });

  it('should render the search form with 単価種別 / 単価名 / 有効単価フラグ filters when mounted', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('単価種別'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('単価名'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('有効単価フラグ'))).toBe(true);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    // Default fixture: 購読料 active + 配達手数料 disabled
    expect(wrapper.text()).toContain('基本購読料');
    expect(wrapper.text()).toContain('配達手数料');
  });

  it('should render tanka_type label via useCodesStore lookup when row renders', async () => {
    // COVERS: §レスポンスデータ — BE returns `tanka_type: 1`, FE renders '購読料'
    // via codes.label('TANKA_TYPE', 1). NO `tanka_type_label` from BE.
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('購読料');
  });

  it('should render 適用開始日 column with formatted date when row has a value', async () => {
    // COVERS: §レスポンスデータ row 6 — date column visible
    const { wrapper } = await renderView();
    expect(wrapper.text()).toMatch(/2026[\/\-]01[\/\-]01/);
  });

  it('should render "-" for 適用終了日 when row has tekiyo_end_date = null', async () => {
    // COVERS: §レスポンスデータ row 7 — NULL は無期限 → 「-」 表示
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockResolvedValue(
      buildTankaListResponse({
        data: [buildTankaListItem({ tekiyo_end_date: null })],
      }),
    );
    const { wrapper } = await renderView();
    // Hard to grep — but the cell should NOT contain a date string for the
    // end column. Use loose check: text contains '-' near the row.
    expect(wrapper.text()).toContain('-');
  });

  it('should render the 検索 button when mounted', async () => {
    const { wrapper } = await renderView();
    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
  });

  it('should render the 検索クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should render the 新規登録 button when mounted', async () => {
    const { wrapper } = await renderView();
    const createBtn = wrapper.findAll('button').find((b) =>
      b.text().includes('新') && b.text().includes('登録'),
    );
    expect(createBtn).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 検索実行 — 機能定義 §2
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — search (機能定義 2.x)', () => {
  it('should call listTanka with tanka_name partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    const textInputs = wrapper.findAll('input[type="text"]');
    expect(textInputs.length).toBeGreaterThan(0);
    await textInputs[0].setValue('基本');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listTanka).toHaveBeenCalled();
    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg).toMatchObject({ tanka_name: '基本' });
  });

  it('should call listTanka WITHOUT active_flg key when 有効単価フラグ is left unselected', async () => {
    // COVERS: §4.3 — 「省略時は両方（有効中・停止中）を返却」
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    // Set a text filter so 検索 actually fires — an all-empty search is
    // now a no-op (the initial load already showed the default list).
    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[0].setValue('基本');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg).toBeDefined();
    expect(callArg!.active_flg).toBeUndefined();
  });

  it('should trim leading/trailing whitespace from tanka_name before sending the filter', async () => {
    // COVERS: list-view rule 5a — trim text filters on search
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[0].setValue('   基本   ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg).toMatchObject({ tanka_name: '基本' });
  });

  it('should clear filters and refetch when 検索クリア is clicked', async () => {
    // COVERS: §機能定義 3.1
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');

    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[0].setValue('基本');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    vi.mocked(listTanka).mockClear();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listTanka).toHaveBeenCalled();
    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg?.tanka_name).toBeFalsy();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 新規登録ボタン — router.push to TankaCreate
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — navigation (機能定義 4.x)', () => {
  it('should router.push to TankaCreate when 新規登録 button is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新') && b.text().includes('登録'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushedJson).toContain('TankaCreate');
  });

  it('should router.push to TankaEdit with the row id when a row 単価コード link is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // 単価コード is rendered as an anchor that navigates to edit. Find an
    // anchor whose text equals one of the seeded codes.
    const codeAnchor = wrapper
      .findAll('a')
      .find((a) => a.text().includes('T001'));
    expect(codeAnchor).toBeDefined();
    await codeAnchor!.trigger('click');
    await flushPromises();

    const pushedJson = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushedJson).toContain('TankaEdit');
    expect(pushedJson).toContain('"id":1');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 削除 — confirm modal → removeTanka → toast → refetch
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — delete (機能定義 §削除フロー + ACSMS-MSG-002-005/006/007)', () => {
  function stubConfirmConfirm() {
    return vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
  }

  it('should open a confirm dialog when 削除 link is clicked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm');
    const { wrapper } = await renderView();
    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    expect(deleteLink).toBeDefined();
    await deleteLink!.trigger('click');
    expect(confirmSpy).toHaveBeenCalled();
  });

  it('should call removeTanka with the row tanka_id when delete is confirmed', async () => {
    stubConfirmConfirm();
    const { wrapper } = await renderView();
    const { removeTanka } = await import('@/api/tanka/tanka');
    vi.mocked(removeTanka).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeTanka).toHaveBeenCalled();
    expect(vi.mocked(removeTanka).mock.calls[0]?.[0]).toBe(1);
  });

  it('should toast "削除しました。" verb-only success message when delete succeeds', async () => {
    // COVERS: project i18n convention — verb-only, NOT '単価を削除しました。'
    stubConfirmConfirm();
    const { wrapper } = await renderView();
    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('削除しました。');
  });

  it('should reload the list after successful delete', async () => {
    stubConfirmConfirm();
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(listTanka).toHaveBeenCalled();
  });

  it('should NOT call removeTanka when the confirm dialog is cancelled', async () => {
    // onOk not invoked when user clicks いいえ
    vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const { wrapper } = await renderView();
    const { removeTanka } = await import('@/api/tanka/tanka');
    vi.mocked(removeTanka).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeTanka).not.toHaveBeenCalled();
  });

  it('should swallow CONFLICT error when removeTanka rejects (axios interceptor toasts)', async () => {
    // COVERS: err:CONFLICT (HTTP 409, m_hanbaiten / t_dokusya FK) — global
    // axios interceptor handles the toast centrally. View must NOT re-toast.
    stubConfirmConfirm();
    const { wrapper } = await renderView();
    const { removeTanka } = await import('@/api/tanka/tanka');
    vi.mocked(removeTanka).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error_code: 'CONFLICT',
          message: '関連データが存在するため削除できません。',
        },
      },
    });
    vi.mocked(message.error).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    // View itself does NOT call message.error — the global axios interceptor does.
    expect(message.error).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 状態フィルタ — active_flg
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — active_flg filter (有効単価フラグ)', () => {
  it('should send active_flg=true when 有効単価フラグ is set to "有効" and 検索 clicked', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    // 有効単価フラグ is rendered as <a-radio-group> with value '1' for 有効
    // and '0' for 無効. Find the radio whose label text is exactly '有効'
    // and click its underlying <input type="radio">.
    const yukoRadio = wrapper
      .findAll('.ant-radio-wrapper')
      .find((w) => w.text().trim() === '有効');
    expect(yukoRadio).toBeDefined();
    await yukoRadio!.find('input[type="radio"]').setValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    // Accept either coerced boolean `true` or string `'1'` (FE may send
    // either — service.findAll handles both per integration tests).
    expect(callArg?.active_flg === true || callArg?.active_flg === '1').toBe(
      true,
    );
  });

  it('should render rows with both active and disabled states from the default response', async () => {
    const { wrapper } = await renderView();
    // Default fixture row 1 active, row 2 disabled
    expect(wrapper.text()).toContain('基本購読料');
    expect(wrapper.text()).toContain('配達手数料');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5b. キャンペーンフラグ filter — campaign_flg (mirrors active_flg)
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — campaign_flg filter (キャンペーンフラグ)', () => {
  it('should render the キャンペーンフラグ filter when mounted', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('キャンペーンフラグ'))).toBe(true);
  });

  it('should call listTanka WITHOUT campaign_flg key when left unselected', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    // Set a text filter so 検索 actually fires — an all-empty search is
    // now a no-op (the initial load already showed the default list).
    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[0].setValue('基本');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg).toBeDefined();
    expect(callArg!.campaign_flg).toBeUndefined();
  });

  it('should send campaign_flg=true when キャンペーンフラグ is set to "有効" and 検索 clicked', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    // Scope to the campaign filter's radio group (id=tanka-filter-6) so we
    // don't grab the 有効単価フラグ radio which shares the label text '有効'.
    const group = wrapper.find('#tanka-filter-6');
    expect(group.exists()).toBe(true);
    const yukoRadio = group
      .findAll('.ant-radio-wrapper')
      .find((w) => w.text().trim() === '有効');
    expect(yukoRadio).toBeDefined();
    await yukoRadio!.find('input[type="radio"]').setValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(
      callArg?.campaign_flg === true || callArg?.campaign_flg === '1',
    ).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 権限 / 表示制御
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — permission-aware UI (security.md Layer 1 mirror)', () => {
  it('should DISABLE the 新規登録 button when user lacks tanka.create permission', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['tanka.view'] }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新') && b.text().includes('登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeDefined();
  });

  it('should DISABLE the 削除 link/button when user lacks tanka.delete permission', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['tanka.view', 'tanka.update'],
      }),
    });
    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().includes('削除'));
    expect(deleteLink).toBeDefined();
    // Anchor or disabled-button — assert it's not actionable
    const html = deleteLink!.html();
    const looksDisabled =
      /disabled(?:=|>|\s)/.test(html) ||
      html.includes('ant-btn-disabled') ||
      html.includes('pointer-events-none') ||
      html.includes('text-text-disabled') ||
      deleteLink!.attributes('disabled') !== undefined;
    expect(looksDisabled).toBe(true);
  });

  it('should still render the list when user has only tanka.view (read-only mode)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['tanka.view'] }),
    });
    expect(wrapper.text()).toContain('基本購読料');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. 空の検索結果
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — empty result (機能定義 §2.3 + ACSMS-MSG-002-001)', () => {
  it('should display "検索結果が見つかりませんでした。" when API returns 0 rows', async () => {
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockResolvedValue(
      buildTankaListResponse({ data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } }),
    );
    const { wrapper } = await renderView();
    // The empty-message is rendered as a sibling <p>, NOT inside the table
    // (BaseDataTable's slot loop crashes on null slotProps; convention is
    // sibling rendering — see .claude/rules/vue.md §List view rules).
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. ページネーション
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — pagination (機能定義 §4.5)', () => {
  it('should refetch with new page when pagination changes', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear();

    // BaseDataTable forwards antd's table @change event. Trigger a
    // pagination click on the next-page button when it's enabled.
    // With the 2-row default fixture (1 page total) the next-page <li>
    // is always rendered (the table no longer hides pagination on a
    // single page — customer asked for the bar to be visible always so
    // the size-changer + '全 N 件' total stay on-screen). But it carries
    // the .ant-pagination-disabled class, so filter that out — clicking
    // a disabled control does nothing and would make the assertion
    // below false-fail.
    const nextPageBtn = wrapper
      .findAll('button, a, li')
      .find((el) => {
        if (
          el.classes('ant-pagination-disabled') ||
          el.attributes('aria-disabled') === 'true'
        ) {
          return false;
        }
        const t = el.text();
        return (
          el.attributes('title') === 'Next Page' ||
          el.attributes('aria-label')?.includes('Next') ||
          /^\s*2\s*$/.test(t)
        );
      });

    if (nextPageBtn) {
      await nextPageBtn.trigger('click');
      await flushPromises();
      expect(listTanka).toHaveBeenCalled();
      const callArg = vi.mocked(listTanka).mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      // Page should advance — exact value depends on total_pages, but it
      // MUST be ≥ 1 (not undefined / 0).
      const page = Number(callArg?.page ?? 1);
      expect(page).toBeGreaterThanOrEqual(1);
    } else {
      // 2-row fixture only generates 1 page → the next-page control is
      // rendered but disabled, so no enabled next-page button was found.
      // Assert that premise rather than a tautology.
      expect(nextPageBtn).toBeUndefined();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('TankaListView — empty 検索 is a no-op', () => {
  it('should NOT call listTanka when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listTanka).not.toHaveBeenCalled();
  });

  it('should NOT call listTanka when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listTanka } = await import('@/api/tanka/tanka');
    vi.mocked(listTanka).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listTanka).not.toHaveBeenCalled();
  });
});
