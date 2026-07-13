import { computed, ref, type ComputedRef } from 'vue';

/**
 * 「全て」= 全件選択を、マルチセレクト(antd)の選択肢1つ(sentinel 値)として扱う共通ロジック。
 *
 * BaseHanbaitenSelect / BaseKanriShitenSelect が共有する。antd の multi-select は
 * 「全件を1タグで表す」機能を持たないため、負の sentinel 値(実 ID は正の bigint)を
 * 先頭選択肢として差し込み、選ばれたら loadAll() でスコープ内全 ID を取得して親へ emit
 * する。入力欄には実 ID を全部並べる代わりに「全て」1件を表示する（innerValue）。
 *
 * - `value()`   … 現在の選択(v-model:value)。getter で渡してリアクティブに追跡。
 * - `emit(v)`   … `update:value` を発火するラッパ。
 * - `loadAll()` … スコープ内の全 ID を取得（各コンポーネントの useEntityDropdown 由来）。
 */
export const ALL_SENTINEL = -1;

export interface SelectAllSentinel {
  /** 全件選択中か（表示を「全て」1件に畳む判定）。 */
  isAll: ComputedRef<boolean>;
  /** a-select に渡す表示用 value：全件中は [ALL_SENTINEL]、それ以外は実 ID。 */
  innerValue: ComputedRef<number[]>;
  /** a-select @change ハンドラ（sentinel の展開/畳み込みを行い実 ID を emit）。 */
  onChange: (v: number[]) => Promise<void>;
}

/** allowSelectAll のとき選択肢先頭に「全て」を差し込む（state 非依存の純関数）。 */
export function withAllOption<T extends { value: number; label: string }>(
  base: T[],
  enabled: boolean,
): T[] {
  return enabled ? [{ value: ALL_SENTINEL, label: '全て' } as T, ...base] : base;
}

export function useSelectAllSentinel(opts: {
  value: () => number[];
  emit: (v: number[]) => void;
  loadAll: () => Promise<number[]>;
}): SelectAllSentinel {
  // スコープ内の全 ID を一度取得したらキャッシュ（「全て」表示判定に使う）。
  const allIds = ref<number[]>([]);
  const isAll = computed(
    () =>
      allIds.value.length > 0 &&
      opts.value().length === allIds.value.length &&
      allIds.value.every((id) => opts.value().includes(id)),
  );
  const innerValue = computed(() => (isAll.value ? [ALL_SENTINEL] : opts.value()));

  async function onChange(v: number[]): Promise<void> {
    const others = (v ?? []).filter((x) => x !== ALL_SENTINEL);
    const pickedAll = (v ?? []).includes(ALL_SENTINEL);
    if (pickedAll && !isAll.value) {
      // 「全て」を新規選択 → スコープ内全 ID を取得して全件に。
      const ids = await opts.loadAll();
      allIds.value = ids;
      opts.emit(ids);
      return;
    }
    if (pickedAll && isAll.value && others.length > 0) {
      // 全件表示中に個別を選択 → その個別だけに切替（「全て」を外す）。
      opts.emit(others);
      return;
    }
    // 「全て」タグを外した / 通常の複数選択。
    opts.emit(others);
  }

  return { isAll, innerValue, onChange };
}
