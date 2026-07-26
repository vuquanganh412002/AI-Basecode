/**
 * Shared state machine for the server-side-paginated + searchable
 * "entity dropdown" pattern used by {@link BaseJaDropdown},
 * {@link BaseAccountDropdown}, and {@link BaseTankaDropdown}.
 *
 * Behavior (identical across all three call sites — extracted here so
 * any fix lands in one place):
 *
 *   - Initial load of `perPage` (default 50) items (page 1) onMounted.
 *   - Search debounced 300 ms — typing `q` resets to page 1.
 *   - Infinite scroll — popup-scroll near the bottom (80 px threshold)
 *     loads page +1 and appends. Stops when `meta.has_more` is false.
 *   - Edit-mode pre-selection — if `selected.value` is set on mount and
 *     the chosen id is not in page 1, the BE prepends it via
 *     `include_id` so the label renders correctly without a second
 *     round-trip.
 *   - Stale-response guard via a monotonic `requestSeq`: typing "a" →
 *     "ab" issues two requests; if the network reorders them the
 *     earlier ("a") response is dropped so it can't clobber the newer
 *     ("ab") cache.
 *   - Debounce cancelled on unmount — pending search after teardown
 *     becomes a no-op, avoiding Vitest "unhandled rejection" noise.
 *   - On reopen, refetch only if the cached options reflect a stale
 *     query (`lastFetchedQ` !== current `q`). Skips the round-trip
 *     when the user just opens / closes / reopens without typing.
 *   - On @change, internal `q` is reset to `''` (antd auto-clears the
 *     visible search input but does NOT fire @search) — refresh of the
 *     option list is deferred to the next dropdown open so users who
 *     just pick + move on don't pay for an unused request.
 *
 * Variations between call sites live in `UseEntityDropdownOpts`:
 *   - `fetcher` — the API call.
 *   - `idField` — which key on the row is the primary identifier.
 *   - `buildExtraParams` — module-specific query params
 *     (todofuken_code, tanka_type, ja_id, match_field, …).
 *   - `resetTriggers` — refs that, when changed, reset the option list
 *     to page 1 (e.g. todofukenCode for JA, jaId for tanka).
 *   - `onResetTrigger` — optional callback fired when a reset trigger
 *     changes. Tanka uses this to clear the parent's `value` (a
 *     tanka_id picked under JA A wouldn't survive the BE scope filter
 *     under JA B).
 *   - `onSelect` — optional callback fired alongside change with the
 *     resolved row object from the cached page (or null on clear).
 *     File-upload's "対象JA" multi-select chip list uses this so it
 *     can grab ja_code without a follow-up GET.
 */
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref,
} from 'vue';

import { DROPDOWN_MAX_PAGE_SIZE } from '@/constants/pagination';

export interface EntityDropdownMeta {
  total?: number;
  page?: number;
  per_page?: number;
  has_more: boolean;
}

export interface EntityDropdownResult<TItem> {
  data: TItem[];
  meta: EntityDropdownMeta;
}

export interface UseEntityDropdownOpts<
  TItem extends object,
  TQuery extends object,
> {
  /** API call. Receives the composed query params; returns `{ data, meta }`. */
  fetcher: (params: TQuery) => Promise<EntityDropdownResult<TItem>>;
  /** Primary-key field name on the row (e.g. `'ja_id'`, `'account_id'`, `'tanka_id'`). */
  idField: keyof TItem;
  /**
   * Current v-model selection (ref to `props.value`). `null` /
   * `undefined` both mean "nothing selected" so callers can pass
   * either filter state (`number | null`) or form state
   * (`number | undefined`) without a ?? bridge.
   */
  selected: Ref<number | null | undefined>;
  /**
   * Page size. Default 50. Pass a ref so a prop change live-updates
   * the next fetch (rare — kept for parity with the original code).
   */
  perPage: Ref<number>;
  /**
   * Build module-specific params (todofuken_code, tanka_type, ja_id,
   * match_field, …). Called on every fetch — must read reactive refs
   * directly so the latest values are picked up.
   */
  buildExtraParams?: () => Partial<TQuery>;
  /**
   * Refs that, when changed, reset the dropdown to page 1. Composable
   * wires the watcher; component just lists which refs to watch.
   *
   * Two reset modes are supported (preserves the difference between
   * the JA + tanka cascades):
   *
   *   - `'soft'` (default — used by BaseJaDropdown.todofukenCode):
   *     just resets `page` + `hasMore` and refetches. The existing
   *     `options` list stays visible until the new fetch resolves
   *     (no flash of empty); `q` is preserved across the trigger
   *     change; parent's selection is NOT cleared. The narrowed
   *     fetch's results overwrite `options` on success.
   *
   *   - `'hard'` (used by BaseTankaDropdown.jaId): clears `options`
   *     immediately, resets `q`, drops `lastFetchedQ`, then refetches.
   *     If `clearValueOnReset` is also true, the parent's selection
   *     is emitted as `null` before the refetch — a tanka_id picked
   *     under JA A wouldn't survive the BE scope filter under JA B.
   */
  resetTriggers?: Array<Ref<unknown>>;
  /** See `resetTriggers`. Default `'soft'`. */
  resetMode?: 'soft' | 'hard';
  /**
   * If true, when a reset trigger fires AND the current selection is
   * non-null, the composable calls `onResetTrigger` (which should
   * emit `update:value` = null) BEFORE refetching. Used by the tanka
   * jaId cascade to clear the parent's form-state.
   */
  clearValueOnReset?: boolean;
  /**
   * Fired when ANY ref in `resetTriggers` changes — typically used to
   * emit `update:value` = null when `clearValueOnReset` is true.
   * Only invoked when the current selection is non-null.
   */
  onResetTrigger?: () => void;
  /**
   * Fired on `@change` alongside the value emit, with the row object
   * resolved from the cached page (or `null` on clear). Lets callers
   * grab full row metadata (ja_code, todofuken_code, …) without a
   * follow-up GET.
   */
  onSelect?: (value: number | null, item: TItem | null) => void;
}

// 300 ms — collapses fast typing into one request while staying
// responsive (~human-noticed delay threshold). Matches GitHub /
// Material UI Autocomplete defaults.
const SEARCH_DEBOUNCE_MS = 300;

// Trigger ~80 px before the bottom so the next batch is rendered
// before the user hits the empty space.
const SCROLL_THRESHOLD_PX = 80;

export function useEntityDropdown<
  TItem extends object,
  TQuery extends object,
>(opts: UseEntityDropdownOpts<TItem, TQuery>) {
  const options = ref<TItem[]>([]) as Ref<TItem[]>;
  const loading = ref(false);
  const page = ref(1);
  const hasMore = ref(true);
  const q = ref('');

  /**
   * Last query the cached `options` reflect. `null` until the first
   * fetch resolves. Used to (a) skip duplicate requests when the
   * debounced query equals what's already loaded, and (b) decide on
   * dropdown re-open whether the option list is stale and needs a
   * refresh.
   */
  const lastFetchedQ = ref<string | null>(null);

  /**
   * Monotonic request counter. Every `fetchPage` invocation captures
   * the current value; when the response resolves we ignore it if the
   * counter has advanced (= a newer request was issued meanwhile).
   *
   * Protects against the classic stale-response race: typing "a" then
   * quickly "ab" issues two requests, and if the network reorders
   * them the first ("a") response would otherwise clobber the second
   * ("ab") and leave the user looking at wrong results.
   */
  let requestSeq = 0;
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  function buildParams(reset: boolean): { nextPage: number; params: TQuery } {
    const nextPage = reset ? 1 : page.value + 1;
    const base: Record<string, unknown> = {
      page: nextPage,
      per_page: opts.perPage.value,
    };
    if (q.value) base.q = q.value;
    // include_id only matters on the first hydration when the parent
    // arrives with a pre-selected id. After that the user controls
    // navigation via search / scroll. `!= null` catches both undefined
    // and null since `selected` can be either.
    if (reset && nextPage === 1 && opts.selected.value != null && !q.value) {
      base.include_id = opts.selected.value;
    }
    const extra = opts.buildExtraParams?.() ?? {};
    return { nextPage, params: { ...base, ...extra } as TQuery };
  }

  function mergePage(reset: boolean, rows: TItem[]): void {
    if (reset) {
      options.value = rows;
      return;
    }
    const idField = opts.idField;
    const seen = new Set(options.value.map((o) => o[idField]));
    for (const item of rows) {
      if (!seen.has(item[idField])) options.value.push(item);
    }
  }

  async function fetchPage(p: { reset: boolean }): Promise<void> {
    // Reset always wins — even if a page-N append is in flight, the
    // newer search/reset must supersede it. Scroll-append bails out
    // when a reset is happening or another append is already loading.
    if (!p.reset && loading.value) return;
    if (!p.reset && !hasMore.value) return;

    const mySeq = ++requestSeq;
    loading.value = true;
    try {
      const { nextPage, params } = buildParams(p.reset);
      const res = await opts.fetcher(params);

      // Stale-response guard: a newer request was issued meanwhile →
      // drop the response entirely so it can't clobber fresher data.
      if (mySeq !== requestSeq) return;

      page.value = nextPage;
      hasMore.value = res.meta.has_more;
      mergePage(p.reset, res.data);
      if (p.reset) lastFetchedQ.value = q.value;
    } finally {
      // Only the latest request flips loading off — a stale finisher
      // must not clear the spinner the newer request is still showing.
      if (mySeq === requestSeq) loading.value = false;
    }
  }

  function onSearch(input: string): void {
    // Trim so paste artifacts / IME-confirmed spaces don't alter the
    // ILIKE pattern (BE wraps with `%…%`, but `%  東京  %` won't match
    // rows whose name has no surrounding spaces).
    const trimmed = input.trim();
    q.value = trimmed;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchDebounce = null;
      // Skip the network round-trip when the debounced query equals
      // what's already loaded — common after typing then deleting back
      // to the same prefix, or antd echoing the same value twice.
      if (trimmed === lastFetchedQ.value) return;
      void fetchPage({ reset: true });
    }, SEARCH_DEBOUNCE_MS);
  }

  function onPopupScroll(e: Event): void {
    const el = e.target as HTMLElement;
    if (
      el.scrollTop + el.clientHeight + SCROLL_THRESHOLD_PX >=
      el.scrollHeight
    ) {
      void fetchPage({ reset: false });
    }
  }

  // Default param `= null` does the antd-undefined → null normalisation
  // in the signature itself (Sonar S7760 — prefer default parameter over
  // a `?? null` reassignment inside the body). JS substitutes the default
  // when the caller passes `undefined`, which is exactly what antd's
  // `@change` event does on X-clear.
  function onChange(v: number | null = null): number | null {
    // Antd auto-clears the visible search input on select / X-clear,
    // but does NOT fire `@search` — sync our internal `q` so the next
    // dropdown open's stale-check sees a clean query. We DON'T refetch
    // here: the refresh is deferred to `onDropdownVisibleChange` below
    // so users who just pick + move on don't pay for an unused request.
    q.value = '';
    // Resolve the picked option from the cached page so callers that
    // need extra row fields (chip lists, audit log payloads) can grab
    // them without a follow-up GET. Null on X-clear.
    const picked =
      v == null
        ? null
        : options.value.find((o) => o[opts.idField] === v) ?? null;
    opts.onSelect?.(v, picked);
    return v;
  }

  function onDropdownVisibleChange(visible: boolean): void {
    // On open: if the cached options reflect a previous search query
    // that no longer matches `q.value` (= user typed before, then
    // selected / cleared / closed without retyping), reload page 1.
    // `lastFetchedQ === null` only on first mount before initial load
    // completes — skip then, the onMounted fetch handles it.
    if (!visible) return;
    if (lastFetchedQ.value === null) return;
    if (lastFetchedQ.value === q.value) return;
    void fetchPage({ reset: true });
  }

  onMounted(() => {
    void fetchPage({ reset: true });
  });

  // Cancel any pending debounce when the component unmounts. The
  // fetchPage callback is then a no-op even if the timer hadn't fired
  // yet — avoids spurious requests + Vitest "unhandled rejection"
  // noise when a spec tears down mid-debounce. In-flight requests are
  // naturally orphaned (requestSeq bump on the next mount won't match
  // the old promise) so the stale-guard inside fetchPage drops them.
  onBeforeUnmount(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
  });

  // If the parent swaps `selected` to an id we have not loaded yet
  // (e.g. programmatic edit-form hydration after mount), refetch with
  // include_id so the label resolves.
  watch(
    () => opts.selected.value,
    (newVal) => {
      // `== null` catches both undefined and null — "no selection" in
      // either representation means nothing to fetch.
      if (newVal == null) return;
      if (options.value.some((o) => o[opts.idField] === newVal)) return;
      void fetchPage({ reset: true });
    },
  );

  // Cascade reset for module-specific narrowing refs (todofukenCode
  // for JA — soft; jaId for tanka — hard). Bumps requestSeq
  // implicitly via fetchPage so any in-flight unfiltered response
  // gets dropped by the stale-guard.
  if (opts.resetTriggers && opts.resetTriggers.length > 0) {
    const mode = opts.resetMode ?? 'soft';
    watch(
      // Spread the triggers into a tuple so each ref is tracked
      // individually. Returning the array of values lets Vue diff
      // them element-wise and call us back on any change.
      opts.resetTriggers.map((r) => () => r.value),
      (next, prev) => {
        // Cheap shallow-equal guard: watcher is sometimes called
        // with identical values on parent re-render with the same
        // prop. Bail out so we don't issue a no-op refetch.
        if (
          Array.isArray(next) &&
          Array.isArray(prev) &&
          next.length === prev.length &&
          next.every((v, i) => v === prev[i])
        ) {
          return;
        }
        if (mode === 'hard') {
          // Hard reset (tanka cascade): clear options + q + memo so
          // the new tenant's data doesn't blend with the previous.
          options.value = [];
          page.value = 1;
          hasMore.value = true;
          q.value = '';
          lastFetchedQ.value = null;
          if (opts.clearValueOnReset && opts.selected.value != null) {
            opts.onResetTrigger?.();
          }
        } else {
          // Soft reset (JA todofukenCode cascade): keep current
          // options visible until the new fetch resolves, preserve
          // `q` so the user's search persists across the narrowing
          // change, don't touch parent selection.
          page.value = 1;
          hasMore.value = true;
        }
        void fetchPage({ reset: true });
      },
    );
  }

  // 全件取得（「全て選択」用）。検索(q)を無視し、per_page 上限(=100・BE DTO @Max(100))
  // で全ページを走査して全 ID を返す。取得行は options へマージ（タグのラベル表示のため）。
  // buildExtraParams のスコープ（ja_id 等）はそのまま効くので権限スコープ内の全件。
  // 安全のため最大ページ数で打ち切る。
  const LOAD_ALL_PER_PAGE = DROPDOWN_MAX_PAGE_SIZE; // BE dropdown DTO の per_page 上限に合わせる
  const LOAD_ALL_MAX_PAGES = 200; // 最大 20,000 件で打ち切り
  async function loadAll(): Promise<number[]> {
    const mySeq = ++requestSeq;
    loading.value = true;
    try {
      const acc: TItem[] = [];
      let p = 1;
      let more = true;
      while (more && p <= LOAD_ALL_MAX_PAGES) {
        const base: Record<string, unknown> = {
          page: p,
          per_page: LOAD_ALL_PER_PAGE,
        };
        const extra = opts.buildExtraParams?.() ?? {};
        const res = await opts.fetcher({ ...base, ...extra } as TQuery);
        if (mySeq !== requestSeq) return []; // superseded by a newer request
        acc.push(...res.data);
        more = res.meta.has_more;
        p += 1;
      }
      const idField = opts.idField;
      const seen = new Set(options.value.map((o) => o[idField]));
      const ids: number[] = [];
      for (const item of acc) {
        if (!seen.has(item[idField])) {
          options.value.push(item);
          seen.add(item[idField]);
        }
        ids.push(item[idField] as unknown as number);
      }
      return ids;
    } finally {
      if (mySeq === requestSeq) loading.value = false;
    }
  }

  return {
    options,
    loading,
    page,
    hasMore,
    q,
    lastFetchedQ,
    fetchPage,
    loadAll,
    onSearch,
    onPopupScroll,
    onChange,
    onDropdownVisibleChange,
  };
}
