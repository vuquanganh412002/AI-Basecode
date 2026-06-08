import axiosInstance from '@/api/axios-instance';
import type { User } from '@/types';

export interface LoginRequest {
  login_id: string;
  password: string;
}

// Auth uses HTTP-only Cookie session (Redis-backed, 24h sliding TTL).
// The session ID lives in the cookie — never in response bodies or
// localStorage. These response types intentionally only carry the
// user object.

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
 * Self-service: toggle the caller's own MFA flag. account_id is read
 * from the authenticated session on the server — never from the URL.
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
 * ACSMS-API-012-001 — request a password reset email.
 *
 * Always resolves with the same success message whether `email` exists
 * or not (server-side account enumeration prevention). Unwraps the BE
 * envelope so the view sees `{ message }` directly.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await axiosInstance.post<{ message: string }>(
    '/api/v1/auth/forgot-password',
    { email },
  );
  return { message: res.data.message };
}

/**
 * ACSMS-API-012-002 — verify a reset token without consuming it.
 * Resolves with `{ valid: true }` for usable tokens; rejects with
 * INVALID_RESET_TOKEN / EXPIRED_RESET_TOKEN otherwise (axios shape).
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
 * ACSMS-API-012-003 — consume the reset token and set a new password.
 * Server destroys all existing Redis sessions for this account on
 * success so a stolen cookie stops working immediately.
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
