import axiosInstance from '@/api/axios-instance';
import type { User } from '@/types';

export interface LoginRequest {
  login_id: string;
  password: string;
}

// 認証は HTTP-only Cookie セッション（Redis, 24h スライディングTTL）。
// セッションIDは cookie 内のみで、レスポンス body や localStorage には持たない。
// これらレスポンス型は意図的に user オブジェクトのみを運ぶ。

export type LoginResponse =
  | {
      data: {
        mfa_required: false;
        user: User;
      };
    }
  | {
      data: {
        mfa_required: true;
        mfa_token: string;
        expires_in: number;
      };
    };

export interface MfaVerifyRequest {
  mfa_token: string;
  otp_code: string;
}

export interface MfaVerifyResponse {
  data: {
    user: User;
  };
}

export interface MfaResendResponse {
  data: {
    mfa_token: string;
    expires_in: number;
    resend_count: number;
    max_resend: number;
  };
}

export interface RefreshResponse {
  data: {
    user: User;
  };
}

export interface LoginOshiraseItem {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

export async function login(body: LoginRequest): Promise<LoginResponse['data']> {
  const res = await axiosInstance.post<LoginResponse>('/api/v1/auth/login', body);
  return res.data.data;
}

export async function verifyMfa(body: MfaVerifyRequest): Promise<MfaVerifyResponse['data']> {
  const res = await axiosInstance.post<MfaVerifyResponse>('/api/v1/auth/mfa/verify', body);
  return res.data.data;
}

export async function resendMfa(mfaToken: string): Promise<MfaResendResponse['data']> {
  const res = await axiosInstance.post<MfaResendResponse>('/api/v1/auth/mfa/resend', {
    mfa_token: mfaToken,
  });
  return res.data.data;
}

export async function refresh(): Promise<RefreshResponse['data']> {
  const res = await axiosInstance.post<RefreshResponse>('/api/v1/auth/refresh');
  return res.data.data;
}

export async function logout(): Promise<void> {
  await axiosInstance.post('/api/v1/auth/logout');
}

export async function fetchLoginOshirase(
  limit = 20,
): Promise<LoginOshiraseItem[]> {
  const res = await axiosInstance.get<{ data: LoginOshiraseItem[] }>(
    '/api/v1/oshirase/login',
    { params: { limit } },
  );
  return res.data.data;
}

export interface ToggleMfaResponse {
  data: {
    mfa_enable_flg: boolean;
    message: string;
  };
}

/**
 * セルフ操作: 自分の MFA フラグを切り替える。account_id は URL ではなく
 * サーバ側の認証セッションから読む。
 */
export async function toggleMfa(enabled: boolean): Promise<ToggleMfaResponse['data']> {
  const res = await axiosInstance.patch<ToggleMfaResponse>(
    '/api/v1/account/me/mfa',
    { enabled },
  );
  return res.data.data;
}

// ─── SCR-012 password reset / change password ────────────────────────────

/**
 * ACSMS-API-012-001 — パスワードリセットメール要求。
 *
 * login_id と email の両方を取り、ペアで絞ることで非ユニークな email が
 * 任意アカウントをリセットしないようにする。ペアが一致してもしなくても常に
 * 同じ成功メッセージを返す（サーバ側アカウント列挙防止）。BE envelope を
 * ほどき view には `{ message }` を直接渡す。
 */
export async function forgotPassword(
  loginId: string,
  email: string,
): Promise<{ message: string }> {
  const res = await axiosInstance.post<{ message: string }>(
    '/api/v1/auth/forgot-password',
    { login_id: loginId, email },
  );
  return { message: res.data.message };
}

/**
 * ACSMS-API-012-002 — リセットトークンを消費せず検証する。
 * 有効なトークンは `{ valid: true }`、無効時は INVALID_RESET_TOKEN /
 * EXPIRED_RESET_TOKEN で reject（axios 形）。
 */
export async function verifyResetToken(token: string): Promise<{ valid: true }> {
  const res = await axiosInstance.post<{ data: { valid: true } }>(
    '/api/v1/auth/reset-password/verify',
    { token },
  );
  return res.data.data;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

/**
 * ACSMS-API-012-003 — リセットトークンを消費し新パスワードを設定。
 * 成功時サーバは当該アカウントの既存 Redis セッションを全破棄し、盗まれた
 * cookie が即座に無効になる。
 */
export async function resetPassword(
  body: ResetPasswordRequest,
): Promise<{ message: string }> {
  const res = await axiosInstance.post<{ message: string }>(
    '/api/v1/auth/reset-password',
    body,
  );
  return { message: res.data.message };
}
