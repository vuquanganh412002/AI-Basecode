<script setup lang="ts">
/**
 * サーバーページング + 検索対応の JA ドロップダウン。
 *
 * JA を紐付ける全フォーム（SCR-009 管理支店 / SCR-007 支店 / SCR-006 単価 等）で使用。
 * `<a-select>` + {@link useEntityDropdown} の薄いラッパ。状態機械（ページング・
 * デバウンス検索・無限スクロール・stale レスポンスガード・編集時 include_id ピン）は
 * composable が持ち、本ファイルは JA 固有設定（fetcher / idField / label / todofukenCode カスケード）を束ねる。
 *
 * サーバー側フィルタは opt-in（`filter-option={false}`）なので antd はクライアント側で絞り込まない。
 */
import { computed, toRef } from 'vue';
import {
  getJaDropdown,
  type JaDropdownItem,
  type JaDropdownQuery,
} from '@/api/ja/ja';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /**
   * 選択中の ja_id。`number | null | undefined` を受ける — null / undefined とも
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
   * ラベル形式。'code-name'（既定）は `${ja_code} ${ja_name}`、'name' は `${ja_name}` のみ。
   * SCR-024 アカウント一覧は UI から ja_code を隠すため 'name' を使う。
   */
  labelFormat?: 'code-name' | 'name';
  /**
   * BE の ILIKE 対象。'both'（既定）は ja_code OR ja_name、'name' は ja_name のみ。
   * 表示できないヒットで混乱しないよう `labelFormat='name'` と組で使う。
   */
  searchField?: 'both' | 'name';
  /**
   * 指定 都道府県 の JA に BE クエリを絞る。SCR-023 ファイルアップロード（都道府県 picker が
   * JA ドロップダウンにカスケード）で使用。変更時は選択解除 + 1ページ目再読込。
   */
  todofukenCode?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'JAを選択',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
  labelFormat: 'code-name',
  searchField: 'both',
  todofukenCode: null,
});

const emit = defineEmits<{
  // クリア時は常に `null` を emit — 呼び出し側は 1 型のみ扱えばよい。
  'update:value': [v: number | null];
  /**
   * ユーザーが行を選択したとき `update:value` と同時に発火。option 全体
   * （ja_code + ja_name + todofuken_code + chuokai_flg）を渡すので、追加 GET なしに
   * ja_code を表示したい呼び出し側（SCR-023「対象JA」複数選択チップ等）が内部 option 配列を
   * 探さずに済む。X クリア時は `null`。
   */
  select: [item: JaDropdownItem | null];
}>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');
const todofukenCodeRef = toRef(props, 'todofukenCode');

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
} = useEntityDropdown<JaDropdownItem, JaDropdownQuery>({
  fetcher: getJaDropdown,
  idField: 'ja_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<JaDropdownQuery> = {};
    // 'name' 絞り込み時のみ match_field を送る（既定は BE が未指定を 'both' 扱い）。
    if (props.searchField === 'name') extra.match_field = 'name';
    // 都道府県 絞り込みは指定時のみ送る（BE は空/null を無視）。
    if (props.todofukenCode) extra.todofuken_code = props.todofukenCode;
    return extra;
  },
  resetTriggers: [todofukenCodeRef],
  // JA カスケードは "soft" — 都道府県変更をまたいで `q` と既存 options を保持し、
  // 親の選択を自動クリアしない。
  resetMode: 'soft',
  onSelect: (v, item) => {
    emit('update:value', v);
    emit('select', item);
  },
});

/**
 * antd `<a-select>` は option の `label` を表示する。既定は `{ja_code} {ja_name}` を
 * 合成し両方で照合可能に、'name' モードは code を隠す呼び出し側（SCR-024）向けに ja_name のみ。
 */
const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.ja_id,
    label:
      props.labelFormat === 'name' ? o.ja_name : `${o.ja_code} ${o.ja_name}`,
  })),
);

function onChange(v: number | undefined): void {
  // composable が選択行を解決し onSelect コールバックを呼ぶ（両 emit 発火済み）。追加処理不要。
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
