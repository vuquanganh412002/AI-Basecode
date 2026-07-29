<script setup lang="ts">
// BaseCurrencyInput — 金額整数（JPY）用のテキスト入力。
//
// 表示 UX（単価 / 配達手数料 / 税抜金額 等の顧客仕様）:
//   - 入力中: 生の数字 `1234567`（記号・区切りなし）。
//   - blur:   整形 `¥1,234,567`（円記号 + カンマ桁区切り）。空は空のまま。
//   - focus:  生の `1234567` に戻し、整形と戦わずに編集できるようにする。
//
// v-model は `number | null` を emit:
//   - 空入力 → null
//   - "0"         → 0（正当な値）
//   - "1234567"   → 1234567
//
// BE の形は整数のまま — 整形は純粋に UI。送信ペイロードは生の数値
// （上流で `form.kingaku_zeikomi ?? undefined`）。
//
// 防御層は [[BaseDigitsInput]] と同様:
//   1. autocorrect / autocapitalize / spellcheck off — OS レベルのテキスト置換を無効化
//      （macOS ダブルスペース→ピリオド 等）。
//   2. @beforeinput — 非数字 data を preventDefault。OS 置換イベント（inputType /Replace/i）を preventDefault。
//   3. @keydown.space.prevent — 入力スペースをクリーンにブロック。
//   4. @update:value サニタイザ — 全非数字を除去し `number | null` を emit。
//
// `maxlength` は生の桁数に適用（例: 10 = 9,999,999,999）。blur 時の整形文字列は
// より長くなり得る（カンマ + ¥ 込みで 14 文字）ため、antd が整形表示を黙って切り詰めないよう
// blur で maxlength を外し、focus で再適用して入力は上限を守らせる。

import { computed, ref } from 'vue';

interface Props {
  value?: number | null;
  maxlength?: number;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}
const props = withDefaults(defineProps<Props>(), {
  value: null,
  maxlength: undefined,
  disabled: false,
  placeholder: undefined,
  id: undefined,
});

const emit = defineEmits<{
  'update:value': [value: number | null];
}>();

const isFocused = ref(false);

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) return '';
  if (isFocused.value) return String(props.value);
  // toLocaleString('en-US') は欧米式の桁区切り（カンマ + ドット）。日本円も同じ
  // カンマ区切りを使う — デザインモックと同じ字形で顧客確認済み。
  return `¥${props.value.toLocaleString('en-US')}`;
});

const effectiveMaxlength = computed(() =>
  isFocused.value ? props.maxlength : undefined,
);

function onFocus(): void {
  isFocused.value = true;
}

function onBlur(): void {
  isFocused.value = false;
}

function onBeforeInput(e: Event): void {
  const evt = e as InputEvent;
  if (typeof evt.data === 'string' && !/^\d*$/.test(evt.data)) {
    evt.preventDefault();
    return;
  }
  if (evt.inputType && /Replace/i.test(evt.inputType)) {
    evt.preventDefault();
  }
}

function onUpdate(v: string): void {
  const cleaned = String(v).replaceAll(/\D+/g, '');
  emit('update:value', cleaned === '' ? null : Number(cleaned));
}
</script>

<template>
  <a-input
    :value="displayValue"
    :maxlength="effectiveMaxlength"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :id="props.id"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    @focus="onFocus"
    @blur="onBlur"
    @beforeinput="onBeforeInput"
    @keydown.space.prevent
    @update:value="onUpdate"
  />
</template>
