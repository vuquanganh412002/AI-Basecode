<script setup lang="ts">
/**
 * サーバーページング + 検索対応の単価ドロップダウン。
 *
 * {@link BaseJaDropdown} / {@link BaseAccountDropdown} と同構造（初回50件/page・
 * `tanka_name` の 300ms デバウンス検索・popup-scroll で次ページ追加・編集時 include_id ピン）。
 * 状態機械は {@link useEntityDropdown}、本ファイルは単価固有設定（fetcher / idField /
 * label + ¥価格サフィックス / `tanka_type` フィルタ / hard な `jaId` カスケード）を束ねる。
 *
 * `jaId` でカスケード — 親が別 JA を選ぶと（NICHINO_STAFF 代行入力 フローのみ関係）
 * option リストをリセットし現在の選択もクリアする。JA A の価格が JA B 配下で作成中の
 * 販売店に紛れ込まないようにする（hard リセット）。
 *
 * サーバー側フィルタは opt-in（`filter-option={false}`）なので antd はクライアント側で絞り込まない。
 */
import { computed, toRef } from 'vue';
import {
  getTankaDropdown,
  type TankaDropdownItem,
  type TankaDropdownQuery,
} from '@/api/tanka/tanka';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** 選択中の tanka_id（`null`/`undefined` = 未選択）。 */
  value?: number | null;
  /**
   * リスト絞り込み用の m_code.code_category=TANKA_TYPE 値。
   * ACSMS-SCR-017 販売店作成は `2`（配達手数料）を渡す。
   */
  tankaType?: number;
  /**
   * 明示的な JA フィルタ — フォームが先に JA を選ぶ NICHINO_STAFF 代行入力 フローで指定。
   * session スコープ付きロール（CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN）は BE が
   * session から自動解決するため undefined でよい。
   */
  jaId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** ページサイズ上書き。既定 50。 */
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '配達手数料単価を選択',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
});

const emit = defineEmits<{
  // クリア時は常に `null` を emit（BaseJaDropdown と同じ「未選択」の統一表現）。
  'update:value': [v: number | null];
}>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');

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
} = useEntityDropdown<TankaDropdownItem, TankaDropdownQuery>({
  fetcher: getTankaDropdown,
  idField: 'tanka_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<TankaDropdownQuery> = {};
    if (props.tankaType !== undefined) extra.tanka_type = props.tankaType;
    if (props.jaId != null) extra.ja_id = props.jaId;
    return extra;
  },
  resetTriggers: [jaIdRef],
  // [cascade-on-ja] 単価カスケードは "hard"：親 JA 変更時（NICHINO_STAFF フロー）、
  // 読込済み単価リストは別 JA のもの。option リスト・ページング・現在選択をクリアし、
  // 呼び出し側 form-state に誤った JA の tanka_id を残さない（BE スコープフィルタで
  // どのみち通らない）。
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => {
    emit('update:value', null);
  },
  onSelect: (v) => {
    emit('update:value', v);
  },
});

/**
 * antd `<a-select>` ラベル。tanka_name + 括弧内の価格を表示 — 似た名称の
 * 配達手数料プランが複数あるとき、担当者がどの明細を選んでいるか確認できるようにする。
 */
const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.tanka_id,
    label: `${o.tanka_name} (¥${formatYen(o.kingaku_zeikomi)})`,
  })),
);

function formatYen(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ja-JP') : '0';
}

function onChange(v: number | undefined): void {
  composableOnChange(v);
}

// テスト用に内部状態を公開。
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
