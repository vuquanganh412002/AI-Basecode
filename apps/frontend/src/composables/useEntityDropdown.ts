/**
 * サーバーページング + 検索対応「エンティティドロップダウン」の共通状態機械。
 * {@link BaseJaDropdown} / {@link BaseAccountDropdown} / {@link BaseTankaDropdown}
 * で共有（修正を一箇所に集約するため抽出）。
 *
 * 挙動:
 *   - onMounted で page 1（perPage 既定 50 件）を初期ロード。
 *   - 検索は 300ms デバウンス。`q` 入力で page 1 にリセット。
 *   - 無限スクロール: 下端 80px 手前で page +1 を追記。`meta.has_more` が false で停止。
 *   - 編集モード事前選択: マウント時の `selected` が page 1 に無ければ BE が
 *     `include_id` で先頭付加し、二度目の往復無しでラベル表示。
 *   - stale-response ガード: 単調増加 `requestSeq` で、"a"→"ab" の順序逆転時に
 *     古い ("a") 応答を破棄し新しい ("ab") を上書きさせない。
 *   - unmount 時にデバウンス取消 — teardown 後の検索は no-op（Vitest の
 *     unhandled rejection ノイズ回避）。
 *   - 再オープン時は `lastFetchedQ` !== 現 `q` の場合のみ再取得。無入力の
 *     open/close/reopen では往復しない。
 *   - @change 時に内部 `q` を '' にリセット（antd は検索入力欄を自動クリアするが
 *     @search を発火しない）。option 一覧の更新は次回オープンまで遅延。
 *
 * 呼び出し側ごとの差異は `UseEntityDropdownOpts` に集約。
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
  /** API 呼び出し。合成済みクエリを受け取り `{ data, meta }` を返す。 */
  fetcher: (params: TQuery) => Promise<EntityDropdownResult<TItem>>;
  /** 行の主キーフィールド名（`'ja_id'` / `'account_id'` / `'tanka_id'` 等）。 */
  idField: keyof TItem;
  /**
   * 現在の v-model 選択（`props.value` への ref）。`null`/`undefined` は共に
   * 「未選択」。filter state（`number | null`）でも form state
   * （`number | undefined`）でも ?? 橋渡し無しで渡せる。
   */
  selected: Ref<number | null | undefined>;
  /** ページサイズ。既定 50。ref 渡しで prop 変更が次回 fetch に反映。 */
  perPage: Ref<number>;
  /**
   * モジュール固有パラメータ（todofuken_code, tanka_type, ja_id, match_field 等）を構築。
   * fetch 毎に呼ばれるので reactive ref を直接読むこと。
   */
  buildExtraParams?: () => Partial<TQuery>;
  /**
   * 変更時にドロップダウンを page 1 にリセットする ref 群。watcher は composable が配線。
   *
   * 2 つのリセットモード（JA と tanka のカスケードの差異を保持）:
   *   - `'soft'`（既定 — BaseJaDropdown.todofukenCode）: `page`+`hasMore` のみ
   *     リセットして再取得。既存 `options` は新 fetch 解決まで表示（空フラッシュ無し）。
   *     `q` は保持、親選択は非クリア。
   *   - `'hard'`（BaseTankaDropdown.jaId）: `options` 即クリア、`q` リセット、
   *     `lastFetchedQ` 破棄後に再取得。`clearValueOnReset` も true なら再取得前に
   *     親選択を null で emit（JA A で選んだ tanka_id は JA B の BE スコープで生き残らない）。
   */
  resetTriggers?: Array<Ref<unknown>>;
  /** `resetTriggers` 参照。既定 `'soft'`。 */
  resetMode?: 'soft' | 'hard';
  /**
   * true なら reset trigger 発火かつ現選択が非 null の時、再取得前に
   * `onResetTrigger`（`update:value`=null を emit すべき）を呼ぶ。
   * tanka jaId カスケードが親 form-state クリアに使用。
   */
  clearValueOnReset?: boolean;
  /**
   * `resetTriggers` のいずれかが変化時に発火。`clearValueOnReset` が true の時に
   * `update:value`=null を emit する用途。現選択が非 null の時のみ呼ばれる。
   */
  onResetTrigger?: () => void;
  /**
   * `@change` の value emit と併せて発火。キャッシュ済みページから解決した行オブジェクト
   * （クリア時 null）を渡す。追加 GET 無しで行メタ（ja_code, todofuken_code 等）を取得可能。
   */
  onSelect?: (value: number | null, item: TItem | null) => void;
}

// 300ms — 高速入力を 1 リクエストに集約しつつ応答性を維持。
// GitHub / Material UI Autocomplete の既定値に一致。
const SEARCH_DEBOUNCE_MS = 300;

// 下端 80px 手前で発火し、空白に達する前に次バッチを描画。
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
   * キャッシュ済み `options` が反映するクエリ。初回 fetch 解決まで `null`。
   * (a) デバウンス後クエリがロード済みと同一なら重複リクエストを回避、
   * (b) 再オープン時に option 一覧が stale で更新要かを判断、に使用。
   */
  const lastFetchedQ = ref<string | null>(null);

  /**
   * 単調増加リクエストカウンタ。`fetchPage` 毎に現在値を捕捉し、応答解決時に
   * カウンタが進んでいれば（= より新しいリクエストが発行済み）無視する。
   * stale-response レース対策: "a"→"ab" の順序逆転で古い応答が新しい結果を
   * 上書きするのを防ぐ。
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
    // include_id は親が事前選択 id を持って来る初回 hydration のみ有効。
    // 以降はユーザーが検索/スクロールで操作。`!= null` で undefined と null 両方を捕捉。
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
    // reset は常に優先 — page-N append 実行中でも新しい検索/reset が優先。
    // scroll-append は reset 中または別 append ロード中なら中断。
    if (!p.reset && loading.value) return;
    if (!p.reset && !hasMore.value) return;

    const mySeq = ++requestSeq;
    loading.value = true;
    try {
      const { nextPage, params } = buildParams(p.reset);
      const res = await opts.fetcher(params);

      // stale-response ガード: より新しいリクエストが発行済みなら応答を破棄。
      if (mySeq !== requestSeq) return;

      page.value = nextPage;
      hasMore.value = res.meta.has_more;
      mergePage(p.reset, res.data);
      if (p.reset) lastFetchedQ.value = q.value;
    } finally {
      // 最新リクエストのみ loading を解除 — stale な終了処理が
      // 新リクエストのスピナーを消さないように。
      if (mySeq === requestSeq) loading.value = false;
    }
  }

  function onSearch(input: string): void {
    // trim して paste 由来/IME 確定の空白が ILIKE パターンを変えないように
    // （BE は `%…%` で囲むが `%  東京  %` は前後空白の無い行にマッチしない）。
    const trimmed = input.trim();
    q.value = trimmed;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchDebounce = null;
      // デバウンス後クエリがロード済みと同一なら往復を回避
      // （入力→同一 prefix まで削除、や antd の二重 echo で頻発）。
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

  // 既定引数 `= null` でシグネチャ側の antd-undefined → null 正規化
  // （Sonar S7760 — body 内 `?? null` 再代入より既定引数を推奨）。antd の
  // `@change` は X-clear 時に undefined を渡すので JS が既定値を代入する。
  function onChange(v: number | null = null): number | null {
    // antd は select/X-clear 時に検索入力欄を自動クリアするが `@search` を
    // 発火しない — 内部 `q` を同期し次回オープンの stale-check がクリーンな
    // クエリを見るように。ここでは再取得せず、更新は onDropdownVisibleChange に遅延。
    q.value = '';
    // 追加行フィールド（chip リスト, 監査ログペイロード）を追加 GET 無しで
    // 取得できるよう、キャッシュ済みページから選択 option を解決。X-clear 時 null。
    const picked =
      v == null
        ? null
        : options.value.find((o) => o[opts.idField] === v) ?? null;
    opts.onSelect?.(v, picked);
    return v;
  }

  function onDropdownVisibleChange(visible: boolean): void {
    // オープン時: キャッシュ済み options が現 `q.value` と不一致な過去の検索クエリを
    // 反映（= 過去に入力後、再入力せず選択/クリア/クローズ）していれば page 1 を再読込。
    // `lastFetchedQ === null` は初回マウントの初期ロード完了前のみ — その時は
    // onMounted の fetch に任せてスキップ。
    if (!visible) return;
    if (lastFetchedQ.value === null) return;
    if (lastFetchedQ.value === q.value) return;
    void fetchPage({ reset: true });
  }

  onMounted(() => {
    void fetchPage({ reset: true });
  });

  // unmount 時に保留中のデバウンスを取消。タイマー未発火でも fetchPage は no-op に
  // なり、spec が debounce 中に teardown する際の無駄なリクエスト + Vitest
  // unhandled rejection ノイズを回避。実行中リクエストは自然に孤立し stale-guard が破棄。
  onBeforeUnmount(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
  });

  // 親が未ロードの id に `selected` を切替（マウント後の編集フォーム
  // プログラム的 hydration 等）した場合、include_id 付きで再取得しラベルを解決。
  watch(
    () => opts.selected.value,
    (newVal) => {
      // `== null` で undefined と null 両方を捕捉 — どちらも「未選択」で fetch 不要。
      if (newVal == null) return;
      if (options.value.some((o) => o[opts.idField] === newVal)) return;
      void fetchPage({ reset: true });
    },
  );

  // モジュール固有の絞り込み ref のカスケードリセット（JA=todofukenCode は soft、
  // tanka=jaId は hard）。fetchPage 経由で requestSeq を暗黙に進め、実行中の
  // 未絞り込み応答を stale-guard が破棄。
  if (opts.resetTriggers && opts.resetTriggers.length > 0) {
    const mode = opts.resetMode ?? 'soft';
    watch(
      // 各 ref を個別追跡するため triggers をタプルに展開。値の配列を返すと
      // Vue が要素単位で diff し変化時にコールバックする。
      opts.resetTriggers.map((r) => () => r.value),
      (next, prev) => {
        // 安価な shallow-equal ガード: 同一 prop での親再描画時に同値で
        // 呼ばれることがあるため、no-op 再取得を回避。
        if (
          Array.isArray(next) &&
          Array.isArray(prev) &&
          next.length === prev.length &&
          next.every((v, i) => v === prev[i])
        ) {
          return;
        }
        if (mode === 'hard') {
          // hard reset（tanka カスケード）: options+q+memo をクリアし
          // 新テナントのデータが前と混ざらないように。
          options.value = [];
          page.value = 1;
          hasMore.value = true;
          q.value = '';
          lastFetchedQ.value = null;
          if (opts.clearValueOnReset && opts.selected.value != null) {
            opts.onResetTrigger?.();
          }
        } else {
          // soft reset（JA todofukenCode カスケード）: 現 options を新 fetch
          // 解決まで表示、`q` を保持し絞り込み変更後も検索を維持、親選択は非変更。
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
        if (mySeq !== requestSeq) return []; // より新しいリクエストに置換された
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
