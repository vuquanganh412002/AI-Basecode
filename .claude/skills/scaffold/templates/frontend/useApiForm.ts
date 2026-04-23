import { ref } from 'vue';
import type { AxiosError } from 'axios';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';

/**
 * Composable for handling form submissions that call APIs returning
 * field-level validation errors.
 *
 * Usage:
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
 * When the backend returns `VALIDATION_ERROR` with `errors: [{field, message}]`,
 * `fieldErrors` will be populated as `{ [field]: message }` — bind to form items:
 * ```vue
 * <a-form-item :validate-status="fieldErrors.email ? 'error' : ''"
 *              :help="fieldErrors.email">
 * ```
 *
 * Non-validation errors (401, 403, 500, etc.) are already handled by the
 * axios interceptor (toast / redirect). This composable only surfaces
 * field-level details.
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
