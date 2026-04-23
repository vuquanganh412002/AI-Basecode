<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

interface Props {
  modelValue: string;
  length?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  length: 6,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  complete: [value: string];
}>();

const digits = ref<string[]>(Array.from({ length: props.length }, () => ''));
const inputs = ref<(HTMLInputElement | null)[]>([]);

// Sync prop → internal
watch(
  () => props.modelValue,
  (v) => {
    const padded = v.padEnd(props.length, '').slice(0, props.length);
    digits.value = padded.split('').map((c) => (/\d/.test(c) ? c : ''));
  },
  { immediate: true },
);

function emitJoined(): void {
  const value = digits.value.join('');
  emit('update:modelValue', value);
  if (value.length === props.length && !value.includes('')) {
    emit('complete', value);
  }
}

function onInput(idx: number, e: Event): void {
  const el = e.target as HTMLInputElement;
  const raw = el.value.replace(/\D/g, '');
  if (!raw) {
    digits.value[idx] = '';
    emitJoined();
    return;
  }
  // Support paste of full code
  if (raw.length > 1) {
    raw.split('').forEach((c, i) => {
      if (idx + i < props.length) digits.value[idx + i] = c;
    });
    const nextIdx = Math.min(idx + raw.length, props.length - 1);
    void nextTick(() => inputs.value[nextIdx]?.focus());
    emitJoined();
    return;
  }
  digits.value[idx] = raw;
  if (idx < props.length - 1) {
    void nextTick(() => inputs.value[idx + 1]?.focus());
  }
  emitJoined();
}

function onKeydown(idx: number, e: KeyboardEvent): void {
  if (e.key === 'Backspace' && !digits.value[idx] && idx > 0) {
    void nextTick(() => inputs.value[idx - 1]?.focus());
  }
  if (e.key === 'ArrowLeft' && idx > 0) {
    void nextTick(() => inputs.value[idx - 1]?.focus());
  }
  if (e.key === 'ArrowRight' && idx < props.length - 1) {
    void nextTick(() => inputs.value[idx + 1]?.focus());
  }
}
</script>

<template>
  <div class="flex justify-between gap-2">
    <input
      v-for="(digit, idx) in digits"
      :key="idx"
      :ref="(el) => (inputs[idx] = el as HTMLInputElement | null)"
      :value="digit"
      :disabled="props.disabled"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="w-12 h-14 text-center text-xl font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
      @input="(e: Event) => onInput(idx, e)"
      @keydown="(e: KeyboardEvent) => onKeydown(idx, e)"
    />
  </div>
</template>
