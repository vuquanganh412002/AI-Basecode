<script setup lang="ts">
/**
 * Server-side-paginated + searchable **multi-select** 管理支店 dropdown.
 *
 * Multi-select sibling of the SCR-007/024/025 single-select cascade.
 * Reuses {@link useEntityDropdown} (page-50 load, debounced search,
 * infinite scroll). Search matches 管理支店コード OR 名称
 * (`match_field='both'`). Requires `jaId` — the BE scopes by JA.
 *
 * Used by SCR-028 増減連絡票（販売店）の管理支店フィルタ（複数選択・未選択＝全件）。
 */
import { computed, ref, toRef } from 'vue';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
  type KanriShitenDropdownQuery,
} from '@/api/kanri-shiten/kanri-shiten';
import {
  useEntityDropdown,
  type EntityDropdownResult,
} from '@/composables/useEntityDropdown';

interface Props {
  /** Selected kanri_shiten_id list (v-model:value). */
  value?: number[];
  /** JA scope (required — BE filters m_kanri_shiten by this JA). */
  jaId: number;
  disabled?: boolean;
  placeholder?: string;
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  disabled: false,
  placeholder: '管理支店を選択（未選択＝全件）',
  perPage: 50,
});

const emit = defineEmits<{ 'update:value': [v: number[]] }>();

const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');
const selected = ref<number | null>(null);

// kanri-shiten dropdown is keyed by ja_id; wrap so the fetcher matches
// the (params) => Promise<{ data, meta }> shape useEntityDropdown wants.
// The wrapper's `meta` is optional (legacy callers); default has_more=false.
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
  fetchPage,
  page,
  hasMore,
  q,
  onSearch,
  onPopupScroll,
  onDropdownVisibleChange,
} = useEntityDropdown<KanriShitenDropdownItem, KanriShitenDropdownQuery>({
  fetcher,
  idField: 'kanri_shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => ({ ja_id: props.jaId }),
  // Reload page 1 when the parent JA changes (NICHINO 代行入力 etc.).
  resetTriggers: [jaIdRef],
  resetMode: 'hard',
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.kanri_shiten_id,
    label: `${o.kanri_shiten_code} ${o.kanri_shiten_name}`,
  })),
);

function onChange(v: number[]): void {
  emit('update:value', v ?? []);
}

defineExpose({ fetchPage, options, page, hasMore, q });
</script>

<template>
  <a-select
    mode="multiple"
    :value="props.value"
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
