// Drives src/composables/useTableQuery.ts. Pagination + sort + filter
// state used by every list view. Lock the onChange/applyFilters/
// resetFilters semantics + URL-sync path so changes here are visible.

import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { defineComponent } from 'vue';
import { useTableQuery } from '@/composables/useTableQuery';

interface F {
  q: string;
  active: boolean;
}

// Harness type — vm auto-unwraps top-level refs so total/loading are
// plain primitives via the setup-binding accessor.
interface HarnessVm {
  state: { page: number; per_page: number; sort_by: string; sort_order: 'asc' | 'desc'; filters: F };
  total: number;
  loading: boolean;
  onChange: (...args: unknown[]) => void;
  applyFilters: (next: Partial<F>) => void;
  resetFilters: () => void;
}

async function mountHarness(initial: string, syncUrl = false) {
  const routes: RouteRecordRaw[] = [
    { path: '/x', name: 'X', component: { template: '<div/>' } },
  ];
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initial);
  await router.isReady();

  const Harness = defineComponent({
    setup() {
      return useTableQuery<F>({
        defaultFilters: { q: '', active: false },
        defaultSortBy: 'created_at',
        defaultSortOrder: 'desc',
        defaultPerPage: 20,
        syncUrl,
      });
    },
    template: '<div></div>',
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { router, vm: wrapper.vm as unknown as HarnessVm };
}

describe('useTableQuery — defaults', () => {
  it('seeds state with the provided defaults', async () => {
    const { vm } = await mountHarness('/x');
    expect(vm.state.page).toBe(1);
    expect(vm.state.per_page).toBe(20);
    expect(vm.state.sort_by).toBe('created_at');
    expect(vm.state.sort_order).toBe('desc');
    expect(vm.state.filters).toEqual({ q: '', active: false });
    expect(vm.total).toBe(0);
    expect(vm.loading).toBe(false);
  });
});

describe('useTableQuery — onChange', () => {
  it('updates page + per_page from antd pagination object', async () => {
    const { vm } = await mountHarness('/x');
    vm.onChange({ current: 3, pageSize: 50 }, {}, { field: undefined });
    expect(vm.state.page).toBe(3);
    expect(vm.state.per_page).toBe(50);
  });

  it('maps antd sorter `ascend` → "asc" and field → sort_by', async () => {
    const { vm } = await mountHarness('/x');
    vm.onChange({ current: 1, pageSize: 20 }, {}, { field: 'ja_code', order: 'ascend' });
    expect(vm.state.sort_by).toBe('ja_code');
    expect(vm.state.sort_order).toBe('asc');
  });

  it('maps antd sorter `descend` → "desc"', async () => {
    const { vm } = await mountHarness('/x');
    vm.onChange({ current: 1, pageSize: 20 }, {}, { field: 'ja_name', order: 'descend' });
    expect(vm.state.sort_order).toBe('desc');
    expect(vm.state.sort_by).toBe('ja_name');
  });

  it('prefers sorter.columnKey over field when column has dataIndex ≠ key', async () => {
    // [regression-sorter-key] SCR-008 account list 都道府県 column:
    //   { dataIndex: 'todofuken_name', key: 'todofuken_code', sorter: true }
    // BE whitelists `todofuken_code` only. Without columnKey priority,
    // sort_by would be 'todofuken_name' → BE 400 VALIDATION_ERROR.
    const { vm } = await mountHarness('/x');
    vm.onChange(
      { current: 1, pageSize: 20 },
      {},
      { field: 'todofuken_name', columnKey: 'todofuken_code', order: 'ascend' },
    );
    expect(vm.state.sort_by).toBe('todofuken_code');
    expect(vm.state.sort_order).toBe('asc');
  });

  it('joins array-form sorter.field (nested column) with dots when no columnKey present', async () => {
    // antd nested columns (rare in this project) emit field as a path
    // array. Guard so we don't accidentally call .toString on Array
    // and end up with "ja,ja_code".
    const { vm } = await mountHarness('/x');
    vm.onChange(
      { current: 1, pageSize: 20 },
      {},
      { field: ['ja', 'ja_code'] as unknown as string, order: 'descend' },
    );
    expect(vm.state.sort_by).toBe('ja.ja_code');
  });

  it('keeps current page/perPage when antd passes undefined', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.page = 5;
    vm.state.per_page = 50;
    vm.onChange({}, {}, {});
    expect(vm.state.page).toBe(1);  // current ?? 1 fallback
    expect(vm.state.per_page).toBe(50);  // pageSize ?? state.per_page fallback
  });
});

describe('useTableQuery — applyFilters / resetFilters', () => {
  it('applyFilters merges next into filters AND resets page to 1', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.page = 5;
    vm.applyFilters({ q: 'tokyo' });
    expect(vm.state.filters).toEqual({ q: 'tokyo', active: false });
    expect(vm.state.page).toBe(1);
  });

  it('resetFilters restores defaults + page + sort', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.filters.q = 'mutated';
    vm.state.page = 7;
    vm.state.sort_by = 'other_col';
    vm.state.sort_order = 'asc';
    vm.resetFilters();
    expect(vm.state.filters).toEqual({ q: '', active: false });
    expect(vm.state.page).toBe(1);
    expect(vm.state.sort_by).toBe('created_at');
    expect(vm.state.sort_order).toBe('desc');
  });
});

describe('useTableQuery — syncUrl', () => {
  it('initializes state from URL query params on mount', async () => {
    const { vm } = await mountHarness(
      '/x?page=4&per_page=50&sort_by=ja_code&sort_order=asc',
      true,
    );
    expect(vm.state.page).toBe(4);
    expect(vm.state.per_page).toBe(50);
    expect(vm.state.sort_by).toBe('ja_code');
    expect(vm.state.sort_order).toBe('asc');
  });

  it('writes state changes back to the URL via router.replace', async () => {
    const { router, vm } = await mountHarness('/x', true);
    vm.onChange({ current: 2, pageSize: 30 }, {}, { field: 'name', order: 'ascend' });
    await flushPromises();
    expect(router.currentRoute.value.query.page).toBe('2');
    expect(router.currentRoute.value.query.per_page).toBe('30');
    expect(router.currentRoute.value.query.sort_by).toBe('name');
    expect(router.currentRoute.value.query.sort_order).toBe('asc');
  });

  it('does NOT touch URL when syncUrl is false (default)', async () => {
    const { router, vm } = await mountHarness('/x', false);
    vm.onChange({ current: 2, pageSize: 30 }, {}, { field: 'name', order: 'ascend' });
    await flushPromises();
    expect(router.currentRoute.value.query.page).toBeUndefined();
  });

  it('ignores invalid sort_order values from URL', async () => {
    const { vm } = await mountHarness('/x?sort_order=invalid', true);
    expect(vm.state.sort_order).toBe('desc');  // falls back to default
  });
});
