// Screen: ACSMS-SCR-010 — メニュー画面
//
// Focused on the 電子版読者承認 banner (ACSMS-API-010-002):
//   - 日農アカウント (NICHINO_ADMIN / NICHINO_STAFF) → banner hidden,
//     getPendingApprovalCount NOT called.
//   - その他ロール → count fetched (DataScope BE-side); count=0 disables the
//     button + hides the 承認待ち badge; count>0 enables + click navigates to
//     DokusyaList with ?denshi_shonin_status=0 (未承認).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd from 'ant-design-vue';

import DashboardView from '@/views/dashboard/DashboardView.vue';
import { buildAuthUser, buildCodesSeed } from '@test/fixtures/dokusya.fixture';

vi.mock('@/api/oshirase/oshirase', () => ({
  getMenuOshirase: vi.fn(),
}));
vi.mock('@/api/dokusya/dokusya', () => ({
  getPendingApprovalCount: vi.fn(),
}));

let pushSpy: ReturnType<typeof vi.fn>;

async function renderView(opts: {
  user?: ReturnType<typeof buildAuthUser>;
} = {}): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Dashboard', component: { template: '<div />' } },
      { path: '/dokusya', name: 'DokusyaList', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'Dashboard' });
  await router.isReady();
  pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(DashboardView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser({ role_code: 'CHUOKAI', ja_id: 100 }) },
            codes: { all: buildCodesSeed() },
          },
        }),
        Antd,
      ],
      stubs: {
        // a-modal teleports to document.body; render title + default slot
        // inline (only when open) so the detail modal is findable from the
        // wrapper. No-op for tests that never open it.
        'a-modal': {
          props: ['open'],
          template:
            '<div v-if="open" class="ann-modal-stub"><slot name="title" /><slot /></div>',
        },
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getMenuOshirase } = await import('@/api/oshirase/oshirase');
  vi.mocked(getMenuOshirase).mockResolvedValue({
    data: { oshirase_list: [], deadline_notice: null },
  } as never);
  const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
  vi.mocked(getPendingApprovalCount).mockResolvedValue({
    data: { count: 0, ja_id: 100 },
  } as never);
});

function approvalButton(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('button')
    .find((b) => b.text().includes('Web申込読者承認'));
}

describe('DashboardView — 電子版読者承認 banner (SCR-010)', () => {
  it('should hide the banner and NOT call the count API when a NICHINO_ADMIN logs in', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ role_code: 'NICHINO_ADMIN', ja_id: null }),
    });
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    expect(vi.mocked(getPendingApprovalCount)).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('電子版読者承認');
    expect(approvalButton(wrapper)).toBeUndefined();
  });

  it('should hide the banner and NOT call the count API when a NICHINO_STAFF logs in', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ role_code: 'NICHINO_STAFF', ja_id: null }),
    });
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    expect(vi.mocked(getPendingApprovalCount)).not.toHaveBeenCalled();
    expect(approvalButton(wrapper)).toBeUndefined();
  });

  it('should disable the button and hide the 承認待ち badge when count is 0 for a CHUOKAI', async () => {
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    vi.mocked(getPendingApprovalCount).mockResolvedValue({
      data: { count: 0, ja_id: 100 },
    } as never);
    const { wrapper } = await renderView();
    expect(vi.mocked(getPendingApprovalCount)).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('電子版読者承認');
    expect(wrapper.text()).not.toContain('承認待ちの読者がいます');
    const btn = approvalButton(wrapper);
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  it('should show the 承認待ち badge and enable the button when count > 0', async () => {
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    vi.mocked(getPendingApprovalCount).mockResolvedValue({
      data: { count: 3, ja_id: 100 },
    } as never);
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('承認待ちの読者がいます');
    const btn = approvalButton(wrapper);
    expect(btn?.attributes('disabled')).toBeUndefined();
  });

  it('should navigate to DokusyaList with denshi_shonin_status=0 when the button is clicked with pending rows', async () => {
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    vi.mocked(getPendingApprovalCount).mockResolvedValue({
      data: { count: 3, ja_id: 100 },
    } as never);
    const { wrapper } = await renderView();
    await approvalButton(wrapper)!.trigger('click');
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaList');
    expect(pushed).toContain('denshi_shonin_status');
  });

  it('should treat the count as 0 (disabled button) when the count API rejects', async () => {
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    vi.mocked(getPendingApprovalCount).mockRejectedValue(new Error('500'));
    const { wrapper } = await renderView();
    const btn = approvalButton(wrapper);
    expect(btn?.attributes('disabled')).toBeDefined();
  });
});

describe('DashboardView — お知らせ詳細モーダル (SCR-010)', () => {
  const buildItem = (over: Record<string, unknown> = {}) => ({
    oshirase_id: 34,
    title: 'test',
    content: 'test\nhttps://www.agrinews.co.jp/',
    oshirase_type: 2, // 重要
    publish_start_date: '2026/06/04 16:17',
    publish_end_date: null,
    is_new: true,
    ja_id: null,
    ...over,
  });

  async function renderWith(over: Record<string, unknown> = {}) {
    const { getMenuOshirase } = await import('@/api/oshirase/oshirase');
    vi.mocked(getMenuOshirase).mockResolvedValue({
      data: { oshirase_list: [buildItem(over)], deadline_notice: null },
    } as never);
    return renderView();
  }

  // The detail modal opens by clicking the whole row (no 詳細 button anymore).
  async function openModal(over: Record<string, unknown> = {}) {
    const { wrapper } = await renderWith(over);
    await wrapper.find('[data-test="announcement-row"]').trigger('click');
    await flushPromises();
    return wrapper;
  }
  const modal = (wrapper: ReturnType<typeof mount>) =>
    wrapper.find('.ann-modal-stub');

  // ── List row (一覧画面で種別・NEW を表示、行クリックで詳細へ) ──────────
  it('should render the row as a real <button> (accessible row-level click)', async () => {
    const { wrapper } = await renderWith();
    const row = wrapper.find('[data-test="announcement-row"]');
    expect(row.exists()).toBe(true);
    expect(row.element.tagName).toBe('BUTTON');
  });

  it('should show the type badge (重要) and NEW on the list row itself', async () => {
    const { wrapper } = await renderWith({ is_new: true });
    const row = wrapper.find('[data-test="announcement-row"]');
    expect(row.text()).toContain('重要');
    expect(row.text()).toContain('NEW');
    expect(row.text()).toContain('2026/06/04');
    expect(row.text()).toContain('test');
  });

  it('should NOT show NEW on the list row when is_new is false', async () => {
    const { wrapper } = await renderWith({ is_new: false });
    expect(wrapper.find('[data-test="announcement-row"]').text()).not.toContain(
      'NEW',
    );
  });

  it('should open the detail modal when the row is clicked', async () => {
    const wrapper = await openModal();
    expect(modal(wrapper).exists()).toBe(true);
  });

  // ── Detail modal ────────────────────────────────────────────────────
  it('should show the type badge (重要) and the title in the modal header', async () => {
    const wrapper = await openModal();
    expect(modal(wrapper).text()).toContain('重要');
    expect(modal(wrapper).text()).toContain('test');
  });

  it('should show the NEW badge in the modal when is_new is true', async () => {
    const wrapper = await openModal({ is_new: true });
    expect(modal(wrapper).text()).toContain('NEW');
  });

  it('should NOT show 種別/対象JA/公開終了日時/お知らせID rows (customer comment)', async () => {
    const t = modal(await openModal()).text();
    expect(t).not.toContain('お知らせ種別');
    expect(t).not.toContain('種別コード');
    expect(t).not.toContain('対象JA');
    expect(t).not.toContain('公開終了日時');
    expect(t).not.toContain('お知らせID');
  });

  it('should show publish_start_date as YYYY/MM/DD HH:mm in the modal', async () => {
    const wrapper = await openModal();
    expect(modal(wrapper).text()).toContain('2026/06/04 16:17');
  });

  it('should render a URL in the body as a clickable link (target=_blank, noopener)', async () => {
    const wrapper = await openModal();
    const link = modal(wrapper).find('a[href="https://www.agrinews.co.jp/"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toContain('noopener');
  });

  it('should keep the body plain text intact alongside the link', async () => {
    const wrapper = await openModal({ content: 'before https://x.com/ after' });
    const box = modal(wrapper);
    expect(box.text()).toContain('before');
    expect(box.text()).toContain('after');
    expect(box.find('a[href="https://x.com/"]').exists()).toBe(true);
  });
});
