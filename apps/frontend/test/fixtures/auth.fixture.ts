// Test fixtures for ACSMS-SCR-001 (ログイン画面 + MFA画面).
// Shapes mirror docs/design/ACSMS-SCR-001/ACSMS-SCR-001-api.md
// レスポンスデータ + frontend `User` type from `@/types`.

import type { User } from '@/types';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    account_id: 1,
    login_id: 'admin01',
    account_name: '管理者太郎',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農（管理者）',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: false,
    denshi_flg: false,
    email: 'admin@nichino.co.jp',
    mfa_enable_flg: false,
    permissions: [
      'dokusya.view',
      'dokusya.create',
      'tanka.view',
      'ja.view',
      'oshirase.view',
    ],
    ...overrides,
  };
}

/** Default no-MFA login response body (backend's `data` field). */
export function buildLoginNoMfaResponse(overrides: Partial<User> = {}) {
  return {
    mfa_required: false as const,
    user: buildUser(overrides),
  };
}

/** Default MFA-required login response body. */
export function buildLoginMfaResponse(overrides: { mfa_token?: string; expires_in?: number } = {}) {
  return {
    mfa_required: true as const,
    mfa_token: overrides.mfa_token ?? '550e8400-e29b-41d4-a716-446655440000',
    expires_in: overrides.expires_in ?? 300,
  };
}

/** Default MFA verify success body. */
export function buildMfaVerifyResponse(overrides: Partial<User> = {}) {
  return {
    user: buildUser(overrides),
  };
}

/** Default MFA resend success body. */
export function buildMfaResendResponse(overrides: Partial<{
  mfa_token: string;
  expires_in: number;
  resend_count: number;
  max_resend: number;
}> = {}) {
  return {
    mfa_token: overrides.mfa_token ?? '660e8400-e29b-41d4-a716-446655440001',
    expires_in: overrides.expires_in ?? 300,
    resend_count: overrides.resend_count ?? 2,
    max_resend: overrides.max_resend ?? 3,
  };
}

export interface LoginOshiraseFixture {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

export function buildLoginOshirase(
  overrides: Partial<LoginOshiraseFixture> = {},
): LoginOshiraseFixture {
  return {
    oshirase_id: 1,
    oshirase_type: 1,
    oshirase_type_label: 'システム',
    title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
    publish_start_date: '2026-04-10',
    ...overrides,
  };
}
