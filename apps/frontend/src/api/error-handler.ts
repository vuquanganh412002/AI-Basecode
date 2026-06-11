import { message } from 'ant-design-vue';
import type { AxiosError } from 'axios';
import router from '@/router';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';

/**
 * Custom screen-specific error_codes whose toast is rendered by the caller
 * view (its catch handler shows a user-actionable message keyed off the
 * error_code). The global handler MUST skip toasting these so the user
 * doesn't see the same message twice. New codes are added here whenever a
 * view introduces an `if (error_code === 'X') message.error(...)` branch.
 *
 *  - DEADLINE_NOTICE_DUPLICATE: SCR-031 (お知らせ管理) create with
 *    publish_location=メニュー画面 + oshirase_type=締め切り時間 already
 *    has a record. View: OshiraseManagementView.applyServerErrors.
 *  - EXPORT_LIMIT_EXCEEDED: SCR-030 (ログ参照) export beyond row cap.
 *    View: LogListView export handler.
 *  - IMPORT_VALIDATION_ERROR: SCR-016 / SCR-019 (購読者 / 販売店 Excel取込)
 *    carry a per-row `errors[]`. The import views surface that detail
 *    themselves (販売店: toast, 購読者: inline row panel), so a generic
 *    global toast would just duplicate without the row context.
 */
const VIEW_HANDLED_CODES: ReadonlySet<string> = new Set([
  'DEADLINE_NOTICE_DUPLICATE',
  'EXPORT_LIMIT_EXCEEDED',
  'IMPORT_VALIDATION_ERROR',
]);

/**
 * Central Axios error handler.
 *
 * Strategy:
 *  - Auth endpoints (login / mfa/*): never redirect to /login — surface toast and let the
 *    calling form handle field-level errors.
 *  - `UNAUTHORIZED` outside auth endpoints: session is dead (HTTP-only cookie session,
 *    no token to refresh) → clear user state, redirect to /login with `redirect` query.
 *  - `FORBIDDEN`: toast + redirect to /dashboard (no standalone 403 page —
 *    keep the user on a working screen instead of a dead end).
 *  - `VALIDATION_ERROR`: do NOT toast — caller's form handler maps `errors[]`.
 *  - View-handled custom codes (`VIEW_HANDLED_CODES`): do NOT toast — caller toasts.
 *  - All other common codes: show a user-friendly toast.
 */
export async function handleApiError(
  error: AxiosError<ApiErrorResponse>,
): Promise<never> {
  const status = error.response?.status;
  const data = error.response?.data;
  const code = data?.error_code;
  const url = error.config?.url || '';

  // Screen-specific custom error_code that the calling view will toast.
  // Skip the global toast to avoid a duplicate banner.
  if (code && VIEW_HANDLED_CODES.has(code)) {
    throw error;
  }
  // User-initiated form posts where UNAUTHORIZED carries an actionable
  // meaning ("wrong password" / "wrong OTP") — toast it.
  const isAuthFormEndpoint =
    url.includes('/auth/login') ||
    url.includes('/auth/mfa/');
  // Background probe fired from main.ts on every page load to restore
  // the session from the cookie. A 401 here just means "user not logged
  // in" — expected on every fresh visit. Silent so we don't show
  // "セッションが切れました" the first time someone opens /login.
  const isRefreshProbe = url.includes('/auth/refresh');

  // Network error or non-JSON body — generic toast.
  if (!status || !data) {
    message.error('ネットワークエラーが発生しました。接続をご確認ください。');
    return Promise.reject(error);
  }

  switch (code) {
    // ─── SCR-001 specific — always toast, never redirect ────────────────
    case ErrorCode.INVALID_CREDENTIALS:
    case ErrorCode.ACCOUNT_LOCKED:
    case ErrorCode.INVALID_OTP:
    case ErrorCode.OTP_RESEND_COOLDOWN:
      message.error(data.message);
      break;

    // OTP expired / max attempts / resend limit / invalid mfa_token
    // → force user back to login (spec §11, §7.6, §8.3).
    case ErrorCode.OTP_EXPIRED:
    case ErrorCode.OTP_MAX_ATTEMPTS:
    case ErrorCode.OTP_RESEND_LIMIT:
    case ErrorCode.INVALID_MFA_TOKEN:
      message.error(data.message);
      await router.push({ name: 'Login' });
      break;

    case ErrorCode.UNAUTHORIZED: {
      if (isRefreshProbe) {
        // Bootstrap probe — caller (auth.store.refreshSession) catches and
        // clears state. No toast (would scare a user opening /login fresh).
        // No redirect (router isn't even mounted yet on first call).
        break;
      }
      if (isAuthFormEndpoint) {
        message.error(data.message);
        break;
      }
      // With HTTP-only session cookies the server's 401 means the Redis session
      // is already gone (expired or revoked). There is no refresh token to
      // swap in — retrying /auth/refresh would send the same dead cookie and
      // also 401. Drop client-side session state (user + codes cache) before
      // bouncing to /login so the next sign-in starts fresh.
      const { useAuthStore } = await import('@/stores/auth.store');
      useAuthStore().clearSession();
      await router.push({
        name: 'Login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
      break;
    }

    case ErrorCode.FORBIDDEN:
      message.error(data.message);
      await router.push({ name: 'Dashboard' });
      break;

    case ErrorCode.DATA_SCOPE_VIOLATION:
      message.error(data.message);
      break;

    // SCR-011 — account lacks paper_flg/denshi_flg for the row's 購読種別.
    // Toast only (no /dashboard bounce) — the user stays on the form.
    case ErrorCode.SHUBETSU_PERMISSION_DENIED:
      message.error(data.message);
      break;

    case ErrorCode.VALIDATION_ERROR:
      // Caller's useApiForm composable maps `errors[]` to form fields.
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
          'システムエラーが発生しました。しばらくしてから再度お試しください。',
      );
      break;
  }

  return Promise.reject(error);
}
