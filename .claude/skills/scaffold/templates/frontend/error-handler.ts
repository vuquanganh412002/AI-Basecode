import { message } from 'ant-design-vue';
import type { AxiosError } from 'axios';
import router from '@/router';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';

/**
 * Central Axios error handler.
 *
 * Strategy:
 *  - `UNAUTHORIZED`: try silent refresh; if that fails, redirect to /login
 *  - `FORBIDDEN`: redirect to /403 (screen-level deny)
 *  - `VALIDATION_ERROR`: do NOT toast — caller's form handler maps `errors[]` via `useApiForm`
 *  - All other common codes: show a user-friendly toast
 *
 * Always re-throws so the calling component can run additional logic
 * (e.g. stop the spinner, highlight a field) if needed.
 */
export async function handleApiError(
  error: AxiosError<ApiErrorResponse>,
): Promise<never> {
  const status = error.response?.status;
  const data = error.response?.data;
  const code = data?.error_code;

  // Network error or non-JSON body — bail out with a generic toast.
  if (!status || !data) {
    message.error('ネットワークエラーが発生しました。接続をご確認ください。');
    return Promise.reject(error);
  }

  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return handleUnauthorized(error);

    case ErrorCode.FORBIDDEN:
      await router.push({ name: 'Forbidden' });
      break;

    case ErrorCode.DATA_SCOPE_VIOLATION:
      message.error(data.message);
      break;

    case ErrorCode.VALIDATION_ERROR:
      // Caller's useApiForm composable will map `errors[]` to form fields.
      break;

    case ErrorCode.DUPLICATE_CODE:
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.NOT_FOUND:
    case ErrorCode.CONFLICT:
    case ErrorCode.TOO_MANY_REQUESTS:
      message.error(data.message);
      break;

    case ErrorCode.INTERNAL_SERVER_ERROR:
    default:
      message.error(
        data.message ||
          'システムエラーが発生しました。しばらくしてから再度お試しください',
      );
      break;
  }

  return Promise.reject(error);
}

async function handleUnauthorized(
  error: AxiosError<ApiErrorResponse>,
): Promise<never> {
  // Avoid refresh loops: if the failing request IS the refresh endpoint,
  // skip straight to login redirect.
  const url = error.config?.url || '';
  if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
    await redirectToLogin();
    return Promise.reject(error);
  }

  try {
    const { useAuthStore } = await import('@/stores/auth.store');
    const authStore = useAuthStore();
    await authStore.refreshToken();
    // Caller's axios instance should retry the original request;
    // this handler just returns rejection so the retry can happen externally.
    return Promise.reject(error);
  } catch {
    await redirectToLogin();
    return Promise.reject(error);
  }
}

async function redirectToLogin(): Promise<void> {
  await router.push({
    name: 'Login',
    query: { redirect: router.currentRoute.value.fullPath },
  });
}
