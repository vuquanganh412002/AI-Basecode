import type { Page } from '@playwright/test';

export type RoleCode = 'NICHINO_ADMIN' | 'NICHINO_STAFF' | 'CHUOKAI' | 'JA_HONTEN' | 'JA_KANRI_SHITEN';

export interface SessionPayload {
  account_id: number;
  login_id: string;
  role_id: number;
  role_code: RoleCode;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  permissions: string[];
}

const TEST_ACCOUNTS: Record<RoleCode, { email: string; password: string }> = {
  NICHINO_ADMIN: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'nichino_admin@test.agrinews.jp',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Test1234!',
  },
  NICHINO_STAFF: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'nichino_admin@test.agrinews.jp',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Test1234!',
  },
  CHUOKAI: {
    email: process.env.TEST_CHUOKAI_EMAIL ?? 'chuokai@test.agrinews.jp',
    password: process.env.TEST_CHUOKAI_PASSWORD ?? 'Test1234!',
  },
  JA_HONTEN: {
    email: process.env.TEST_JA_HONTEN_EMAIL ?? 'ja_honten@test.agrinews.jp',
    password: process.env.TEST_JA_HONTEN_PASSWORD ?? 'Test1234!',
  },
  JA_KANRI_SHITEN: {
    email: process.env.TEST_JA_KANRI_EMAIL ?? 'ja_kanri@test.agrinews.jp',
    password: process.env.TEST_JA_KANRI_PASSWORD ?? 'Test1234!',
  },
};

/** Log in via UI and return to the given path. Session cookie is set by the server. */
export async function loginAs(page: Page, role: RoleCode, redirectPath = '/menu'): Promise<void> {
  const { email, password } = TEST_ACCOUNTS[role];
  await page.goto('/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL('**/mfa**', { timeout: 5000 }).catch(() => null);
  await page.waitForURL(`**${redirectPath}**`, { timeout: 10000 });
}

/** Build a mock SessionPayload for NestJS unit tests (no real Redis needed). */
export function createTestSessionPayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    account_id: 1,
    login_id: 'test_admin',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    permissions: ['*'],
    ...overrides,
  };
}

export function createChuokaiSession(jaId: number): SessionPayload {
  return createTestSessionPayload({
    role_code: 'CHUOKAI',
    role_id: 2,
    ja_id: jaId,
    permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
  });
}

export function createJaHontenSession(jaId: number): SessionPayload {
  return createTestSessionPayload({
    role_code: 'JA_HONTEN',
    role_id: 3,
    ja_id: jaId,
    permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
  });
}

export function createKanriShitenSession(jaId: number, kanriShitenId: number): SessionPayload {
  return createTestSessionPayload({
    role_code: 'JA_KANRI_SHITEN',
    role_id: 4,
    ja_id: jaId,
    kanri_shiten_id: kanriShitenId,
    permissions: ['dokusya.view'],
  });
}
