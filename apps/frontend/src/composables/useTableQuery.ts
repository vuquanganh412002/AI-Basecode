import { reactive, ref, watch, type UnwrapRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TablePaginationConfig } from 'ant-design-vue';

export interface TableQueryState<F extends object> {
  page: number;
  per_page: number;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  filters: F;
}

export interface UseTableQueryOptions<F extends object> {
  defaultFilters: F;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  defaultPerPage?: number;
  /** If true, sync state to URL query so URL is shareable. */
  syncUrl?: boolean;
}

/**
 * Reusable table query state: pagination + sort + filter.
 *
 * Pairs with `BaseDataTable`. Pass the returned `state` to your API call,
 * wire `onChange` to the table, and `resetFilters` to the 検索クリア button.
 *
 * Example:
 * ```ts
 * const { state, onChange, applyFilters, resetFilters, total, loading, rows } =
 *   useTableQuery({
 *     defaultFilters: { tanka_type: undefined, tanka_name: '' },
 *     fetchFn: (s) => getTanka().tankaControllerList(s),
 *   });
 * ```
 */
export function useTableQuery<F extends object>(
  opts: UseTableQueryOptions<F>,
) {
  const router = useRouter();
  const route = useRoute();

  const state = reactive<TableQueryState<F>>({
    page: 1,
    per_page: opts.defaultPerPage ?? 20,
    sort_by: opts.defaultSortBy ?? 'created_at',
    sort_order: opts.defaultSortOrder ?? 'desc',
    filters: { ...opts.defaultFilters },
  });

  const loading = ref(false);
  const total = ref(0);

  function onChange(
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: { field?: string; order?: 'ascend' | 'descend' },
  ): void {
    state.page = pagination.current ?? 1;
    state.per_page = pagination.pageSize ?? state.per_page;
    if (sorter.field) {
      state.sort_by = sorter.field;
      state.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    syncUrl();
  }

  function applyFilters(next: Partial<F>): void {
    Object.assign(state.filters as object, next);
    state.page = 1;
    syncUrl();
  }

  function resetFilters(): void {
    state.filters = { ...opts.defaultFilters } as UnwrapRef<F>;
    state.page = 1;
    state.sort_by = opts.defaultSortBy ?? 'created_at';
    state.sort_order = opts.defaultSortOrder ?? 'desc';
    syncUrl();
  }

  function syncUrl(): void {
    if (!opts.syncUrl) return;
    router.replace({
      query: {
        ...route.query,
        page: String(state.page),
        per_page: String(state.per_page),
        sort_by: state.sort_by,
        sort_order: state.sort_order,
      },
    });
  }

  // Initialize page/sort from URL (one-shot on mount).
  if (opts.syncUrl) {
    const q = route.query;
    if (q.page) state.page = Number(q.page) || 1;
    if (q.per_page) state.per_page = Number(q.per_page) || state.per_page;
    if (typeof q.sort_by === 'string') state.sort_by = q.sort_by;
    if (q.sort_order === 'asc' || q.sort_order === 'desc') {
      state.sort_order = q.sort_order;
    }
  }

  return { state, loading, total, onChange, applyFilters, resetFilters, watch };
}
