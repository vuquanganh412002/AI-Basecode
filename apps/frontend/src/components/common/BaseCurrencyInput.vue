<script setup lang="ts">
// BaseCurrencyInput — text input for monetary integers (JPY).
//
// Display UX (per customer spec for 単価 / 配達手数料 / 税抜金額 etc.):
//   - User types: raw digits `1234567` — no symbol, no separator.
//   - On blur:    formatted `¥1,234,567` (yen symbol + comma thousand-
//                 separator). Empty stays empty.
//   - On focus:   reverts to raw `1234567` so the user can edit without
//                 fighting the formatting.
//
// v-model emits `number | null`:
//   - Empty input → null
//   - "0"         → 0 (legitimate value)
//   - "1234567"   → 1234567
//
// BE shape stays integer — the formatting is purely UI; submit payload
// is the raw number (`form.kingaku_zeikomi ?? undefined` upstream).
//
// Defence layers mirror [[BaseDigitsInput]]:
//   1. autocorrect / autocapitalize / spellcheck off — kill OS-level
//      text substitution (macOS double-space → period etc.).
//   2. @beforeinput — preventDefault non-digit data; preventDefault
//      OS replacement events (inputType /Replace/i).
//   3. @keydown.space.prevent — clean block on typed space.
//   4. @update:value sanitiser — strip every non-digit and emit
//      `number | null`.
//
// `maxlength` applies to the RAW digit count (e.g. 10 = 9,999,999,999).
// When blurred the formatted string can be wider (14 chars including
// commas + ¥); we drop maxlength on blur to avoid antd silently
// clipping the formatted display. Re-applied on focus so typing
// respects the cap.

import { computed, ref } from 'vue';

interface Props {
  value: number | null | undefined;
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
  // toLocaleString('en-US') gives Western thousand separators (commas
  // + dot). For Japanese yen we use the same comma separator — same
  // glyph the design mockup ships, and customer-confirmed.
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
  const cleaned = String(v).replace(/\D+/g, '');
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
