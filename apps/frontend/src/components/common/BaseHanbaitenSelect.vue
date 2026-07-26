<script setup lang="ts">
/**
 * Server-side-paginated + searchable **multi-select** 販売店 dropdown.
 *
 * Multi-select sibling of {@link BaseJaDropdown}. Reuses
 * {@link useEntityDropdown} for the option state machine (page-50 load,
 * 300 ms debounced search, infinite scroll, stale-response guard) and
 * binds an `<a-select mode="multiple">`. Search matches 販売店コード OR
 * 名称 on the BE (`match_field='both'`).
 *
 * `auto-clear-search-value=false` keeps the typed query after each pick
 * so the user can select several filtered rows in a row, and the
 * infinite-scroll keeps paging the SAME filtered set.
 *
 * Used by SCR-028 増減連絡票（販売店）の販売店フィルタ（複数選択・未選択＝全件）。
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
  /** Selected hanbaiten_id list (v-model:value). */
  value?: number[];
  /** Optional JA filter (NICHINO_* 代行入力). JA-scoped roles let session.ja_id win. */
  jaId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  /** Override page size. Default 50. */
  perPage?: number;
  /** Add a 「全て」 option at the top of the list (選択すると入力欄に「全て」タグ=全件選択)。 */
  allowSelectAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  jaId: null,
  disabled: false,
  placeholder: '販売店を選択（未選択＝全件）',
  perPage: DROPDOWN_PAGE_SIZE,
  allowSelectAll: false,
});

const emit = defineEmits<{ 'update:value': [v: number[]] }>();

const perPageRef = toRef(props, 'perPage');
// Multi-select has no single edit-pin → include_id unused.
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
    return extra;
  },
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
