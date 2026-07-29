<script setup lang="ts">
// BaseDigitsInput — `number | null` で保持する数値用のテキスト入力。
// 単価（税込）/（税抜）/ 配達手数料 等の顧客仕様は コントロール=テキスト + 半角数字のみ +
// 桁数 を指定 — <a-input-number> スピナーは UX が不適切（小数・負数の入力を許し、
// 仕様にない増減ボタンを露出する）。
//
// 防御層は [[BaseCodeInput]] と同様だが数字のみルール:
//   1. autocorrect/autocapitalize/spellcheck off — OS 置換を無効化。
//   2. @beforeinput — InputEvent.data に非数字が含まれる、または inputType が /Replace/i に
//      一致するとき preventDefault（macOS ダブルスペース→ピリオドを捕捉）。
//   3. @keydown.space.prevent — 入力スペースをクリーンにブロック（ちらつきなし）。
//   4. @update:value サニタイザ — 最終文字列から全非数字を除去し `number | null` を再 emit
//      （空入力 → null）。
//
// v-model は `number | null`。フォームコンポーネントで手動の文字列→数値変換をせずに
// 親の form-state 型が BE DTO の期待（`@IsOptional() @IsInt() @Min(0) @Max(...)`）に一致する。
//
// パススルー props: value (v-model), maxlength (= 最大桁数), disabled, placeholder, id。

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

import { computed } from 'vue';

// 内部 <a-input> は文字列で動くため、prop を表示用に一方向変換する。
const displayValue = computed(() =>
  props.value === null || props.value === undefined ? '' : String(props.value),
);

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
    :maxlength="props.maxlength"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :id="props.id"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    @beforeinput="onBeforeInput"
    @keydown.space.prevent
    @update:value="onUpdate"
  />
</template>
