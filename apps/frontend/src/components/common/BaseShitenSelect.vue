<script setup lang="ts">
/**
 * 検索対応の **複数選択** 支店ドロップダウン。
 *
 * 単一選択の {@link BaseShitenDropdown} の複数選択版。SCR-026 購読者名簿出力の
 * 支店フィルタ（複数選択・未選択＝全件）で使用（顧客要件2026-08）。
 *
 * `kanriShitenIds` を渡すと、その管理支店配下の支店だけを候補にする。上位の
 * 管理支店の選択が変わったら候補を取り直し、選択済みの支店も破棄する
 * （残すと配下に無い支店で絞ることになり、結果 0 件の理由が画面から読めない）。
 *
 * ※ BE `GET /api/v1/shiten/dropdown` はサーバーページングを持たず全件返す
 * （`meta.has_more` は常に false）。`useEntityDropdown` は無限スクロールを
 * 諦めて 1 ページ目で確定する。
 */
import { computed, ref, toRef, watch } from 'vue';
import {
  getShitenDropdown,
  type ShitenDropdownItem,
  type ShitenDropdownQuery,
} from '@/api/shiten/shiten';
import {
  useEntityDropdown,
  type EntityDropdownResult,
} from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';
import {
  useSelectAllSentinel,
  withAllOption,
} from '@/composables/useSelectAllSentinel';

interface Props {
  /** 選択中の shiten_id 配列（v-model:value）。 */
  value?: number[];
  /** 候補を絞る管理支店。空配列＝親未選択なので候補も出さない。 */
  kanriShitenIds?: number[];
  /** JA スコープ（NICHINO_* 代行用。JA ロールは session 側で絞られる）。 */
  jaId?: number | null;
  /**
   * 金融機関支店フラグで候補を絞る。`true`=金融機関支店のみ、`false`=それ以外のみ、
   * 省略=絞らない。BE は `undefined` のときだけ条件を付けない
   * （`false` は「全件」ではなく「金融機関支店を除く」）。
   */
  kinyuShitenFlg?: boolean;
  disabled?: boolean;
  placeholder?: string;
  perPage?: number;
  /** リスト先頭に「全て」オプションを追加（選択すると入力欄に「全て」タグ=全件選択）。 */
  allowSelectAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  kanriShitenIds: () => [],
  jaId: null,
  kinyuShitenFlg: undefined,
  disabled: false,
  placeholder: '支店を選択（未選択＝全件）',
  perPage: DROPDOWN_PAGE_SIZE,
  allowSelectAll: false,
});

const emit = defineEmits<{ 'update:value': [v: number[]] }>();

const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');
const kinyuFlgRef = toRef(props, 'kinyuShitenFlg');
const selected = ref<number | null>(null);

// 親の管理支店選択。配列そのものを resetTriggers に渡すと参照が変わるたびに
// 発火してしまうので、内容をキー化した文字列を監視対象にする。
const kanriShitenKey = computed(() => [...props.kanriShitenIds].sort((a, b) => a - b).join(','));

async function fetcher(
  params: ShitenDropdownQuery,
): Promise<EntityDropdownResult<ShitenDropdownItem>> {
  const res = await getShitenDropdown(params);
  return {
    data: res.data,
    meta: res.meta ?? {
      total: res.data.length,
      page: 1,
      per_page: res.data.length,
      has_more: false,
    },
  };
}

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
} = useEntityDropdown<ShitenDropdownItem, ShitenDropdownQuery>({
  fetcher,
  idField: 'shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: ShitenDropdownQuery = {};
    if (props.jaId != null) extra.ja_id = props.jaId;
    if (props.kinyuShitenFlg !== undefined) {
      extra.kinyu_shiten_flg = props.kinyuShitenFlg;
    }
    if (props.kanriShitenIds.length > 0) {
      extra.kanri_shiten_ids = props.kanriShitenIds;
    }
    return extra;
  },
  // 管理支店 / JA が変わったら候補を取り直す。
  // kinyuShitenFlg も候補集合を変える条件なので reset 対象に含める（現状の
  // 呼出しは静的だが、動的に切り替えたとき古い候補が残らないように）。
  resetTriggers: [kanriShitenKey, jaIdRef, kinyuFlgRef],
  resetMode: 'hard',
});

// 親が変われば配下の支店も変わる → 選択済みを持ち越さない。残すと配下に無い
// 支店で絞ることになり、結果 0 件の理由が画面から読めない。
//
// composable の `clearValueOnReset` は使えない: あれは単一選択用で
// `selected.value != null` のときだけ発火するが、複数選択版の `selected` は
// composable を満たすためのダミーで常に null。
watch(kanriShitenKey, () => {
  if (props.value.length > 0) emit('update:value', []);
});

const { innerValue, onChange } = useSelectAllSentinel({
  value: () => props.value,
  emit: (v) => emit('update:value', v),
  loadAll,
});

const selectOptions = computed(() =>
  withAllOption(
    options.value.map((o) => ({
      value: o.shiten_id,
      label: `${o.shiten_code} ${o.shiten_name}`,
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
