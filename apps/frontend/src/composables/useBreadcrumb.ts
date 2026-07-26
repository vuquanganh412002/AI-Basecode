import { computed } from 'vue';
import {
  useRoute,
  type RouteLocationMatched,
  type RouteLocationRaw,
} from 'vue-router';

export interface BreadcrumbItem {
  label: string;
  /** Either a string path or a Vue Router location object (`{ name: 'JaList' }`).
   *  Prefer the named-route object form so renaming a path doesn't ripple. */
  to?: RouteLocationRaw;
}

/**
 * Pure builder: turn a route's `matched` chain into breadcrumb items,
 * always prefixed with ホーム. Shared by {@link useBreadcrumb} (component
 * context) and the router `afterEach` document-title logic so both derive
 * the page label from the exact same source and never drift.
 */
export function buildBreadcrumbItems(
  matched: readonly RouteLocationMatched[],
): BreadcrumbItem[] {
  const list: BreadcrumbItem[] = [{ label: 'ホーム', to: '/' }];
  for (const m of matched) {
    const raw = m.meta?.breadcrumb as
      | string
      | BreadcrumbItem
      | BreadcrumbItem[]
      | undefined;
    if (!raw) continue;
    if (typeof raw === 'string') {
      list.push({ label: raw, to: m.path });
    } else if (Array.isArray(raw)) {
      list.push(...raw);
    } else {
      list.push(raw);
    }
  }
  return list;
}

/**
 * The current page's title = the leaf (last) breadcrumb label, or `null`
 * when the route only resolves to ホーム (no page-specific breadcrumb).
 * Used to build `document.title` per page.
 */
export function pageTitleFromMatched(
  matched: readonly RouteLocationMatched[],
): string | null {
  const items = buildBreadcrumbItems(matched);
  // items[0] is always ホーム — a real page adds at least one more.
  return items.length > 1 ? items[items.length - 1].label : null;
}

/**
 * Generates breadcrumbs from the current route's matched chain,
 * reading `meta.breadcrumb` (string | BreadcrumbItem[]).
 *
 * Usage in route meta:
 * ```ts
 * { path: '/tanka', meta: { breadcrumb: 'マスタ管理' } }
 * { path: '/tanka/list', meta: { breadcrumb: '単価マスタ明細検索' } }
 * ```
 *
 * Result: `ホーム > マスタ管理 > 単価マスタ明細検索`
 */
export function useBreadcrumb() {
  const route = useRoute();
  const items = computed<BreadcrumbItem[]>(() =>
    buildBreadcrumbItems(route.matched),
  );
  return { items };
}
