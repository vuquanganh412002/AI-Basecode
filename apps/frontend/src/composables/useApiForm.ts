import { ref } from 'vue';
import type { AxiosError } from 'axios';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';

/**
 * フィールド単位のバリデーションエラーを返す API を呼ぶフォーム送信の composable。
 *
 * 使用例:
 * ```ts
 * const { fieldErrors, submitting, submit } = useApiForm();
 *
 * async function onSubmit() {
 *   await submit(async () => {
 *     await api.createTanka(form);
 *     message.success('登録しました');
 *   });
 * }
 * ```
 *
 * BE が `VALIDATION_ERROR` を `errors: [{field, message}]` 付きで返すと、
 * `fieldErrors` が `{ [field]: message }` に populate される — フォーム項目に bind:
 * ```vue
 * <a-form-item :validate-status="fieldErrors.email ? 'error' : ''"
 *              :help="fieldErrors.email">
 * ```
 *
 * 非バリデーションエラー（401/403/500 等）は axios interceptor が処理済み
 * （トースト/リダイレクト）。当 composable はフィールド単位の詳細のみ露出する。
 */
export function useApiForm() {
  const fieldErrors = ref<Record<string, string>>({});
  const submitting = ref(false);

  function clearErrors(): void {
    fieldErrors.value = {};
  }

  async function submit<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (submitting.value) return undefined;
    submitting.value = true;
    clearErrors();
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const data = axiosErr.response?.data;
      if (
        data?.error_code === ErrorCode.VALIDATION_ERROR &&
        Array.isArray(data.errors)
      ) {
        fieldErrors.value = Object.fromEntries(
          data.errors.map((e) => [e.field, e.message]),
        );
      }
      return undefined;
    } finally {
      submitting.value = false;
    }
  }

  return { fieldErrors, submitting, submit, clearErrors };
}
