<script setup lang="ts">
/**
 * サーバーページング + 検索対応のアカウントドロップダウン。
 *
 * {@link BaseJaDropdown} と同構造（初回50件/page・300ms デバウンス検索・popup-scroll で次ページ追加・
 * 初回に選択行を固定する任意の include_id）。状態機械は {@link useEntityDropdown}、本ファイルは
 * アカウント固有設定（fetcher / idField / label / 任意の match_field）を束ねる。
 *
 * 既定ラベルは `${login_id} ${account_name}` — 表示名が同じアカウントをログ/監査画面で区別するため。
 * `labelFormat='name'` はフィールドを ユーザー名 として見せる画面向けに `${account_name}` のみ。
 *
 * サーバー側フィルタは opt-in（`filter-option={false}`）なので antd はクライアント側で絞り込まない。
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
   * 選択中の account_id。`number | null | undefined` を受ける — null / undefined とも
   * 「未選択」の意味なので、filter state（`number | null`、useTableQuery）でも
   * form state（`number | undefined`）でも ?? 変換なしに v-model:value できる。
   */
  value?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** ページサイズ上書き。既定 50。 */
  perPage?: number;
  /**
   * ラベル形式。'login-name'（既定）は `${login_id} ${account_name}`（スペース区切り —
   * 行が自然に読め、ログ/チケットからのコピペで id→name の順が保たれる）、
   * 'name' はフィールドを ユーザー名 として見せる画面向けに `${account_name}` のみ。
   */
  labelFormat?: 'login-name' | 'name';
  /**
   * BE の ILIKE 対象。'both'（既定）は login_id OR account_name、'name' は account_name のみ。
   * 表示できないヒットで混乱しないよう `labelFormat='name'` と組で使う。
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
  // クリア時は常に `null` を emit — 呼び出し側は 1 型のみ扱えばよい。
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

// テスト用に内部状態を公開（spec が wrapper.vm.fetchPage / options / page / hasMore / q を参照）。
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
