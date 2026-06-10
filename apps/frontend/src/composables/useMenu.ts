import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { MENU_SECTIONS, type MenuSection } from '@/constants/menu-sections';
import { RoleCode } from '@/constants/enums';

/**
 * For NICHINO_STAFF, the 販売店 screens are operated in 代行 (proxy-input)
 * mode on behalf of a JA. Surface that in the label so staff know they're
 * acting as a proxy — 販売店情報登録（代行）/ 販売店明細検索（代行）. Keyed
 * by route name; only these entries get the suffix, and only for staff.
 * Other roles see the plain labels. (Replaces the old standalone
 * 販売店代行入力 menu entry, removed from MENU_SECTIONS in 2026-06.)
 */
const STAFF_DAIKO_LABEL_SUFFIX = '（代行）';
const STAFF_DAIKO_ROUTE_NAMES: ReadonlySet<string> = new Set([
  'HanbaitenCreate',
  'HanbaitenList',
]);

export interface UseMenuOptions {
  /**
   * Drop the rootless top-level entry (the Dashboard "メニュー画面" item)
   * from the visible result. DashboardView sets this to true so it doesn't
   * render a "go to dashboard" card while already on the dashboard.
   */
  excludeRoot?: boolean;
}

/**
 * Returns the menu sections the current user is allowed to see, in the
 * canonical order defined in `src/constants/menu-sections.ts`. An item is
 * visible when it has no `permission` (e.g. Dashboard) or when the user's
 * session permissions[] contains the required one. Empty sections (every
 * item filtered out) are dropped — sections are auto-collapsed.
 *
 * Used by both AppSidebar (left rail) and DashboardView (SCR-010 menu cards)
 * so the two surfaces stay in sync.
 */
export function useMenu(options: UseMenuOptions = {}): {
  visibleSections: ComputedRef<MenuSection[]>;
} {
  const authStore = useAuthStore();

  const visibleSections = computed<MenuSection[]>(() => {
    const isStaff = authStore.user?.role_code === RoleCode.NICHINO_STAFF;
    return MENU_SECTIONS
      .filter((section) => !options.excludeRoot || section.heading !== undefined)
      .map((section) => ({
        ...section,
        items: section.items
          .filter((it) => !it.permission || authStore.hasPermission(it.permission))
          .map((it) =>
            isStaff && STAFF_DAIKO_ROUTE_NAMES.has(it.name)
              ? { ...it, label: it.label + STAFF_DAIKO_LABEL_SUFFIX }
              : it,
          ),
      }))
      .filter((section) => section.items.length > 0);
  });

  return { visibleSections };
}
