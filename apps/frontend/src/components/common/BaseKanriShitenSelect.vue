<script setup lang="ts">
/**
 * サーバーページング + 検索対応の **複数選択** 管理支店ドロップダウン。
 *
 * SCR-007/024/025 の単一選択カスケードの複数選択版。{@link useEntityDropdown} を再利用
 * （50件/page・デバウンス検索・無限スクロール）。検索は 管理支店コード OR 名称
 * （`match_field='both'`）。`jaId` 必須 — BE が JA でスコープする。
 *
 * SCR-028 増減連絡票（販売店）の管理支店フィルタ（複数選択・未選択＝全件）で使用。
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
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';
import {
  useSelectAllSentinel,
  withAllOption,
} from '@/composables/useSelectAllSentinel';

interface Props {
  /** 選択中の kanri_shiten_id 配列（v-model:value）。 */
  value?: number[];
  /** JA スコープ（必須 — BE が m_kanri_shiten をこの JA で絞る）。 */
  jaId: number;
  disabled?: boolean;
  placeholder?: string;
  perPage?: number;
  /** リスト先頭に「全て」オプションを追加（選択すると入力欄に「全て」タグ=全件選択）。 */
  allowSelectAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  disabled: false,
  placeholder: '管理支店を選択（未選択＝全件）',
  perPage: DROPDOWN_PAGE_SIZE,
  allowSelectAll: false,
});

const emit = defineEmits<{ 'update:value': [v: number[]] }>();

const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');
const selected = ref<number | null>(null);

// kanri-shiten ドロップダウンは ja_id キー。useEntityDropdown が要求する
// (params) => Promise<{ data, meta }> 形にラップする。meta は任意（旧呼び出し側）、
// 既定 has_more=false。
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
  loadAll,
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
  // 親 JA が変わったら 1ページ目を再読込（NICHINO 代行入力 等）。
  resetTriggers: [jaIdRef],
  resetMode: 'hard',
});

// 「全て」= 全件を選択肢1つ(sentinel)として扱う共通ロジック（BaseHanbaitenSelect と共有）。
const { innerValue, onChange } = useSelectAllSentinel({
  value: () => props.value,
  emit: (v) => emit('update:value', v),
  loadAll,
});

const selectOptions = computed(() =>
  withAllOption(
    options.value.map((o) => ({
      value: o.kanri_shiten_id,
      label: `${o.kanri_shiten_code} ${o.kanri_shiten_name}`,
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
