<script setup lang="ts">
/**
 * Server-side-paginated + searchable account dropdown.
 *
 * Mirrors {@link BaseJaDropdown}: 50/page init, 300 ms debounced search,
 * popup-scroll → next page append, optional `include_id` to pin a
 * pre-selected row on the first hydration. State-machine lives in
 * {@link useEntityDropdown}; this file binds account-specific knobs
 * (fetcher, idField, label composer, optional `match_field`).
 *
 * Default label format is `${login_id} ${account_name}` so log/audit
 * screens disambiguate accounts that share a display name;
 * `labelFormat='name'` shows just `${account_name}` for screens that
 * present the field as ユーザー名.
 *
 * Server-side filter is opt-in (`filter-option={false}`) so antd does
 * not also client-side filter the visible option list.
 */
import { computed, toRef } from 'vue';
import {
  listAccountDropdown,
  type AccountDropdownItem,
  type AccountDropdownQuery,
} from '@/api/account/account';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /**
   * Currently-selected account_id. Accepts `number | null | undefined`
   * — both `null` and `undefined` mean "nothing selected" so callers
   * can use `v-model:value` against either filter state
   * (`number | null`, from `useTableQuery`) or form state
   * (`number | undefined`) without a ?? bridge at every call site.
   */
  value?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** Override page size. Default 50. */
  perPage?: number;
  /**
   * Option label format. 'login-name' (default) renders
   * `${login_id} ${account_name}` (space-separated — chosen so the
   * row reads naturally and copy-paste from logs/tickets keeps the
   * id-then-name order); 'name' renders only `${account_name}` for
   * screens that present the field as just ユーザー名.
   */
  labelFormat?: 'login-name' | 'name';
  /**
   * Backend ILIKE target. 'both' (default) matches login_id OR
   * account_name; 'name' matches account_name only. Pair with
   * `labelFormat='name'` so the user can't be confused by a hit they
   * can't see.
   */
  searchField?: 'both' | 'name';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '選択してください',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
  labelFormat: 'login-name',
  searchField: 'both',
});

const emit = defineEmits<{
  // Always emits `null` for "cleared" — callers get one type to handle.
  'update:value': [v: number | null];
}>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');

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
} = useEntityDropdown<AccountDropdownItem, AccountDropdownQuery>({
  fetcher: listAccountDropdown,
  idField: 'account_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<AccountDropdownQuery> = {};
    if (props.searchField === 'name') extra.match_field = 'name';
    return extra;
  },
  onSelect: (v) => {
    emit('update:value', v);
  },
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.account_id,
    label:
      props.labelFormat === 'name'
        ? o.account_name
        : `${o.login_id} ${o.account_name}`,
  })),
);

function onChange(v: number | undefined): void {
  composableOnChange(v);
}

// Re-expose internal state for tests (spec reads
// `wrapper.vm.fetchPage / options / page / hasMore / q`).
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
    style="width: 100%"
    @search="onSearch"
    @popup-scroll="onPopupScroll"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  />
</template>
