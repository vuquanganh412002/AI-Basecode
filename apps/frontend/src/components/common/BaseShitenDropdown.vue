<script setup lang="ts">
/**
 * Server-side-paginated + searchable **single-select** 支店 dropdown.
 *
 * Reuses {@link useEntityDropdown} (page-50 load, debounced search on
 * コード OR 名称, infinite scroll, edit-mode include_id pin). Optional
 * `kanriShitenId` cascades the list off the chosen 管理支店 (BE asserts
 * the id is within the caller's scope); when omitted the full scoped
 * list is returned. `jaId` is only needed for the NICHINO_* 代行入力 flow.
 */
import { computed, toRef } from 'vue';
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

interface Props {
  /** Selected shiten_id (`null`/`undefined` = nothing selected). */
  value?: number | null;
  /** Cascade filter — only shiten under this 管理支店. */
  kanriShitenId?: number | null;
  /** Explicit JA filter (NICHINO_* 代行入力). Scoped roles let session win. */
  jaId?: number | null;
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
const kanriShitenIdRef = toRef(props, 'kanriShitenId');

// shiten envelope's meta is optional (legacy callers) — default
// has_more=false so useEntityDropdown stops paging.
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
  page,
  hasMore,
  q,
  fetchPage,
  onSearch,
  onPopupScroll,
  onChange: composableOnChange,
  onDropdownVisibleChange,
} = useEntityDropdown<ShitenDropdownItem, ShitenDropdownQuery>({
  fetcher,
  idField: 'shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<ShitenDropdownQuery> = {};
    if (props.kanriShitenId != null) extra.kanri_shiten_id = props.kanriShitenId;
    if (props.jaId != null) extra.ja_id = props.jaId;
    return extra;
  },
  // 管理支店が変わると支店候補は別管理支店のものになる → リセット + 選択クリア。
  resetTriggers: [kanriShitenIdRef],
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => emit('update:value', null),
  onSelect: (v) => emit('update:value', v),
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.shiten_id,
    label: `${o.shiten_code} ${o.shiten_name}`,
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
