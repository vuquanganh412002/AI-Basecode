<script setup lang="ts">
// BaseDigitsInput — text input for numeric values stored as
// `number | null`. Customer spec for fields like 単価（税込）/（税抜）/
// 配達手数料 specifies コントロール=テキスト + 半角数字のみ + 桁数 — so an
// <a-input-number> spinner is wrong UX (it lets users type decimals,
// negatives, and exposes increment buttons the spec doesn't ask for).
//
// Defence layers mirror [[BaseCodeInput]] but with digit-only rule:
//   1. autocorrect/autocapitalize/spellcheck off — kill OS substitution.
//   2. @beforeinput — preventDefault when InputEvent.data contains
//      any non-digit character, OR when inputType matches /Replace/i
//      (catches macOS double-space → period).
//   3. @keydown.space.prevent — block typed space cleanly (no flicker).
//   4. @update:value sanitiser — strip every non-digit from the final
//      string and re-emit as `number | null` (empty input → null).
//
// v-model is `number | null` so the parent's form-state type matches
// what the BE DTO expects (`@IsOptional() @IsInt() @Min(0) @Max(...)`)
// without manual string-to-number conversion in the form component.
//
// Pass-through props: value (v-model), maxlength (= max digit count),
// disabled, placeholder, id.

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

// Inner <a-input> works on strings — convert the prop one-way for display.
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
