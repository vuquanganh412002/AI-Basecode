import { ref } from 'vue';
import axios, { type AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/constants/error-codes';

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
 * BE が `errors: [{field, message}]` 付きでエラーを返すと（`VALIDATION_ERROR`
 * が最も多いが、`DUPLICATE_CODE` 等も対象フィールドを特定できる場合は同じ形で
 * `errors[]` を付けて返す — 例: 販売店コード重複、ログインID重複）、
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
      // 非 HTTP エラー（fn() 内の post-success 処理のバグ等）は axios interceptor を
      // 経由しておらずトースト済みでない。黙って握りつぶさず App.vue の
      // onErrorCaptured / main.ts errorHandler へ伝播させる。
      // `'response' in err` は axios.isAxiosError() に加えたフォールバック —
      // プロジェクト全体のテストフィクスチャ（例: test/fixtures/password-reset.fixture.ts
      // の buildAxiosError）が `isAxiosError` を持たないプレーンオブジェクト
      // `{ response: { status, data } }` で reject する慣習のため。
      const isHttpError =
        axios.isAxiosError(err) ||
        (typeof err === 'object' && err !== null && 'response' in err);
      if (!isHttpError) {
        console.error('useApiForm: unexpected non-HTTP error in submit()', err);
        throw err;
      }
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const data = axiosErr.response?.data;
      // `VALIDATION_ERROR` が最多だが、`DUPLICATE_CODE`（例: 販売店コード/
      // ログインID重複）等も field を特定できる場合は同じ `errors[]` 形で
      // 返る — error_code を問わず、その形が付いていれば fieldErrors へ
      // マップする（HanbaitenFormView / AccountFormView の実際の contract）。
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
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
