<script setup lang="ts">
// 都道府県セレクトの共通コンポーネント。
//
// 47件の静的マスタなので候補は全件クライアント保持し、検索も antd の既定
// フィルタ（option-filter-prop="label"）でクライアント側に閉じる。JA / 支店の
// ような件数の多いマスタ（BaseJaDropdown / BaseShitenSelect）はサーバ検索 +
// 無限スクロールだが、ここでそれを持ち込むのは無駄。
//
// [why-not-a-select-option] 以前は各画面が `<a-select-option>` を並べ、
// `filter-option` で `String(option.children).includes(input)` を書いていた。
// antd-vue 4 の option.children はスロット(vnode配列)で文字列ではないため、
// この比較は常に '[object Object]' 相手になり、何を打っても候補が0件だった。
// `:options` + option-filter-prop="label" に統一してこの罠を封じる。
import { computed, onMounted } from 'vue';

import { useTodofuken } from '@/composables/useTodofuken';

interface Props {
  /**
   * 選択中の都道府県コード（v-model:value）。
   *
   * 「未選択」は `null` / `undefined` / `''` のいずれでも受ける。呼び出し側の
   * 空表現がバラバラなため（フィルタ state は `''`、フォーム state は `null`）。
   */
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  /** 外側の <label for="..."> と紐付ける場合に指定。 */
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  placeholder: '都道府県を選択',
  disabled: false,
  allowClear: true,
  id: undefined,
});

const emit = defineEmits<{
  'update:value': [value: string];
  /** 選択変更。名称を別欄に出す画面向けに名称も渡す。 */
  change: [code: string, name: string];
}>();

const { items, load, name } = useTodofuken();

onMounted(() => {
  void load();
});

/**
 * antd へ渡す値。空文字は `undefined` に潰す。
 *
 * antd は `''` を「選択済みの値」として扱うため、そのまま渡すと placeholder が
 * 出ずに空欄の選択チップが描画される（SCR-022 のフィルタ初期値が `''` で、
 * 都道府県だけプレースホルダが消えていた）。null/undefined/'' を1つの
 * 「未選択」へ寄せる。
 */
const innerValue = computed(() => props.value || undefined);

/**
 * ラベルは「コード 名称」（例: `01 北海道`）。
 *
 * - 区切りはスペース。他のマスタ用セレクト（BaseShitenSelect /
 *   BaseHanbaitenSelect / BaseShitenDropdown）が `${code} ${name}` で揃っている
 *   ので、都道府県だけ `:` を挟むと一覧の見た目が割れる。
 * - コードを常に出すのは、検索対象が label なので「コードでも名称でも引ける」
 *   状態を全画面で同じにするため（画面ごとに出し分けると、同じ操作が画面に
 *   よって効いたり効かなかったりする）。
 */
const options = computed(() =>
  items.value.map((o) => ({
    value: o.todofuken_code,
    label: `${o.todofuken_code} ${o.todofuken_name}`,
  })),
);

function onChange(v: unknown): void {
  // allow-clear の × は undefined を渡す。空は `''` で返す — 呼び出し側の
  // state はどれも string 前提（フィルタ・フォームとも初期値が `''`）なので、
  // null を流すと型と初期値の両方から外れる。
  const code = (v ?? '') as string;
  emit('update:value', code);
  emit('change', code, name(code));
}
</script>

<template>
  <a-select
    :id="props.id"
    :value="innerValue"
    :options="options"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :allow-clear="props.allowClear"
    show-search
    option-filter-prop="label"
    class="w-full"
    @change="onChange"
  />
</template>
