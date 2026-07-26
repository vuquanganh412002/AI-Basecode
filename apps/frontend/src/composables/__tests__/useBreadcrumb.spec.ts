// Drives src/composables/useBreadcrumb.ts. Builds the AppHeader
// breadcrumb chain from route.matched meta.breadcrumb. Three input
// shapes (string / object / array) all need coverage.

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { defineComponent, h } from 'vue';
import {
  pageTitleFromMatched,
  useBreadcrumb,
  type BreadcrumbItem,
} from '@/composables/useBreadcrumb';

const Probe = defineComponent({
  setup() {
    const { items } = useBreadcrumb();
    return () => h('div', { 'data-items': JSON.stringify(items.value) });
  },
});

async function mountAt(routes: RouteRecordRaw[], path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const w = mount(Probe, { global: { plugins: [router] } });
  return JSON.parse(w.find('[data-items]').attributes('data-items')!) as BreadcrumbItem[];
}

describe('useBreadcrumb', () => {
  it('always starts with ホーム linked to /', async () => {
    const items = await mountAt(
      [{ path: '/', name: 'H', component: { template: '<div/>' } }],
      '/',
    );
    expect(items[0]).toEqual({ label: 'ホーム', to: '/' });
  });

  it('appends a string `meta.breadcrumb` linked to the segment path', async () => {
    const items = await mountAt(
      [
        {
          path: '/ja',
          name: 'JaList',
          meta: { breadcrumb: 'JAマスタ一覧' },
          component: { template: '<div/>' },
        },
      ],
      '/ja',
    );
    expect(items).toEqual([
      { label: 'ホーム', to: '/' },
      { label: 'JAマスタ一覧', to: '/ja' },
    ]);
  });

  it('appends an array `meta.breadcrumb` verbatim (3-level shape for create/edit)', async () => {
    const items = await mountAt(
      [
        {
          path: '/ja/create',
          name: 'JaCreate',
          meta: {
            breadcrumb: [
              { label: 'JAマスタ一覧', to: '/ja' },
              { label: 'JAマスタ登録画面' },
            ],
          },
          component: { template: '<div/>' },
        },
      ],
      '/ja/create',
    );
    expect(items).toEqual([
      { label: 'ホーム', to: '/' },
      { label: 'JAマスタ一覧', to: '/ja' },
      { label: 'JAマスタ登録画面' },
    ]);
  });

  it('appends a single BreadcrumbItem object `meta.breadcrumb` verbatim', async () => {
    const items = await mountAt(
      [
        {
          path: '/x',
          name: 'X',
          meta: { breadcrumb: { label: 'カスタム', to: '/x' } },
          component: { template: '<div/>' },
        },
      ],
      '/x',
    );
    expect(items.at(-1)).toEqual({ label: 'カスタム', to: '/x' });
  });

  it('skips matched routes without `meta.breadcrumb`', async () => {
    const items = await mountAt(
      [
        {
          path: '/parent',
          name: 'P',
          component: { template: '<div/>' },
          children: [
            {
              path: 'child',
              name: 'C',
              meta: { breadcrumb: 'Child' },
              component: { template: '<div/>' },
            },
          ],
        },
      ],
      '/parent/child',
    );
    // Parent has no breadcrumb → only ホーム + Child are emitted.
    expect(items.map((i) => i.label)).toEqual(['ホーム', 'Child']);
  });
});

describe('pageTitleFromMatched (document.title source)', () => {
  async function matchedAt(routes: RouteRecordRaw[], path: string) {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push(path);
    await router.isReady();
    return router.currentRoute.value.matched;
  }

  it('returns the leaf label for a string breadcrumb (list page)', async () => {
    const m = await matchedAt(
      [
        {
          path: '/haitatsuryo',
          name: 'HaitatsuryoExport',
          meta: { breadcrumb: '配達手数料支払情報出力' },
          component: { template: '<div/>' },
        },
      ],
      '/haitatsuryo',
    );
    expect(pageTitleFromMatched(m)).toBe('配達手数料支払情報出力');
  });

  it('returns the last array item label (create/edit page)', async () => {
    const m = await matchedAt(
      [
        {
          path: '/ja/create',
          name: 'JaCreate',
          meta: {
            breadcrumb: [
              { label: 'JAマスタ一覧', to: '/ja' },
              { label: 'JAマスタ登録画面' },
            ],
          },
          component: { template: '<div/>' },
        },
      ],
      '/ja/create',
    );
    expect(pageTitleFromMatched(m)).toBe('JAマスタ登録画面');
  });

  it('returns null when the route resolves to only ホーム (no breadcrumb)', async () => {
    const m = await matchedAt(
      [{ path: '/', name: 'H', component: { template: '<div/>' } }],
      '/',
    );
    expect(pageTitleFromMatched(m)).toBeNull();
  });
});
