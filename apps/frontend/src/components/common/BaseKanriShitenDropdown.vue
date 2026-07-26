<script setup lang="ts">
/**
 * Server-side-paginated + searchable **single-select** 管理支店 dropdown.
 *
 * Single-select sibling of {@link BaseKanriShitenSelect} (multi). Reuses
 * {@link useEntityDropdown} (page-50 load, 300ms debounced search on
 * コード OR 名称, infinite scroll, edit-mode include_id pin). Requires
 * `jaId` — the BE scopes m_kanri_shiten by JA.
 *
 * Used by 購読者一覧 / 販売店一括置換 の管理支店フィルタ。
 */
import { computed, toRef } from 'vue';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
  type KanriShitenDropdownQuery,
} from '@/api/kanri-shiten/kanri-shiten';
import {
  useEntityDropdown,
  type EntityDropdownResult,
} from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** Selected kanri_shiten_id (`null`/`undefined` = nothing selected). */
  value?: number | null;
  /** JA scope (required — BE filters m_kanri_shiten by this JA). */
  jaId: number;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '選択してください',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
});

const emit = defineEmits<{ 'update:value': [v: number | null] }>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');

// kanri-shiten envelope's meta is optional (legacy callers) — default
// has_more=false so useEntityDropdown stops paging.
async function fetcher(
  params: KanriShitenDropdownQuery,
): Promise<EntityDropdownResult<KanriShitenDropdownItem>> {
  const res = await getKanriShitenDropdown(params);
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
  page,
  hasMore,
  q,
  fetchPage,
  onSearch,
  onPopupScroll,
  onChange: composableOnChange,
  onDropdownVisibleChange,
} = useEntityDropdown<KanriShitenDropdownItem, KanriShitenDropdownQuery>({
  fetcher,
  idField: 'kanri_shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => ({ ja_id: props.jaId }),
  resetTriggers: [jaIdRef],
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => emit('update:value', null),
  onSelect: (v) => emit('update:value', v),
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.kanri_shiten_id,
    label: `${o.kanri_shiten_code} ${o.kanri_shiten_name}`,
  })),
);

function onChange(v: number | undefined): void {
  composableOnChange(v);
}

defineExpose({ fetchPage, options, page, hasMore, q });
</script>

<template>
  <a-select
    :value="props.value ?? undefined"
    :options="selectOptions"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :allow-clear="props.allowClear"
    :loading="loading"
    show-search
    :filter-option="false"
    option-filter-prop="label"
    class="w-full"
    @search="onSearch"
    @popup-scroll="onPopupScroll"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  />
</template>
