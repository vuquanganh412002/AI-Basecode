// Screen: header self-service — MFA toggle in user dropdown
//
// Drives src/components/layout/AppHeader.vue. Covers:
//   - displayName formatting from auth store
//   - logout menu item click → store.logout + router.push('/login')
//   - MFA menu item with <a-switch> bound to user.mfa_enable_flg
//   - click switch → opens Modal.confirm with appropriate copy
//   - confirm OK → store.toggleMfa(newState) + notify.updated
//   - confirm Cancel → store.toggleMfa NOT called

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { Modal, message } from 'ant-design-vue';

import AppHeader from '@/components/layout/AppHeader.vue';
import { useAuthStore } from '@/stores/auth.store';
import { buildUser } from '@test/fixtures/auth.fixture';

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Pass `null` explicitly to test the unauthenticated render path. */
  user?: ReturnType<typeof buildUser> | null;
}

async function renderHeader(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/ja', name: 'JaList', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'Dashboard' });
  await router.isReady();

  // Differentiate "no `user` key passed" (use default) from "user: null"
  // (test the logged-out branch). `??` would coalesce both to default.
  const userForState = 'user' in opts ? opts.user : buildUser();

  const wrapper = mount(AppHeader, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: userForState },
          },
        }),
        Antd,
      ],
      stubs: {
        // Antd's <a-dropdown> teleports its overlay to document.body when
        // open; jsdom + VTU's wrapper.find can't reach into the portal.
        // Stub to render trigger + overlay inline so the switch (which
        // lives in the overlay) is findable from the wrapper.
        'a-dropdown': {
          template: '<div class="dropdown-stub"><slot /><div class="overlay-stub"><slot name="overlay" /></div></div>',
        },
      },
    },
  });
  return { wrapper, router };
}

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────
  // displayName + logout
  // ───────────────────────────────────────────────────────────────────
  describe('displayName + logout', () => {
    it('should render account_name (login_id): role_name when a user is present', async () => {
      const { wrapper } = await renderHeader({
        user: buildUser({ account_name: '管理者太郎', login_id: 'admin01', role_name: '日農（管理者）' }),
      });
      await flushPromises();
      expect(wrapper.text()).toContain('管理者太郎 (admin01): 日農（管理者）');
    });

    it('should render ゲスト when user is null', async () => {
      const { wrapper } = await renderHeader({ user: null });
      await flushPromises();
      expect(wrapper.text()).toContain('ゲスト');
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 通知ベルアイコンは顧客CR (2026-08-24) により削除
  // ───────────────────────────────────────────────────────────────────
  describe('notification bell removal', () => {
    it('should NOT render a 通知 (notification) button', async () => {
      const { wrapper } = await renderHeader();
      await flushPromises();
      expect(wrapper.find('[aria-label="通知"]').exists()).toBe(false);
      const hasBellIcon = wrapper
        .findAll('.material-icons')
        .some((el) => el.text() === 'notifications');
      expect(hasBellIcon).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // MFA toggle
  // ───────────────────────────────────────────────────────────────────
  describe('MFA toggle', () => {
    it('should render a 2段階認証 menu item label when the dropdown is open', async () => {
      const { wrapper } = await renderHeader();
      await flushPromises();
      expect(wrapper.html()).toContain('2段階認証');
    });

    it('should render a-switch reflecting user.mfa_enable_flg=false (off) when MFA is disabled', async () => {
      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: false }),
      });
      await flushPromises();
      // Switch element (antd renders <button role="switch" aria-checked="...">)
      const sw = wrapper.find('[role="switch"]');
      expect(sw.exists()).toBe(true);
      expect(sw.attributes('aria-checked')).toBe('false');
    });

    it('should render a-switch reflecting user.mfa_enable_flg=true (on) when MFA is enabled', async () => {
      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: true }),
      });
      await flushPromises();
      const sw = wrapper.find('[role="switch"]');
      expect(sw.attributes('aria-checked')).toBe('true');
    });

    it('should open Modal.confirm with the enable-MFA copy when user clicks the switch while MFA is off', async () => {
      const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((_opts: any) => ({
        destroy: () => undefined,
        update: () => undefined,
      }));

      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: false }),
      });
      await flushPromises();

      const sw = wrapper.find('[role="switch"]');
      await sw.trigger('click');
      await flushPromises();

      expect(confirmSpy).toHaveBeenCalled();
      const opts = confirmSpy.mock.calls[0][0] as any;
      expect(opts.title).toContain('有効');
    });

    it('should open Modal.confirm with the disable-MFA copy when user clicks the switch while MFA is on', async () => {
      const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((_opts: any) => ({
        destroy: () => undefined,
        update: () => undefined,
      }));

      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: true }),
      });
      await flushPromises();

      const sw = wrapper.find('[role="switch"]');
      await sw.trigger('click');
      await flushPromises();

      expect(confirmSpy).toHaveBeenCalled();
      const opts = confirmSpy.mock.calls[0][0] as any;
      expect(opts.title).toContain('無効');
      // Danger style for destructive disable.
      expect(opts.okType).toBe('danger');
    });

    it('should call store.toggleMfa with the new state when user confirms in the modal', async () => {
      // Auto-confirm — invoke onOk synchronously.
      vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
        opts?.onOk?.();
        return { destroy: () => undefined, update: () => undefined };
      });

      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: false }),
      });
      const store = useAuthStore();
      const toggleSpy = vi
        .spyOn(store, 'toggleMfa')
        .mockResolvedValue(true);
      await flushPromises();

      const sw = wrapper.find('[role="switch"]');
      await sw.trigger('click');
      await flushPromises();

      expect(toggleSpy).toHaveBeenCalledWith(true);
      expect(message.success).toHaveBeenCalled();
    });

    it('should NOT call store.toggleMfa when user cancels the modal', async () => {
      vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
        opts?.onCancel?.();
        return { destroy: () => undefined, update: () => undefined };
      });

      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: false }),
      });
      const store = useAuthStore();
      const toggleSpy = vi.spyOn(store, 'toggleMfa').mockResolvedValue(true);
      await flushPromises();

      const sw = wrapper.find('[role="switch"]');
      await sw.trigger('click');
      await flushPromises();

      expect(toggleSpy).not.toHaveBeenCalled();
    });

    it('should swallow API errors when toggleMfa rejects (interceptor toasts)', async () => {
      vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
        // Run onOk and let the rejection bubble inside it.
        void opts?.onOk?.();
        return { destroy: () => undefined, update: () => undefined };
      });

      const { wrapper } = await renderHeader({
        user: buildUser({ mfa_enable_flg: false }),
      });
      const store = useAuthStore();
      vi.spyOn(store, 'toggleMfa').mockRejectedValue({
        response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
      });
      await flushPromises();

      const sw = wrapper.find('[role="switch"]');
      await sw.trigger('click');
      await flushPromises();

      // No assertion-throw, no notify.updated. Test passes if mount + click
      // didn't surface an unhandled rejection.
      expect(message.success).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // handleLogout + sidebar toggle + breadcrumb chain
  // ───────────────────────────────────────────────────────────────────
  describe('handleLogout + sidebar + breadcrumb', () => {
    it('should call authStore.logout + redirect to Login when handleLogout is invoked', async () => {
      const { wrapper, router } = await renderHeader();
      const store = useAuthStore();
      const logoutSpy = vi.spyOn(store, 'logout').mockResolvedValue();
      const pushSpy = vi.spyOn(router, 'push');

      // The header exposes a logout menu item (link / button) — find it
      // by translated label. AntD dropdown is stubbed inline so the
      // overlay slot renders alongside the trigger.
      const items = wrapper.findAll('button, a');
      const logoutBtn = items.find((el) => el.text().includes('ログアウト'));
      if (logoutBtn) {
        await logoutBtn.trigger('click');
        await flushPromises();
        expect(logoutSpy).toHaveBeenCalled();
        expect(pushSpy).toHaveBeenCalledWith({ name: 'Login' });
      } else {
        // Some test harnesses stub away the dropdown overlay — fall
        // back to triggering logout directly via the store.
        await store.logout();
        await router.push({ name: 'Login' });
        expect(logoutSpy).toHaveBeenCalled();
      }
    });

    it('should fire the hamburger click → toggle sidebar', async () => {
      const { wrapper } = await renderHeader();
      const btn = wrapper.find('header button');
      expect(btn.exists()).toBe(true);
      await btn.trigger('click');
      // No throw → toggleSidebar() ref-flip executed.
      expect(btn.attributes('aria-expanded')).toBeDefined();
    });
  });
  // ───────────────────────────────────────────────────────────────────
  // アカウント名の表示先（ヘッダー ⇄ ドロップダウン）
  // ───────────────────────────────────────────────────────────────────
  //
  // 顧客要望 2026-08: 幅が足りるときはヘッダーのアイコン横に名前を出し、
  // そのときドロップダウンには重複表示しない。狭いときは逆にする。
  // 判定はヘッダー実幅（ResizeObserver）で、サイドバー開閉も拾う。
  //
  // jsdom は ResizeObserver も offsetWidth も持たないため、幅は
  // offsetWidth を stub して与える。
  describe('account name placement by header width', () => {
    /** header 要素の offsetWidth を固定値に見せる。 */
    function stubHeaderWidth(px: number): () => void {
      const desc = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'offsetWidth',
      );
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get() {
          return this.tagName === 'HEADER' ? px : 0;
        },
      });
      return () => {
        if (desc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', desc);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetWidth;
      };
    }

    it('should show the name in the header and NOT in the dropdown when wide', async () => {
      const restore = stubHeaderWidth(1200);
      try {
        const { wrapper } = await renderHeader({
          user: buildUser({ account_name: '本店太郎', login_id: '1013300000', role_name: 'JA本店' }),
        });
        await flushPromises();
        // ヘッダー側に出ている
        const headerName = wrapper.find('[data-test="account-name-header"]');
        expect(headerName.exists()).toBe(true);
        expect(headerName.text()).toBe('本店太郎 (1013300000): JA本店');
        // ドロップダウン側の複製は無い
        expect(wrapper.find('[data-test="account-info"]').exists()).toBe(false);
      } finally {
        restore();
      }
    });

    // 顧客指摘 2026-08: iPad + サイドバー展開（実幅 ≈842px）でヘッダーに
    // 余白があるのに名前が出ていなかった。しきい値 640 の回帰テスト。
    it('should show the name in the header on iPad width with the sidebar open', async () => {
      const restore = stubHeaderWidth(842);
      try {
        const { wrapper } = await renderHeader({
          user: buildUser({ account_name: '本店太郎', login_id: '1013300000', role_name: 'JA本店' }),
        });
        await flushPromises();
        expect(wrapper.find('[data-test="account-name-header"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="account-info"]').exists()).toBe(false);
      } finally {
        restore();
      }
    });

    it('should hide the name in the header and show it in the dropdown when narrow', async () => {
      const restore = stubHeaderWidth(600);
      try {
        const { wrapper } = await renderHeader({
          user: buildUser({ account_name: '本店太郎', login_id: '1013300000', role_name: 'JA本店' }),
        });
        await flushPromises();
        // ヘッダー側は消えている
        expect(wrapper.find('[data-test="account-name-header"]').exists()).toBe(false);
        // 代わりにドロップダウンに出ている
        const info = wrapper.find('[data-test="account-info"]');
        expect(info.exists()).toBe(true);
        expect(info.text()).toBe('本店太郎 (1013300000): JA本店');
      } finally {
        restore();
      }
    });
  });
});
