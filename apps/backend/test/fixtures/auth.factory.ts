// Screen: ACSMS-SCR-001 — ログイン画面
//
// Fixture builders for the auth module entities (Account, MfaOtp, Role,
// Permission, Oshirase). Mirror m_account / t_mfa_otp / m_roles /
// m_permissions / t_oshirase schema (docs/database/database-design.md +
// docs/database/seeder.md).
//
// Used in: auth.service.spec, auth.controller.spec, auth.integration.spec,
//          oshirase.service.spec.

import type { Account } from '@/database/entities/account.entity';
import type { MfaOtp } from '@/database/entities/mfa-otp.entity';
import type { Role } from '@/database/entities/role.entity';
import type { Oshirase } from '@/database/entities/oshirase.entity';

const NOW = new Date('2026-04-29T10:00:00Z');

export function buildAccount(overrides: Partial<Account> = {}): Account {
  return {
    accountId: 1,
    loginId: 'admin01',
    // bcrypt hash of 'P@ssw0rd123' (10 rounds) — services compare via
    // bcrypt.compare; specs override this when a literal hash is needed.
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv1234567890ABCDEFGHIJKLMN',
    accountName: '管理者太郎',
    roleId: 1,
    jaId: null,
    kanriShitenId: null,
    todofukenCode: null,
    paperFlg: false,
    denshiFlg: false,
    email: 'admin@nichino.co.jp',
    passwordUpdatedAt: NOW,
    lastLoginAt: null,
    loginFailureCount: 0,
    accountLockFlg: false,
    accountLockAt: null,
    biko: '',
    mfaEnableFlg: false,
    deletedAt: null,
    createdAt: NOW,
    createdBy: 'SYSTEM',
    updatedAt: NOW,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Account;
}

export function buildChuokaiAccount(overrides: Partial<Account> = {}): Account {
  return buildAccount({
    accountId: 3,
    loginId: 'chuokai01',
    accountName: '中央会太郎',
    roleId: 3,
    jaId: 1,
    kanriShitenId: null,
    todofukenCode: '13',
    paperFlg: true,
    denshiFlg: true,
    email: 'chuokai@ja-example.or.jp',
    mfaEnableFlg: true,
    ...overrides,
  });
}

export function buildLockedAccount(overrides: Partial<Account> = {}): Account {
  return buildAccount({
    accountLockFlg: true,
    accountLockAt: NOW,
    loginFailureCount: 5,
    ...overrides,
  });
}

export function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    roleId: 1,
    roleCode: 'NICHINO_ADMIN',
    roleName: '日農（管理者）',
    description: null,
    deletedAt: null,
    createdAt: NOW,
    createdBy: 'SYSTEM',
    updatedAt: NOW,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Role;
}

export function buildOtp(overrides: Partial<MfaOtp> = {}): MfaOtp {
  return {
    otpId: 100,
    accountId: 3,
    otpCodeHash: '$2a$10$ZZZZZZZZZZZZZZZZZZZZZZ12345678901234567890ABCDEFG',
    otpType: 1,
    expiredAt: new Date(Date.now() + 5 * 60 * 1000),
    verifyAttemptCount: 0,
    resendCount: 0,
    usedFlg: false,
    createdAt: new Date(),
    ...overrides,
  } as unknown as MfaOtp;
}

export function buildOshirase(overrides: Partial<Oshirase> = {}): Oshirase {
  return {
    oshiraseId: 1,
    jaId: null,
    oshiraseType: 1,
    publishLocation: 1,
    status: 2,
    title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
    content: '',
    publishStartDate: new Date('2026-04-10T00:00:00Z'),
    publishEndDate: null,
    targetKanriKubun: '',
    deletedAt: null,
    createdAt: NOW,
    createdBy: 'SYSTEM',
    updatedAt: NOW,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Oshirase;
}

/**
 * Default permissions list mirrored from the api.md happy-path example
 * (NICHINO_ADMIN). 25 codes — used to assert the response shape.
 */
export const ADMIN_PERMISSIONS: string[] = [
  'dokusya.create', 'dokusya.view', 'dokusya.update', 'dokusya.delete',
  'dokusya.import', 'dokusya.replace_hanbaiten',
  'hanbaiten.create', 'hanbaiten.view', 'hanbaiten.update', 'hanbaiten.delete',
  'hanbaiten.import',
  'tanka.create', 'tanka.view', 'tanka.update', 'tanka.delete',
  'account.create', 'account.view', 'account.update', 'account.delete',
  'oshirase.create', 'oshirase.view', 'oshirase.update', 'oshirase.delete',
  'log.view',
];
