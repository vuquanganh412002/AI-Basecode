<script setup lang="ts">
// BaseCodeInput — コード系フィールド（ja_code, tanka_code, login_id, bank_code,
// yubin_no …）向けに <a-input> を空白防御 4 層でラップ。コードは英数字の識別子で、
// 空白を BE に届けてはならない理由:
//   - UNIQUE インデックスが `'T001'` と `'T001 '` を別行として扱う
//   - bank/Zengin CSV エクスポートは前後空白を拒否
//   - macOS「ダブルスペース→ピリオド」変換が `.` を混入させる（本コンポーネントの発端）
//
// 防御層（発火順）:
//   1. autocorrect/autocapitalize/spellcheck off — OS レベルのテキスト置換を無効化。
//      ブラウザへのベストエフォートなヒントで macOS では 100% ではない。
//   2. @beforeinput — InputEvent.data に空白が含まれる、または inputType が /Replace/i に
//      一致するとき preventDefault（keydown.prevent の後に "insertReplacementText" として
//      発火する macOS ダブルスペース→ピリオドを捕捉）。
//   3. @keydown.space.prevent — キーストローク層でクリーンにブロックしカーソルの
//      ちらつきを防ぐ。
//   4. @update:value サニタイザ — paste / IME / 上記をすり抜けたものから \s を最終除去。
//
// パススルー props: value (v-model), maxlength, disabled, placeholder, id。
// 新規 props はフォームが実際に必要とするときのみ追加。

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
