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
 * Normalize a filter value for "did the user change it?" comparison so that
 * every "empty" representation collapses to the same thing: `null`,
 * `undefined`, `''` and whitespace-only strings ALL become `undefined`.
 *
 * This matters because the empty state of a control is not consistent across
 * the codebase — a cleared `<a-select>` may yield `undefined` OR `''`, while
 * the filter's default might be `null`. Without collapsing, a select whose
 * default is `null` but which clears to `''` would read as "changed" and the
 * empty-form 検索 would keep hitting the API. Other types pass through.
 */
function normalizeFilterValue(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim();
  return v;
}

/** Equality for two filter values after normalization (handles arrays). */
function filterValuesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeFilterValue(a);
  const nb = normalizeFilterValue(b);
  if (Array.isArray(na) && Array.isArray(nb)) {
    return na.length === nb.length && na.every((v, i) => v === nb[i]);
  }
  return na === nb;
}

/** Equality for two whole filter records (key-by-key, normalized). */
function filterRecordsEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!filterValuesEqual(a[k], b[k])) return false;
  }
  return true;
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

  // Snapshot of the filters that produced the currently-displayed list. The
  // initial onMounted fetch in every view runs with the defaults, so the
  // applied state starts at the defaults. Updated whenever the query actually
  // changes (applyFilters / resetFilters). Used by isPristine() so 検索クリア
  // can skip a redundant fetch when the screen is already showing the default
  // list, WITHOUT losing the ability to reset after the user manually emptied
  // the inputs (form blank but list still filtered).
  let appliedFilters: Record<string, unknown> = {
    ...(opts.defaultFilters as Record<string, unknown>),
  };

  function onChange(
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: {
      field?: string | string[];
      columnKey?: string;
      order?: 'ascend' | 'descend';
    },
  ): void {
    state.page = pagination.current ?? 1;
    state.per_page = pagination.pageSize ?? state.per_page;
    // [sorter-key-priority] When a column has dataIndex ≠ key (e.g.
    // SCR-008 account list 都道府県: dataIndex=todofuken_name for
    // display, key=todofuken_code for the BE sort whitelist), antd's
    // sorter callback emits BOTH `field` (= dataIndex) and `columnKey`
    // (= key). The BE whitelists the column NAME, so prefer columnKey.
    // Falling back to field keeps every existing screen working (where
    // dataIndex === key) and avoids forcing a `key:` declaration on
    // every column.
    const sortKey =
      sorter.columnKey ??
      (Array.isArray(sorter.field) ? sorter.field.join('.') : sorter.field);
    if (sortKey) {
      state.sort_by = sortKey;
      state.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    syncUrl();
  }

  function applyFilters(next: Partial<F>): void {
    Object.assign(state.filters as object, next);
    state.page = 1;
    appliedFilters = { ...(state.filters as Record<string, unknown>) };
    syncUrl();
  }

  /**
   * True when at least one filter differs from its default value — i.e. the
   * user has actually entered/changed a search criterion.
   *
   * List views call this in `onSearch` to skip a redundant API call when the
   * form is still at its defaults — the initial `onMounted` fetch already
   * shows that (unfiltered) result set, so re-querying would return the same
   * data. 検索クリア (`resetFilters` + fetch) remains the way to reset back to
   * the full list after a narrowed search.
   *
   * Comparing against the defaults (rather than just "is the value blank")
   * correctly handles sentinel defaults like `kinyu_shiten_flg: 'all'` or a
   * pre-selected radio — those count as "unchanged", not "active".
   */
  function hasActiveFilters(): boolean {
    const current = state.filters as Record<string, unknown>;
    const defaults = opts.defaultFilters as Record<string, unknown>;
    return Object.keys(defaults).some(
      (k) => !filterValuesEqual(current[k], defaults[k]),
    );
  }

  /**
   * True when the current form filters differ from the ones that produced the
   * currently-displayed list — i.e. pressing 検索 now would actually change
   * the result set.
   *
   * Views call this in `onSearch` so a 検索 press is a no-op ONLY when it would
   * return the exact rows already on screen. This still skips the fresh-screen
   * empty search (form == applied == defaults), AND it correctly fires the one
   * fetch needed to restore the full list after the user cleared a search by
   * emptying the inputs by hand (form back to defaults, but the displayed list
   * is still filtered). After that single fetch, further empty 検索 presses are
   * no-ops again. Compare to `hasActiveFilters` (vs defaults), which could not
   * tell "empty form, default list" from "empty form, still-filtered list".
   */
  function filtersChangedSinceApplied(): boolean {
    return !filterRecordsEqual(
      state.filters as Record<string, unknown>,
      appliedFilters,
    );
  }

  /**
   * True when 検索クリア would be a no-op: the form is already at its defaults
   * AND the currently-displayed list is already the default (unfiltered) set.
   *
   * Views call this in `onClear` to skip the redundant reset+fetch on a
   * pristine screen. It deliberately stays false when the form is blank but
   * the displayed list is still filtered (user emptied the inputs by hand
   * after a search) — there 検索クリア must still fetch to restore the full
   * list, and must still wipe any unsearched text left in the inputs.
   */
  function isPristine(): boolean {
    if (hasActiveFilters()) return false; // unsearched input in the form
    return filterRecordsEqual(
      appliedFilters,
      opts.defaultFilters as Record<string, unknown>,
    );
  }

  function resetFilters(): void {
    state.filters = { ...opts.defaultFilters } as UnwrapRef<F>;
    state.page = 1;
    state.sort_by = opts.defaultSortBy ?? 'created_at';
    state.sort_order = opts.defaultSortOrder ?? 'desc';
    appliedFilters = { ...(opts.defaultFilters as Record<string, unknown>) };
    syncUrl();
  }

  /**
   * Configuration for {@link searchActions} — the shared 検索 / 検索クリア
   * handler pair every list screen wires to `<BaseSearchForm @search @clear>`.
   */
  interface SearchActionsConfig {
    /** The view's list fetch. Run after applyFilters (検索) and after reset (クリア). */
    fetchList: () => void | Promise<void>;
    /**
     * Run at the start of 検索, BEFORE the changed-since-applied guard. Use to
     * trim text filters in place / validate. Return `false` to abort the search
     * (validation failed, a required-field guard, etc.).
     */
    beforeSearch?: () => boolean | void;
    /**
     * Run at the start of 検索クリア, ALWAYS (even on a pristine screen). Use to
     * clear local-only UI that the table-query state doesn't own — row
     * selection, a staged bulk-action form, dependent dropdown options.
     */
    beforeClear?: () => void;
    /**
     * Run AFTER resetFilters() on 検索クリア, only when an actual reset happens
     * (screen was not pristine). Use for local resets that only matter when the
     * filters really changed (e.g. clearing a cascaded dropdown's options).
     */
    afterReset?: () => void;
    /** Fetch used by 検索クリア — defaults to {@link SearchActionsConfig.fetchList}. */
    clearFetch?: () => void | Promise<void>;
  }

  /**
   * Build the canonical 検索 / 検索クリア handlers with the redundant-call
   * guards baked in, so every list screen behaves identically and pressing
   * either button repeatedly with no change does NOT re-hit the API:
   *
   * - `onSearch`: run `beforeSearch` (trim/validate; `false` aborts), then skip
   *   when the form matches the displayed list (`filtersChangedSinceApplied`),
   *   else `applyFilters` + `fetchList`.
   * - `onClear`: run `beforeClear` (always — clears local UI), then skip the
   *   reset+refetch when already pristine (`isPristine`), else `resetFilters`,
   *   `afterReset`, and fetch (via `clearFetch ?? fetchList`).
   *
   * Wire to the template: `<BaseSearchForm @search="onSearch" @clear="onClear">`.
   */
  function searchActions(cfg: SearchActionsConfig): {
    onSearch: () => void;
    onClear: () => void;
  } {
    function onSearch(): void {
      if (cfg.beforeSearch?.() === false) return;
      if (!filtersChangedSinceApplied()) return;
      applyFilters({ ...(state.filters as object) });
      void cfg.fetchList();
    }
    function onClear(): void {
      cfg.beforeClear?.();
      if (isPristine()) return;
      resetFilters();
      cfg.afterReset?.();
      void (cfg.clearFetch ?? cfg.fetchList)();
    }
    return { onSearch, onClear };
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

  return {
    state,
    loading,
    total,
    onChange,
    applyFilters,
    resetFilters,
    hasActiveFilters,
    filtersChangedSinceApplied,
    isPristine,
    searchActions,
    watch,
  };
}
