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
  hasActiveFilters: () => boolean;
  filtersChangedSinceApplied: () => boolean;
  isPristine: () => boolean;
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

// ───────────────────────────────────────────────────────────────────────
// hasActiveFilters — list views skip a redundant 検索 API call when every
// input is empty (the initial onMounted fetch already showed the default
// list). Blank = null/undefined, empty/whitespace string, empty array,
// or false (unchecked checkbox). Numbers are always meaningful.
// ───────────────────────────────────────────────────────────────────────
describe('useTableQuery — hasActiveFilters', () => {
  it('returns false when all filters are at their empty defaults', async () => {
    const { vm } = await mountHarness('/x');
    expect(vm.hasActiveFilters()).toBe(false);
  });

  it('returns false when a text filter holds only whitespace', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.filters.q = '   ';
    expect(vm.hasActiveFilters()).toBe(false);
  });

  it('returns true when a text filter holds a value', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.filters.q = '基本';
    expect(vm.hasActiveFilters()).toBe(true);
  });

  it('treats an unchecked checkbox (false) as blank but a checked one (true) as active', async () => {
    const { vm } = await mountHarness('/x');
    expect(vm.hasActiveFilters()).toBe(false); // active: false
    vm.state.filters.active = true;
    expect(vm.hasActiveFilters()).toBe(true);
  });

  // Regression: a select whose default is null but which clears to '' (or
  // the reverse) must NOT read as "changed" — otherwise the empty-form 検索
  // keeps calling the API after the user clears a search.
  it('treats null / undefined / "" / whitespace as the same empty value', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/x', name: 'X', component: { template: '<div/>' } }],
    });
    await router.push('/x');
    await router.isReady();
    const Harness = defineComponent({
      setup() {
        return useTableQuery<{ sel: number | string | null | undefined }>({
          defaultFilters: { sel: null },
        });
      },
      template: '<div></div>',
    });
    const vm = mount(Harness, { global: { plugins: [router] } })
      .vm as unknown as {
      state: { filters: { sel: number | string | null | undefined } };
      hasActiveFilters: () => boolean;
    };
    expect(vm.hasActiveFilters()).toBe(false); // default null
    vm.state.filters.sel = undefined;
    expect(vm.hasActiveFilters()).toBe(false);
    vm.state.filters.sel = '';
    expect(vm.hasActiveFilters()).toBe(false); // '' vs default null → still empty
    vm.state.filters.sel = '   ';
    expect(vm.hasActiveFilters()).toBe(false);
    vm.state.filters.sel = 3;
    expect(vm.hasActiveFilters()).toBe(true); // a real selection
  });
});

// ───────────────────────────────────────────────────────────────────────
// isPristine — drives onClear: 検索クリア skips its reset+fetch only when the
// screen is truly pristine (form at defaults AND the displayed list is the
// default set). Crucially it stays false when the user emptied the inputs by
// hand after a search, so 検索クリア can still restore the full list.
// ───────────────────────────────────────────────────────────────────────
describe('useTableQuery — isPristine', () => {
  it('is true on a fresh screen (form + applied filters at defaults)', async () => {
    const { vm } = await mountHarness('/x');
    expect(vm.isPristine()).toBe(true);
  });

  it('is false while the form holds an unsearched value', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.filters.q = 'abc';
    expect(vm.isPristine()).toBe(false);
  });

  it('is false after a search narrowed the displayed list', async () => {
    const { vm } = await mountHarness('/x');
    vm.applyFilters({ q: 'abc' });
    expect(vm.isPristine()).toBe(false);
  });

  it('stays false when the form was emptied by hand but the list is still filtered', async () => {
    const { vm } = await mountHarness('/x');
    vm.applyFilters({ q: 'abc' });   // displayed list now filtered
    vm.state.filters.q = '';          // user wipes the input WITHOUT clearing
    expect(vm.hasActiveFilters()).toBe(false); // form looks empty…
    expect(vm.isPristine()).toBe(false);       // …but 検索クリア must still fetch
  });

  it('is true again after resetFilters (検索クリア) restored the default list', async () => {
    const { vm } = await mountHarness('/x');
    vm.applyFilters({ q: 'abc' });
    vm.resetFilters();
    expect(vm.isPristine()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// filtersChangedSinceApplied — drives onSearch: 検索 fetches only when it
// would change what's on screen. The key flow: type abc → search → empty the
// input → the NEXT search must fire once (restore full list), then subsequent
// empty searches are no-ops.
// ───────────────────────────────────────────────────────────────────────
describe('useTableQuery — filtersChangedSinceApplied', () => {
  it('is false on a fresh screen (form == applied defaults)', async () => {
    const { vm } = await mountHarness('/x');
    expect(vm.filtersChangedSinceApplied()).toBe(false);
  });

  it('is true once the form is edited away from the applied filters', async () => {
    const { vm } = await mountHarness('/x');
    vm.state.filters.q = 'abc';
    expect(vm.filtersChangedSinceApplied()).toBe(true);
  });

  it('becomes false again after that search is applied', async () => {
    const { vm } = await mountHarness('/x');
    vm.applyFilters({ q: 'abc' });
    expect(vm.filtersChangedSinceApplied()).toBe(false); // re-pressing 検索 → no-op
  });

  it('fires once after the user empties the inputs, then is a no-op again', async () => {
    const { vm } = await mountHarness('/x');
    vm.applyFilters({ q: 'abc' });        // list now filtered, applied = abc
    vm.state.filters.q = '';               // user clears the input by hand
    expect(vm.filtersChangedSinceApplied()).toBe(true);  // 検索 must fetch (restore all)
    vm.applyFilters({ q: '' });            // that fetch applied the empty filter
    expect(vm.filtersChangedSinceApplied()).toBe(false); // further 検索 → no-op
  });
});
