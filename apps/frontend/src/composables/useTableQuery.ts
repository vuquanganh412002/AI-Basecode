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
  /** true で state を URL クエリに同期し URL を共有可能に。 */
  syncUrl?: boolean;
}

/**
 * 「ユーザーが変更したか」比較用にフィルタ値を正規化。全ての「空」表現を統一
 * （`null` / `undefined` / `''` / 空白のみ文字列 → すべて `undefined`）。
 *
 * コントロールの空状態はコードベース全体で不統一なため重要 — クリアした
 * `<a-select>` は `undefined` か `''` を返し得るがフィルタ既定は `null` かも。
 * 正規化しないと既定 `null` だが `''` にクリアされる select が「変更」と読まれ、
 * 空フォームの検索が API を叩き続ける。他の型は素通し。
 */
function normalizeFilterValue(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim();
  return v;
}

/** 正規化後の 2 フィルタ値の等価判定（配列対応）。 */
function filterValuesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeFilterValue(a);
  const nb = normalizeFilterValue(b);
  if (Array.isArray(na) && Array.isArray(nb)) {
    return na.length === nb.length && na.every((v, i) => v === nb[i]);
  }
  return na === nb;
}

/** 2 つのフィルタレコード全体の等価判定（キー毎・正規化済み）。 */
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
 * 再利用可能なテーブルクエリ状態: pagination + sort + filter。
 *
 * `BaseDataTable` と対。返る `state` を API 呼び出しに渡し、`onChange` を
 * テーブルに、`resetFilters` を検索クリアボタンに配線する。
 *
 * 例:
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

  // 現在表示中の一覧を生成したフィルタのスナップショット。各 view の初回
  // onMounted fetch は既定で走るので applied state も既定から開始。クエリが
  // 実際に変化（applyFilters / resetFilters）する度に更新。isPristine() が
  // 使用し、既定一覧表示中の検索クリアで冗長 fetch を回避しつつ、手動で入力を
  // 空にした後（フォーム空だが一覧はまだ絞り込み済み）のリセット能力は保持。
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
    // [sorter-key-priority] dataIndex ≠ key の列（例 ACSMS-SCR-008 アカウント一覧
    // 都道府県: 表示は dataIndex=todofuken_name、BE ソート whitelist は
    // key=todofuken_code）では antd の sorter が `field`(=dataIndex) と
    // `columnKey`(=key) 両方を emit。BE は列名を whitelist するので columnKey 優先。
    // field へのフォールバックで既存画面（dataIndex === key）を維持し、全列への
    // `key:` 宣言強制を回避。
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
   * 少なくとも 1 つのフィルタが既定値と異なる時 true — ユーザーが実際に
   * 検索条件を入力/変更した状態。
   *
   * 一覧 view が `onSearch` で呼び、フォームが既定のままなら冗長 API 呼び出しを
   * スキップ（初回 onMounted fetch が既にその未絞り込み結果を表示済み）。
   * 絞り込み後の全件復帰は検索クリア（`resetFilters` + fetch）が担う。
   *
   * 「値が空か」でなく既定値と比較することで、`kinyu_shiten_flg: 'all'` 等の
   * sentinel 既定や事前選択ラジオを正しく「未変更」扱いにできる。
   */
  function hasActiveFilters(): boolean {
    const current = state.filters as Record<string, unknown>;
    const defaults = opts.defaultFilters as Record<string, unknown>;
    return Object.keys(defaults).some(
      (k) => !filterValuesEqual(current[k], defaults[k]),
    );
  }

  /**
   * 現フォームフィルタが現在表示中の一覧を生成したものと異なる時 true —
   * 今検索を押せば実際に結果セットが変わる状態。
   *
   * view が `onSearch` で呼び、既に画面表示中の行と同一を返す時のみ検索を
   * no-op にする。新規画面の空検索（form == applied == defaults）はスキップし、
   * かつ手動で入力を空にして検索解除した後（form は既定だが表示一覧はまだ
   * 絞り込み済み）の全件復帰に必要な 1 回の fetch は正しく発火。その後の空検索は
   * 再び no-op。`hasActiveFilters`（vs 既定）では「空フォーム・既定一覧」と
   * 「空フォーム・絞り込み一覧」を区別できない。
   */
  function filtersChangedSinceApplied(): boolean {
    return !filterRecordsEqual(
      state.filters as Record<string, unknown>,
      appliedFilters,
    );
  }

  /**
   * 検索クリアが no-op になる時 true: フォームが既定かつ現在表示中の一覧も
   * 既定（未絞り込み）セットである状態。
   *
   * view が `onClear` で呼び、pristine な画面での冗長 reset+fetch をスキップ。
   * フォームが空でも表示一覧がまだ絞り込み済み（検索後に手動で入力を空にした）
   * の時は意図的に false のまま — その場合の検索クリアは全件復帰の fetch と
   * 入力欄に残る未検索テキストの消去が必要。
   */
  function isPristine(): boolean {
    if (hasActiveFilters()) return false; // フォームに未検索の入力あり
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
   * {@link searchActions} 用設定 — 各一覧画面が `<BaseSearchForm @search @clear>`
   * に配線する共通の検索 / 検索クリアハンドラ対。
   */
  interface SearchActionsConfig {
    /** view の一覧 fetch。applyFilters（検索）後と reset（クリア）後に実行。 */
    fetchList: () => void | Promise<void>;
    /**
     * 検索の冒頭、changed-since-applied ガードの前に実行。テキストフィルタの
     * in-place トリム/検証に使用。`false` を返すと検索を中断（検証失敗、必須ガード等）。
     */
    beforeSearch?: () => boolean | void;
    /**
     * 検索クリアの冒頭で常に実行（pristine 画面でも）。table-query state が
     * 所有しないローカル UI（行選択、staged 一括操作フォーム、依存ドロップダウン
     * option）のクリアに使用。
     */
    beforeClear?: () => void;
    /**
     * 検索クリアで resetFilters() 後、実際に reset が起きた時（非 pristine）のみ実行。
     * フィルタが実変化した時のみ意味を持つローカルリセット（カスケード
     * ドロップダウンの option クリア等）に使用。
     */
    afterReset?: () => void;
    /** 検索クリアが使う fetch — 既定は {@link SearchActionsConfig.fetchList}。 */
    clearFetch?: () => void | Promise<void>;
  }

  /**
   * 冗長呼び出しガードを組み込んだ標準の検索 / 検索クリアハンドラを構築。
   * 全一覧画面が同一挙動になり、無変化でボタンを連打しても API を再度叩かない:
   *
   * - `onSearch`: `beforeSearch`（トリム/検証、`false` で中断）実行後、フォームが
   *   表示一覧と一致（`filtersChangedSinceApplied`）ならスキップ、
   *   さもなくば `applyFilters` + `fetchList`。
   * - `onClear`: `beforeClear`（常時 — ローカル UI クリア）実行後、既に pristine
   *   （`isPristine`）なら reset+refetch をスキップ、さもなくば `resetFilters`、
   *   `afterReset`、fetch（`clearFetch ?? fetchList`）。
   *
   * テンプレート配線: `<BaseSearchForm @search="onSearch" @clear="onClear">`。
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

  // URL から page/sort を初期化（マウント時に一度だけ）。
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
