<script setup lang="ts">
/**
 * サーバーページング + 検索対応の **複数選択** 販売店ドロップダウン。
 *
 * {@link BaseJaDropdown} の複数選択版。option 状態機械は {@link useEntityDropdown} を再利用
 * （50件/page・300ms デバウンス検索・無限スクロール・stale レスポンスガード）し
 * `<a-select mode="multiple">` を束ねる。検索は BE で 販売店コード OR 名称（`match_field='both'`）。
 *
 * `auto-clear-search-value=false` で選択後も入力クエリを保持 — 絞り込んだ行を連続選択でき、
 * 無限スクロールは同じ絞り込みセットをページングし続ける。
 *
 * SCR-028 増減連絡票（販売店）の販売店フィルタ（複数選択・未選択＝全件）で使用。
 */
import { computed, ref, toRef } from 'vue';
import {
  getHanbaitenDropdown,
  type HanbaitenDropdownItem,
  type HanbaitenDropdownQuery,
} from '@/api/hanbaiten/hanbaiten';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';
import {
  useSelectAllSentinel,
  withAllOption,
} from '@/composables/useSelectAllSentinel';

interface Props {
  /** 選択中の hanbaiten_id 配列（v-model:value）。 */
  value?: number[];
  /** 任意の JA フィルタ（NICHINO_* 代行入力）。JA スコープ付きロールは session.ja_id 優先。 */
  jaId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  /** ページサイズ上書き。既定 50。 */
  perPage?: number;
  /** リスト先頭に「全て」オプションを追加（選択すると入力欄に「全て」タグ=全件選択）。 */
  allowSelectAll?: boolean;
  /**
   * 電子版ダミー販売店（hanbaiten_code=9999999999）の扱い。
   *
   * ダミーは「電子版読者を紐づける受け皿」であって実在の販売店ではない
   * （t_dokusya.hanbaiten_id が NOT NULL のため用意している）。帳票の出力条件など
   * 実在の販売店だけを選ばせたい画面は 'exclude' を渡す。
   * 未指定は絞らない（従来の呼び出しの挙動を変えない）。
   */
  dummy?: 'only' | 'exclude';
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  jaId: null,
  disabled: false,
  placeholder: '販売店を選択（未選択＝全件）',
  perPage: DROPDOWN_PAGE_SIZE,
  allowSelectAll: false,
  dummy: undefined,
});

const emit = defineEmits<{ 'update:value': [v: number[]] }>();

const perPageRef = toRef(props, 'perPage');
// 複数選択は単一の編集ピンが無い → include_id 未使用。
const selected = ref<number | null>(null);

const {
  options,
  loading,
  fetchPage,
  loadAll,
  page,
  hasMore,
  q,
  onSearch,
  onPopupScroll,
  onDropdownVisibleChange,
} = useEntityDropdown<HanbaitenDropdownItem, HanbaitenDropdownQuery>({
  fetcher: getHanbaitenDropdown,
  idField: 'hanbaiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<HanbaitenDropdownQuery> = {};
    if (props.jaId) extra.ja_id = props.jaId;
    if (props.dummy) extra.dummy = props.dummy;
    return extra;
  },
  // dummy を切り替えたら候補集合が変わるので取り直す（帳票種別の切替など）。
  resetTriggers: [toRef(props, 'dummy')],
});

// 「全て」= 全件を選択肢1つ(sentinel)として扱う共通ロジック（BaseKanriShitenSelect と共有）。
const { innerValue, onChange } = useSelectAllSentinel({
  value: () => props.value,
  emit: (v) => emit('update:value', v),
  loadAll,
});

const selectOptions = computed(() =>
  withAllOption(
    options.value.map((o) => ({
      value: o.hanbaiten_id,
      label: `${o.hanbaiten_code} ${o.hanbaiten_name}`,
    })),
    props.allowSelectAll,
  ),
);

defineExpose({ fetchPage, loadAll, options, page, hasMore, q });
</script>

<template>
  <a-select
    mode="multiple"
    :value="innerValue"
    :options="selectOptions"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :loading="loading"
    show-search
    :filter-option="false"
    :auto-clear-search-value="false"
    option-filter-prop="label"
    class="w-full"
    @search="onSearch"
    @popup-scroll="onPopupScroll"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  />
</template>
