// Drives src/api/auth/auth.ts. The auth wrapper unwraps the BE
// `{ data: ... }` envelope so views consume the inner payload
// directly. Lock the URL + method for every endpoint so a typo
// can't silently 404 in production.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const get = vi.fn();
const patch = vi.fn();

vi.mock('@/api/axios-instance', () => ({
  default: {
    post: (...a: unknown[]) => post(...a),
    get: (...a: unknown[]) => get(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}));

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  patch.mockReset();
});

describe('auth API wrapper', () => {
  it('login() posts /api/v1/auth/login and unwraps data', async () => {
    const { login } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { data: { mfa_required: false, user: { id: 1 } } } });
    const out = await login({ login_id: 'a', password: 'b' });
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', { login_id: 'a', password: 'b' });
    expect(out).toEqual({ mfa_required: false, user: { id: 1 } });
  });

  it('verifyMfa() posts /api/v1/auth/mfa/verify and unwraps data', async () => {
    const { verifyMfa } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { data: { user: { id: 7 } } } });
    const out = await verifyMfa({ mfa_token: 't', otp_code: '123456' });
    expect(post).toHaveBeenCalledWith('/api/v1/auth/mfa/verify', { mfa_token: 't', otp_code: '123456' });
    expect(out).toEqual({ user: { id: 7 } });
  });

  it('resendMfa() posts /api/v1/auth/mfa/resend with mfa_token in body', async () => {
    const { resendMfa } = await import('@/api/auth/auth');
    post.mockResolvedValue({
      data: { data: { mfa_token: 't2', expires_in: 300, resend_count: 2, max_resend: 3 } },
    });
    const out = await resendMfa('orig-token');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/mfa/resend', { mfa_token: 'orig-token' });
    expect(out.resend_count).toBe(2);
  });

  it('refresh() posts /api/v1/auth/refresh (no body) and unwraps user', async () => {
    const { refresh } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { data: { user: { id: 9 } } } });
    const out = await refresh();
    expect(post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    expect(out).toEqual({ user: { id: 9 } });
  });

  it('logout() posts /api/v1/auth/logout and returns void', async () => {
    const { logout } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: {} });
    await expect(logout()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/api/v1/auth/logout');
  });

  it('fetchLoginOshirase() GETs /api/v1/oshirase/login with default limit=20', async () => {
    const { fetchLoginOshirase } = await import('@/api/auth/auth');
    get.mockResolvedValue({ data: { data: [{ oshirase_id: 1 }] } });
    const out = await fetchLoginOshirase();
    expect(get).toHaveBeenCalledWith('/api/v1/oshirase/login', {
      params: { limit: 20 },
    });
    expect(out).toEqual([{ oshirase_id: 1 }]);
  });

  it('fetchLoginOshirase() forwards custom limit when passed', async () => {
    const { fetchLoginOshirase } = await import('@/api/auth/auth');
    get.mockResolvedValue({ data: { data: [] } });
    await fetchLoginOshirase(5);
    expect(get).toHaveBeenCalledWith('/api/v1/oshirase/login', {
      params: { limit: 5 },
    });
  });

  it('toggleMfa() PATCHes /api/v1/account/me/mfa with { enabled } and unwraps', async () => {
    const { toggleMfa } = await import('@/api/auth/auth');
    patch.mockResolvedValue({
      data: { data: { mfa_enable_flg: true, message: 'MFAを有効にしました。' } },
    });
    const out = await toggleMfa(true);
    expect(patch).toHaveBeenCalledWith('/api/v1/account/me/mfa', { enabled: true });
    expect(out.mfa_enable_flg).toBe(true);
  });

  it('forgotPassword() posts /api/v1/auth/forgot-password and returns { message }', async () => {
    const { forgotPassword } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { message: 'メールを送信しました。' } });
    const out = await forgotPassword('admin01', 'x@example.com');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
      login_id: 'admin01',
      email: 'x@example.com',
    });
    expect(out).toEqual({ message: 'メールを送信しました。' });
  });

  it('verifyResetToken() posts /api/v1/auth/reset-password/verify with { token } and unwraps', async () => {
    const { verifyResetToken } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { data: { valid: true } } });
    const out = await verifyResetToken('rt');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/reset-password/verify', { token: 'rt' });
    expect(out).toEqual({ valid: true });
  });

  it('resetPassword() posts /api/v1/auth/reset-password with the full body and returns { message }', async () => {
    const { resetPassword } = await import('@/api/auth/auth');
    post.mockResolvedValue({ data: { message: 'パスワードを更新しました。' } });
    const body = { token: 'rt', new_password: 'P@ss12345', confirm_password: 'P@ss12345' };
    const out = await resetPassword(body);
    expect(post).toHaveBeenCalledWith('/api/v1/auth/reset-password', body);
    expect(out).toEqual({ message: 'パスワードを更新しました。' });
  });
});
