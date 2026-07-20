<script setup lang="ts">
// BaseCodeInput — wraps <a-input> with 4 layers of whitespace defence
// for code-style fields (ja_code, tanka_code, login_id, bank_code,
// yubin_no, …). Codes are alphanumeric identifiers; whitespace must
// never reach the BE because:
//   - UNIQUE indexes treat `'T001'` and `'T001 '` as distinct rows
//   - bank/Zengin CSV exports reject leading/trailing whitespace
//   - macOS "double-space → period" substitution silently injects `.`
//     into a code field, which is the trigger for this component.
//
// Defence layers (in order of fire):
//   1. autocorrect/autocapitalize/spellcheck off — disables OS-level
//      text replacement for this field. Best-effort hint to the
//      browser; not 100% on macOS.
//   2. @beforeinput — preventDefault when InputEvent.data contains
//      whitespace, OR when inputType matches /Replace/i (catches
//      macOS double-space-to-period which fires as
//      "insertReplacementText" AFTER keydown.prevent).
//   3. @keydown.space.prevent — clean block at the keystroke layer
//      so no cursor flicker on each typed space.
//   4. @update:value sanitiser — final \s strip from paste / IME /
//      anything that bypassed the above.
//
// Pass-through props: value (v-model), maxlength, disabled,
// placeholder, id. Add new props only when a form actually needs them.

interface Props {
  value?: string;
  maxlength?: number;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}
const props = withDefaults(defineProps<Props>(), {
  value: '',
  maxlength: undefined,
  disabled: false,
  placeholder: undefined,
  id: undefined,
});

const emit = defineEmits<{
  'update:value': [value: string];
}>();

function onBeforeInput(e: Event): void {
  const evt = e as InputEvent;
  if (typeof evt.data === 'string' && /\s/.test(evt.data)) {
    evt.preventDefault();
    return;
  }
  if (evt.inputType && /Replace/i.test(evt.inputType)) {
    evt.preventDefault();
  }
}

function onUpdate(v: string): void {
  emit('update:value', String(v).replaceAll(/\s+/g, ''));
}
</script>

<template>
  <a-input
    :value="props.value"
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
