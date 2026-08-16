// Drives src/composables/useNotFoundRedirect.ts — the shared "record not
// found on direct edit-URL access → bounce to Dashboard" behavior used by
// account/ja/kanri-shiten/shiten/tanka/hanbaiten/dokusya FormViews
// (顧客要件 2026-08).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { defineComponent } from 'vue';
import { message } from 'ant-design-vue';

import { useNotFoundRedirect } from '@/composables/useNotFoundRedirect';

interface HarnessVm {
  redirectToDashboard: (customMessage?: string) => Promise<void>;
}

const mountedWrappers: Array<VueWrapper<unknown>> = [];
afterEach(() => {
  while (mountedWrappers.length > 0) mountedWrappers.pop()?.unmount();
  vi.restoreAllMocks();
});

async function mountHarness(withDashboardRoute = true) {
  const routes: RouteRecordRaw[] = [
    { path: '/x', name: 'X', component: { template: '<div/>' } },
    ...(withDashboardRoute
      ? [{ path: '/dashboard', name: 'Dashboard', component: { template: '<div/>' } }]
      : []),
  ];
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/x');
  await router.isReady();

  const Harness = defineComponent({
    setup() {
      return useNotFoundRedirect();
    },
    template: '<div></div>',
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  mountedWrappers.push(wrapper);
  return { router, vm: wrapper.vm as unknown as HarnessVm };
}

describe('useNotFoundRedirect', () => {
  it('should navigate to the Dashboard route when redirectToDashboard is called', async () => {
    const { router, vm } = await mountHarness();
    await vm.redirectToDashboard();
    expect(router.currentRoute.value.name).toBe('Dashboard');
  });

  it('should NOT show any toast when called without a custom message (BE 一般メッセージは interceptor が既にトースト済み)', async () => {
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => ({}) as any);
    const { vm } = await mountHarness();
    await vm.redirectToDashboard();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should show the custom message via toast before navigating when provided (e.g. SCR-011 ACSMS-MSG-011-016)', async () => {
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => ({}) as any);
    const { router, vm } = await mountHarness();
    await vm.redirectToDashboard('購読者ID #123 が見つかりません。');
    expect(errorSpy).toHaveBeenCalledWith('購読者ID #123 が見つかりません。');
    expect(router.currentRoute.value.name).toBe('Dashboard');
  });

  it('should NOT throw when the router has no Dashboard route registered (test router fallback)', async () => {
    const { vm } = await mountHarness(false);
    await expect(vm.redirectToDashboard()).resolves.toBeUndefined();
  });
});
