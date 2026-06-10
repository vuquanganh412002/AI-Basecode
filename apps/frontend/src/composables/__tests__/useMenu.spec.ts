// Drives src/composables/useMenu.ts. Both AppSidebar and DashboardView
// consume this composable so menu visibility stays in sync between the two
// surfaces — see also AppSidebar.spec.ts for the per-role label assertions.

import { describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMenu } from '@/composables/useMenu';
import { useAuthStore } from '@/stores/auth.store';

function seedAdmin(): void {
  setActivePinia(createPinia());
  useAuthStore().user = {
    account_id: 1,
    login_id: 'admin',
    account_name: '管理者',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: true,
    denshi_flg: false,
    email: 'admin@example.com',
    mfa_enable_flg: false,
    permissions: [
      'ja.view', 'kanri_shiten.view', 'account.view', 'oshirase.view',
      'file.upload', 'file.download', 'log.view', 'role.view',
    ],
  };
}

describe('useMenu', () => {
  describe('default (excludeRoot=false)', () => {
    it('should include the rootless Dashboard entry when excludeRoot is omitted', () => {
      seedAdmin();
      const { visibleSections } = useMenu();
      const headings = visibleSections.value.map((s) => s.heading);
      // First section has no heading (the Dashboard "メニュー画面" item).
      expect(headings[0]).toBeUndefined();
    });
  });

  describe('excludeRoot=true', () => {
    it('should drop the rootless Dashboard entry when excludeRoot is true', () => {
      seedAdmin();
      const { visibleSections } = useMenu({ excludeRoot: true });
      // Every visible section must have a heading — used by DashboardView so it
      // doesn't render a "go to dashboard" card while already on the dashboard.
      expect(
        visibleSections.value.every((s) => s.heading !== undefined),
      ).toBe(true);
    });
  });

  describe('empty permissions', () => {
    it('should return only the rootless Dashboard entry when user has no permissions', () => {
      setActivePinia(createPinia());
      useAuthStore().user = {
        account_id: 0,
        login_id: 'noone',
        account_name: '',
        role_id: 0,
        role_code: 'NONE',
        role_name: '',
        ja_id: null,
        kanri_shiten_id: null,
        todofuken_code: null,
        paper_flg: false,
        denshi_flg: false,
        email: '',
        mfa_enable_flg: false,
        permissions: [],
      };
      const { visibleSections } = useMenu();
      // Only the rootless section survives because every other item has a permission gate.
      expect(visibleSections.value).toHaveLength(1);
      expect(visibleSections.value[0].heading).toBeUndefined();
      expect(visibleSections.value[0].items).toHaveLength(1);
      expect(visibleSections.value[0].items[0].name).toBe('Dashboard');
    });
  });
});
