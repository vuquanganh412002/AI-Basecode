<script setup lang="ts">
interface Props {
  open: boolean;
  title?: string;
  content: string;
  okText?: string;
  cancelText?: string;
  /** OK ボタンを破壊的操作（赤）にする — 削除確認向け。 */
  danger?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '確認',
  okText: 'はい',
  cancelText: 'いいえ',
  danger: false,
  loading: false,
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  ok: [];
  cancel: [];
}>();

function onOk(): void {
  emit('ok');
}
function onCancel(): void {
  emit('update:open', false);
  emit('cancel');
}
</script>

<template>
  <a-modal
    :open="props.open"
    :title="props.title"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    :ok-type="props.danger ? 'primary' : 'primary'"
    :ok-button-props="{ danger: props.danger, loading: props.loading }"
    centered
    @ok="onOk"
    @cancel="onCancel"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <p class="whitespace-pre-line">{{ props.content }}</p>
  </a-modal>
</template>
