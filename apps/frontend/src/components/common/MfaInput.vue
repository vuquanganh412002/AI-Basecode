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

// prop → 内部状態を同期
watch(
  () => props.modelValue,
  (v) => {
    digits.value = Array.from({ length: props.length }, (_, i) => {
      const c = v[i] ?? '';
      return /\d/.test(c) ? c : '';
    });
  },
  { immediate: true },
);

function emitJoined(): void {
  const value = digits.value.join('');
  emit('update:modelValue', value);
  // 全枠が埋まっている必要がある。NOTE: `value.includes('')` は使えない —
  // 空文字は任意文字列の部分文字列なので満杯のコードでも true を返す。配列を直接確認する。
  if (value.length === props.length && !digits.value.includes('')) {
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
  // コード全体の貼り付けに対応
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

// 明示的な paste ハンドラ — さもなくば `maxlength="1"` が 1 文字に切り詰める。
function onPaste(e: ClipboardEvent): void {
  e.preventDefault();
  const text = e.clipboardData?.getData('text') ?? '';
  const code = text.replace(/\D/g, '').slice(0, props.length);
  if (!code) return;
  digits.value = Array.from({ length: props.length }, (_, i) => code[i] ?? '');
  const lastIdx = Math.min(code.length, props.length) - 1;
  void nextTick(() => inputs.value[lastIdx]?.focus());
  emitJoined();
}
</script>

<template>
  <!--
    6桁 OTP は「1文字入力 × 6」。桁ごとに見えるラベルを置くとレイアウトが壊れる
    ため、グループ名は視覚的に隠した見出しで、各桁の位置は読み上げ用ラベル
    （「認証コード 3桁目」）で伝える。各入力の id は見えるラベルとの紐付け用では
    なく、支援技術と自動テストのための識別子。

    グループ化に ARIA ロール属性ではなくネイティブのフォームグループ要素を使うのは、
    支援技術の対応範囲が広いため（Sonar Web:S6819）。
  -->
  <fieldset class="flex justify-between gap-2 border-0 p-0 m-0 min-w-0">
    <legend class="sr-only">認証コード（6桁）</legend>
    <input
      v-for="(digit, idx) in digits"
      :id="`mfa-digit-${idx + 1}`"
      :key="idx"
      :ref="(el) => (inputs[idx] = el as HTMLInputElement | null)"
      :value="digit"
      :aria-label="`認証コード ${idx + 1}桁目`"
      :disabled="props.disabled"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="w-12 h-14 text-center text-xl font-bold !border !border-border-strong !rounded-lg !bg-surface-card !text-text-main focus:!border-primary focus:!ring-2 focus:!ring-primary/10 !outline-none !transition-colors disabled:!bg-surface-hover disabled:!cursor-not-allowed"
      @input="(e: Event) => onInput(idx, e)"
      @keydown="(e: KeyboardEvent) => onKeydown(idx, e)"
      @paste="onPaste"
    />
  </fieldset>
</template>
