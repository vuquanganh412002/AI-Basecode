<script setup lang="ts">
/**
 * 新規/編集フォーム用の 登録・キャンセル ボタンバー。
 *
 * プロジェクト規約（vue.md §Form footer）: **主アクションを左に、両ボタン左寄せ**。
 * submit ラベルは `isEdit` により `登録`（新規）/ `更新`（編集）で切替。
 * キャンセルは ナビゲーション規約に従い `前の画面に戻る`。
 *
 * 使用例（標準 CRUD フォーム）:
 * ```vue
 * <BaseFormFooter
 *   :is-edit="isEdit"
 *   :submitting="submitting"
 *   @cancel="onBack"
 * />
 * ```
 *
 * 非 CRUD フォーム（削除確認・ウィザードステップ）はラベル上書き:
 * ```vue
 * <BaseFormFooter
 *   submit-text="削除する"
 *   cancel-text="キャンセル"
 *   danger
 *   :submitting="submitting"
 *   @cancel="onCancel"
 * />
 * ```
 *
 * 権限ゲート（Tanka パターン — ロールに create/update 権限が無ければ submit を無効化）:
 * ```vue
 * <BaseFormFooter
 *   :is-edit="isEdit"
 *   :submitting="submitting"
 *   :disabled="!canSubmit"
 *   @cancel="onBack"
 * />
 * ```
 */
import { computed } from 'vue';

interface Props {
  /** 主ボタンを `登録` でなく `更新` にする。 */
  isEdit?: boolean;
  /** リクエスト中は両ボタンを無効化 + submit にスピナー表示。 */
  submitting?: boolean;
  /** submit を単独で無効化（例: ロールに create/update 権限が無い）。 */
  disabled?: boolean;
  /** 主ボタンのラベルを上書き（isEdit 既定を無視）。 */
  submitText?: string;
  /** キャンセルボタンのラベルを上書き。 */
  cancelText?: string;
  /** キャンセルボタンを完全に非表示（戻り先の無いフォーム向け）。 */
  hideCancel?: boolean;
  /** submit を破壊的操作（赤ボタン）にする。削除確認フォーム向け。 */
  danger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  submitting: false,
  disabled: false,
  submitText: undefined,
  cancelText: '前の画面に戻る',
  hideCancel: false,
  danger: false,
});

const emit = defineEmits<{
  cancel: [];
}>();

const computedSubmitText = computed(
  () => props.submitText ?? (props.isEdit ? '更新' : '登録'),
);
</script>

<template>
  <div
    class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2"
  >
    <a-button
      type="primary"
      html-type="submit"
      :loading="props.submitting"
      :disabled="props.disabled"
      :danger="props.danger"
    >
      {{ computedSubmitText }}
    </a-button>
    <a-button
      v-if="!props.hideCancel"
      data-test="btn-back"
      :disabled="props.submitting"
      @click="emit('cancel')"
    >
      {{ props.cancelText }}
    </a-button>
  </div>
</template>
