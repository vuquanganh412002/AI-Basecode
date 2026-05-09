import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { MENU_SECTIONS, type MenuSection } from '@/constants/menu-sections';

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

  const visibleSections = computed<MenuSection[]>(() =>
    MENU_SECTIONS
      .filter((section) => !options.excludeRoot || section.heading !== undefined)
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (it) => !it.permission || authStore.hasPermission(it.permission),
        ),
      }))
      .filter((section) => section.items.length > 0),
  );

  return { visibleSections };
}
