// Screen: shared — cross-module session payload builder
//
// Minimal SessionPayload builder for controller/service specs.
// Shape mirrors src/modules/auth/session.service.ts SessionPayload.

import type { SessionPayload } from '../../src/modules/auth/session.service';

export function buildSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  const now = new Date().toISOString();
  return {
    account_id: 1,
    login_id: 'admin01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    permissions: [
      'ja.view',
      'ja.create',
      'ja.update',
      'ja.delete',
    ],
    created_at: now,
    last_activity_at: now,
    ...overrides,
  };
}

export function buildChuokaiSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return buildSession({
    account_id: 2,
    login_id: 'chuokai01',
    role_id: 3,
    role_code: 'CHUOKAI',
    ja_id: 1,
    permissions: ['ja.view', 'ja.update'],
    ...overrides,
  });
}

export function buildJaHontenSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return buildSession({
    account_id: 3,
    login_id: 'hn01',
    role_id: 4,
    role_code: 'JA_HONTEN',
    ja_id: 1,
    permissions: ['ja.view', 'ja.update'],
    ...overrides,
  });
}

export function buildJaKanriShitenSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return buildSession({
    account_id: 4,
    login_id: 'ks01',
    role_id: 5,
    role_code: 'JA_KANRI_SHITEN',
    ja_id: 1,
    kanri_shiten_id: 1,
    permissions: [],
    ...overrides,
  });
}
